import * as core from '@actions/core'
import { context } from '@actions/github'
import coerce from 'semver/functions/coerce'
import satisfies from 'semver/functions/satisfies'
import validRange from 'semver/ranges/valid'
import { getOctokit } from 'src/common'
import type { ParsedConfig } from '../../config'
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
 * The last stable release is used to determine the range of commits to include in the changelog,
 * and to resolve the next version number.
 *
 * The draft release is used to determine if we should create a new release or update the existing one.
 */
export const findPreviousReleases = async (
  params: Pick<
    ParsedConfig,
    | 'commitish'
    | 'filter-by-commitish'
    | 'tag-prefix'
    | 'prerelease'
    | 'include-pre-releases'
    | 'filter-by-range'
  >,
) => {
  const {
    commitish,
    'filter-by-commitish': filterByCommitish,
    'tag-prefix': tagPrefix,
    prerelease: isPreRelease,
    'include-pre-releases': includePreReleases,
    'filter-by-range': filterByRange,
  } = params
  const octokit = getOctokit()

  core.info('Fetching releases from GitHub...')

  let releaseCount = 0
  const releases = await octokit.paginate(
    octokit.rest.repos.listReleases,
    {
      ...context.repo,
      per_page: 100,
    },
    (response, done) => {
      releaseCount += response.data.length
      if (releaseCount >= RELEASE_COUNT_LIMIT) {
        done()
      }
      return response.data
    },
  )

  core.info(`Found ${releases.length} releases`)

  // Filter releases
  const headRefRegex = /^refs\/heads\// // `refs/heads/branch` and `branch` are the same thing in this context
  const targetCommitishName = commitish.replace(headRefRegex, '')
  const commitishFilteredReleases = filterByCommitish
    ? releases.filter(
        (r) =>
          targetCommitishName === r.target_commitish.replace(headRefRegex, ''),
      )
    : releases
  const semverRangeFilteredReleases =
    filterByRange && filterByRange !== '*'
      ? commitishFilteredReleases.filter((r) => {
          const parsedRange = validRange(filterByRange)
          if (!parsedRange) return false
          const parsedVersion = coerce(r.tag_name, { loose: true })?.version

          if (!parsedVersion) {
            core.warning(
              `Failed to coerce semver version for "${r.tag_name}" : will be excluded from releases considered for drafting.`,
            )
            return false
          }

          const doesSatisfy = !!satisfies(parsedVersion, parsedRange, {
            loose: true,
          })

          core.debug(
            `Range "${parsedRange}" ${
              doesSatisfy ? 'satisfies' : 'does not satisfy'
            } version "${parsedVersion}" `,
          )

          return doesSatisfy
        })
      : commitishFilteredReleases
  const filteredReleases = tagPrefix
    ? semverRangeFilteredReleases.filter((r) =>
        r.tag_name.startsWith(tagPrefix),
      )
    : semverRangeFilteredReleases

  // Split drafts and published releases
  let publishedReleases = filteredReleases.filter((r) => !r.draft)
  let draftReleases = filteredReleases.filter((r) => r.draft)

  // Handle prereleases
  publishedReleases = publishedReleases.filter(
    (publishedRelease) =>
      isPreRelease || includePreReleases
        ? publishedRelease.prerelease || !publishedRelease.prerelease // Both prerelease and regular published-releases
        : !publishedRelease.prerelease, // Only regular published-releases
  )
  draftReleases = draftReleases.filter(
    (draftRelease) =>
      isPreRelease
        ? draftRelease.prerelease // Only pre-releases drafts
        : !draftRelease.prerelease, // Only regular drafts
  )

  // Sort results
  const draftRelease = draftReleases[0] // Should this be sorted ?
  const lastRelease = sortReleases({
    releases: publishedReleases,
    tagPrefix,
  })?.at(-1)

  if (draftRelease) {
    if (draftReleases.length > 1) {
      core.warning(
        `Multiple draft releases found : ${draftReleases
          .map((r) => r.tag_name)
          .join(', ')}`,
      )
      core.warning(
        `Using the first one returned by GitHub API: ${draftRelease.tag_name}`,
      )
    }

    core.info(`Draft release${isPreRelease ? ' (which is a prerelease)' : ''}:`)
    core.info(`  tag_name:  ${draftRelease.tag_name}`)
    core.info(`  name:      ${draftRelease.name}`)
  } else {
    core.info(
      `No draft release found${isPreRelease ? ' (among prerelease drafts)' : ''}`,
    )
  }

  if (lastRelease) {
    core.info(`Last release${isPreRelease ? ' (including prerelease)' : ''}:`)
    core.info(`  tag_name:  ${lastRelease.tag_name}`)
    core.info(`  name:      ${lastRelease.name}`)
  } else {
    core.warning(
      `No published release found${isPreRelease ? ' (including prerelease)' : ''}`,
    )
  }

  return { draftRelease, lastRelease }
}
