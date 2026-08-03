import type { DraftReleaseResult } from '@release-drafter/core'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type {
  CliAdapter,
  CliDependencies,
  DraftFunction,
  WritableStream,
} from './index.ts'

const BASE_CONFIG = 'template: "$CHANGES"\n'

const payload = {
  name: 'Release 2.0.0',
  tag: 'v2.0.0',
  body: 'Changes',
  targetCommitish: 'main',
  prerelease: false,
  makeLatest: true,
  draft: true,
  resolvedVersion: '2.0.0',
  majorVersion: '2',
  minorVersion: '0',
  patchVersion: '0',
}

const createResult = (): DraftReleaseResult => ({
  plan: { action: 'create', releasePayload: payload },
  release: {
    id: 42,
    tagName: payload.tag,
    name: payload.name,
    url: 'https://github.example/acme/widgets/releases/tag/v2.0.0',
    uploadUrl: 'https://uploads.github.example/releases/42/assets',
  },
  releasePayload: payload,
})

const capture = () => {
  const chunks: string[] = []
  const stream: WritableStream = {
    write(chunk) {
      chunks.push(chunk)
    },
  }
  return { chunks, stream, text: () => chunks.join('') }
}

const createAdapter = (options?: {
  defaultBranch?: string
  getConfig?: (request: {
    repository: { owner: string; name: string; serverUrl: string }
    path: string
    ref?: string
  }) => Promise<string>
}) => {
  const get = vi.fn(async () => ({
    data: { default_branch: options?.defaultBranch ?? 'main' },
  }))
  const getRepositoryConfig = vi.fn(
    options?.getConfig ?? (async () => BASE_CONFIG),
  )
  const adapter = {
    capabilities: { draftReleases: true },
    octokit: { rest: { repos: { get } } },
    getRepositoryConfig,
    listReleases: vi.fn(),
    findChanges: vi.fn(),
    resolveCommitish: vi.fn(),
    createRelease: vi.fn(),
    updateRelease: vi.fn(),
  } as unknown as CliAdapter
  return { adapter, get, getRepositoryConfig }
}

let runCli: typeof import('./index.ts').runCli

beforeAll(async () => {
  ;({ runCli } = await import('./index.ts'))
})

const invoke = async (
  argv: readonly string[],
  overrides: Partial<CliDependencies> & {
    adapter?: CliAdapter
    draftResult?: DraftReleaseResult
  } = {},
) => {
  const stdout = capture()
  const stderr = capture()
  const adapterState = overrides.adapter
    ? { adapter: overrides.adapter }
    : createAdapter()
  const adapterFactory = vi.fn(() => adapterState.adapter)
  const draft = vi.fn<DraftFunction>(async () => createResult())
  if (overrides.draftResult) draft.mockResolvedValue(overrides.draftResult)
  const execFile = vi.fn(async () => ({ stdout: 'gh-token\n', stderr: '' }))

  const code = await runCli(argv, {
    stdout: stdout.stream,
    stderr: stderr.stream,
    env: { GITHUB_TOKEN: 'github-token' },
    cwd: '/workspace',
    readFile: vi.fn(async () => BASE_CONFIG),
    execFile,
    adapterFactory,
    draft,
    ...overrides,
  })

  return {
    code,
    stdout,
    stderr,
    adapter: adapterState.adapter,
    adapterFactory,
    draft,
    execFile,
  }
}

describe('module boundary', () => {
  it('has no observable import side effects', async () => {
    vi.resetModules()
    const stdout = vi.spyOn(process.stdout, 'write')
    const stderr = vi.spyOn(process.stderr, 'write')

    await import('./index.ts')

    expect(stdout).not.toHaveBeenCalled()
    expect(stderr).not.toHaveBeenCalled()
    stdout.mockRestore()
    stderr.mockRestore()
  })
})

describe('usage and informational commands', () => {
  it.each([
    { argv: ['--help'], expected: 'Usage: release-drafter' },
    { argv: ['--version'], expected: 'test-version' },
  ])('$argv returns zero without resolving a token or creating an adapter', async ({
    argv,
    expected,
  }) => {
    const adapterFactory = vi.fn()
    const execFile = vi.fn()
    const readFile = vi.fn()
    const draft = vi.fn()
    const stdout = capture()
    const stderr = capture()

    const code = await runCli(argv, 'test-version', {
      stdout: stdout.stream,
      stderr: stderr.stream,
      env: {},
      execFile,
      adapterFactory,
      readFile,
      draft,
    })

    expect(code).toBe(0)
    expect(stdout.text()).toContain(expected)
    expect(stderr.text()).toBe('')
    expect(execFile).not.toHaveBeenCalled()
    expect(adapterFactory).not.toHaveBeenCalled()
    expect(readFile).not.toHaveBeenCalled()
    expect(draft).not.toHaveBeenCalled()
  })

  it.each([
    { name: 'missing repository', argv: [] },
    { name: 'owner only', argv: ['acme'] },
    { name: 'extra repository segment', argv: ['acme/widgets/extra'] },
    { name: 'blank owner', argv: ['/widgets'] },
    { name: 'blank repo', argv: ['acme/'] },
    { name: 'unknown option', argv: ['acme/widgets', '--wat'] },
    {
      name: 'invalid publish boolean',
      argv: ['acme/widgets', '--publish=maybe'],
    },
    {
      name: 'invalid prerelease boolean',
      argv: ['acme/widgets', '--prerelease=1'],
    },
    {
      name: 'invalid latest boolean',
      argv: ['acme/widgets', '--latest=yes'],
    },
  ])('returns usage code 2 for $name', async ({ argv }) => {
    const result = await invoke(argv)

    expect(result.code).toBe(2)
    expect(result.stdout.text()).toBe('')
    expect(result.stderr.text()).toContain('error:')
    expect(result.stderr.text()).toContain('Usage: release-drafter')
    expect(result.adapterFactory).not.toHaveBeenCalled()
    expect(result.execFile).not.toHaveBeenCalled()
  })
})

describe('option mapping', () => {
  it('maps short aliases and all release/config options to public inputs', async () => {
    const state = createAdapter()
    const result = await invoke(
      [
        'acme/widgets',
        '-f',
        'v1.0.0',
        '-t',
        'release/2.x',
        '-c',
        'release.yml',
        '-n',
        'Two',
        '--tag',
        'v2',
        '-r',
        '2.0.0',
        '--dry-run',
        '--publish',
        'true',
        '--prerelease',
        'true',
        '--latest',
        'false',
      ],
      { adapter: state.adapter },
    )

    expect(result.code).toBe(0)
    expect(result.draft).toHaveBeenCalledOnce()
    expect(state.getRepositoryConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '.github/release.yml',
        ref: 'release/2.x',
      }),
    )
    expect(result.draft).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: {
          owner: 'acme',
          name: 'widgets',
          serverUrl: 'https://github.com',
        },
        config: expect.objectContaining({
          commitish: 'release/2.x',
          prerelease: true,
          latest: false,
        }),
        input: {
          from: 'v1.0.0',
          name: 'Two',
          tag: 'v2',
          version: '2.0.0',
          dryRun: true,
          publish: true,
        },
      }),
    )
  })

  it.each([
    ['publish', true],
    ['publish', false],
    ['prerelease', true],
    ['prerelease', false],
    ['latest', true],
    ['latest', false],
  ] as const)('maps --%s=%s exactly', async (option, value) => {
    const result = await invoke([
      'acme/widgets',
      '--to',
      'main',
      `--${option}=${String(value)}`,
    ])

    expect(result.code).toBe(0)
    const call = result.draft.mock.calls[0][0]
    if (option === 'publish') expect(call.input.publish).toBe(value)
    else expect(call.config[option]).toBe(value)
  })
})

describe('forge and endpoint selection', () => {
  it.each([
    {
      name: 'GitHub defaults',
      argv: ['acme/widgets', '--to', 'main'],
      expected: {
        serverUrl: 'https://github.com',
        apiUrl: undefined,
        graphqlUrl: undefined,
      },
    },
    {
      name: 'explicit GitHub',
      argv: ['acme/widgets', '--to', 'main', '--forge', 'github'],
      expected: { serverUrl: 'https://github.com' },
    },
    {
      name: 'recognizable GHES API',
      argv: [
        'acme/widgets',
        '--to',
        'main',
        '--server-url',
        'https://github.corp',
        '--api-url',
        'https://github.corp/api/v3',
      ],
      expected: {
        serverUrl: 'https://github.corp',
        apiUrl: 'https://github.corp/api/v3',
      },
    },
    {
      name: 'explicit endpoint forwarding',
      argv: [
        'acme/widgets',
        '--to',
        'main',
        '--forge',
        'github',
        '--server-url',
        'https://git.example/',
        '--api-url',
        'https://git.example/custom/rest/',
        '--graphql-url',
        'https://git.example/custom/graphql/',
      ],
      expected: {
        serverUrl: 'https://git.example',
        apiUrl: 'https://git.example/custom/rest',
        graphqlUrl: 'https://git.example/custom/graphql',
      },
    },
  ])('supports $name', async ({ argv, expected }) => {
    const result = await invoke(argv)

    expect(result.code).toBe(0)
    expect(result.adapterFactory).toHaveBeenCalledWith(
      expect.objectContaining(expected),
    )
  })

  it('rejects an arbitrary /api/v1 endpoint as ambiguous without inferring a forge', async () => {
    const result = await invoke([
      'acme/widgets',
      '--api-url',
      'https://git.example/api/v1',
    ])

    expect(result.code).toBe(2)
    expect(result.stderr.text()).toContain('ambiguous')
    expect(result.stderr.text()).toContain('--forge')
    expect(result.stderr.text()).not.toMatch(/Gitea|Forgejo/i)
    expect(result.adapterFactory).not.toHaveBeenCalled()
  })

  it.each([
    'gitea',
    'forgejo',
    'unknown',
  ])('rejects unsupported forge %s clearly', async (forge) => {
    const result = await invoke(['acme/widgets', '--forge', forge])

    expect(result.code).toBe(2)
    expect(result.stderr.text()).toContain(`Forge '${forge}' is not supported`)
    expect(result.adapterFactory).not.toHaveBeenCalled()
  })
})

describe('authentication and default branch resolution', () => {
  it('prefers GITHUB_TOKEN over GH_TOKEN and gh', async () => {
    const result = await invoke(['acme/widgets', '--to', 'main'], {
      env: { GITHUB_TOKEN: 'github-first', GH_TOKEN: 'gh-second' },
    })

    expect(result.adapterFactory).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'github-first' }),
    )
    expect(result.execFile).not.toHaveBeenCalled()
  })

  it('uses GH_TOKEN when GITHUB_TOKEN is blank', async () => {
    const result = await invoke(['acme/widgets', '--to', 'main'], {
      env: { GITHUB_TOKEN: '  ', GH_TOKEN: 'gh-token' },
    })

    expect(result.adapterFactory).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'gh-token' }),
    )
    expect(result.execFile).not.toHaveBeenCalled()
  })

  it('falls back to gh auth token for github.com', async () => {
    const execFile = vi.fn(async () => ({ stdout: 'cli-token\n', stderr: '' }))
    const result = await invoke(['acme/widgets', '--to', 'main'], {
      env: {},
      execFile,
    })

    expect(execFile).toHaveBeenCalledWith(
      'gh',
      ['auth', 'token'],
      expect.objectContaining({ encoding: 'utf8', env: {} }),
    )
    expect(result.adapterFactory).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'cli-token' }),
    )
  })

  it('passes the GHES hostname to gh auth token', async () => {
    const execFile = vi.fn(async () => ({ stdout: 'cli-token\n', stderr: '' }))
    await invoke(
      ['acme/widgets', '--to', 'main', '--server-url', 'https://github.corp'],
      { env: {}, execFile },
    )

    expect(execFile).toHaveBeenCalledWith(
      'gh',
      ['auth', 'token', '--hostname', 'github.corp'],
      expect.objectContaining({ encoding: 'utf8', env: {} }),
    )
  })

  it('looks up the default branch only when --to is absent', async () => {
    const withoutTo = createAdapter({ defaultBranch: 'trunk' })
    const defaulted = await invoke(['acme/widgets'], {
      adapter: withoutTo.adapter,
    })
    const withTo = createAdapter({ defaultBranch: 'should-not-be-read' })
    const explicit = await invoke(['acme/widgets', '--to', 'release'], {
      adapter: withTo.adapter,
    })

    expect(defaulted.code).toBe(0)
    expect(withoutTo.get).toHaveBeenCalledOnce()
    expect(defaulted.draft.mock.calls[0][0].config.commitish).toBe('trunk')
    expect(explicit.code).toBe(0)
    expect(withTo.get).not.toHaveBeenCalled()
    expect(explicit.draft.mock.calls[0][0].config.commitish).toBe('release')
  })
})

describe('config loading', () => {
  it.each([
    {
      name: 'repository YAML',
      target: '.github/release-drafter.yml',
      content: 'template: YAML\n',
    },
    {
      name: 'repository JSON',
      target: '.github/release-drafter.json',
      content: '{"template":"JSON"}',
    },
  ])('loads $name targets', async ({ target, content }) => {
    const state = createAdapter({ getConfig: async () => content })
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--config', target],
      { adapter: state.adapter },
    )

    expect(result.code).toBe(0)
    expect(state.getRepositoryConfig).toHaveBeenCalledWith({
      repository: {
        owner: 'acme',
        name: 'widgets',
        serverUrl: 'https://github.com',
      },
      path: target,
      ref: 'main',
    })
    expect(result.draft.mock.calls[0][0].config.template).toBe(
      target.endsWith('.json') ? 'JSON' : 'YAML',
    )
  })

  it('loads file: targets relative to the injected cwd', async () => {
    const readFile = vi.fn(async () => '{"template":"local"}')
    const state = createAdapter()
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--config', 'file:configs/release.json'],
      { adapter: state.adapter, cwd: '/checkout', readFile },
    )

    expect(result.code).toBe(0)
    expect(readFile).toHaveBeenCalledWith(
      '/checkout/configs/release.json',
      'utf8',
    )
    expect(state.getRepositoryConfig).not.toHaveBeenCalled()
    expect(result.draft.mock.calls[0][0].config.template).toBe('local')
  })

  it('accepts github.com blob config URLs', async () => {
    const state = createAdapter({ getConfig: async () => BASE_CONFIG })
    const result = await invoke(
      [
        'acme/widgets',
        '--to',
        'main',
        '--config',
        'https://github.com/shared/configs/blob/v3/.github/release-drafter.yml',
      ],
      { adapter: state.adapter },
    )

    expect(result.code).toBe(0)
    expect(state.getRepositoryConfig).toHaveBeenCalledWith({
      repository: {
        owner: 'shared',
        name: 'configs',
        serverUrl: 'https://github.com',
      },
      path: '.github/release-drafter.yml',
      ref: 'v3',
    })
  })

  it('falls back to the organization .github repository when the target repo config is missing', async () => {
    const state = createAdapter({
      getConfig: async ({ repository }) => {
        if (repository.name === 'widgets')
          throw new Error('Config file not found')
        return BASE_CONFIG
      },
    })
    const result = await invoke(['acme/widgets', '--to', 'main'], {
      adapter: state.adapter,
    })

    expect(result.code).toBe(0)
    expect(state.getRepositoryConfig).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        repository: {
          owner: 'acme',
          name: '.github',
          serverUrl: 'https://github.com',
        },
        ref: undefined,
      }),
    )
  })

  it.each([
    {
      strategy: 'override',
      leaf: ['leaf'],
      expected: ['leaf'],
    },
    {
      strategy: 'append',
      leaf: ['leaf'],
      expected: ['base', 'leaf'],
    },
    {
      strategy: 'prepend',
      leaf: ['leaf'],
      expected: ['leaf', 'base'],
    },
  ])('applies _extends $strategy list merging', async ({
    strategy,
    leaf,
    expected,
  }) => {
    const files = new Map([
      [
        'leaf.yml',
        `template: leaf\nexclude-contributors: ${JSON.stringify(leaf)}\n_extends:\n  from: base.yml\n  strategy:\n    exclude-contributors: ${strategy}\n`,
      ],
      ['base.yml', 'template: base\nexclude-contributors: [base]\n'],
    ])
    const state = createAdapter({
      getConfig: async ({ path }) =>
        files.get(path.split('/').at(-1) ?? path) ?? BASE_CONFIG,
    })
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--config', 'leaf.yml'],
      { adapter: state.adapter },
    )

    expect(result.code).toBe(0)
    expect(
      result.draft.mock.calls[0][0].config['exclude-contributors'],
    ).toEqual(expected)
  })

  it('stops a recursive _extends chain deterministically', async () => {
    const state = createAdapter({
      getConfig: async ({ path }) =>
        path.endsWith('/a.yml')
          ? 'template: a\n_extends: b.yml\n'
          : 'template: b\n_extends: a.yml\n',
    })
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--config', 'a.yml'],
      { adapter: state.adapter },
    )

    expect(result.code).toBe(0)
    expect(state.getRepositoryConfig).toHaveBeenCalledTimes(2)
    expect(result.stderr.text()).toMatch(/recursion/i)
  })

  it.each([
    {
      name: 'invalid extension',
      target: 'release-drafter.toml',
      content: 'template = "bad"',
    },
    {
      name: 'invalid schema',
      target: 'release-drafter.yml',
      content: 'pull-request-limit: 0\n',
    },
  ])('rejects $name', async ({ target, content }) => {
    const state = createAdapter({ getConfig: async () => content })
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--config', target, '--json'],
      { adapter: state.adapter },
    )

    expect(result.code).toBe(1)
    expect(result.stdout.text()).toBe('')
    expect(result.stderr.text()).toContain('error:')
    expect(result.draft).not.toHaveBeenCalled()
  })

  it('prohibits a github config from extending a local file target', async () => {
    const state = createAdapter({
      getConfig: async () => 'template: leaf\n_extends: file:base.yml\n',
    })
    const readFile = vi.fn(async () => BASE_CONFIG)
    const result = await invoke(
      ['acme/widgets', '--to', 'main', '--config', 'leaf.yml'],
      { adapter: state.adapter, readFile },
    )

    expect(result.code).toBe(1)
    expect(result.stderr.text()).toMatch(/github.*file|local/i)
    expect(readFile).not.toHaveBeenCalled()
    expect(result.draft).not.toHaveBeenCalled()
  })
})

describe('output and release result mapping', () => {
  it('writes exactly one parseable JSON document to stdout and diagnostics only to stderr', async () => {
    const result = await invoke(['acme/widgets', '--to', 'main', '--json'])

    expect(result.code).toBe(0)
    expect(result.stdout.chunks).toHaveLength(1)
    expect(result.stdout.text().trim().split('\n')).toHaveLength(1)
    expect(() => JSON.parse(result.stdout.text())).not.toThrow()
    expect(result.stderr.text()).not.toContain('{"action"')
  })

  it('keeps stdout empty for JSON failures', async () => {
    const result = await invoke(['acme/widgets', '--to', 'main', '--json'], {
      draft: vi.fn(async () => {
        throw new Error('draft failed')
      }),
    })

    expect(result.code).toBe(1)
    expect(result.stdout.text()).toBe('')
    expect(result.stderr.text()).toContain('error: draft failed\n')
  })

  it('keeps non-JSON success output concise and on stderr', async () => {
    const result = await invoke(['acme/widgets', '--to', 'main'])

    expect(result.code).toBe(0)
    expect(result.stdout.text()).toBe('')
    const lines = result.stderr.text().trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(lines.at(-1)).toBe(
      'create: v2.0.0 (https://github.example/acme/widgets/releases/tag/v2.0.0)',
    )
  })

  it.each([
    {
      action: 'create' as const,
      result: createResult(),
      expected: {
        tagName: 'v2.0.0',
        name: 'Release 2.0.0',
        id: '42',
        url: 'https://github.example/acme/widgets/releases/tag/v2.0.0',
        uploadUrl: 'https://uploads.github.example/releases/42/assets',
      },
    },
    {
      action: 'update' as const,
      result: {
        ...createResult(),
        plan: {
          action: 'update' as const,
          draftRelease: {
            id: 7,
            tagName: 'v1-draft',
            name: 'Old draft',
            url: 'https://github.example/releases/7',
            uploadUrl: 'https://uploads.github.example/releases/7/assets',
          },
          releasePayload: payload,
        },
      },
      expected: {
        tagName: 'v2.0.0',
        name: 'Release 2.0.0',
        id: '42',
        url: 'https://github.example/acme/widgets/releases/tag/v2.0.0',
        uploadUrl: 'https://uploads.github.example/releases/42/assets',
      },
    },
    {
      action: 'dry-run' as const,
      result: {
        plan: { action: 'dry-run' as const, releasePayload: payload },
        releasePayload: payload,
      },
      expected: undefined,
    },
  ])('maps $action results and snake_case payload fields', async ({
    action,
    result: draftResult,
    expected,
  }) => {
    const result = await invoke(['acme/widgets', '--to', 'main', '--json'], {
      draftResult,
    })

    expect(result.code).toBe(0)
    const document = JSON.parse(result.stdout.text())
    expect(document).toMatchObject({
      action,
      tag_name: expected?.tagName ?? 'v2.0.0',
      name: expected?.name ?? 'Release 2.0.0',
      resolved_version: '2.0.0',
      major_version: '2',
      minor_version: '0',
      patch_version: '0',
      body: 'Changes',
    })
    if (expected) {
      expect(document).toEqual(
        expect.objectContaining({
          id: expected.id,
          html_url: expected.url,
          upload_url: expected.uploadUrl,
        }),
      )
    } else {
      expect(document).not.toHaveProperty('id')
      expect(document).not.toHaveProperty('html_url')
      expect(document).not.toHaveProperty('upload_url')
    }
  })
})
