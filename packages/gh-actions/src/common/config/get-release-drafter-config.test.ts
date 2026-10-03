import { describe, expect, it, vi } from 'vitest'
import { ConfigError } from './config-error.ts'
import { getReleaseDrafterConfig } from './get-release-drafter-config.ts'
import { composeConfigGet } from './index.ts'

vi.mock(import('./index.ts'), () => ({ composeConfigGet: vi.fn() }))

const currentContext = { repo: { owner: 'acme', repo: 'widgets' }, ref: 'main' }
const contexts = [
  {
    ...currentContext,
    scheme: 'github' as const,
    filepath: '.github/release-drafter.yml',
  },
  {
    repo: { owner: 'acme', repo: '.github' },
    ref: 'v1',
    scheme: 'github' as const,
    filepath: '.github/base.yml',
  },
]

describe('composed config diagnostics', () => {
  it('names all sources and identifies the failing schema field', async () => {
    vi.mocked(composeConfigGet).mockResolvedValue({
      config: { categories: 'invalid' },
      contexts,
    })
    const error = await getReleaseDrafterConfig(
      'release-drafter.yml',
      currentContext,
    ).catch((error: unknown) => error)
    expect(error).toBeInstanceOf(ConfigError)
    expect((error as ConfigError).message).toContain('acme/widgets@main')
    expect((error as ConfigError).message).toContain('acme/.github@v1')
    expect((error as ConfigError).message).toContain('categories')
    expect(
      (error as ConfigError).annotation(currentContext.repo, 'main').file,
    ).toBeUndefined()
  })
})
