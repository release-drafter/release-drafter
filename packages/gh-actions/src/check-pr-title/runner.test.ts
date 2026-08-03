import * as core from '@actions/core'
import { configSchema } from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import { checkPullRequestTitle, type RunnerDependencies } from './runner.ts'

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
) => {
  const findPullRequestChangedFiles = vi.fn().mockResolvedValue(['src/a.ts'])
  const value: RunnerDependencies = {
    eventName: 'pull_request',
    payload: payload(title),
    getInput: () => ({
      'config-name': 'release-drafter.yml',
      token: 'token',
    }),
    getConfig: vi
      .fn()
      .mockResolvedValue(configSchema.parse({ categories: categoryConfig })),
    getAdapter: () => ({ findPullRequestChangedFiles }),
    repository: {
      owner: 'release-drafter',
      name: 'release-drafter',
      serverUrl: 'https://github.com',
    },
    ...overrides,
  }
  return { value, findPullRequestChangedFiles }
}

describe('check PR title runner', () => {
  it('uses the edited event current title and performs no writes', async () => {
    const { value, findPullRequestChangedFiles } = dependencies(
      'feat: current',
      [{ title: 'Features', when: { conventional: { type: 'feat' } } }],
    )

    await expect(checkPullRequestTitle(value)).resolves.toBeUndefined()
    expect(findPullRequestChangedFiles).not.toHaveBeenCalled()
    expect(core.setOutput).not.toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('rejects invalid and fallback-only titles with a clear error', async () => {
    const { value } = dependencies('old style title', [
      { title: 'Features', when: { conventional: { type: 'feat' } } },
      { title: 'Other' },
    ])
    await expect(checkPullRequestTitle(value)).rejects.toThrow(
      'does not match any configured conventional changelog or version-resolver category',
    )
  })

  it('passes excluded pull requests', async () => {
    const { value, findPullRequestChangedFiles } = dependencies(
      'invalid title',
      [
        { type: 'pre-exclude', when: { label: 'skip' } },
        {
          title: 'Features',
          when: { conventional: { type: 'feat' }, path: 'src/**' },
        },
      ],
      { payload: payload('invalid title', ['skip']) },
    )
    await expect(checkPullRequestTitle(value)).resolves.toBeUndefined()
    expect(findPullRequestChangedFiles).not.toHaveBeenCalled()
    expect(core.info).toHaveBeenCalledWith(
      'Skipping excluded pull request #42.',
    )
  })

  it('fetches changed files only when any category needs them', async () => {
    const pathConfig = [
      {
        title: 'Features',
        when: { conventional: { type: 'feat' }, path: 'src/**' },
      },
    ]
    const withPaths = dependencies('feat: path aware', pathConfig)
    await checkPullRequestTitle(withPaths.value)
    expect(withPaths.findPullRequestChangedFiles).toHaveBeenCalledOnce()
    expect(withPaths.findPullRequestChangedFiles).toHaveBeenCalledWith({
      repository: withPaths.value.repository,
      number: 42,
    })

    const withoutPaths = dependencies('feat: no files', [
      { title: 'Features', when: { conventional: { type: 'feat' } } },
    ])
    await checkPullRequestTitle(withoutPaths.value)
    expect(withoutPaths.findPullRequestChangedFiles).not.toHaveBeenCalled()
  })

  it('does not fetch files for discarded path-only release branches', async () => {
    const { value, findPullRequestChangedFiles } = dependencies(
      'feat: no files needed',
      [
        { title: 'Path only', when: { path: 'docs/**' } },
        { title: 'Features', when: { conventional: { type: 'feat' } } },
      ],
    )

    await expect(checkPullRequestTitle(value)).resolves.toBeUndefined()
    expect(findPullRequestChangedFiles).not.toHaveBeenCalled()
  })

  it('fetches files when pre-categories require path data', async () => {
    const { value, findPullRequestChangedFiles } = dependencies(
      'feat: inspect pre-category paths',
      [
        { type: 'pre-exclude', when: { path: 'docs/**' } },
        { title: 'Features', when: { conventional: { type: 'feat' } } },
      ],
    )

    await expect(checkPullRequestTitle(value)).resolves.toBeUndefined()
    expect(findPullRequestChangedFiles).toHaveBeenCalledOnce()
  })

  it.each([
    'push',
    'workflow_dispatch',
  ])('rejects non-PR event %s', async (eventName) => {
    const { value } = dependencies('feat: title', [], { eventName })
    await expect(checkPullRequestTitle(value)).rejects.toThrow(
      "Expected 'pull_request' or 'pull_request_target'",
    )
  })

  it.each([
    {},
    { number: '42', pull_request: {} },
    { number: 42, pull_request: { title: 'feat: x', labels: [] } },
  ])('rejects malformed PR payload %#', async (malformedPayload) => {
    const { value } = dependencies('feat: title', [], {
      payload: malformedPayload,
    })
    await expect(checkPullRequestTitle(value)).rejects.toThrow()
  })

  it('supports pull_request_target', async () => {
    const { value } = dependencies(
      'fix: target',
      [{ title: 'Fixes', when: { conventional: { type: 'fix' } } }],
      { eventName: 'pull_request_target' },
    )
    await expect(checkPullRequestTitle(value)).resolves.toBeUndefined()
  })
})
