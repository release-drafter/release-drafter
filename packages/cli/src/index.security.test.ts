import type { DraftReleaseResult } from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import type {
  CliAdapter,
  CliDependencies,
  DraftFunction,
  WritableStream,
} from './index.ts'
import { runCli } from './index.ts'

const CONFIG = 'template: "$CHANGES"\n'

const capture = () => {
  const chunks: string[] = []
  const stream: WritableStream = {
    write(chunk) {
      chunks.push(chunk)
    },
  }
  return { stream, text: () => chunks.join('') }
}

const releaseResult = (
  action: DraftReleaseResult['plan']['action'] = 'create',
) =>
  ({
    plan: { action, releasePayload: undefined },
    releasePayload: {
      name: 'Release 1.0.0',
      tag: 'v1.0.0',
      body: 'Changes',
      targetCommitish: 'main',
      prerelease: false,
      makeLatest: true,
      draft: true,
    },
  }) as unknown as DraftReleaseResult

const createAdapter = (): CliAdapter =>
  ({
    capabilities: { draftReleases: true },
    octokit: {
      rest: {
        repos: {
          get: vi.fn(async () => ({ data: { default_branch: 'main' } })),
        },
      },
    },
    getRepositoryConfig: vi.fn(async () => CONFIG),
    listReleases: vi.fn(),
    findChanges: vi.fn(),
    resolveCommitish: vi.fn(),
    createRelease: vi.fn(),
    updateRelease: vi.fn(),
  }) as unknown as CliAdapter

const invoke = async (
  argv: readonly string[],
  overrides: CliDependencies = {},
) => {
  const stdout = capture()
  const stderr = capture()
  const adapter = createAdapter()
  const adapterFactory = vi.fn(() => adapter)
  const draft = vi.fn<DraftFunction>(async () => releaseResult())
  const execFile = vi.fn(async () => ({ stdout: 'gh-token\n', stderr: '' }))
  const code = await runCli(argv, {
    stdout: stdout.stream,
    stderr: stderr.stream,
    env: { GITHUB_TOKEN: 'token' },
    cwd: '/workspace',
    readFile: vi.fn(async () => CONFIG),
    execFile,
    adapterFactory,
    draft,
    ...overrides,
  })
  return { code, stdout, stderr, adapterFactory, draft, execFile }
}

describe('CLI runtime security', () => {
  it.each([
    [
      '--server-url',
      'https://user:hunter2-secret@github.example',
      'hunter2-secret',
    ],
    [
      '--api-url',
      'https://github.example/api/v3?token=q-value-secret',
      'q-value-secret',
    ],
    [
      '--graphql-url',
      'https://github.example/api/graphql#f-value-secret',
      'f-value-secret',
    ],
  ])('rejects and redacts unsafe %s values', async (option, endpoint, secret) => {
    const result = await invoke(['acme/widgets', option, endpoint])

    expect(result.code).toBe(2)
    expect(result.stderr.text()).toContain(
      `${option} must be an absolute HTTP(S) URL without credentials, a query, or a fragment.`,
    )
    expect(result.stderr.text()).not.toContain(secret)
    expect(result.adapterFactory).not.toHaveBeenCalled()
  })

  it('passes the injected environment and bounded options exactly to gh', async () => {
    const env = { PATH: '/test/bin', GH_CONFIG_DIR: '/safe/config' }
    const execFile = vi.fn(async () => ({ stdout: 'cli-token\n', stderr: '' }))

    const result = await invoke(['acme/widgets', '--to', 'main'], {
      env,
      execFile,
    })

    expect(result.code).toBe(0)
    expect(execFile).toHaveBeenCalledOnce()
    expect(execFile).toHaveBeenCalledWith('gh', ['auth', 'token'], {
      encoding: 'utf8',
      env,
      timeout: 10_000,
      maxBuffer: 16 * 1024,
      windowsHide: true,
    })
  })

  it('routes canonicalization through the injected realpath boundary', async () => {
    const readFile = vi.fn(async () => '{"template":"local"}')
    const realpath = vi.fn(async (path: string) =>
      path === '/workspace'
        ? '/canonical/workspace'
        : '/canonical/workspace/configs/release.json',
    )

    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--config', 'file:configs/release.json'],
      { readFile, realpath },
    )

    expect(result.code).toBe(0)
    expect(realpath).toHaveBeenCalledWith('/workspace')
    expect(realpath).toHaveBeenCalledWith('/workspace/configs/release.json')
    expect(readFile).toHaveBeenCalledWith(
      '/canonical/workspace/configs/release.json',
      'utf8',
    )
  })

  it('uses only enterprise token variables for GHES', async () => {
    const execFile = vi.fn(async () => ({ stdout: 'cli-token\n', stderr: '' }))
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--server-url', 'https://github.corp'],
      {
        env: {
          GITHUB_TOKEN: 'github-dot-com-only',
          GH_TOKEN: 'github-dot-com-secondary',
          GH_ENTERPRISE_TOKEN: 'enterprise-token',
          GITHUB_ENTERPRISE_TOKEN: 'enterprise-secondary',
        },
        execFile,
      },
    )

    expect(result.code).toBe(0)
    expect(result.adapterFactory).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'enterprise-token' }),
    )
    expect(execFile).not.toHaveBeenCalled()
  })

  it('does not reuse github.com tokens for GHES gh fallback', async () => {
    const env = { GITHUB_TOKEN: 'github-dot-com-only' }
    const execFile = vi.fn(async () => ({
      stdout: 'enterprise-cli\n',
      stderr: '',
    }))

    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--server-url', 'https://github.corp'],
      { env, execFile },
    )

    expect(result.code).toBe(0)
    expect(execFile).toHaveBeenCalledWith(
      'gh',
      ['auth', 'token', '--hostname', 'github.corp'],
      expect.objectContaining({ env }),
    )
    expect(result.adapterFactory).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'enterprise-cli' }),
    )
  })

  it.each([
    ['--api-url', 'https://other.example/api/v3'],
    ['--graphql-url', 'https://other.example/api/graphql'],
    ['--graphql-url', 'https://api.github.com/custom-graphql'],
  ])('fails closed for ambiguous %s endpoints', async (option, endpoint) => {
    const result = await invoke(['acme/widgets', option, endpoint])

    expect(result.code).toBe(2)
    expect(result.stderr.text()).toContain(
      'The custom endpoints are ambiguous. Pass --forge explicitly.',
    )
    expect(result.stderr.text()).not.toContain(endpoint)
  })

  it('accepts conventional same-host GHES API and GraphQL endpoints', async () => {
    const result = await invoke(
      [
        'acme/widgets',
        '--to',
        'main',
        '--server-url',
        'https://github.corp',
        '--api-url',
        'https://github.corp/api/v3',
        '--graphql-url',
        'https://github.corp/api/graphql',
      ],
      { env: { GH_ENTERPRISE_TOKEN: 'token' } },
    )

    expect(result.code).toBe(0)
  })

  it('rejects a GHES endpoint with a mismatched protocol', async () => {
    const result = await invoke([
      'acme/widgets',
      '--server-url',
      'https://github.corp',
      '--api-url',
      'http://github.corp/api/v3',
    ])

    expect(result.code).toBe(2)
    expect(result.stderr.text()).toContain(
      'The custom endpoints are ambiguous. Pass --forge explicitly.',
    )
  })

  it('accepts conventional GHES endpoints using the server port', async () => {
    const result = await invoke(
      [
        'acme/widgets',
        '--to',
        'main',
        '--server-url',
        'https://github.corp:8443',
        '--api-url',
        'https://github.corp:8443/api/v3',
        '--graphql-url',
        'https://github.corp:8443/api/graphql',
      ],
      { env: { GH_ENTERPRISE_TOKEN: 'token' } },
    )

    expect(result.code).toBe(0)
  })

  it('uses a stable host-aware diagnostic when GHES token lookup fails', async () => {
    const execFile = vi.fn(async () => {
      throw new Error('subprocess-secret')
    })
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--server-url', 'https://github.corp'],
      { env: {}, execFile },
    )

    expect(result.code).toBe(1)
    expect(result.stderr.text()).toContain('GH_ENTERPRISE_TOKEN')
    expect(result.stderr.text()).toContain('GITHUB_ENTERPRISE_TOKEN')
    expect(result.stderr.text()).toContain('`gh auth token --hostname`')
    expect(result.stderr.text()).not.toContain('subprocess-secret')
    expect(result.stderr.text()).not.toContain('GITHUB_TOKEN, GH_TOKEN')
  })

  it('reports a core-forced dry run in JSON output', async () => {
    const draft = vi.fn<DraftFunction>(async () => releaseResult('dry-run'))
    const result = await invoke(['acme/widgets', '--to', 'main', '--json'], {
      draft,
    })

    expect(result.code).toBe(0)
    expect(JSON.parse(result.stdout.text())).toMatchObject({
      action: 'dry-run',
      dry_run: true,
    })
  })
})
