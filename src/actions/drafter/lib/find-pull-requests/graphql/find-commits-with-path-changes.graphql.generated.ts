import * as Types from '../../../../../types/github.graphql.generated';

export type FindCommitsWithPathChangesQueryQueryVariables = Types.Exact<{
  name: Types.Scalars['String']['input'];
  owner: Types.Scalars['String']['input'];
  targetCommitish: Types.Scalars['String']['input'];
  since?: Types.InputMaybe<Types.Scalars['GitTimestamp']['input']>;
  after?: Types.InputMaybe<Types.Scalars['String']['input']>;
  path?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type FindCommitsWithPathChangesQueryQuery = { __typename?: 'Query', repository?: { __typename?: 'Repository', object?:
      | { __typename?: 'Blob' }
      | { __typename?: 'Commit', history: { __typename?: 'CommitHistoryConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor?: string | null }, nodes?: Array<{ __typename?: 'Commit', id: string } | null> | null } }
      | { __typename?: 'Tag' }
      | { __typename?: 'Tree' }
     | null } | null };
