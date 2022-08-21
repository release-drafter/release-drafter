import { config } from '@probot/octokit-plugin-config'
import { WebhookEvent } from '@octokit/webhooks-types'
import { promises as fs } from 'node:fs'
import { throttling } from '@octokit/plugin-throttling'
import { Octokit } from '@octokit/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { paginateRest } from '@octokit/plugin-paginate-rest'
import { HttpClient } from '@actions/http-client'
import * as core from '@actions/core'
import { SummaryTableRow } from '@actions/core/lib/summary.js'
import { ReleaseDrafterConfig } from '@release-drafter/core'
import { RequestOptions } from '@octokit/types'

function getProxyAgent(proxyUrl: string) {
	const hc = new HttpClient()
	return hc.getAgent(proxyUrl)
}

const baseUrl = process.env['GITHUB_API_URL'] || 'https://api.github.com'
const defaults = {
	baseUrl,
	request: {
		agent: getProxyAgent(baseUrl),
	},
}

export const ReleaseDrafterOctokit = Octokit.plugin(
	restEndpointMethods,
	paginateRest,
	throttling,
	config,
).defaults(defaults)

export async function getPayload(): Promise<WebhookEvent> {
	if (process.env['GITHUB_EVENT_PATH']) {
		return JSON.parse(
			await fs.readFile(process.env['GITHUB_EVENT_PATH'], 'utf8'),
		)
	}
	throw new Error('GITHUB_EVENT_PATH not set')
}

export async function getReference(): Promise<string> {
	return new Promise((resolve, reject) => {
		if (process.env['GITHUB_REF']) {
			resolve(process.env['GITHUB_REF'])
		}
		reject('GITHUB_REF not set')
	})
}

async function fetchDefaultBranch(
	octokit: InstanceType<typeof ReleaseDrafterOctokit>,
) {
	const repo = await getRepo()
	return octokit.rest.repos
		.get(repo)
		.then(({ data }) => data.default_branch)
		.catch(() => '')
}

export async function getDefaultBranch(
	octokit: InstanceType<typeof ReleaseDrafterOctokit>,
): Promise<string> {
	const payload = await getPayload()
	const reference = await getReference()
	let defaultBranch
	if ('repository' in payload) {
		defaultBranch =
			payload.repository?.default_branch || fetchDefaultBranch(octokit)
	}
	return defaultBranch || reference || 'master'
}

export async function getRepo(): Promise<{ owner: string; repo: string }> {
	if (process.env['GITHUB_REPOSITORY']) {
		const [owner, repo] = process.env['GITHUB_REPOSITORY'].split('/', 2)
		return { owner, repo }
	}
	const payload = await getPayload()
	if ('repository' in payload) {
		return {
			owner: payload.repository?.owner?.login || '',
			repo: payload.repository?.name || '',
		}
	}
	return { owner: '', repo: '' }
}

export function getActionInputs(config: ReleaseDrafterConfig) {
	// Merges the config file with the input which takes precedence
	const preRelease = core.getInput('prerelease').toLowerCase()

	const header = core.getInput('header')
	const footer = core.getInput('footer')
	if (header) {
		config.header = header
	}
	if (footer) {
		config.footer = footer
	}

	return {
		isPreRelease: preRelease === 'true' || (!preRelease && config.prerelease),
		shouldDraft: core.getInput('publish').toLowerCase() !== 'true',
		version: core.getInput('version') || undefined,
		tag: core.getInput('tag') || undefined,
		name: core.getInput('name') || undefined,
		commitish: core.getInput('commitish') || undefined,
	}
}

export type ReleaseResponse = {
	data: {
		id: number
		html_url: string
		upload_url: string
		tag_name: string
		name: string | null
	}
}

export async function setActionOutputs(
	releaseResponse: ReleaseResponse,
	{ body }: { body: string },
	shouldDraft: boolean,
	isPreRelease: boolean,
) {
	const {
		data: {
			id: releaseId,
			html_url: htmlUrl,
			upload_url: uploadUrl,
			tag_name: tagName,
			name: name,
		},
	} = releaseResponse
	if (releaseId && Number.isInteger(releaseId))
		core.setOutput('id', releaseId.toString())

	const summaryTable = [] as SummaryTableRow[]

	if (htmlUrl) core.setOutput('html_url', htmlUrl)
	if (uploadUrl) core.setOutput('upload_url', uploadUrl)
	if (name) {
		core.setOutput('name', name)
		summaryTable.push(['Release Name', name])
	}
	if (tagName) {
		core.setOutput('tag_name', tagName)
		summaryTable.push(['Tag name', tagName])
	}
	core.setOutput('body', body)
	if (shouldDraft) {
		core.setOutput('draft', 'true')
		core.setOutput('published', 'false')
		summaryTable.push(['Published', '❌'], ['Draft', '✔'])
	} else {
		core.setOutput('draft', 'false')
		core.setOutput('published', 'true')
		summaryTable.push(['Published', '✔'], ['Draft', '❌'])
	}
	if (isPreRelease) {
		core.setOutput('prerelease', 'true')
		summaryTable.push(['Prerelease', '✔'])
	} else {
		core.setOutput('prerelease', 'false')
		summaryTable.push(['Prerelease', '❌'])
	}
	await core.summary
		.addHeading(`Release Drafter Output`)
		.addTable(summaryTable)
		.addLink(`View Release`, htmlUrl)
		.addHeading(`Release Drafter body`, 3)
		.addRaw(`\n${body}\n`)
		.write()
}

export function getOctokit() {
	return new ReleaseDrafterOctokit({
		auth: core.getInput('token'),
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
					console.log(`Retrying after ${retryAfter} seconds!`)
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
