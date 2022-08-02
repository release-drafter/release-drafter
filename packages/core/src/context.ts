import path from 'node:path'
import deepmerge from 'deepmerge'
import { ReleaseDrafterOctokit } from './release-drafter-octokit.js'
import { ReleaseDrafterConfig, ReleaseDrafterGetOptions } from './types.js'
import { DEFAULT_CONFIG } from './default-config.js'

export class Context {
	public octokit: InstanceType<typeof ReleaseDrafterOctokit>
	public owner: string
	public repo: string
	public configName: string
	public defaultBranch: string
	public pull_number: number
	public branch: string

	constructor(
		octokit: InstanceType<typeof ReleaseDrafterOctokit>,
		defaultBranch: string,
		{
			owner,
			repo,
			pull_number,
		}: { owner: string; repo: string; pull_number?: number },
		branch?: string,
		configName?: string,
	) {
		this.octokit = octokit
		this.owner = owner
		this.repo = repo
		this.pull_number = pull_number || 0
		this.defaultBranch = defaultBranch || 'master'
		this.branch = branch || this.defaultBranch
		this.configName = configName || 'release-drafter.yml'
	}

	public pullRequest(pullRequestNumber: number) {
		return {
			owner: this.owner,
			repo: this.repo,
			pull_number: pullRequestNumber,
		}
	}

	public async config(): Promise<ReleaseDrafterConfig> {
		const parameters: ReleaseDrafterGetOptions = {
			owner: this.owner,
			repo: this.repo,
			path: path.join('.github', this.configName),
			defaults(configs: object[]) {
				const result = deepmerge.all([DEFAULT_CONFIG, ...configs])
				return result as ReleaseDrafterConfig
			},
			branch: this.branch,
		}

		const { config } = await this.octokit.config.get(parameters)

		return config as ReleaseDrafterConfig
	}
}
