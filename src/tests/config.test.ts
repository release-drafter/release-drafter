import { describe, expect, it, vi } from 'vitest'
import { composeConfigGet } from 'src/common/config'
import nock from 'nock'

const mocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}))

vi.mock(import('fs'), async (iom) => {
  const fs = await iom()
  return {
    ...fs,
    existsSync: mocks.existsSync,
    readFileSync: mocks.readFileSync
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
    params.repo.repo
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
        ref: 'main'
      }

      const endpoint = getContentEndpoint({
        ...context,
        path: endpointFilepath
      })
      const scope = nock('https://api.github.com')
        .get(endpoint)
        .reply(200, `template: fake-template-content`, {
          'content-type': 'application/vnd.github.v3.raw; charset=utf-8'
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
    it('should return config content using the file: scheme', async () => {
      const inputConfigName = 'file:../configs/release-drafter.yml'
      const workspace = '/home/runner/workspace'
      const endpointFilepath = workspace + '/configs/release-drafter.yml'
      const context = {
        repo: { owner: 'octocat', repo: 'hello-world' },
        ref: 'main'
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
        `"configs/release-drafter.yml"`
      )
      expect(res.config).toMatchInlineSnapshot(`
            {
              "template": "fake-template-content",
            }
          `)
    })
  })
  describe('with _extends', () => {
    describe('using the github: scheme', () => {
      it('should aggregate two configs in the same context', async () => {
        vi.stubEnv('GITHUB_TOKEN', 'test')
        const initialContext = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main'
        }
        const configChain = [
          {
            inputConfigName: 'release-drafter.yml',
            file: `_extends: common.yml\ntemplate: fake-template-content`,
            endpointFilepath: '.github/release-drafter.yml',
            endpoint: '',
            context: initialContext
          },
          {
            file: `template: overridden-content\nsaul: goodman`,
            endpointFilepath: '.github/common.yml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: 'hello-world' },
              ref: 'main'
            }
          }
        ].map((c) => ({
          ...c,
          endpoint: getContentEndpoint({
            ...c.context,
            path: c.endpointFilepath
          })
        }))

        const scope = nock('https://api.github.com')
          .get((uri) => configChain.map((c) => c.endpoint).includes(uri))
          .times(configChain.length)
          .reply(
            200,
            (uri) => configChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8'
            }
          )

        const res = await composeConfigGet(
          configChain[0].inputConfigName as string,
          initialContext
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
          ref: 'main'
        }
        const configChain = [
          {
            inputConfigName: 'release-drafter.yml',
            file: `_extends: .github:/configs/common.yml\ntemplate: fake-template-content`,
            endpointFilepath: '.github/release-drafter.yml',
            endpoint: '',
            context: initialContext
          },
          {
            file: `template: overridden-content\nsaul: goodman`,
            endpointFilepath: 'configs/common.yml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' }
            }
          }
        ].map((c) => ({
          ...c,
          endpoint: getContentEndpoint({
            ...c.context,
            path: c.endpointFilepath
          })
        }))

        const scope = nock('https://api.github.com')
          .get((uri) => configChain.map((c) => c.endpoint).includes(uri))
          .times(configChain.length)
          .reply(
            200,
            (uri) => configChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8'
            }
          )

        const res = await composeConfigGet(
          configChain[0].inputConfigName as string,
          initialContext
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
          ref: 'main'
        }
        const configChain = [
          {
            inputConfigName: 'release-drafter.yml',
            file: `_extends: .github:/configs/common.yml\ntemplate: fake-template-content`,
            endpointFilepath: '.github/release-drafter.yml',
            endpoint: '',
            context: initialContext
          },
          {
            file: `_extends: hello-world:release-drafter.yml@main\ntemplate: overridden-content\nsaul: goodman`,
            endpointFilepath: 'configs/common.yml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' }
            }
          }
        ].map((c) => ({
          ...c,
          endpoint: getContentEndpoint({
            ...c.context,
            path: c.endpointFilepath
          })
        }))

        const scope = nock('https://api.github.com')
          .get((uri) => configChain.map((c) => c.endpoint).includes(uri))
          .times(configChain.length + 1) // recursion !
          .reply(
            200,
            (uri) => configChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8'
            }
          )

        const res = await composeConfigGet(
          configChain[0].inputConfigName as string,
          initialContext
        )

        expect(mocks.existsSync).not.toHaveBeenCalled()
        expect(mocks.readFileSync).not.toHaveBeenCalled()

        expect((await import('@actions/core')).warning).toHaveBeenCalledWith(
          'Recursion detected. Configuration with identical content was already loaded. Ignoring "_extends: .github:/configs/common.yml".'
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
          ref: 'main'
        }
        const configChain = Array.from({ length: 34 }, (_, i) => i)
          .map((i) => ({
            inputConfigName: `release-drafter-${i}.yml`,
            file: `_extends: ./release-drafter-${i + 1}.yml\ntemplate: fake-template-content\niteration: ${i}`,
            endpointFilepath: `.github/release-drafter-${i}.yml`,
            endpoint: '',
            context: initialContext
          }))
          .map((c) => ({
            ...c,
            endpoint: getContentEndpoint({
              ...c.context,
              path: c.endpointFilepath
            })
          }))

        const scope = nock('https://api.github.com')
          .get((uri) => configChain.map((c) => c.endpoint).includes(uri))
          .times(configChain.length)
          .reply(
            200,
            (uri) => configChain.find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8'
            }
          )

        await expect(
          composeConfigGet(
            configChain[0].inputConfigName as string,
            initialContext
          )
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[Error: Maximum extends depth (33) exceeded. Check for circular dependencies or reduce the chain of extended configurations.]`
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
          ref: 'main'
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: workspace + '/.github/release-drafter.yml',
            file: `_extends: file:./common.json\ntemplate: fake-template-content`
          },
          {
            pathToFile: workspace + '/.github/common.json',
            file: `{"template": "overridden-content","saul": "goodman", "_extends": "file:../top-level.yaml"}`
          },
          {
            pathToFile: workspace + '/top-level.yaml',
            file: `better: call`
          }
        ]

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) => configChain.find((c) => c.pathToFile === path)?.file
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
          ref: 'main'
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: workspace + '/.github/release-drafter.yml',
            file: `_extends: file:/configs/common.yml\ntemplate: fake-template-content`
          },
          {
            pathToFile: workspace + '/configs/common.yml',
            file: `template: overridden-content\nsaul: goodman`
          }
        ]

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) => configChain.find((c) => c.pathToFile === path)?.file
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
          ref: 'main'
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: workspace + '/.github/release-drafter.yml',
            file: `_extends: file:./common.json\ntemplate: fake-template-content`
          },
          {
            pathToFile: workspace + '/.github/common.json',
            file: `{"template": "overridden-content","saul": "goodman", "_extends": ".github:/top-level.yaml"}`
          },
          {
            file: `better: call`,
            endpointFilepath: 'top-level.yaml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' }
            }
          }
        ].map((c) => ({
          ...c,
          endpoint: c.endpointFilepath
            ? getContentEndpoint({
                ...c.context,
                path: c.endpointFilepath
              })
            : undefined
        }))

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) => configChain.find((c) => c.pathToFile === path)?.file
        )

        const scope = nock('https://api.github.com')
          .get((uri) =>
            configChain
              .filter((c) => !!c.endpoint)
              .map((c) => c.endpoint)
              .includes(uri)
          )
          .times(configChain.filter((c) => !!c.endpoint).length)
          .reply(
            200,
            (uri) =>
              configChain
                .filter((c) => !!c.endpoint)
                .find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8'
            }
          )

        const res = await composeConfigGet(inputConfigName, context)

        expect(mocks.existsSync).toHaveBeenCalledTimes(
          configChain.filter((c) => !!c.pathToFile).length * 2
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
    describe('using the github: and then the file: scheme', () => {
      it('should throw an error', async () => {
        const workspace = '/home/runner/workspace'
        vi.stubEnv('GITHUB_TOKEN', 'test')
        vi.stubEnv('GITHUB_WORKSPACE', workspace)
        const context = {
          repo: { owner: 'octocat', repo: 'hello-world' },
          ref: 'main'
        }
        const inputConfigName = 'file:release-drafter.yml'
        const configChain = [
          {
            pathToFile: workspace + '/.github/release-drafter.yml',
            file: `_extends: file:./common.json\ntemplate: fake-template-content`
          },
          {
            pathToFile: workspace + '/.github/common.json',
            file: `{"template": "overridden-content","saul": "goodman", "_extends": ".github:/top-level.yaml"}`
          },
          {
            file: `better: call\n_extends: this-is-remote.json@v6`,
            endpointFilepath: 'top-level.yaml',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' }
            }
          },
          {
            file: `{"_extends": "file:/sould-not-be-imported.yaml", "the": {"cake": {"is": "a lie"}}}`,
            endpointFilepath: '.github/this-is-remote.json',
            endpoint: '',
            context: {
              repo: { owner: 'octocat', repo: '.github' },
              ref: 'v6'
            }
          }
        ].map((c) => ({
          ...c,
          endpoint: c.endpointFilepath
            ? getContentEndpoint({
                ...c.context,
                path: c.endpointFilepath
              })
            : undefined
        }))

        mocks.existsSync.mockReturnValue(true)
        mocks.readFileSync.mockImplementation(
          (path: string) => configChain.find((c) => c.pathToFile === path)?.file
        )

        const scope = nock('https://api.github.com')
          .get((uri) =>
            configChain
              .filter((c) => !!c.endpoint)
              .map((c) => c.endpoint)
              .includes(uri)
          )
          .times(configChain.filter((c) => !!c.endpoint).length)
          .reply(
            200,
            (uri) =>
              configChain
                .filter((c) => !!c.endpoint)
                .find((c) => c.endpoint === uri)?.file,
            {
              'content-type': 'application/vnd.github.v3.raw; charset=utf-8'
            }
          )

        await expect(
          composeConfigGet(inputConfigName, context)
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `[Error: The '_extends' import-chain cannot contain github: to file: scheme transitions. Please change '_extends: file:/sould-not-be-imported.yaml' to use the github: scheme. ex: '_extends: octocat/.github:/sould-not-be-imported.yaml']`
        )

        expect(mocks.existsSync).toHaveBeenCalledTimes(
          configChain.filter((c) => !!c.pathToFile).length * 2
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
