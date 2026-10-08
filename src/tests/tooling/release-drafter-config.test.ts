import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { configSchema } from '../../../packages/core/src/config/config.schema.ts'
import { mergeInputAndConfig } from '../../../packages/core/src/config/merge-input-and-config.ts'
import { noopLogger } from '../../../packages/core/src/ports.ts'
import { buildReleasePayload } from '../../../packages/core/src/release/build-release-payload.ts'

const config = mergeInputAndConfig({
  config: configSchema.parse(
    parse(readFileSync('.github/release-drafter.yml', 'utf8')),
  ),
  input: {},
  defaultCommitish: 'main',
  logger: noopLogger,
})

const buildPayload = (title: string, labels: string[] = []) => {
  const pullRequest = Object.freeze({
    number: 42,
    title,
    labels,
    author: { login: 'contributor', type: 'User' },
  })
  return buildReleasePayload({
    adapter: { resolveCommitish: async ({ commitish }) => commitish },
    commits: [],
    config,
    input: { publish: false },
    lastRelease: { id: 1, tagName: 'v1.2.3' },
    logger: noopLogger,
    pullRequests: [pullRequest],
    repository: {
      owner: 'release-drafter',
      name: 'release-drafter',
      serverUrl: 'https://github.com',
    },
  })
}

describe('repository Release Drafter configuration', () => {
  it.each([
    ['build: improve output', 'Maintenance', '1.2.4'],
    ['chore(deps): improve output', 'Dependency Updates', '1.2.4'],
    ['ci(release): improve output', 'Maintenance', '1.2.4'],
    ['docs: improve output', 'Documentation', '1.2.4'],
    ['feat: improve output', 'New', '1.3.0'],
    ['fix(core): improve output', 'Bug Fixes', '1.2.4'],
    ['perf: improve output', 'Maintenance', '1.2.4'],
    ['refactor: improve output', 'Maintenance', '1.2.4'],
    ['revert: improve output', 'Maintenance', '1.2.4'],
    ['style: improve output', 'Maintenance', '1.2.4'],
    ['test: improve output', 'Maintenance', '1.2.4'],
    ['feat(core)!: improve output', 'Breaking', '2.0.0'],
    ['fix!: improve output', 'Breaking', '2.0.0'],
  ])(
    'renders %s without its prefix while preserving classification',
    async (title, category, version) => {
      const payload = await buildPayload(title)
      expect(payload.body).toContain(
        `## ${category}\n\n* Improve output (#42) @contributor`,
      )
      expect(payload.body).not.toContain(title)
      expect(payload.resolvedVersion).toBe(version)
      expect(payload.tag).toBe(`v${version}`)
      expect(payload.draft).toBe(true)
    },
  )

  it.each([
    'Improve output',
    'release: improve output',
    'prefix feat: improve output',
  ])(
    'preserves titles without a supported conventional prefix: %s',
    async (title) => {
      const payload = await buildPayload(title)
      expect(payload.body).toContain(`* ${title} (#42) @contributor`)
    },
  )

  it('only removes the leading prefix', async () => {
    const payload = await buildPayload('fix: preserve ci: in the description')
    expect(payload.body).toContain(
      '* Preserve ci: in the description (#42) @contributor',
    )
  })

  it('keeps release PRs excluded after title replacement', async () => {
    const payload = await buildPayload('chore: release v1.2.4', [
      'skip-changelog',
    ])
    expect(payload.body).not.toContain('release v1.2.4')
    expect(payload.body).not.toContain('(#42)')
  })
})
