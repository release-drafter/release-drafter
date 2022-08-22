import { Octokit } from '@octokit/core'
import { RequestOptions } from '@octokit/types'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { config } from '@probot/octokit-plugin-config'
import { throttling } from '@octokit/plugin-throttling'

export const githubApiUrl =
	process.env['GITHUB_API_URL'] || 'https://api.github.com'

export const ReleaseDrafterOctokit = Octokit.plugin(
	restEndpointMethods,
	paginateRest,
	throttling,
	config,
)

export function getOctokit(auth: string) {
	return new ReleaseDrafterOctokit({
		auth,
		throttle: {
			onRateLimit: (
				retryAfter: number,
				options: RequestOptions,
				octokit: Octokit,
			) => {
				octokit.log.warn(
					`Request quota exhausted for request ${options.method} ${options.url}`,
				)
				if (options.request?.retryCount === 0) {
					// only retries once
					octokit.log.info(`Retrying after ${retryAfter} seconds!`)
					return true
				}
			},
			onSecondaryRateLimit: (
				retryAfter: number,
				options: RequestOptions,
				octokit: Octokit,
			) => {
				// does not retry, only logs a warning
				octokit.log.warn(
					`Abuse detected for request ${options.method} ${options.url}`,
				)
			},
		},
	})
}
