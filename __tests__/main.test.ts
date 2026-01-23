import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  beforeAll,
  afterAll,
  Mock
} from 'vitest'
import * as core from '../__fixtures__/core'
import nock from 'nock'
import { mockGraphqlQuery } from '../__fixtures__/graphql'
import { getReleasePayload, nockGetReleases } from '../__fixtures__/releases'
import { getEnvMock } from '../__fixtures__/env'
import { run as actionRun } from 'src/actions/drafter/runner'
import path from 'path'
import { readFileSync } from 'fs'

const mockGetConfig = vi.hoisted<
  Mock<() => 'config.yml' | 'config-non-master-branch.yml' | undefined>
>(() => vi.fn(() => undefined))

vi.mock(import('src/common/load-config-file'), async (iom) => {
  const om = await iom()
  return {
    loadConfigFile: () => {
      const mockedConfig = mockGetConfig()
      if (mockedConfig) {
        const p = path.resolve(
          import.meta.dirname,
          '../__fixtures__',
          'config',
          mockedConfig
        )
        return readFileSync(p, 'utf8')
      } else {
        return om.loadConfigFile('release-drafter.yml')
      }
    }
  }
})

/**
 * Helper to run the action in an isolated module context.
 * Especially useful for `@actions/github` which reads from process.env
 * at import time.
 */
const run = async (...args: Parameters<typeof actionRun>) =>
  await (await import(`src/actions/drafter/runner`)).run(...args)

describe('release-drafter', () => {
  beforeAll(() => {
    // Disable actual network requests.
    nock.disableNetConnect()
    vi.mock('@actions/core', () => core)
  })

  afterAll(() => {
    nock.restore()
  })

  beforeEach(() => {
    nock('https://api.github.com')
      .post('/app/installations/179208/access_tokens')
      .reply(200, { token: 'test' })
  })

  afterEach(() => {
    nock.cleanAll()
    vi.resetAllMocks()
  })

  /**
   * ###################################
   * Release-drafter tests
   * ###################################
   */

  describe('push', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        const restoreLocalEnvironment = getEnvMock({
          payload: 'push'
        })

        mockGetConfig.mockClear()

        await run()

        expect(core.setOutput).not.toHaveBeenCalled()
        expect(core.setFailed).toHaveBeenCalledWith(
          `Config file not found: ${path.resolve(import.meta.dirname, '..')}/.github/release-drafter.yml. Did you clone your sources ? (ex: using @actions/checkout)`
        )

        restoreLocalEnvironment()
      })
    })

    describe('to a non-master branch', () => {
      it('does nothing', async () => {
        const restoreLocalEnvironment = getEnvMock({
          payload: 'push-non-master-branch'
        })
        mockGetConfig.mockReturnValue('config.yml')

        const scope = nock('https://api.github.com')
          .post('/repos/:owner/:repo/releases')
          .reply(200)
          .patch('/repos/:owner/:repo/releases/:release_id')
          .reply(200)

        await run()

        expect(scope.isDone()).toBe(false) // should NOT call the mocked endpoints
        expect(core.setOutput).not.toHaveBeenCalled()
        expect(core.setFailed).not.toHaveBeenCalled()

        restoreLocalEnvironment()
      })

      describe('when configured for that branch', () => {
        it('creates a release draft targeting that branch', async () => {
          const restoreLocalEnvironment = getEnvMock({
            payload: 'push-non-master-branch'
          })
          mockGetConfig.mockReturnValue('config-non-master-branch.yml')

          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-commits-no-prs.json'
          })

          const scope = nockGetReleases({ releaseFiles: ['release.json'] })
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "# What's Changed

                  * No changes
                  ",
                    "draft": true,
                    "make_latest": "true",
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/some-branch",
                  }
                `)
                return true
              }
            )
            .reply(200, getReleasePayload('release.json'))

          await run()

          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(core.setFailed).not.toHaveBeenCalled()

          restoreLocalEnvironment()
        })
      })
    })

    describe('to a tag', () => {
      it('creates a release draft', async () => {
        const restoreLocalEnvironment = getEnvMock({
          payload: 'push-tag'
        })
        mockGetConfig.mockReturnValue('config.yml')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit.json'
        })

        const scope = nockGetReleases({ releaseFiles: ['release.json'] })
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "# What's Changed

                  * Add documentation (#5) @TimonVS
                  * Update dependencies (#4) @TimonVS
                  * Bug fixes (#3) @TimonVS
                  * Add big feature (#2) @TimonVS
                  * 👽 Add alien technology (#1) @TimonVS
                  ",
                    "draft": true,
                    "make_latest": "true",
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "",
                  }
                `)
              return true
            }
          )
          .reply(200, getReleasePayload('release.json'))

        await run()

        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(core.setFailed).not.toHaveBeenCalled()

        restoreLocalEnvironment()
      })
    })
  })
})
