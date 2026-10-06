import { describe, expect, it, vi } from 'vitest'
import { ConfigError } from './config-error.ts'
import { getConfigFile } from './get-config-file.ts'
import { getConfigFileFromRepo } from './get-config-file-from-repo.ts'
import type { ConfigTarget } from './parse-config-target.ts'

vi.mock(import('./get-config-file-from-repo.ts'), () => ({
  getConfigFileFromRepo: vi.fn(),
}))

const target: ConfigTarget = {
  scheme: 'github',
  filepath: 'release-drafter.yml',
  repo: { owner: 'acme', repo: 'widgets' },
  ref: 'refs/pull/42/head',
}

describe('config parsing diagnostics', () => {
  it('retains YAML syntax positions and the resolved source ref', async () => {
    vi.mocked(getConfigFileFromRepo).mockResolvedValue('categories: [\n')
    const error = await getConfigFile(target).catch((error: unknown) => error)
    expect(error).toBeInstanceOf(ConfigError)
    const diagnostic = error as ConfigError
    expect(diagnostic.message).toContain('acme/widgets@refs/pull/42/head')
    expect(diagnostic.targets[0].filepath).toBe('.github/release-drafter.yml')
    expect(diagnostic.position?.line).toBe(2)
  })

  it('names the source of invalid JSON without inventing a line number', async () => {
    vi.mocked(getConfigFileFromRepo).mockResolvedValue('{')
    const error = await getConfigFile({
      ...target,
      filepath: 'config.json',
    }).catch((error: unknown) => error)
    expect(error).toBeInstanceOf(ConfigError)
    expect((error as ConfigError).message).toContain('.github/config.json')
    expect((error as ConfigError).position).toBeUndefined()
  })

  it('reports invalid inheritance with the source and schema issue', async () => {
    vi.mocked(getConfigFileFromRepo).mockResolvedValue(
      '_extends:\n  from: ""\n',
    )
    await expect(getConfigFile(target)).rejects.toThrow(
      "'from' must not be blank",
    )
  })
})
