import * as core from '@actions/core'
import type { ParsedConfig } from 'src/actions/drafter/config'

/**
 * Tags are not supported as `target_commitish` by Github API.
 * GITHUB_REF or the ref from webhook start with `refs/tags/`, so we handle
 * those here.
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
  let mutableCommitish = structuredClone(commitish)

  if (mutableCommitish.startsWith('refs/tags/')) {
    // TODO retrieve the commitish that the tag points to, and use it as target_commitish instead of default branch
    core.info(
      `${mutableCommitish} is not supported as release target, falling back to default branch`,
    )

    mutableCommitish = ''
  }

  return mutableCommitish
}
