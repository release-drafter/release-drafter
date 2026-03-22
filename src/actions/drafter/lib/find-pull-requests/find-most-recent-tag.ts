import { executeGraphql, getOctokit } from 'src/common'
import {
  FindMostRecentTagDocument,
  type FindMostRecentTagQueryVariables,
} from './graphql/find-most-recent-tag.graphql.generated'

export const findMostRecentTag = async (params: {
  name: string
  owner: string
  tagPrefix: string | undefined
}): Promise<string | undefined> => {
  const octokit = getOctokit()
  const variables: FindMostRecentTagQueryVariables = {
    name: params.name,
    owner: params.owner,
    first: 20,
  }
  const data = await executeGraphql(
    octokit.graphql,
    FindMostRecentTagDocument,
    variables,
  )
  const tags = (data.repository?.refs?.nodes ?? []).filter(
    (n): n is NonNullable<typeof n> => n != null,
  )
  const { tagPrefix } = params
  const filtered = tagPrefix
    ? tags.filter((t) => t.name.startsWith(tagPrefix))
    : tags
  return filtered[0]?.name
}
