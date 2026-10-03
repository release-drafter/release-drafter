import * as core from '@actions/core'
import { configSchema } from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import { ConfigError } from '../common/config/config-error.ts'
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
    expect(value.getConfig).toHaveBeenCalledWith(
      'release-drafter.yml',
      'token',
      'main',
    )
    expect(value.getConfig).toHaveBeenCalledWith(
      'release-drafter.yml',
      'token',
      'refs/pull/42/head',
    )
    expect(core.setOutput).toHaveBeenCalledWith('labels', '[]')
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('reports a validation failure with the pull request number', async () => {
    const value = dependencies('old style title', [
      { title: 'Features', when: { conventional: { type: 'feat' } } },
    ])
    await expect(checkPullRequest(value)).rejects.toThrow(
      'No configured changelog or version-resolver category matches the title or labels of pull request #42.',
    )
    expect(core.setOutput).toHaveBeenCalledWith('labels', '[]')
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
    expect(core.setOutput).toHaveBeenCalledWith('labels', '["skip"]')
    expect(core.info).toHaveBeenCalledWith(
      'Base configuration: skipping excluded pull request #42.',
    )
  })

  it.each(['push', 'workflow_dispatch'])(
    'rejects non-PR event %s',
    async (eventName) => {
      const value = dependencies('feat: title', [], { eventName })
      await expect(checkPullRequest(value)).rejects.toThrow(
        `Unsupported event \`${eventName}\`. Expected \`pull_request\` or \`pull_request_target\`.`,
      )
    },
  )

  it('outputs unique sorted labels with JSON escaping', async () => {
    await checkPullRequest(
      dependencies(
        'feat: title',
        [
          {
            title: 'Features',
            when: {
              conventional: { type: 'feat' },
              labels: ['api/user', 'comma,quote"'],
            },
          },
        ],
        {
          payload: payload('feat: title', [
            'z',
            'api/user',
            'z',
            'comma,quote"',
          ]),
        },
      ),
    )
    expect(core.setOutput).toHaveBeenCalledWith(
      'labels',
      JSON.stringify(['api/user', 'comma,quote"']),
    )
  })

  it('supports pull_request_target', async () => {
    const value = dependencies(
      'fix: target',
      [{ title: 'Fixes', when: { conventional: { type: 'fix' } } }],
      { eventName: 'pull_request_target' },
    )
    await expect(checkPullRequest(value)).resolves.toBeUndefined()
  })
  it.each(['main', 'refs/pull/42/head'])(
    'reports an invalid config at %s and still checks the other snapshot',
    async (invalidRef) => {
      vi.stubEnv('GITHUB_REPOSITORY', 'acme/widgets')
      const value = dependencies('feat: title', [
        { title: 'Features', when: { conventional: { type: 'feat' } } },
      ])
      const validConfig = await value.getConfig('release-drafter.yml')
      value.getConfig = vi.fn(async (_name, _token, ref) => {
        if (ref === invalidRef)
          throw new ConfigError(
            'Invalid config: categories must be an array',
            [
              {
                scheme: 'github',
                filepath: '.github/release-drafter.yml',
                repo: { owner: 'acme', repo: 'widgets' },
                ref,
              },
            ],
            { line: 3, col: 1 },
          )
        return validConfig
      })
      await expect(checkPullRequest(value)).rejects.toThrow(invalidRef)
      expect(value.getConfig).toHaveBeenCalledTimes(2)
      const annotation = vi.mocked(core.error).mock.calls[0][1]
      if (invalidRef === 'main') {
        expect(annotation?.file).toBeUndefined()
      } else {
        expect(annotation).toMatchObject({
          file: '.github/release-drafter.yml',
          startLine: 3,
        })
      }
      expect(core.setOutput).not.toHaveBeenCalled()
    },
  )

  it('cannot loosen base rules by editing the proposed configuration', async () => {
    const value = dependencies('fix: title', [])
    value.getConfig = vi.fn(async (_name, _token, ref) =>
      configSchema.parse({
        categories: [
          {
            title: 'Changes',
            when: {
              conventional: {
                type: ref === 'main' ? 'feat' : 'fix',
              },
            },
          },
        ],
      }),
    )
    await expect(checkPullRequest(value)).rejects.toThrow(
      'Base configuration (main)',
    )
    expect(core.error).toHaveBeenCalledTimes(1)
    expect(core.info).toHaveBeenCalledWith('PR title: "fix: title"')
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('"types":["feat"]'),
    )
  })

  it('rejects proposed rules that stop the PR matching', async () => {
    const value = dependencies('feat: title', [])
    value.getConfig = vi.fn(async (_name, _token, ref) =>
      configSchema.parse({
        categories: [
          {
            title: 'Changes',
            when: {
              conventional: {
                type: ref === 'main' ? 'feat' : 'fix',
              },
            },
          },
        ],
      }),
    )
    await expect(checkPullRequest(value)).rejects.toThrow(
      'Proposed configuration (refs/pull/42/head)',
    )
    expect(core.error).toHaveBeenCalledTimes(1)
    expect(core.setOutput).toHaveBeenCalledWith('labels', '[]')
  })

  it('validates proposed config even when the base config excludes the PR', async () => {
    const value = dependencies('title', [])
    value.getConfig = vi.fn(async (_name, _token, ref) =>
      configSchema.parse({
        categories:
          ref === 'main'
            ? [{ type: 'pre-exclude', when: { label: 'skip' } }]
            : [{ type: 'changelog', when: { label: 'skip' } }],
      }),
    )
    value.payload = payload('title', ['skip'])
    await expect(checkPullRequest(value)).rejects.toThrow('non-empty')
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('Proposed configuration'),
      expect.any(Object),
    )
  })

  it('retains base labels when proposed conditions select different labels', async () => {
    const value = dependencies('feat: title', [])
    value.payload = payload('feat: title', ['base', 'proposed'])
    value.getConfig = vi.fn(async (_name, _token, ref) =>
      configSchema.parse({
        categories: [
          {
            title: 'Changes',
            when: { label: ref === 'main' ? 'base' : 'proposed' },
          },
        ],
      }),
    )
    await checkPullRequest(value)
    expect(core.setOutput).toHaveBeenCalledWith('labels', '["base"]')
  })
  it('explains which part of a combined title and label condition failed', async () => {
    const value = dependencies('feat: title', [
      {
        title: 'Features',
        when: { conventional: { type: 'feat' }, label: 'approved' },
      },
    ])
    await expect(checkPullRequest(value)).rejects.toThrow('No configured')
    expect(core.info).toHaveBeenCalledWith(
      'Condition 1: title matches, labels do not match. Path predicates are ignored.',
    )
  })
})
