import {
	describe,
	beforeAll,
	it,
	expect,
	afterEach,
	afterAll,
} from '@jest/globals'
import nock from 'nock'
import { Context } from '../src/context.js'
import { getOctokit } from '../src/index.js'
import { DEFAULT_CONFIG } from '../src/default-config.js'

const octokit = getOctokit('TEST')

describe('Context', () => {
	beforeAll(() => {
		nock.disableNetConnect()
	})
	it('Context prints owner and repo', () => {
		const context = new Context(octokit, {
			owner: 'release-drafter-owner',
			repo: 'release-drafter-repo',
		})
		expect(context.ownerRepo()).toBe(
			'release-drafter-owner/release-drafter-repo',
		)
	})
	it('Context with default branch and no config should default', async () => {
		const context = new Context(octokit, {
			owner: 'release-drafter',
			repo: 'release-drafter',
			defaultBranch: 'main',
		})

		nock('https://api.github.com')
			.get(
				'/repos/release-drafter/release-drafter/contents/.github%2Frelease-drafter.yml?ref=main',
			)
			.reply(404)
			.get(
				'/repos/release-drafter/.github/contents/.github%2Frelease-drafter.yml?ref=main',
			)
			.reply(404)

		nock('https://api.github.com')
			.get(
				'/repos/release-drafter/release-drafter/contents/.github%2Frelease-drafter.yml',
			)
			.reply(404)
			.get(
				'/repos/release-drafter/.github/contents/.github%2Frelease-drafter.yml',
			)
			.reply(404)

		const config = await context.config()
		expect(config).toEqual(DEFAULT_CONFIG)
	})

	it('Context with no default branch and no config should default', async () => {
		const otherContext = new Context(octokit, {
			owner: 'release-drafter',
			repo: 'release-drafter',
		})

		nock('https://api.github.com')
			.get(
				'/repos/release-drafter/release-drafter/contents/.github%2Frelease-drafter.yml',
			)
			.reply(404)
			.get(
				'/repos/release-drafter/.github/contents/.github%2Frelease-drafter.yml',
			)
			.reply(404)

		const config = await otherContext.config()
		expect(config).toEqual(DEFAULT_CONFIG)
	})

	afterEach(() => {
		nock.cleanAll()
	})

	afterAll(() => {
		nock.restore()
	})
})
