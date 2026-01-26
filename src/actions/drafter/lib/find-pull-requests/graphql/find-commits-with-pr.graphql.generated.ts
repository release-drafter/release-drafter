import * as Types from '../../../../../types/github.graphql.generated';

export type FindCommitsWithAssociatedPullRequestsQueryVariables = Types.Exact<{
  name: Types.Scalars['String']['input'];
  owner: Types.Scalars['String']['input'];
  targetCommitish: Types.Scalars['String']['input'];
  withPullRequestBody: Types.Scalars['Boolean']['input'];
  withPullRequestURL: Types.Scalars['Boolean']['input'];
  since?: Types.InputMaybe<Types.Scalars['GitTimestamp']['input']>;
  after?: Types.InputMaybe<Types.Scalars['String']['input']>;
  withBaseRefName: Types.Scalars['Boolean']['input'];
  withHeadRefName: Types.Scalars['Boolean']['input'];
  pullRequestLimit: Types.Scalars['Int']['input'];
  historyLimit: Types.Scalars['Int']['input'];
}>;


export type FindCommitsWithAssociatedPullRequestsQuery = { __typename?: 'Query', repository?: { __typename?: 'Repository', object?:
      | { __typename?: 'Blob' }
      | { __typename?: 'Commit', history: { __typename?: 'CommitHistoryConnection', totalCount: number, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes?: Array<{ __typename?: 'Commit', id: string, committedDate: string, message: string, author?: { __typename?: 'GitActor', name?: string | null, user?: { __typename?: 'User', login: string } | null } | null, associatedPullRequests?: { __typename?: 'PullRequestConnection', nodes?: Array<{ __typename?: 'PullRequest', title: string, number: number, url?: string, body?: string, mergedAt?: string | null, isCrossRepository: boolean, merged: boolean, baseRefName?: string, headRefName?: string, author?:
                  | { __typename: 'Bot', login: string, url: string }
                  | { __typename: 'EnterpriseUserAccount', login: string, url: string }
                  | { __typename: 'Mannequin', login: string, url: string }
                  | { __typename: 'Organization', login: string, url: string }
                  | { __typename: 'User', login: string, url: string }
                 | null, baseRepository?: { __typename?: 'Repository', nameWithOwner: string } | null, labels?: { __typename?: 'LabelConnection', nodes?: Array<{ __typename?: 'Label', name: string } | null> | null } | null } | null> | null } | null } | null> | null } }
      | { __typename?: 'Tag' }
      | { __typename?: 'Tree' }
     | null } | null };
