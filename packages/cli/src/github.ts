import { ReleaseDrafterOctokit } from '@release-drafter/core'

async function fetchDefaultBranch(
	octokit: InstanceType<typeof ReleaseDrafterOctokit>,
	{ repo, owner }: { owner: string; repo: string },
) {
	return octokit.rest.repos
		.get({ owner, repo })
		.then(({ data }) => data.default_branch)
		.catch(() => '')
}

export async function getDefaultBranch(
	octokit: InstanceType<typeof ReleaseDrafterOctokit>,
	{
		defaultBranchFromOption,
		owner,
		repo,
	}: { owner: string; repo: string; defaultBranchFromOption: string },
): Promise<string> {
	if (defaultBranchFromOption) {
		return defaultBranchFromOption
	}
	return (await fetchDefaultBranch(octokit, { owner, repo })) || 'master'
}
