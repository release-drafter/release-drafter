import nock from 'nock'
import { Context } from '../src/context.js'
import { getOctokit } from '../src/release-drafter-octokit.js'
import { findReleases, generateChangeLog } from '../src/releases.js'
import { PullRequest, ReleaseDrafterConfig } from '../src/types.js'

const octokit = getOctokit('TEST')

describe('releases', () => {
	beforeAll(() => {
		nock.disableNetConnect()
	})

	describe('findReleases', () => {
		it('finds no release safely', async () => {
			const context = new Context(octokit, {
				owner: 'release-drafter',
				repo: 'release-drafter',
				defaultBranch: 'main',
			})

			nock('https://api.github.com')
				.get('/repos/release-drafter/release-drafter/releases?per_page=100')
				.reply(200, { total_count: 0, items: [] })

			const actual = await findReleases({
				context,
				targetCommitish: 'refs/heads/main',
				filterByCommitish: true,
				tagPrefix: 'v',
			})
			expect(actual).toEqual({
				draftRelease: undefined,
				lastRelease: undefined,
			})
		})

		it('finds one release as latest', async () => {
			const context = new Context(octokit, {
				owner: 'release-drafter',
				repo: 'release-drafter',
				defaultBranch: 'main',
			})

			nock('https://api.github.com')
				.get('/repos/release-drafter/release-drafter/releases?per_page=100')
				.reply(200, {
					total_count: 1,
					items: [
						{
							target_commitish: 'refs/heads/main',
							tag_name: 'v0.1.0',
							draft: false,
						},
					],
				})

			const actual = await findReleases({
				context,
				targetCommitish: 'refs/heads/main',
				filterByCommitish: true,
				tagPrefix: 'v',
			})
			expect(actual).toEqual({
				draftRelease: undefined,
				lastRelease: {
					target_commitish: 'refs/heads/main',
					tag_name: 'v0.1.0',
					draft: false,
				},
			})
		})

		it('finds releases correctly', async () => {
			const context = new Context(octokit, {
				owner: 'release-drafter',
				repo: 'release-drafter',
				defaultBranch: 'main',
			})

			nock('https://api.github.com')
				.get('/repos/release-drafter/release-drafter/releases?per_page=100')
				.reply(200, {
					total_count: 3,
					items: [
						{
							target_commitish: 'refs/heads/main',
							tag_name: 'v0.2.1',
							draft: true,
						},
						{
							target_commitish: 'refs/heads/main',
							tag_name: 'v0.2.0',
							draft: false,
						},
						{
							target_commitish: 'refs/heads/main',
							tag_name: 'v0.1.0',
							draft: false,
						},
					],
				})

			const actual = await findReleases({
				context,
				targetCommitish: 'refs/heads/main',
				filterByCommitish: true,
				tagPrefix: 'v',
			})
			expect(actual).toEqual({
				draftRelease: {
					target_commitish: 'refs/heads/main',
					tag_name: 'v0.2.1',
					draft: true,
				},
				lastRelease: {
					target_commitish: 'refs/heads/main',
					tag_name: 'v0.2.0',
					draft: false,
				},
			})
		})
	})

	describe('generateChangeLog', () => {
		const pr = {
			number: 123,
			title: 'feat(example): An example feat',
			author: { login: 'testymctesterface' },
			labels: { nodes: [{ name: 'example' }] },
		} as unknown as PullRequest

		const config = {
			'category-template': '$TITLE',
			'change-template': '$TITLE (#$NUMBER) @$AUTHOR',
			'change-title-escapes': '',
			'no-changes-template': 'no changes',
			'exclude-labels': [],
			'include-labels': [],
			categories: [
				{
					title: 'Example',
					labels: ['example'],
				},
				{
					title: 'ABC',
					labels: ['a', 'b', 'c'],
				},
				{
					title: 'XYZ',
					labels: ['x', 'y', 'z'],
				},
				{
					title: 'Uncategorized',
					labels: [],
				},
			],
		} as unknown as ReleaseDrafterConfig

		it('generates no change', () => {
			const actual = generateChangeLog([], config)
			expect(actual).toBe('no changes')
		})

		it('generates basic change log', () => {
			const actual = generateChangeLog(
				[
					{
						...pr,
						labels: { nodes: [{ name: 'example' }] },
					} as unknown as PullRequest,
				],
				config,
			)
			expect(actual).toBe(
				'Example\n\nfeat(example): An example feat (#123) @testymctesterface',
			)
		})

		it('adds to uncategorized if labels dont match', () => {
			const actual = generateChangeLog(
				[
					{
						...pr,
						labels: { nodes: [{ name: 'unknown' }] },
					} as unknown as PullRequest,
				],
				config,
			)
			expect(actual).toBe(
				'Uncategorized\n\nfeat(example): An example feat (#123) @testymctesterface',
			)
		})

		it('adds to multiple categories if applicable', () => {
			const actual = generateChangeLog(
				[
					{
						...pr,
						labels: { nodes: [{ name: 'a' }, { name: 'x' }] },
					} as unknown as PullRequest,
				],
				config,
			)
			expect(actual).toBe(
				'ABC\n\nfeat(example): An example feat (#123) @testymctesterface\n\n' +
					'XYZ\n\nfeat(example): An example feat (#123) @testymctesterface',
			)
		})

		it('lands in correct category with multiple label hits', () => {
			const actual = generateChangeLog(
				[
					{
						...pr,
						labels: { nodes: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] },
					} as unknown as PullRequest,
				],
				config,
			)
			expect(actual).toBe(
				'ABC\n\nfeat(example): An example feat (#123) @testymctesterface',
			)
		})
	})
})
