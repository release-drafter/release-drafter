import type { DraftReleaseResult } from '@release-drafter/core'
import { describe, expect, it, vi } from 'vitest'
import type {
  CliAdapter,
  CliDependencies,
  DraftFunction,
  WritableStream,
} from './index.ts'
import { runCli } from './index.ts'
import type { LocalConfigFileReader } from './local-config-file.js'

const CONFIG = 'template: "$CHANGES"\n'

const localConfigReader = (contents = CONFIG): LocalConfigFileReader =>
  vi.fn(async (path, cwd) => ({
    contents,
    canonicalCwd: cwd,
    canonicalPath: path,
  }))

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
  const code = await runCli(argv, {
    stdout: stdout.stream,
    stderr: stderr.stream,
    env: { GITHUB_TOKEN: 'token' },
    cwd: '/workspace',
    readLocalFile: localConfigReader(),
    adapterFactory,
    draft,
    ...overrides,
  })
  return { code, stdout, stderr, adapterFactory, draft }
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

  it('routes local configs through the injected atomic reader boundary', async () => {
    const readLocalFile = vi.fn(async () => ({
      contents: '{"template":"local"}',
      canonicalCwd: '/canonical/workspace',
      canonicalPath: '/canonical/workspace/configs/release.json',
    }))

    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--config', 'file:configs/release.json'],
      { readLocalFile },
    )

    expect(result.code).toBe(0)
    expect(readLocalFile).toHaveBeenCalledWith(
      '/workspace/configs/release.json',
      '/workspace',
    )
  })

  it('uses only enterprise token variables for GHES', async () => {
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--server-url', 'https://github.corp'],
      {
        env: {
          GITHUB_TOKEN: 'github-dot-com-only',
          GH_TOKEN: 'github-dot-com-secondary',
          GH_ENTERPRISE_TOKEN: 'enterprise-token',
          GITHUB_ENTERPRISE_TOKEN: 'enterprise-secondary',
        },
      },
    )

    expect(result.code).toBe(0)
    expect(result.adapterFactory).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'enterprise-token' }),
    )
  })

  it('does not reuse github.com tokens for GHES', async () => {
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--server-url', 'https://github.corp'],
      { env: { GITHUB_TOKEN: 'github-dot-com-only' } },
    )

    expect(result.code).toBe(2)
    expect(result.adapterFactory).not.toHaveBeenCalled()
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

  it('uses a stable host-aware usage error when a GHES token is missing', async () => {
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--server-url', 'https://github.corp'],
      { env: {} },
    )

    expect(result.code).toBe(2)
    expect(result.stderr.text()).toContain('GH_ENTERPRISE_TOKEN')
    expect(result.stderr.text()).toContain('GITHUB_ENTERPRISE_TOKEN')
    expect(result.stderr.text()).toContain('pass --token')
    expect(result.stderr.text()).not.toContain('GITHUB_TOKEN, GH_TOKEN')
    expect(result.stderr.text()).toContain('Usage: release-drafter')
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
