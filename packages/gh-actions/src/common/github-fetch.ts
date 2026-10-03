import type { GitHubFetch } from '@release-drafter/github-adapter'
import { EnvHttpProxyAgent, fetch as undiciFetch } from 'undici'

/** Preserve runner proxy settings without changing the process-wide fetch. */
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
