import { describe, expect, it, vi } from 'vitest'
import { normalizeConfigTarget, parseRepository } from '#src/cli/options.ts'

describe('CLI options', () => {
  it('parses an owner/name repository', () => {
    expect(parseRepository('owner/repository')).toEqual({
      owner: 'owner',
      repo: 'repository',
    })
  })

  it('rejects a repository URL', () => {
    expect(() => parseRepository('https://github.com/owner/repo')).toThrow(
      'owner/name',
    )
  })

  it('converts a GitHub blob URL to a config target', async () => {
    await expect(
      normalizeConfigTarget(
        'https://github.com/owner/config/blob/main/.github/release-drafter.yml',
      ),
    ).resolves.toBe('owner/config:.github/release-drafter.yml@main')
  })

  it('resolves a GitHub blob URL whose ref contains slashes', async () => {
    const targetExists = vi.fn(async ({ ref }) => ref === 'release/9.x')

    await expect(
      normalizeConfigTarget(
        'https://github.com/owner/config/blob/release/9.x/.github/release-drafter.yml',
        targetExists,
      ),
    ).resolves.toBe('owner/config:.github/release-drafter.yml@release/9.x')
  })

  it('converts a blob URL on a GHES server', async () => {
    vi.stubEnv('GITHUB_SERVER_URL', 'https://github.example.com')

    await expect(
      normalizeConfigTarget(
        'https://github.example.com/owner/config/blob/main/.github/release-drafter.yml',
      ),
    ).resolves.toBe('owner/config:.github/release-drafter.yml@main')
  })

  it('leaves a github.com blob URL alone when pointed at a GHES server', async () => {
    vi.stubEnv('GITHUB_SERVER_URL', 'https://github.example.com')

    await expect(
      normalizeConfigTarget(
        'https://github.com/owner/config/blob/main/.github/release-drafter.yml',
      ),
    ).resolves.toBe(
      'https://github.com/owner/config/blob/main/.github/release-drafter.yml',
    )
  })

  it('preserves release-drafter config syntax', async () => {
    await expect(
      normalizeConfigTarget('owner/config:.github/release-drafter.yml@main'),
    ).resolves.toBe('owner/config:.github/release-drafter.yml@main')
  })
})
