import { describe, expect, it, vi } from 'vitest'
import {
  type ConfigLogger,
  type LoadConfigOptions,
  loadConfig,
} from './config.js'

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
  realpath: vi.fn(async (path: string) => path),
  ...overrides,
})

describe('config loader security', () => {
  it('reads a local config through the injected canonical path boundary', async () => {
    const readFile = vi.fn(async () => 'template: local\n')
    const realpath = vi.fn(async (path: string) => {
      if (path === '/checkout-link') return '/real/checkout'
      if (path === '/checkout-link/configs/release.yml') {
        return '/real/checkout/configs/release.yml'
      }
      throw new Error(`Unexpected path: ${path}`)
    })

    const config = await loadConfig(
      options({
        target: 'file:configs/release.yml',
        cwd: '/checkout-link',
        readFile,
        realpath,
      }),
    )

    expect(config.template).toBe('local')
    expect(realpath).toHaveBeenCalledWith('/checkout-link')
    expect(realpath).toHaveBeenCalledWith('/checkout-link/configs/release.yml')
    expect(readFile).toHaveBeenCalledWith('/real/checkout/configs/release.yml')
  })

  it('rejects a local symlink target whose canonical path escapes cwd', async () => {
    const readFile = vi.fn(async () => 'template: escaped\n')
    const realpath = vi.fn(async (path: string) => {
      if (path === '/checkout') return '/real/checkout'
      if (path === '/checkout/configs/release.yml') {
        return '/outside/release.yml'
      }
      throw new Error(`Unexpected path: ${path}`)
    })

    await expect(
      loadConfig(
        options({
          target: 'file:configs/release.yml',
          readFile,
          realpath,
        }),
      ),
    ).rejects.toThrow('Local config path must remain within cwd')
    expect(readFile).not.toHaveBeenCalled()
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
