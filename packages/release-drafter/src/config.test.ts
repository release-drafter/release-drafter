import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import {
  type DraftReleaseConfig,
  type LoadConfigOptions,
  loadConfig,
  type RepositoryConfigReader,
} from './index.ts'

const repository = {
  owner: 'acme',
  name: 'widgets',
  serverUrl: 'https://forge.example',
}

const reader = (files: Record<string, string>): RepositoryConfigReader => ({
  getDefaultBranch: vi.fn(async () => 'main'),
  getRepositoryConfig: vi.fn(async ({ repository, path }) => {
    const contents = files[`${repository.name}/${path}`]
    if (contents === undefined)
      throw Object.assign(new Error(), { status: 404 })
    return contents
  }),
})

describe('public configuration loader', () => {
  const directories: string[] = []
  afterEach(async () => {
    await Promise.all(
      directories
        .splice(0)
        .map((path) => rm(path, { recursive: true, force: true })),
    )
  })

  it('returns the public parsed config with defaults, inheritance, and normalization', async () => {
    expectTypeOf(loadConfig).parameter(0).toEqualTypeOf<LoadConfigOptions>()
    expectTypeOf(loadConfig).returns.toEqualTypeOf<
      Promise<DraftReleaseConfig>
    >()
    const adapter = reader({
      'widgets/.github/release-drafter.yml': `
_extends:
  from: base.yml
  strategy:
    exclude-contributors: append
exclude-contributors: [bot]
replacers:
  - search: '/bug/g'
    replace: fix
  - target: change-body
    search: '/<!--.*?-->/gs'
    replace: ''
    not-found: empty
  - target: change-title
    search: '/^feat: /'
    replace: ''
categories:
  - title: Features
    label: feature
`,
      'widgets/.github/base.yml':
        'template: $CHANGES\nexclude-contributors: [owner]\n',
    })
    const config = await loadConfig({ adapter, repository })

    expect(config).toMatchObject({
      template: '$CHANGES',
      commitish: 'main',
      latest: true,
      prerelease: false,
      'exclude-contributors': ['owner', 'bot'],
      replacers: [
        { search: /bug/g, replace: 'fix' },
        {
          target: 'change-body',
          search: /<!--.*?-->/gs,
          replace: '',
          'not-found': 'empty',
        },
        { target: 'change-title', search: /^feat: /, replace: '' },
      ],
      categories: [
        expect.objectContaining({
          title: 'Features',
          when: [expect.objectContaining({ labels: ['feature'] })],
        }),
      ],
    })
    expect(config).not.toHaveProperty('_extends')
    expect(config['change-template']).toBeTruthy()
    expect(adapter.getDefaultBranch).toHaveBeenCalledWith(repository)
    expect(adapter.getRepositoryConfig).toHaveBeenCalledWith({
      repository,
      path: '.github/base.yml',
      ref: 'main',
    })
  })

  it('uses an explicit ref and applies common overrides', async () => {
    const adapter = reader({
      'widgets/.github/custom.json':
        '{"template":"$CHANGES","commitish":"old"}',
    })
    const config = await loadConfig({
      adapter,
      repository,
      target: 'custom.json',
      ref: 'release',
      overrides: { commitish: 'next', prerelease: true, latest: false },
    })

    expect(config).toMatchObject({
      commitish: 'next',
      prerelease: true,
      latest: false,
    })
    expect(adapter.getDefaultBranch).not.toHaveBeenCalled()
    expect(adapter.getRepositoryConfig).toHaveBeenCalledWith({
      repository,
      path: '.github/custom.json',
      ref: 'release',
    })
  })

  it('falls back to the shared configuration repository when the file is missing', async () => {
    const adapter = reader({
      '.github/.github/release-drafter.yml': 'template: shared\n',
    })
    await expect(loadConfig({ adapter, repository })).resolves.toMatchObject({
      template: 'shared',
      commitish: 'main',
    })
    expect(adapter.getRepositoryConfig).toHaveBeenLastCalledWith({
      repository: { ...repository, name: '.github' },
      path: '.github/release-drafter.yml',
      ref: undefined,
    })
  })

  it('rejects invalid configuration without falling back', async () => {
    const adapter = reader({
      'widgets/.github/release-drafter.yml': 'template: []\n',
    })
    await expect(loadConfig({ adapter, repository })).rejects.toThrow(
      'Invalid merged config',
    )
    expect(adapter.getRepositoryConfig).toHaveBeenCalledOnce()
  })

  it('loads local inheritance and rejects a symlink outside cwd', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'release-drafter-config-'))
    const outside = await mkdtemp(join(tmpdir(), 'release-drafter-outside-'))
    directories.push(cwd, outside)
    await writeFile(
      join(cwd, 'config.yml'),
      '_extends: file:base.yml\nheader: local\n',
    )
    await writeFile(join(cwd, 'base.yml'), 'template: $CHANGES\n')
    await writeFile(join(outside, 'config.yml'), 'template: outside\n')
    await symlink(join(outside, 'config.yml'), join(cwd, 'escape.yml'))
    const adapter = reader({})

    await expect(
      loadConfig({
        adapter,
        repository,
        ref: 'main',
        cwd,
        target: 'file:config.yml',
      }),
    ).resolves.toMatchObject({
      template: '$CHANGES',
      header: 'local',
      commitish: 'main',
    })
    await expect(
      loadConfig({
        adapter,
        repository,
        ref: 'main',
        cwd,
        target: 'file:escape.yml',
      }),
    ).rejects.toThrow('Could not read local config')
    expect(adapter.getRepositoryConfig).not.toHaveBeenCalled()
  })
})
