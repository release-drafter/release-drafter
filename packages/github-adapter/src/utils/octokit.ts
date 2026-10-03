import { Octokit as OctokitCore } from '@octokit/core'
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { retry } from '@octokit/plugin-retry'

export const GitHubOctokitClient = OctokitCore.plugin(
  restEndpointMethods,
  paginateRest,
  paginateGraphQL,
  retry,
)

export type GitHubOctokit = InstanceType<typeof GitHubOctokitClient>

export const deriveEndpoints = (options: {
  serverUrl?: string
  apiUrl?: string
  graphqlUrl?: string
}) => {
  const serverUrl = (options.serverUrl ?? 'https://github.com').replace(
    /\/$/,
    '',
  )
  const githubDotCom = serverUrl === 'https://github.com'
  const apiUrl = (
    options.apiUrl ??
    (githubDotCom ? 'https://api.github.com' : `${serverUrl}/api/v3`)
  ).replace(/\/$/, '')
  const graphqlUrl = (
    options.graphqlUrl ??
    (githubDotCom
      ? 'https://api.github.com/graphql'
      : `${serverUrl}/api/graphql`)
  ).replace(/\/$/, '')
  return { serverUrl, apiUrl, graphqlUrl }
}
