import { type GitHubContext } from '../../../../common/index.js';
import { type FindRecentMergedPullRequestsQuery } from '../../../../types/github.graphql.generated.js';
export type PullRequestFieldFlags = {
    withPullRequestBody: boolean;
    withPullRequestURL: boolean;
    withBaseRefName: boolean;
    withHeadRefName: boolean;
};
type RecentMergedPullRequestNode = NonNullable<NonNullable<FindRecentMergedPullRequestsQuery['repository']>['pullRequests']['nodes']>[number];
export type RecentMergedPullRequest = NonNullable<RecentMergedPullRequestNode>;
export declare const findRecentMergedPullRequests: (params: {
    baseRefName: string | null;
    commitOids: Set<string>;
    foundPrKeys: Set<string>;
    fieldFlags: PullRequestFieldFlags;
    github: Pick<GitHubContext, 'logger' | 'octokit' | 'repo'>;
}) => Promise<RecentMergedPullRequest[]>;
export {};
