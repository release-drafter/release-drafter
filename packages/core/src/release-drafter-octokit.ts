import { Octokit } from '@octokit/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { config } from '@probot/octokit-plugin-config'

export const ReleaseDrafterOctokit = Octokit.plugin(
	restEndpointMethods,
	paginateRest,
	config,
)
