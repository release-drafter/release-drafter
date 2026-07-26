import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  execFile: vi.fn(),
}))

vi.mock('node:child_process', () => ({ execFile: mocks.execFile }))

const { resolveToken } = await import('#src/cli/auth.ts')

describe('resolveToken', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_TOKEN', '')
    vi.stubEnv('GH_TOKEN', '')
  })

  it('prefers GITHUB_TOKEN', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'github-token')
    vi.stubEnv('GH_TOKEN', 'gh-token')

    await expect(resolveToken()).resolves.toBe('github-token')
    expect(mocks.execFile).not.toHaveBeenCalled()
  })

  it('uses GH_TOKEN when GITHUB_TOKEN is absent', async () => {
    vi.stubEnv('GH_TOKEN', 'gh-token')

    await expect(resolveToken()).resolves.toBe('gh-token')
    expect(mocks.execFile).not.toHaveBeenCalled()
  })

  it('falls back to the GitHub CLI token', async () => {
    mocks.execFile.mockImplementationOnce(
      (
        _file: string,
        _args: string[],
        _options: object,
        callback: (error: null, result: { stdout: string }) => void,
      ) => callback(null, { stdout: 'cli-token\n' }),
    )

    await expect(resolveToken()).resolves.toBe('cli-token')
  })

  it('explains the supported authentication methods when none work', async () => {
    mocks.execFile.mockImplementationOnce(
      (
        _file: string,
        _args: string[],
        _options: object,
        callback: (error: Error) => void,
      ) => callback(new Error('not authenticated')),
    )

    await expect(resolveToken()).rejects.toThrow(
      'GitHub authentication required: set GITHUB_TOKEN or GH_TOKEN, or run `gh auth login`',
    )
  })
})
