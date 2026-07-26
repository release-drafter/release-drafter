import type { ParsedConfig } from '../actions/drafter/config/index.js';
import type { GitHubContext } from './github-context.js';
export declare const commitishToCommitExpression: (commitish: string) => string;
/**
 * GitHub's Releases API accepts a branch name or commit SHA as
 * `target_commitish`. Normalize fully qualified branch refs, resolve fully
 * qualified tag and pull request refs to commit SHAs before building the API
 * payload.
 *
 * A tag without the `refs/tags/` prefix cannot be distinguished reliably from
 * a branch with the same name, so it is passed through unchanged.
 *
 * If ref resolution fails, preserve the existing fallback to the repository's
 * default branch.
 */
export declare const parseCommitishForRelease: (commitish: ParsedConfig['commitish'], github: Pick<GitHubContext, 'logger' | 'octokit' | 'repo'>) => Promise<string>;
