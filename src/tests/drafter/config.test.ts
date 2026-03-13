import nock from 'nock'
import { composeConfigGet } from 'src/common/config'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

vi.mock(import('node:fs'), async (iom) => {
  const fs = await iom()
  return {
    ...fs,
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync,
  }
})

// disable mocks from setup file
vi.unmock(import('src/common/config'))

const getContentEndpoint = (params: {
  path: string
  repo: { owner: string; repo: string }
  ref?: string
}) => {
  return `/repos/${encodeURIComponent(params.repo.owner)}/${encodeURIComponent(
    params.repo.repo,
  )}/contents/${encodeURIComponent(params.path)}${params.ref ? `?ref=${encodeURIComponent(params.ref)}` : ''}`
}

describe('get config file', () => {
  describe('with no _extends', () => {
    it('should return config content using the github: scheme', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const inputConfigName = 'release-drafter.yml'
      const endpointFilepath = '.github/release-drafter.yml'
      const context = {
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main',
      }

      const endpoint = getContentEndpoint({
        ...context,
        path: endpointFilepath,
      })
      const scope = nock('https://api.github.com')
        .get(endpoint)
        .reply(200, `template: fake-template-content`, {
          'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
        })

      const res = await composeConfigGet(inputConfigName, context)

      expect(mocks.existsSync).not.toHaveBeenCalled()
      expect(mocks.readFileSync).not.toHaveBeenCalled()

      expect(scope.isDone()).toBe(true)

      expect(res.contexts.length).toBe(1)
      expect(res.config).toMatchInlineSnapshot(`
        {
          "template": "fake-template-content",
        }
      `)
      expect(res.contexts[0]).toMatchInlineSnapshot(`
        {
          "filepath": ".github/release-drafter.yml",
          "ref": "main",
          "repo": {
            "owner": "octocat",
            "repo": "hello-world",
          },
          "scheme": "github",
        }
      `)
    })
    it('should fall back to org .github repo if config not found in current repo', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const inputConfigName = 'release-drafter.yml'
      const context = {
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main',
      }

      const currentRepoEndpoint = getContentEndpoint({
        ...context,
        path: '.github/release-drafter.yml',
      })
      const orgFallbackEndpoint = getContentEndpoint({
        repo: { owner: 'octocat', repo: '.github' },
        path: '.github/release-drafter.yml',
      })

      const scope = nock('https://api.github.com')
        .get(currentRepoEndpoint)
        .reply(404)
        .get(orgFallbackEndpoint)
        .reply(200, `template: org-template-content`, {
          'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
        })

      const res = await composeConfigGet(inputConfigName, context)

      expect(scope.isDone()).toBe(true)

      expect(res.contexts.length).toBe(1)
      expect(res.config).toMatchInlineSnapshot(`
        {
          "template": "org-template-content",
        }
      `)
      expect(res.contexts[0]).toMatchInlineSnapshot(`
        {
          "filepath": ".github/release-drafter.yml",
          "ref": undefined,
          "repo": {
            "owner": "octocat",
            "repo": ".github",
          },
          "scheme": "github",
        }
      `)
    })
    it('should error if config not found in current repo and org .github repo', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const inputConfigName = 'release-drafter.yml'
      const context = {
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main',
      }

      const currentRepoEndpoint = getContentEndpoint({
        ...context,
        path: '.github/release-drafter.yml',
      })
      const orgFallbackEndpoint = getContentEndpoint({
        repo: { owner: 'octocat', repo: '.github' },
        path: '.github/release-drafter.yml',
      })

      const scope = nock('https://api.github.com')
        .get(currentRepoEndpoint)
        .reply(404)
        .get(orgFallbackEndpoint)
        .reply(404)

      await expect(
        composeConfigGet(inputConfigName, context),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Repo load failed. Config file not found with error 404. (target: octocat/.github:.github/release-drafter.yml)]`,
      )

      expect(scope.isDone()).toBe(true)
    })
    it('should error if config not exists using the github: scheme', async () => {
      vi.stubEnv('GITHUB_TOKEN', 'test')

      const inputConfigName = 'release-drafter.yml'
      const endpointFilepath = '.github/release-drafter.yml'
      const context = {
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main',
      }

      const currentRepoEndpoint = getContentEndpoint({
        ...context,
        path: endpointFilepath,
      })
      const orgFallbackEndpoint = getContentEndpoint({
        repo: { owner: 'octocat', repo: '.github' },
        path: endpointFilepath,
      })
      const scope = nock('https://api.github.com')
        .get(currentRepoEndpoint)
        .reply(404)
        .get(orgFallbackEndpoint)
        .reply(404)

      await expect(
        composeConfigGet(inputConfigName, context),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Repo load failed. Config file not found with error 404. (target: octocat/.github:.github/release-drafter.yml)]`,
      )

      expect(mocks.existsSync).not.toHaveBeenCalled()
      expect(mocks.readFileSync).not.toHaveBeenCalled()

      expect(scope.isDone()).toBe(true)
    })
    it('should return config content using the file: scheme', async () => {
      const inputConfigName = 'file:../configs/release-drafter.yml'
      const workspace = '/home/runner/workspace'
      const endpointFilepath = `${workspace}/configs/release-drafter.yml`
      const context = {
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main',
      }

      vi.stubEnv('GITHUB_WORKSPACE', workspace)
      mocks.existsSync.mockReturnValue(true)
      mocks.readFileSync.mockReturnValue(`template: fake-template-content`)

      const res = await composeConfigGet(inputConfigName, context)

      expect(mocks.existsSync).toHaveBeenCalledTimes(2)
      expect(mocks.existsSync).toHaveBeenNthCalledWith(1, workspace)
      expect(mocks.existsSync).toHaveBeenNthCalledWith(2, endpointFilepath)
      expect(res.contexts.length).toBe(1)
      expect(res.contexts[0].scheme).toBe('file')
      expect(res.contexts[0].filepath).toMatchInlineSnapshot(
        `"configs/release-drafter.yml"`,
      )
      expect(res.config).toMatchInlineSnapshot(`
            {
              "template": "fake-template-content",
            }
          `)
    })
    it('should error if config not exists using the file: scheme', async () => {
      const inputConfigName = 'file:../configs/release-drafter.yml'
      const workspace = '/home/runner/workspace'
      const endpointFilepath = `${workspace}/configs/release-drafter.yml`
      const context = {
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main',
      }

      vi.stubEnv('GITHUB_WORKSPACE', workspace)
      mocks.existsSync.mockImplementation((path: string) => path === workspace) // workspace exists but file doesn't
      mocks.readFileSync.mockReturnValue(`template: fake-template-content`)

      await expect(
        composeConfigGet(inputConfigName, context),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Local load failed. Config file not found: /home/runner/workspace/configs/release-drafter.yml. Did you clone your sources ? (ex: using @actions/checkout)]`,
      )

      expect(mocks.existsSync).toHaveBeenCalledTimes(2)
      expect(mocks.existsSync).toHaveBeenNthCalledWith(1, workspace)
      expect(mocks.existsSync).toHaveBeenNthCalledWith(2, endpointFilepath)
    })
  })
  describe('with _extends', () => {
    describe('using the github: scheme', () => {
      it('should aggregate two configs in the same context', async () => {
        vi.stubEnv('GITHUB_TOKEN', 'test')
        const initialContext = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const configChain = [
          {
            inputConfigName: 'release-drafter.yml',
            file: `_extends: common.yml\ntemplate: fake-template-content`,
            endpointFilepath: '.github/release-drafter.yml',
            endpoint: '',
            context: initialContext,
          },
          {
            file: `template: overridden-content\nsaul: goodman`,
            endpointFilepath: '.github/common.yml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: 'hello-world' },
              ref: 'main',
            },
          },
        ].map((c) => ({
          ...c,
          endpoint: getContentEndpoint({
            ...c.context,
            path: c.endpointFilepath,
          }),
        }))

        const scope = nock('https://api.github.com')
          .get((uri) => configChain.map((c) => c.endpoint).includes(uri))
          .times(configChain.length)
          .reply(
            200,
            (uri) => configChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        const res = await composeConfigGet(
          configChain[0].inputConfigName as string,
          initialContext,
        )

        expect(mocks.existsSync).not.toHaveBeenCalled()
        expect(mocks.readFileSync).not.toHaveBeenCalled()

        expect(scope.isDone()).toBe(true)

        expect(res.contexts.length).toBe(2)
        expect(res.config).toMatchInlineSnapshot(`
            {
              "saul": "goodman",
              "template": "fake-template-content",
            }
          `)
      })
      it('should aggregate two configs when the second is in another repo and uses absolute paths', async () => {
        vi.stubEnv('GITHUB_TOKEN', 'test')
        const initialContext = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const configChain = [
          {
            inputConfigName: 'release-drafter.yml',
            file: `_extends: .github:/configs/common.yml\ntemplate: fake-template-content`,
            endpointFilepath: '.github/release-drafter.yml',
            endpoint: '',
            context: initialContext,
          },
          {
            file: `template: overridden-content\nsaul: goodman`,
            endpointFilepath: 'configs/common.yml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' },
            },
          },
        ].map((c) => ({
          ...c,
          endpoint: getContentEndpoint({
            ...c.context,
            path: c.endpointFilepath,
          }),
        }))

        const scope = nock('https://api.github.com')
          .get((uri) => configChain.map((c) => c.endpoint).includes(uri))
          .times(configChain.length)
          .reply(
            200,
            (uri) => configChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        const res = await composeConfigGet(
          configChain[0].inputConfigName as string,
          initialContext,
        )

        expect(mocks.existsSync).not.toHaveBeenCalled()
        expect(mocks.readFileSync).not.toHaveBeenCalled()

        expect(scope.isDone()).toBe(true)

        expect(res.contexts.length).toBe(2)
        expect(res.config).toMatchInlineSnapshot(`
            {
              "saul": "goodman",
              "template": "fake-template-content",
            }
          `)
      })
      it('should prevent recursions', async () => {
        vi.stubEnv('GITHUB_TOKEN', 'test')
        const initialContext = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const configChain = [
          {
            inputConfigName: 'release-drafter.yml',
            file: `_extends: .github:/configs/common.yml\ntemplate: fake-template-content`,
            endpointFilepath: '.github/release-drafter.yml',
            endpoint: '',
            context: initialContext,
          },
          {
            file: `_extends: hello-world:release-drafter.yml@main\ntemplate: overridden-content\nsaul: goodman`,
            endpointFilepath: 'configs/common.yml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' },
            },
          },
        ].map((c) => ({
          ...c,
          endpoint: getContentEndpoint({
            ...c.context,
            path: c.endpointFilepath,
          }),
        }))

        const scope = nock('https://api.github.com')
          .get((uri) => configChain.map((c) => c.endpoint).includes(uri))
          .times(configChain.length) // no extra call — pre-fetch check stops the loop
          .reply(
            200,
            (uri) => configChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        const res = await composeConfigGet(
          configChain[0].inputConfigName as string,
          initialContext,
        )

        expect(mocks.existsSync).not.toHaveBeenCalled()
        expect(mocks.readFileSync).not.toHaveBeenCalled()

        expect((await import('@actions/core')).warning).toHaveBeenCalledWith(
          'Recursion detected. Ignoring "_extends: hello-world:release-drafter.yml@main".',
        )
        expect(scope.isDone()).toBe(true)

        expect(res.contexts.length).toBe(2)
        expect(res.config).toMatchInlineSnapshot(`
            {
              "saul": "goodman",
              "template": "fake-template-content",
            }
          `)
      })
      it('should prevent recursions triggering the max depth', async () => {
        vi.stubEnv('GITHUB_TOKEN', 'test')
        const initialContext = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const configChain = Array.from({ length: 34 }, (_, i) => i)
          .map((i) => ({
            inputConfigName: `release-drafter-${i}.yml`,
            file: `_extends: ./release-drafter-${i + 1}.yml\ntemplate: fake-template-content\niteration: ${i}`,
            endpointFilepath: `.github/release-drafter-${i}.yml`,
            endpoint: '',
            context: initialContext,
          }))
          .map((c) => ({
            ...c,
            endpoint: getContentEndpoint({
              ...c.context,
              path: c.endpointFilepath,
            }),
          }))

        const scope = nock('https://api.github.com')
          .get((uri) => configChain.map((c) => c.endpoint).includes(uri))
          .times(configChain.length)
          .reply(
            200,
            (uri) => configChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        await expect(
          composeConfigGet(
            configChain[0].inputConfigName as string,
            initialContext,
          ),
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[Error: Maximum extends depth (33) exceeded. Check for circular dependencies or reduce the chain of extended configurations.]`,
        )

        expect(mocks.existsSync).not.toHaveBeenCalled()
        expect(mocks.readFileSync).not.toHaveBeenCalled()

        expect(scope.isDone()).toBe(true)
      })
    })
    describe('using the file: scheme', () => {
      it('should aggregate configs', async () => {
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            file: `_extends: file:./common.json\ntemplate: fake-template-content`,
          },
          {
            pathToFile: `${workspace}/.github/common.json`,
            file: `{"template": "overridden-content","saul": "goodman", "_extends": "file:../top-level.yaml"}`,
          },
          {
            pathToFile: `${workspace}/top-level.yaml`,
            file: `better: call`,
          },
        ]

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) =>
            configChain.find((c) => c.pathToFile === path)?.file,
        )

        const res = await composeConfigGet(inputConfigName, context)

        expect(mocks.existsSync).toHaveBeenCalledTimes(configChain.length * 2)
        configChain
          .flatMap((c) => [workspace, c.pathToFile])
          .forEach((p, i) => {
            expect(mocks.existsSync).toHaveBeenNthCalledWith(i + 1, p)
          })

        expect(res.contexts.length).toBe(configChain.length)
        expect(res.config).toMatchInlineSnapshot(`
            {
              "better": "call",
              "saul": "goodman",
              "template": "fake-template-content",
            }
          `)
      })
      it('should aggregate two configs when the second uses absolute paths', async () => {
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            file: `_extends: file:/configs/common.yml\ntemplate: fake-template-content`,
          },
          {
            pathToFile: `${workspace}/configs/common.yml`,
            file: `template: overridden-content\nsaul: goodman`,
          },
        ]

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) =>
            configChain.find((c) => c.pathToFile === path)?.file,
        )

        const res = await composeConfigGet(inputConfigName, context)

        expect(mocks.existsSync).toHaveBeenCalledTimes(configChain.length * 2)
        configChain
          .flatMap((c) => [workspace, c.pathToFile])
          .forEach((p, i) => {
            expect(mocks.existsSync).toHaveBeenNthCalledWith(i + 1, p)
          })

        expect(res.contexts.length).toBe(configChain.length)
        expect(res.config).toMatchInlineSnapshot(`
            {
              "saul": "goodman",
              "template": "fake-template-content",
            }
          `)
      })
    })
    describe('using the file: and then the github: scheme', () => {
      it('should aggregate configs', async () => {
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_TOKEN', 'test')
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            file: `_extends: file:./common.json\ntemplate: fake-template-content`,
          },
          {
            pathToFile: `${workspace}/.github/common.json`,
            file: `{"template": "overridden-content","saul": "goodman", "_extends": ".github:/top-level.yaml"}`,
          },
          {
            file: `better: call`,
            endpointFilepath: 'top-level.yaml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' },
            },
          },
        ].map((c) => ({
          ...c,
          endpoint: c.endpointFilepath
            ? getContentEndpoint({
                ...c.context,
                path: c.endpointFilepath,
              })
            : undefined,
        }))

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) =>
            configChain.find((c) => c.pathToFile === path)?.file,
        )

        const scope = nock('https://api.github.com')
          .get((uri) =>
            configChain
              .filter((c) => !!c.endpoint)
              .map((c) => c.endpoint)
              .includes(uri),
          )
          .times(configChain.filter((c) => !!c.endpoint).length)
          .reply(
            200,
            (uri) =>
              configChain
                .filter((c) => !!c.endpoint)
                .find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        const res = await composeConfigGet(inputConfigName, context)

        expect(mocks.existsSync).toHaveBeenCalledTimes(
          configChain.filter((c) => !!c.pathToFile).length * 2,
        )
        configChain
          .filter((c) => !!c.pathToFile)
          .flatMap((c) => [workspace, c.pathToFile])
          .forEach((p, i) => {
            expect(mocks.existsSync).toHaveBeenNthCalledWith(i + 1, p)
          })

        expect(scope.isDone()).toBe(true)

        expect(res.contexts.length).toBe(configChain.length)
        expect(res.config).toMatchInlineSnapshot(`
            {
              "better": "call",
              "saul": "goodman",
              "template": "fake-template-content",
            }
          `)
      })
    })
    describe('using the file: scheme with circular references', () => {
      it('should prevent direct self-recursion in file: scheme', async () => {
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            file: `_extends: file:./release-drafter.yml\ntemplate: initial-content`,
          },
        ]

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) =>
            configChain.find((c) => c.pathToFile === path)?.file,
        )

        const res = await composeConfigGet(inputConfigName, context)

        expect((await import('@actions/core')).warning).toHaveBeenCalledWith(
          'Recursion detected. Ignoring "_extends: file:./release-drafter.yml".',
        )

        expect(res.contexts.length).toBe(1)
        expect(res.config).toMatchInlineSnapshot(`
          {
            "template": "initial-content",
          }
        `)
      })

      it('should prevent mutual recursion between two local file: configs (A extends B extends A)', async () => {
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            file: `_extends: file:./common.yml\ntemplate: initial-content`,
          },
          {
            pathToFile: `${workspace}/.github/common.yml`,
            file: `_extends: file:./release-drafter.yml\nbase: setting`,
          },
        ]

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) =>
            configChain.find((c) => c.pathToFile === path)?.file,
        )

        const res = await composeConfigGet(inputConfigName, context)

        // lastExtends at detection time is file B's _extends pointing back to file A
        expect((await import('@actions/core')).warning).toHaveBeenCalledWith(
          'Recursion detected. Ignoring "_extends: file:./release-drafter.yml".',
        )

        expect(res.contexts.length).toBe(2)
        expect(res.config).toMatchInlineSnapshot(`
          {
            "base": "setting",
            "template": "initial-content",
          }
        `)
      })
    })
    describe('using the file: and then the github: scheme with circular references in the github: portion', () => {
      it('should prevent a github: config from looping back to itself within a mixed chain', async () => {
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_TOKEN', 'test')
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            file: `_extends: file:./base.yml\ntemplate: initial-content`,
          },
          {
            pathToFile: `${workspace}/.github/base.yml`,
            file: `_extends: .github:/shared.yml\nbase: setting`,
          },
          {
            // github: octocat/.github shared.yml — points back to itself
            file: `_extends: .github:/shared.yml\nshared: value`,
            endpointFilepath: 'shared.yml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' },
            },
          },
        ].map((c) => ({
          ...c,
          endpoint: c.endpointFilepath
            ? getContentEndpoint({
                ...c.context,
                path: c.endpointFilepath,
              })
            : undefined,
        }))

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) =>
            configChain.find((c) => c.pathToFile === path)?.file,
        )

        const scope = nock('https://api.github.com')
          .get((uri) =>
            configChain
              .filter((c) => !!c.endpoint)
              .map((c) => c.endpoint)
              .includes(uri),
          )
          .times(configChain.filter((c) => !!c.endpoint).length) // pre-fetch check stops the self-loop
          .reply(
            200,
            (uri) =>
              configChain
                .filter((c) => !!c.endpoint)
                .find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        const res = await composeConfigGet(inputConfigName, context)

        expect(scope.isDone()).toBe(true)

        expect((await import('@actions/core')).warning).toHaveBeenCalledWith(
          'Recursion detected. Ignoring "_extends: .github:/shared.yml".',
        )

        // 2 file: configs + 1 github: config
        expect(res.contexts.length).toBe(3)
        expect(res.config).toMatchInlineSnapshot(`
          {
            "base": "setting",
            "shared": "value",
            "template": "initial-content",
          }
        `)
      })

      it('should prevent mutual recursion between two github: configs within a mixed chain (B extends C extends B)', async () => {
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_TOKEN', 'test')
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            file: `_extends: .github:/shared.yml\ntemplate: initial-content`,
          },
          {
            // github: octocat/.github shared.yml — extends to another github: config
            file: `_extends: .github:/base.yml\nshared: value`,
            endpointFilepath: 'shared.yml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' },
            },
          },
          {
            // github: octocat/.github base.yml — loops back to shared.yml
            file: `_extends: .github:/shared.yml\nbase: setting`,
            endpointFilepath: 'base.yml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' },
            },
          },
        ].map((c) => ({
          ...c,
          endpoint: c.endpointFilepath
            ? getContentEndpoint({
                ...c.context,
                path: c.endpointFilepath,
              })
            : undefined,
        }))

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) =>
            configChain.find((c) => c.pathToFile === path)?.file,
        )

        const scope = nock('https://api.github.com')
          .get((uri) =>
            configChain
              .filter((c) => !!c.endpoint)
              .map((c) => c.endpoint)
              .includes(uri),
          )
          .times(configChain.filter((c) => !!c.endpoint).length) // pre-fetch check stops the loop
          .reply(
            200,
            (uri) =>
              configChain
                .filter((c) => !!c.endpoint)
                .find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        const res = await composeConfigGet(inputConfigName, context)

        expect(scope.isDone()).toBe(true)

        // lastExtends at detection time is github:C's _extends pointing back to github:B
        expect((await import('@actions/core')).warning).toHaveBeenCalledWith(
          'Recursion detected. Ignoring "_extends: .github:/shared.yml".',
        )

        // 1 file: config + 2 github: configs
        expect(res.contexts.length).toBe(3)
        expect(res.config).toMatchInlineSnapshot(`
          {
            "base": "setting",
            "shared": "value",
            "template": "initial-content",
          }
        `)
      })

      it('should detect cross-scheme loop: file:A → github:B → github:A (same file as A, loaded remotely)', async () => {
        // Exact scenario from PR review comment:
        // file:A (local) extends github:B (remote)
        // github:B extends github:A (same file as A but fetched via github: — different scheme, same filepath+ref+repo)
        // Without scheme-agnostic check, github:A would be loaded unnecessarily before the loop is caught
        // With the fix (file: takes priority), github:A matches file:A and the chain stops at [file:A, github:B]
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_TOKEN', 'test')
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        // file:A is local; github:B is fetched; github:A is caught pre-fetch (no endpoint needed)
        const localChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            // file:A — extends github:B
            file: `_extends: .github:/remote-base.yml\ntemplate: local-content`,
          },
        ]
        const remoteChain = [
          {
            // github:B (octocat/.github:remote-base.yml) — extends the remote version of file:A
            file: `_extends: hello-world:release-drafter.yml@main\nremote: base`,
            endpointFilepath: 'remote-base.yml',
            context: { repo: { owner: 'octocat', repo: '.github' } },
          },
          // github:A would be octocat/hello-world:.github/release-drafter.yml@main —
          // same filepath+ref+repo as file:A, different scheme — caught by pre-fetch check
        ].map((c) => ({
          ...c,
          endpoint: getContentEndpoint({
            ...c.context,
            path: c.endpointFilepath,
          }),
        }))

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) => localChain.find((c) => c.pathToFile === path)?.file,
        )

        const scope = nock('https://api.github.com')
          .get((uri) => remoteChain.map((c) => c.endpoint).includes(uri))
          .times(remoteChain.length)
          .reply(
            200,
            (uri) => remoteChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        const res = await composeConfigGet(inputConfigName, context)

        expect(scope.isDone()).toBe(true)

        // lastExtends at detection is github:B's _extends that points to github:A
        expect((await import('@actions/core')).warning).toHaveBeenCalledWith(
          'Recursion detected. Ignoring "_extends: hello-world:release-drafter.yml@main".',
        )

        // file:A and github:B only — github:A is not added to the chain
        expect(res.contexts.length).toBe(2)
        expect(res.config).toMatchInlineSnapshot(`
          {
            "remote": "base",
            "template": "local-content",
          }
        `)
      })

      it('should prefer the local file:A over github:A even when the remote targets a different ref', async () => {
        // Variant of the PR comment scenario where the remote chain targets a different ref.
        // file:A is loaded locally (ref from context = 'main').
        // github:B extends github:A@v1.0 — same filepath+repo as file:A but a different ref.
        // The local file must take priority: ref is ignored when one side is file: scheme.
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_TOKEN', 'test')
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        // file:A is local; github:B is fetched; github:A@v1.0 is caught pre-fetch (no endpoint needed)
        const localChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            file: `_extends: .github:/remote-base.yml\ntemplate: local-content`,
          },
        ]
        const remoteChain = [
          {
            // github:B — extends github:A at a different ref (v1.0 instead of main)
            file: `_extends: hello-world:release-drafter.yml@v1.0\nremote: base`,
            endpointFilepath: 'remote-base.yml',
            context: { repo: { owner: 'octocat', repo: '.github' } },
          },
          // github:A@v1.0 would be octocat/hello-world:.github/release-drafter.yml@v1.0 —
          // same filepath+repo as file:A (different ref) — caught by pre-fetch check
        ].map((c) => ({
          ...c,
          endpoint: getContentEndpoint({
            ...c.context,
            path: c.endpointFilepath,
          }),
        }))

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) => localChain.find((c) => c.pathToFile === path)?.file,
        )

        const scope = nock('https://api.github.com')
          .get((uri) => remoteChain.map((c) => c.endpoint).includes(uri))
          .times(remoteChain.length)
          .reply(
            200,
            (uri) => remoteChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        const res = await composeConfigGet(inputConfigName, context)

        expect(scope.isDone()).toBe(true)

        // lastExtends at detection is github:B's _extends pointing to github:A@v1.0
        expect((await import('@actions/core')).warning).toHaveBeenCalledWith(
          'Recursion detected. Ignoring "_extends: hello-world:release-drafter.yml@v1.0".',
        )

        // file:A and github:B only — github:A@v1.0 is not added despite the ref mismatch
        expect(res.contexts.length).toBe(2)
        expect(res.config).toMatchInlineSnapshot(`
          {
            "remote": "base",
            "template": "local-content",
          }
        `)
      })
    })
    describe('using the github: and then the file: scheme', () => {
      it('should throw an error', async () => {
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_TOKEN', 'test')
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main',
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: `${workspace}/.github/release-drafter.yml`,
            file: `_extends: file:./common.json\ntemplate: fake-template-content`,
          },
          {
            pathToFile: `${workspace}/.github/common.json`,
            file: `{"template": "overridden-content","saul": "goodman", "_extends": ".github:/top-level.yaml"}`,
          },
          {
            file: `better: call\n_extends: this-is-remote.json@v6`,
            endpointFilepath: 'top-level.yaml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' },
            },
          },
          {
            file: `{"_extends": "file:/sould-not-be-imported.yaml", "the": {"cake": {"is": "a lie"}}}`,
            endpointFilepath: '.github/this-is-remote.json',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' },
              ref: 'v6',
            },
          },
        ].map((c) => ({
          ...c,
          endpoint: c.endpointFilepath
            ? getContentEndpoint({
                ...c.context,
                path: c.endpointFilepath,
              })
            : undefined,
        }))

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) =>
            configChain.find((c) => c.pathToFile === path)?.file,
        )

        const scope = nock('https://api.github.com')
          .get((uri) =>
            configChain
              .filter((c) => !!c.endpoint)
              .map((c) => c.endpoint)
              .includes(uri),
          )
          .times(configChain.filter((c) => !!c.endpoint).length)
          .reply(
            200,
            (uri) =>
              configChain
                .filter((c) => !!c.endpoint)
                .find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8',
            },
          )

        await expect(
          composeConfigGet(inputConfigName, context),
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[Error: The '_extends' import-chain cannot contain github: to file: scheme transitions. Please change '_extends: file:/sould-not-be-imported.yaml' to use the github: scheme. ex: '_extends: octocat/.github:/sould-not-be-imported.yaml']`,
        )

        expect(mocks.existsSync).toHaveBeenCalledTimes(
          configChain.filter((c) => !!c.pathToFile).length * 2,
        )
        configChain
          .filter((c) => !!c.pathToFile)
          .flatMap((c) => [workspace, c.pathToFile])
          .forEach((p, i) => {
            expect(mocks.existsSync).toHaveBeenNthCalledWith(i + 1, p)
          })

        expect(scope.isDone()).toBe(true)
      })
    })
  })
})
