import { describe, expect, it, vi } from 'vitest'
import { type LoadConfigOptions, loadConfig } from './load-config.ts'

const repository = {
  owner: 'acme',
  name: 'widgets',
  serverUrl: 'https://github.com',
}
const options = (
  overrides: Partial<LoadConfigOptions> = {},
): LoadConfigOptions => ({
  target: 'release-drafter.yml',
  repository,
  ref: 'main',
  cwd: '/checkout',
  reader: { getRepositoryConfig: vi.fn(async () => 'template: safe\n') },
  logger: { debug: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() },
  ...overrides,
})

describe('configuration target validation', () => {
  it.each([
    [' ', 'The target is blank'],
    ['config file.yml', 'Spaces are not allowed'],
    ['file:', 'The local path is missing'],
    [
      'file:config.yml@main',
      'Local targets cannot contain repository or ref specifiers',
    ],
    [
      'file:repo:config.yml',
      'Local targets cannot contain repository or ref specifiers',
    ],
    ['repo:config.yml:extra', '":" may be specified at most once'],
    [':config.yml', 'The repository specifier is missing'],
    [
      'owner/repo/extra:config.yml',
      'The repository must be `repo` or `owner/repo`',
    ],
    ['owner/:config.yml', 'The repository must be `repo` or `owner/repo`'],
    ['config.yml@main@other', '"@" may be specified at most once'],
    ['config.yml@', 'The ref specifier is empty'],
    ['https://[invalid', 'The URL is malformed'],
    [
      'https://other.example/acme/widgets/blob/main/config.yml',
      'The URL host does not match',
    ],
    [
      'https://github.com/acme/widgets/tree/main/config.yml',
      'must be a repository blob URL',
    ],
    ['../../config.yml', 'Repository config path escapes the repository'],
    ['file:/config.yml', 'Local config path must be relative'],
    ['file:../config.yml', 'Local config path must remain within cwd'],
  ])('rejects %s before reading configuration', async (target, message) => {
    const params = options({ target })
    await expect(loadConfig(params)).rejects.toThrow(message)
    expect(params.reader.getRepositoryConfig).not.toHaveBeenCalled()
  })

  it('requires blob URLs to match the enterprise server path prefix', async () => {
    const params = options({
      repository: {
        ...repository,
        serverUrl: 'https://github.example/enterprise',
      },
      target: 'https://github.example/acme/widgets/blob/main/config.yml',
    })
    await expect(loadConfig(params)).rejects.toThrow(
      'The URL path does not match the repository server',
    )
    expect(params.reader.getRepositoryConfig).not.toHaveBeenCalled()
  })

  it('redacts URL credentials and query parameters in target errors', async () => {
    const error = await loadConfig(
      options({
        target:
          'https://user:secret@other.example/acme/widgets/blob/main/config.yml?token=private',
      }),
    ).catch((error: unknown) => error)
    expect(String(error)).toContain(
      'https://other.example/acme/widgets/blob/main/config.yml',
    )
    expect(String(error)).not.toMatch(/user|secret|token|private/)
  })

  it('normalizes explicit repository targets and branch refs', async () => {
    const params = options({
      target: 'github:shared:config.yml@refs/heads/stable',
    })
    await expect(loadConfig(params)).resolves.toMatchObject({
      template: 'safe',
    })
    expect(params.reader.getRepositoryConfig).toHaveBeenCalledExactlyOnceWith({
      repository: { ...repository, name: 'shared' },
      path: '.github/config.yml',
      ref: 'stable',
    })
  })

  it('inherits the current filename when _extends names only a repository', async () => {
    const getRepositoryConfig = vi
      .fn<LoadConfigOptions['reader']['getRepositoryConfig']>()
      .mockResolvedValueOnce('template: child\n_extends: other/shared@stable\n')
      .mockResolvedValueOnce('name-template: inherited\n')
    await expect(
      loadConfig(options({ reader: { getRepositoryConfig } })),
    ).resolves.toMatchObject({
      template: 'child',
      'name-template': 'inherited',
    })
    expect(getRepositoryConfig).toHaveBeenNthCalledWith(2, {
      repository: {
        owner: 'other',
        name: 'shared',
        serverUrl: repository.serverUrl,
      },
      path: '.github/release-drafter.yml',
      ref: 'stable',
    })
  })

  it('requires an injected local file reader', async () => {
    await expect(
      loadConfig(options({ target: 'file:config.yml' })),
    ).rejects.toThrow('No local file reader was provided')
  })

  it('does not use organization fallback for non-object transport failures', async () => {
    const getRepositoryConfig = vi.fn().mockRejectedValue('connection lost')
    await expect(
      loadConfig(options({ reader: { getRepositoryConfig } })),
    ).rejects.toThrow(
      'Could not read repository config github:acme/widgets:.github/release-drafter.yml@main',
    )
    expect(getRepositoryConfig).toHaveBeenCalledTimes(1)
  })
})

describe('configuration parsing and inheritance', () => {
  it.each([
    ['config.json', '{', 'Could not parse config syntax'],
    ['config.yml', 'template: [', 'Could not parse config syntax'],
    [
      'config.yml',
      'template: safe\n_extends:\n  from: " "\n',
      'Invalid config inheritance envelope',
    ],
    [
      'config.yml',
      'template: safe\n_extends:\n  from: parent.yml\n  strategy:\n    labels: merge\n',
      'Invalid config inheritance envelope',
    ],
    ['config.yml', '- not an object\n', 'Invalid config inheritance envelope'],
  ])(
    'rejects invalid syntax or inheritance in %s',
    async (target, contents, message) => {
      const params = options({
        target,
        reader: { getRepositoryConfig: vi.fn(async () => contents) },
      })
      await expect(loadConfig(params)).rejects.toThrow(message)
      expect(params.reader.getRepositoryConfig).toHaveBeenCalledTimes(1)
    },
  )

  it('stops distinct inheritance targets at the depth limit', async () => {
    const getRepositoryConfig = vi.fn<
      LoadConfigOptions['reader']['getRepositoryConfig']
    >(async ({ path }) => {
      const depth = Number(/config-(\d+)\.yml$/.exec(path)?.[1])
      return `template: safe\n_extends: config-${depth + 1}.yml\n`
    })
    const params = options({
      target: 'config-0.yml',
      reader: { getRepositoryConfig },
    })
    await expect(loadConfig(params)).rejects.toThrow(
      'Maximum _extends depth (33) exceeded',
    )
    expect(getRepositoryConfig).toHaveBeenCalledTimes(34)
    expect(params.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Maximum _extends depth (33) exceeded'),
    )
  })

  it.each(['append', 'prepend'] as const)(
    'uses %s with an absent inherited list and warns about unused strategies',
    async (strategy) => {
      const getRepositoryConfig = vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            template: 'child',
            'exclude-labels': ['child'],
            _extends: {
              from: 'parent.json',
              strategy: {
                'exclude-labels': strategy,
                'include-labels': 'append',
              },
            },
          }),
        )
        .mockResolvedValueOnce('{"template":"parent"}')
      const params = options({
        target: 'child.json',
        reader: { getRepositoryConfig },
      })
      await expect(loadConfig(params)).resolves.toMatchObject({
        'exclude-labels': ['child'],
      })
      expect(params.logger.warning).toHaveBeenCalledWith(
        expect.stringContaining("but that file does not set 'include-labels'"),
      )
      expect(params.logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          `strategy ${strategy} merged 1 'exclude-labels' item(s)`,
        ),
      )
    },
  )

  it.each(['append', 'prepend'] as const)(
    'rejects %s of scalar values',
    async (strategy) => {
      const getRepositoryConfig = vi
        .fn()
        .mockResolvedValueOnce(
          JSON.stringify({
            template: 'child',
            _extends: { from: 'parent.json', strategy: { template: strategy } },
          }),
        )
        .mockResolvedValueOnce('{"template":"parent"}')
      await expect(
        loadConfig(
          options({ target: 'child.json', reader: { getRepositoryConfig } }),
        ),
      ).rejects.toThrow(`Cannot ${strategy} 'template'`)
    },
  )

  it('detects recursion after a blob URL alternative resolves to an already loaded target', async () => {
    const getRepositoryConfig = vi.fn<
      LoadConfigOptions['reader']['getRepositoryConfig']
    >(async ({ ref, path }) => {
      if (ref === 'feature') throw { status: 404 }
      expect(path).toBe('.github/config.yml')
      return 'template: safe\n_extends: https://github.com/acme/widgets/blob/feature/foo/.github/config.yml\n'
    })
    const params = options({
      target: 'config.yml@feature/foo',
      reader: { getRepositoryConfig },
    })
    await expect(loadConfig(params)).resolves.toMatchObject({
      template: 'safe',
    })
    expect(getRepositoryConfig).toHaveBeenCalledTimes(3)
    expect(params.logger.warning).toHaveBeenCalledWith(
      expect.stringContaining('Recursion detected'),
    )
  })
})
