import * as core from '@actions/core'
import type { ParsedConfig } from '#src/actions/drafter/config/index.ts'

/**
 * GitHub's Releases API accepts a branch name or commit SHA as
 * `target_commitish`. Normalize fully qualified branch refs and reject tag and
 * pull request refs before building the API payload.
 *
 * If it doesn't but is still a tag (e.g. "v1.2.3") - it must have been set
 * explicitly by the user, so it's fair to just let the API respond with an error.
 *
 * Note that this cannot be distinguished from a branch name accurately without manually
 * fetching branch refs from the remote. (TODO ? Overkill ?)
 */
export const parseCommitishForRelease = (
  commitish: ParsedConfig['commitish'],
) => {
  if (commitish.startsWith('refs/heads/')) {
    return commitish.replace(/^refs\/heads\//, '')
  }

  if (
    commitish.startsWith('refs/tags/') ||
    commitish.startsWith('refs/pull/')
  ) {
    // TODO retrieve the commitish that the tag/the pr points to, and use it as target_commitish instead of default branch
    core.warning(
      `${commitish} is not supported as release target (commitish), falling back to default branch`,
    )

    return ''
  }

  return commitish
}
