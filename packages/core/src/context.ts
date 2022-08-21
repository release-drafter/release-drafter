import deepmerge from 'deepmerge'
import { ReleaseDrafterOctokit } from './release-drafter-octokit.js'
import { ReleaseDrafterConfig, ReleaseDrafterGetOptions } from './types.js'
import { DEFAULT_CONFIG } from './default-config.js'
import { schema } from './schema.js'

export class Context {
	public octokit: InstanceType<typeof ReleaseDrafterOctokit>
	public readonly owner: string
	public readonly repo: string
	public readonly pullRequest: number
	public readonly issueNumber: number
	public readonly configName: string
	public readonly defaultBranch: string

	constructor(
		octokit: InstanceType<typeof ReleaseDrafterOctokit>,
		defaultBranch: string,
		{
			owner,
			repo,
			issue,
			pullRequest,
			configName,
		}: {
			owner: string
			repo: string
			issue?: number
			pullRequest?: number
			configName?: string
		},
	) {
		this.octokit = octokit
		this.owner = owner
		this.repo = repo
		this.issueNumber = issue || 0
		this.pullRequest = pullRequest || 0
		this.defaultBranch = defaultBranch
		this.configName = configName || 'release-drafter.yml'
	}

	public ownerRepo = () => `${this.owner}/${this.repo}`

	public async config(): Promise<ReleaseDrafterConfig> {
		const parameters: ReleaseDrafterGetOptions = {
			owner: this.owner,
			repo: this.repo,
			path: `.github/${this.configName}`,
			defaults(configs: object[]) {
				const result = deepmerge.all([DEFAULT_CONFIG, ...configs])
				return result as ReleaseDrafterConfig
			},
			branch: this.defaultBranch,
		}

		const { config } = await this.octokit.config.get(parameters)

		return schema(this.defaultBranch).parse(config)
	}
}
