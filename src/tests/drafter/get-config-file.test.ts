import { describe, expect, it, vi } from 'vitest'
import { getConfigFile } from 'src/common/config/get-config-file'
import nock from 'nock'

// @ts-expect-error readFileSyncOriginal is the original unmocked function, whose mock is hoisted above
import { readFileSyncOriginal } from 'fs'

const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}))

vi.mock(import('fs'), async (iom) => {
  const fs = await iom()
  return {
    ...fs,
    readFileSyncOriginal: fs.readFileSync,
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync
  }
})

const getContentEndpoint = (
  owner: string,
  repo: string,
  path: string,
  ref?: string
) => {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo
  )}/contents/${encodeURIComponent(path)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`
}

describe('get config file', () => {
  it('should throw error on unsupported file extension', async () => {
    await expect(
      getConfigFile({
        scheme: 'file',
        filepath: 'README.md',
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main'
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Unsupported file extension: .md. Supported extensions are: json, yml, yaml]`
    )
  })
  describe('with a file scheme', () => {
    it('should return config content', async () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/home/runner/workspace')
      mocks.existsSync.mockReturnValue(true)
      mocks.readFileSync.mockReturnValue(`template: fake-template-content`)

      const res = await getConfigFile({
        scheme: 'file',
        filepath: '../configs/release-drafter.yml',
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main'
      })

      expect(mocks.existsSync).toHaveBeenCalledTimes(2)
      expect(mocks.existsSync).toHaveBeenNthCalledWith(
        1,
        '/home/runner/workspace'
      )
      expect(mocks.existsSync).toHaveBeenNthCalledWith(
        2,
        '/home/runner/workspace/configs/release-drafter.yml'
      )
      expect(res.fetchedFrom.scheme).toBe('file')
      expect(res.fetchedFrom.filepath).toMatchInlineSnapshot(
        `"configs/release-drafter.yml"`
      )
      expect(res.config).toMatchInlineSnapshot(`
        {
          "template": "fake-template-content",
        }
      `)
    })
    it('should return error without workspace config', async () => {
      vi.stubEnv('GITHUB_WORKSPACE', undefined)
      await expect(
        getConfigFile({
          scheme: 'file',
          filepath: '../configs/release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main'
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Local load failed. env GITHUB_WORKSPACE is not set. Cannot resolve local repo path.]`
      )
    })
    it('should return error when workspace does not exist', async () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/home/runner/workspace')
      mocks.existsSync.mockImplementation((p) => p !== '/home/runner/workspace')
      await expect(
        getConfigFile({
          scheme: 'file',
          filepath: '../configs/release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main'
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Local load failed. Root repo path does not exist: /home/runner/workspace]`
      )
    })
    it('should return error when file does not exist', async () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/home/runner/workspace')
      mocks.existsSync.mockImplementation(
        (p) => p !== '/home/runner/workspace/configs/release-drafter.yml'
      )
      await expect(
        getConfigFile({
          scheme: 'file',
          filepath: '../configs/release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main'
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Local load failed. Config file not found: /home/runner/workspace/configs/release-drafter.yml. Did you clone your sources ? (ex: using @actions/checkout)]`
      )
    })
    it('should return error when file exists but read fails', async () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/this/file/should/not/exist/on/your/pc')
      mocks.existsSync.mockReturnValue(true)
      mocks.readFileSync.mockImplementationOnce(readFileSyncOriginal)

      await expect(
        getConfigFile({
          scheme: 'file',
          filepath: '../configs/release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main'
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Local load failed. ENOENT: no such file or directory, open '/this/file/should/not/exist/on/your/pc/configs/release-drafter.yml']`
      )
    })
  })
  describe('with a github scheme', () => {
    it('should return config content', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const endpoint = getContentEndpoint(
        'octocat',
        'hello-world',
        '.github/release-drafter.yml',
        'main'
      )
      const scope = nock('https://api.github.com')
        .get(endpoint)
        .reply(200, `template: fake-template-content`, {
          'content-type': 'application/vnd.github.v3.raw; charset=utf-8'
        })

      const res = await getConfigFile({
        scheme: 'github',
        filepath: 'release-drafter.yml',
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main'
      })

      expect(mocks.existsSync).not.toHaveBeenCalled()
      expect(mocks.readFileSync).not.toHaveBeenCalled()

      expect(scope.isDone()).toBe(true)

      expect(res.fetchedFrom.scheme).toBe('github')
      expect(res.fetchedFrom.filepath).toMatchInlineSnapshot(
        `".github/release-drafter.yml"`
      )
      expect(res.config).toMatchInlineSnapshot(`
        {
          "template": "fake-template-content",
        }
      `)
    })
    it('should fail when file is not found', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const endpoint = getContentEndpoint(
        'octocat',
        'hello-world',
        '.github/release-drafter.yml'
      )
      const scope = nock('https://api.github.com').get(endpoint).reply(404)

      await expect(
        getConfigFile({
          scheme: 'github',
          filepath: 'release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' }
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Repo load failed. Config file not found with error 404. (target: octocat/hello-world:.github/release-drafter.yml)]`
      )

      expect(mocks.existsSync).not.toHaveBeenCalled()
      expect(mocks.readFileSync).not.toHaveBeenCalled()

      expect(scope.isDone()).toBe(true)
    })
    it('should fail when fetching a directory', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const endpoint = getContentEndpoint(
        'octocat',
        'hello-world',
        '.github/release-drafter.yml'
      )
      const scope = nock('https://api.github.com').get(endpoint).reply(200, [])

      await expect(
        getConfigFile({
          scheme: 'github',
          filepath: 'release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' }
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Repo load failed. Fetched content is a directory (array), expected a file. (target: octocat/hello-world:.github/release-drafter.yml)]`
      )

      expect(mocks.existsSync).not.toHaveBeenCalled()
      expect(mocks.readFileSync).not.toHaveBeenCalled()

      expect(scope.isDone()).toBe(true)
    })
    it('should fail when content-type is wrong', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const endpoint = getContentEndpoint(
        'octocat',
        'hello-world',
        '.github/release-drafter.yml',
        'main'
      )
      const scope = nock('https://api.github.com').get(endpoint).reply(
        200,
        { number: 12345 },
        {
          'content-type': 'application/json'
        }
      )

      await expect(
        getConfigFile({
          scheme: 'github',
          filepath: 'release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main'
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Repo load failed. Fetched content has wrong content-type (application/json), expected a raw file. (target: octocat/hello-world:.github/release-drafter.yml@main)]`
      )

      expect(mocks.existsSync).not.toHaveBeenCalled()
      expect(mocks.readFileSync).not.toHaveBeenCalled()

      expect(scope.isDone()).toBe(true)
    })
  })
})
