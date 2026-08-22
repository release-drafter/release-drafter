import * as core from '@actions/core'
import { configSchema } from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import { checkPullRequest, type RunnerDependencies } from './runner.ts'

const payload = (title: string, labels: string[] = []) => ({
  action: 'edited',
  number: 42,
  pull_request: {
    title,
    labels: labels.map((name) => ({ name })),
    base: { ref: 'main' },
  },
  changes: { title: { from: 'old title' } },
})

const dependencies = (
  title: string,
  categoryConfig: unknown,
  overrides: Partial<RunnerDependencies> = {},
): RunnerDependencies => ({
  eventName: 'pull_request',
  payload: payload(title),
  getInput: () => ({
    'config-name': 'release-drafter.yml',
    token: 'token',
  }),
  getConfig: vi
    .fn()
    .mockResolvedValue(configSchema.parse({ categories: categoryConfig })),
  ...overrides,
})

describe('check PR runner', () => {
  it('uses the edited event current title and performs no writes', async () => {
    const value = dependencies('feat: current', [
      { title: 'Features', when: { conventional: { type: 'feat' } } },
    ])

    await expect(checkPullRequest(value)).resolves.toBeUndefined()
    expect(core.setOutput).not.toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('accepts a configured label without a conventional title', async () => {
    const value = dependencies(
      'old style title',
      [{ title: 'Features', when: { label: 'feature' } }],
      { payload: payload('old style title', ['feature']) },
    )

    await expect(checkPullRequest(value)).resolves.toBeUndefined()
  })

  it('rejects invalid and fallback-only pull requests with a clear error', async () => {
    const value = dependencies('old style title', [
      { title: 'Features', when: { conventional: { type: 'feat' } } },
      { title: 'Other' },
    ])
    await expect(checkPullRequest(value)).rejects.toThrow(
      'does not match any configured conventional or label-based changelog or version-resolver category',
    )
  })

  it('passes pull requests excluded by labels', async () => {
    const value = dependencies(
      'invalid title',
      [
        { type: 'pre-exclude', when: { label: 'skip' } },
        { title: 'Features', when: { conventional: { type: 'feat' } } },
      ],
      { payload: payload('invalid title', ['skip']) },
    )
    await expect(checkPullRequest(value)).resolves.toBeUndefined()
    expect(core.info).toHaveBeenCalledWith(
      'Skipping excluded pull request #42.',
    )
  })

  it('ignores path predicates and path-only categories', async () => {
    const value = dependencies('feat: metadata only', [
      { title: 'Path only', when: { path: 'docs/**' } },
      {
        title: 'Features',
        when: { conventional: { type: 'feat' }, path: 'src/**' },
      },
    ])

    await expect(checkPullRequest(value)).resolves.toBeUndefined()
  })

  it.each([
    'push',
    'workflow_dispatch',
  ])('rejects non-PR event %s', async (eventName) => {
    const value = dependencies('feat: title', [], { eventName })
    await expect(checkPullRequest(value)).rejects.toThrow(
      "Expected 'pull_request' or 'pull_request_target'",
    )
  })

  it.each([
    {},
    { number: '42', pull_request: {} },
    { number: 42, pull_request: { title: 'feat: x', labels: [] } },
  ])('rejects malformed PR payload %#', async (malformedPayload) => {
    const value = dependencies('feat: title', [], {
      payload: malformedPayload,
    })
    await expect(checkPullRequest(value)).rejects.toThrow()
  })

  it('supports pull_request_target', async () => {
    const value = dependencies(
      'fix: target',
      [{ title: 'Fixes', when: { conventional: { type: 'fix' } } }],
      { eventName: 'pull_request_target' },
    )
    await expect(checkPullRequest(value)).resolves.toBeUndefined()
  })
})
