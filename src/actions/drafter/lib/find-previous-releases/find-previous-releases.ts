import { getOctokit } from 'src/common'
import { Config } from 'src/types'
import { context } from '@actions/github'
import * as core from '@actions/core'
import { sortReleases } from './sort-releases'

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
    Config,
    'commitish' | 'filter-by-commitish' | 'include-pre-releases' | 'tag-prefix'
  >
) => {
  const {
    commitish,
    'filter-by-commitish': filterByCommitish,
    'include-pre-releases': includePreReleases,
    'tag-prefix': tagPrefix
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

  // `refs/heads/branch` and `branch` are the same thing in this context
  const headRefRegex = /^refs\/heads\//
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
  const sortedSelectedReleases = sortReleases({
    releases: filteredReleases.filter(
      (r) => !r.draft && (!r.prerelease || includePreReleases)
    ),
    tagPrefix
  })
  const draftRelease = filteredReleases.find(
    (r) => r.draft && r.prerelease === includePreReleases
  )
  const lastRelease = sortedSelectedReleases.at(-1)

  if (draftRelease) {
    core.info(`Draft release: ${draftRelease.tag_name}`)
  } else {
    core.info(`No draft release found`)
  }

  if (lastRelease) {
    core.info(
      `Last release${
        includePreReleases ? ' (including prerelease)' : ''
      }: ${lastRelease.tag_name}`
    )
  } else {
    core.info(`No last release found`)
  }

  return { draftRelease, lastRelease }
}
