import { Octokit as OctokitCore } from '@octokit/core'
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { retry } from '@octokit/plugin-retry'
import { EnvHttpProxyAgent, fetch as undiciFetch } from 'undici'

export const GitHubOctokitClient = OctokitCore.plugin(
  restEndpointMethods,
  paginateRest,
  paginateGraphQL,
  retry,
)

export type GitHubOctokit = InstanceType<typeof GitHubOctokitClient>
export type GitHubFetch = typeof globalThis.fetch

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

export const createProxyAwareFetch = (env: NodeJS.ProcessEnv): GitHubFetch => {
  const dispatcher = new EnvHttpProxyAgent({
    httpProxy: env.HTTP_PROXY ?? env.http_proxy,
    httpsProxy: env.HTTPS_PROXY ?? env.https_proxy,
    noProxy: env.NO_PROXY ?? env.no_proxy,
  })
  const fetchWithDispatcher = undiciFetch as unknown as (
    input: unknown,
    init: unknown,
  ) => ReturnType<GitHubFetch>
  return ((
    input: Parameters<GitHubFetch>[0],
    init?: Parameters<GitHubFetch>[1],
  ) => fetchWithDispatcher(input, { ...init, dispatcher })) as GitHubFetch
}
