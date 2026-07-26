import { type GitHubContext } from '../../../../common/index.js';
import type { ExclusiveInput, ParsedConfig } from '../../config/index.js';
import type { findPreviousReleases } from '../find-previous-releases/index.js';
import type { findPullRequests } from '../find-pull-requests/index.js';
/**
 * Outputs the payload for creating or updating a release.
 *
 * Previously known as `generateReleaseInfo`.
 */
export declare const buildReleasePayload: (params: {
    commits: Awaited<ReturnType<typeof findPullRequests>>['commits'];
    config: Pick<ParsedConfig, 'sort-by' | 'sort-direction' | 'header' | 'footer' | 'template' | 'replacers' | 'change-title-escapes' | 'no-changes-template' | 'categories' | 'change-template' | 'change-author-template' | 'change-authors-separator' | 'change-authors-final-separator' | 'category-template' | 'exclude-contributors' | 'new-contributor-template' | 'no-contributors-template' | 'prerelease' | 'version-template' | 'tag-prefix' | 'prerelease-identifier' | 'tag-template' | 'name-template' | 'commitish' | 'latest'>;
    input: ExclusiveInput;
    lastRelease: Awaited<ReturnType<typeof findPreviousReleases>>['lastRelease'];
    previousCommitish?: string;
    newContributorLogins?: ReadonlySet<string>;
    pullRequests: Awaited<ReturnType<typeof findPullRequests>>['pullRequests'];
    github: GitHubContext;
}) => Promise<{
    name: string;
    tag: string;
    body: string;
    targetCommitish: string;
    prerelease: boolean;
    make_latest: boolean;
    draft: boolean;
    resolvedVersion: string;
    majorVersion: string | null;
    minorVersion: string | null;
    patchVersion: string | null;
    prereleaseVersion: string | null;
}>;
