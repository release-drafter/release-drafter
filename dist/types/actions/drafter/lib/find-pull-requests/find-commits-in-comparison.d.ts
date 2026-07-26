import { type GitHubContext } from '../../../../common/index.js';
import { type FindCommitsInComparisonQuery, type FindCommitsInComparisonQueryVariables } from '../../../../types/github.graphql.generated.js';
type Params = Omit<FindCommitsInComparisonQueryVariables, 'cursor' | 'useCommitishes'> & {
    useCommitishes?: boolean;
};
type Repository = NonNullable<FindCommitsInComparisonQuery['repository']>;
type RefCommits = NonNullable<NonNullable<NonNullable<Repository['ref']>['compare']>['commits']['nodes']>;
type HeadCommit = Extract<NonNullable<Repository['head']>, {
    __typename: 'Commit';
}>;
type HistoryCommits = NonNullable<HeadCommit['history']['nodes']>;
type ComparisonCommit = NonNullable<RefCommits[number] | HistoryCommits[number]>;
export declare const findCommitsInComparison: (params: Params & {
    github: Pick<GitHubContext, 'octokit'>;
}) => Promise<ComparisonCommit[]>;
export {};
