import { getOctokit } from 'src/common'
import { context } from '@actions/github'
import * as core from '@actions/core'
import { sortReleases } from './sort-releases'
import { type ParsedConfig } from '../../config'

// GitHub API currently returns a 500 HTTP response if you attempt to fetch over 1000 releases.
const RELEASE_COUNT_LIMIT = 1000

/**
 * Lists every release and :
 * - filters by commitish if specified
 * - filters by tag-prefix if specified
 * - filters out pre-releases unless specified
 * - extracts the first draft releases (according to return-order of GitHub API)
 * - get latest published release according to ./sort-releases.ts implementation
 *
 * Returns one of (or both) draft release and latest published release
 */
export const findPreviousReleases = async (
  params: Pick<
    ParsedConfig,
    'commitish' | 'filter-by-commitish' | 'tag-prefix' | 'prerelease'
  >
) => {
  const {
    commitish,
    'filter-by-commitish': filterByCommitish,
    'tag-prefix': tagPrefix,
    prerelease: isPreRelease
  } = params
  const octokit = getOctokit()

  core.info('Fetching releases from GitHub...')

  let releaseCount = 0
  const releases = await octokit.paginate(
    octokit.rest.repos.listReleases,
    {
      ...context.repo,
      per_page: 100
    },
    (response, done) => {
      releaseCount += response.data.length
      if (releaseCount >= RELEASE_COUNT_LIMIT) {
        done()
      }
      return response.data
    }
  )

  core.info(`Found ${releases.length} releases`)

  // Filter releases
  const headRefRegex = /^refs\/heads\// // `refs/heads/branch` and `branch` are the same thing in this context
  const targetCommitishName = commitish.replace(headRefRegex, '')
  const commitishFilteredReleases = filterByCommitish
    ? releases.filter(
        (r) =>
          targetCommitishName === r.target_commitish.replace(headRefRegex, '')
      )
    : releases
  const filteredReleases = tagPrefix
    ? commitishFilteredReleases.filter((r) => r.tag_name.startsWith(tagPrefix))
    : commitishFilteredReleases

  // Split drafts and published releases
  let publishedReleases = filteredReleases.filter((r) => !r.draft)
  let draftReleases = filteredReleases.filter((r) => r.draft)

  // Handle prereleases
  publishedReleases = publishedReleases.filter(
    (publishedRelease) =>
      isPreRelease
        ? publishedRelease.prerelease || !publishedRelease.prerelease // Both prerelease and regular published-releases
        : !publishedRelease.prerelease // Only regular published-releases
  )
  draftReleases = draftReleases.filter(
    (draftRelease) =>
      isPreRelease
        ? draftRelease.prerelease // Only pre-releases drafts
        : !draftRelease.prerelease // Only regular drafts
  )

  // Sort results
  const draftRelease = draftReleases[0] // Should this be sorted ?
  const lastRelease = sortReleases({
    releases: publishedReleases,
    tagPrefix
  })?.at(-1)

  if (draftRelease) {
    if (draftReleases.length > 1) {
      core.warning(
        `Multiple draft releases found : ${draftReleases
          .map((r) => r.tag_name)
          .join(', ')}`
      )
      core.warning(
        `Using the first one returned by GitHub API: ${draftRelease.tag_name}`
      )
    }

    core.info(`Draft release${isPreRelease ? ' (which is a prerelease)' : ''}:`)
    core.info(`  tag_name:  ${draftRelease.tag_name}`)
    core.info(`  name:      ${draftRelease.name}`)
  } else {
    core.info(
      `No draft release found${isPreRelease ? ' (among prerelease drafts)' : ''}`
    )
  }

  if (lastRelease) {
    core.info(`Last release${isPreRelease ? ' (including prerelease)' : ''}:`)
    core.info(`  tag_name:  ${lastRelease.tag_name}`)
    core.info(`  name:      ${lastRelease.name}`)
  } else {
    core.info(
      `No last release found${isPreRelease ? ' (including prerelease)' : ''}`
    )
  }

  return { draftRelease, lastRelease }
}
