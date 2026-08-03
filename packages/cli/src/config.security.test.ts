import { describe, expect, it, vi } from 'vitest'
import {
  type ConfigLogger,
  type LoadConfigOptions,
  loadConfig,
} from './config.js'
import { LocalConfigFileBoundaryError } from './local-config-file.js'

const repository = {
  owner: 'acme',
  name: 'widgets',
  serverUrl: 'https://github.com',
}

const logger = (): ConfigLogger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
})

const options = (
  overrides: Partial<LoadConfigOptions> = {},
): LoadConfigOptions => ({
  target: 'release-drafter.yml',
  repository,
  ref: 'main',
  cwd: '/checkout',
  reader: {
    getRepositoryConfig: vi.fn(async () => 'template: safe\n'),
  },
  logger: logger(),
  ...overrides,
})

describe('config loader security', () => {
  it('reads a local config through the injected canonical path boundary', async () => {
    const readLocalFile = vi.fn(async () => ({
      contents: 'template: local\n',
      canonicalCwd: '/real/checkout',
      canonicalPath: '/real/checkout/configs/release.yml',
    }))

    const config = await loadConfig(
      options({
        target: 'file:configs/release.yml',
        cwd: '/checkout-link',
        readLocalFile,
      }),
    )

    expect(config.template).toBe('local')
    expect(readLocalFile).toHaveBeenCalledWith(
      '/checkout-link/configs/release.yml',
      '/checkout-link',
    )
  })

  it('rejects a local symlink target whose canonical path escapes cwd', async () => {
    const readLocalFile = vi.fn(async () => {
      throw new LocalConfigFileBoundaryError(
        'Local config path must remain within cwd.',
        'outside-cwd',
      )
    })

    await expect(
      loadConfig(
        options({
          target: 'file:configs/release.yml',
          readLocalFile,
        }),
      ),
    ).rejects.toThrow('Local config path must remain within cwd')
    expect(readLocalFile).toHaveBeenCalledTimes(1)
  })

  it('reports a local path replacement detected by the atomic reader', async () => {
    const readLocalFile = vi.fn(async () => {
      throw new LocalConfigFileBoundaryError(
        'Local config path changed while it was being opened.',
        'changed',
      )
    })

    await expect(
      loadConfig(
        options({
          target: 'file:configs/release.yml',
          readLocalFile,
        }),
      ),
    ).rejects.toThrow('Local config path changed while it was being opened')
    expect(readLocalFile).toHaveBeenCalledTimes(1)
  })

  it.each([
    {
      name: 'JSON __proto__ key',
      target: 'release-drafter.json',
      contents: '{"template":"safe","__proto__":{"polluted":true}}',
      key: '__proto__',
    },
    {
      name: 'nested YAML constructor key',
      target: 'release-drafter.yml',
      contents: 'template: safe\nnested:\n  constructor:\n    polluted: true\n',
      key: 'constructor',
    },
    {
      name: 'inheritance strategy prototype key',
      target: 'release-drafter.yml',
      contents:
        'template: safe\n_extends:\n  from: base.yml\n  strategy:\n    prototype: append\n',
      key: 'prototype',
    },
  ])('rejects $name recursively', async ({ target, contents, key }) => {
    const getRepositoryConfig = vi.fn(async () => contents)

    await expect(
      loadConfig(
        options({
          target,
          reader: { getRepositoryConfig },
        }),
      ),
    ).rejects.toThrow(`Unsafe config key '${key}'`)
    expect(Object.prototype).not.toHaveProperty('polluted')
    expect(getRepositoryConfig).toHaveBeenCalledTimes(1)
  })

  it('probes blob URL splits until a slash-containing ref resolves', async () => {
    const notFound = Object.assign(new Error('Config not found'), {
      status: 404,
    })
    const getRepositoryConfig = vi.fn(
      async ({
        ref,
      }: Parameters<LoadConfigOptions['reader']['getRepositoryConfig']>[0]) => {
        if (ref === 'feature') throw notFound
        return 'template: slash-ref\n'
      },
    )

    const config = await loadConfig(
      options({
        target:
          'https://github.com/acme/widgets/blob/feature/foo/.github/release-drafter.yml',
        reader: { getRepositoryConfig },
      }),
    )

    expect(config.template).toBe('slash-ref')
    expect(getRepositoryConfig).toHaveBeenNthCalledWith(1, {
      repository,
      path: 'foo/.github/release-drafter.yml',
      ref: 'feature',
    })
    expect(getRepositoryConfig).toHaveBeenNthCalledWith(2, {
      repository,
      path: '.github/release-drafter.yml',
      ref: 'feature/foo',
    })
    expect(getRepositoryConfig).toHaveBeenCalledTimes(2)
  })
})
