// @ts-expect-error readFileSyncOriginal is the original unmocked function, whose mock is hoisted above
import { readFileSyncOriginal } from 'node:fs'
import nock from 'nock'
import { getConfigFile } from 'src/common/config/get-config-file'
import { getConfigFiles } from 'src/common/config/get-config-files'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

vi.mock(import('node:fs'), async (iom) => {
  const fs = await iom()
  return {
    ...fs,
    readFileSyncOriginal: fs.readFileSync,
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
  }
})

const getContentEndpoint = (
  owner: string,
  repo: string,
  path: string,
  ref?: string,
) => {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
    repo,
  )}/contents/${encodeURIComponent(path)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`
}

const RAW_CONTENT_TYPE = 'application/vnd.github.v3.raw; charset=utf-8'

describe('getConfigFile', () => {
  it('should throw error on unsupported file extension', async () => {
    await expect(
      getConfigFile({
        scheme: 'file',
        filepath: 'README.md',
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Unsupported file extension: .md. Supported extensions are: json, yml, yaml]`,
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
        ref: 'main',
      })

      expect(mocks.existsSync).toHaveBeenCalledTimes(2)
      expect(mocks.existsSync).toHaveBeenNthCalledWith(
        1,
        '/home/runner/workspace',
      )
      expect(mocks.existsSync).toHaveBeenNthCalledWith(
        2,
        '/home/runner/workspace/configs/release-drafter.yml',
      )
      expect(res.fetchedFrom.scheme).toBe('file')
      expect(res.fetchedFrom.filepath).toMatchInlineSnapshot(
        `"configs/release-drafter.yml"`,
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
          ref: 'main',
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Local load failed. env GITHUB_WORKSPACE is not set. Cannot resolve local repo path.]`,
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
          ref: 'main',
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Local load failed. Root repo path does not exist: /home/runner/workspace]`,
      )
    })
    it('should return error when file does not exist', async () => {
      vi.stubEnv('GITHUB_WORKSPACE', '/home/runner/workspace')
      mocks.existsSync.mockImplementation(
        (p) => p !== '/home/runner/workspace/configs/release-drafter.yml',
      )
      await expect(
        getConfigFile({
          scheme: 'file',
          filepath: '../configs/release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Local load failed. Config file not found: /home/runner/workspace/configs/release-drafter.yml. Did you clone your sources ? (ex: using @actions/checkout)]`,
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
          ref: 'main',
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Local load failed. ENOENT: no such file or directory, open '/this/file/should/not/exist/on/your/pc/configs/release-drafter.yml']`,
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
        'main',
      )
      const scope = nock('https://api.github.com')
        .get(endpoint)
        .reply(200, `template: fake-template-content`, {
          'content-type': RAW_CONTENT_TYPE,
        })

      const res = await getConfigFile({
        scheme: 'github',
        filepath: 'release-drafter.yml',
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main',
      })

      expect(mocks.existsSync).not.toHaveBeenCalled()
      expect(mocks.readFileSync).not.toHaveBeenCalled()

      expect(scope.isDone()).toBe(true)

      expect(res.fetchedFrom.scheme).toBe('github')
      expect(res.fetchedFrom.filepath).toMatchInlineSnapshot(
        `".github/release-drafter.yml"`,
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
        '.github/release-drafter.yml',
      )
      const scope = nock('https://api.github.com').get(endpoint).reply(404)

      await expect(
        getConfigFile({
          scheme: 'github',
          filepath: 'release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' },
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Repo load failed. Config file not found with error 404. (target: octocat/hello-world:.github/release-drafter.yml)]`,
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
        '.github/release-drafter.yml',
      )
      const scope = nock('https://api.github.com').get(endpoint).reply(200, [])

      await expect(
        getConfigFile({
          scheme: 'github',
          filepath: 'release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' },
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Repo load failed. Fetched content is a directory (array), expected a file. (target: octocat/hello-world:.github/release-drafter.yml)]`,
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
        'main',
      )
      const scope = nock('https://api.github.com').get(endpoint).reply(
        200,
        { number: 12345 },
        {
          'content-type': 'application/json',
        },
      )

      await expect(
        getConfigFile({
          scheme: 'github',
          filepath: 'release-drafter.yml',
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Repo load failed. Fetched content has wrong content-type (application/json), expected a raw file. (target: octocat/hello-world:.github/release-drafter.yml@main)]`,
      )

      expect(mocks.existsSync).not.toHaveBeenCalled()
      expect(mocks.readFileSync).not.toHaveBeenCalled()

      expect(scope.isDone()).toBe(true)
    })
  })
})

describe('getConfigFiles', () => {
  describe('_extends with repo-only defaults filepath from parent', () => {
    it('should default filepath when _extends is owner/repo', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const parentEndpoint = getContentEndpoint(
        'ansible',
        'ansible-navigator',
        '.github/release-drafter.yml',
        'main',
      )
      const extendsEndpoint = getContentEndpoint(
        'ansible',
        'team-devtools',
        '.github/release-drafter.yml',
      )

      const scope = nock('https://api.github.com')
        .get(parentEndpoint)
        .reply(
          200,
          `_extends: ansible/team-devtools\ntemplate: child-template`,
          { 'content-type': RAW_CONTENT_TYPE },
        )
        .get(extendsEndpoint)
        .reply(200, `template: parent-template`, {
          'content-type': RAW_CONTENT_TYPE,
        })

      const files = await getConfigFiles('release-drafter.yml', {
        repo: { owner: 'ansible', repo: 'ansible-navigator' },
        ref: 'main',
      })

      expect(scope.isDone()).toBe(true)
      expect(files).toHaveLength(2)
      expect(files[0].fetchedFrom.filepath).toBe('.github/release-drafter.yml')
      expect(files[1].fetchedFrom.filepath).toBe('.github/release-drafter.yml')
      expect(files[1].fetchedFrom.repo).toEqual({
        owner: 'ansible',
        repo: 'team-devtools',
      })
    })

    it('should default filepath when _extends is repo-only (no owner)', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const parentEndpoint = getContentEndpoint(
        'ansible',
        'ansible-navigator',
        '.github/release-drafter.yml',
        'main',
      )
      const extendsEndpoint = getContentEndpoint(
        'ansible',
        'team-devtools',
        '.github/release-drafter.yml',
      )

      const scope = nock('https://api.github.com')
        .get(parentEndpoint)
        .reply(200, `_extends: team-devtools\ntemplate: child-template`, {
          'content-type': RAW_CONTENT_TYPE,
        })
        .get(extendsEndpoint)
        .reply(200, `template: parent-template`, {
          'content-type': RAW_CONTENT_TYPE,
        })

      const files = await getConfigFiles('release-drafter.yml', {
        repo: { owner: 'ansible', repo: 'ansible-navigator' },
        ref: 'main',
      })

      expect(scope.isDone()).toBe(true)
      expect(files).toHaveLength(2)
      expect(files[1].fetchedFrom.filepath).toBe('.github/release-drafter.yml')
      expect(files[1].fetchedFrom.repo).toEqual({
        owner: 'ansible',
        repo: 'team-devtools',
      })
    })

    it('should default filepath with custom config name', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const parentEndpoint = getContentEndpoint(
        'myorg',
        'myrepo',
        '.github/custom-drafter.yml',
        'main',
      )
      const extendsEndpoint = getContentEndpoint(
        'myorg',
        'shared-configs',
        '.github/custom-drafter.yml',
      )

      const scope = nock('https://api.github.com')
        .get(parentEndpoint)
        .reply(
          200,
          `_extends: myorg/shared-configs\ntemplate: child-template`,
          { 'content-type': RAW_CONTENT_TYPE },
        )
        .get(extendsEndpoint)
        .reply(200, `template: parent-template`, {
          'content-type': RAW_CONTENT_TYPE,
        })

      const files = await getConfigFiles('custom-drafter.yml', {
        repo: { owner: 'myorg', repo: 'myrepo' },
        ref: 'main',
      })

      expect(scope.isDone()).toBe(true)
      expect(files).toHaveLength(2)
      expect(files[1].fetchedFrom.filepath).toBe('.github/custom-drafter.yml')
    })
  })

  describe('no _extends', () => {
    it('should return a single config file', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const endpoint = getContentEndpoint(
        'octocat',
        'hello-world',
        '.github/release-drafter.yml',
        'main',
      )

      const scope = nock('https://api.github.com')
        .get(endpoint)
        .reply(200, `template: standalone`, {
          'content-type': RAW_CONTENT_TYPE,
        })

      const files = await getConfigFiles('release-drafter.yml', {
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main',
      })

      expect(scope.isDone()).toBe(true)
      expect(files).toHaveLength(1)
      expect(files[0].config.template).toBe('standalone')
    })
  })
})
