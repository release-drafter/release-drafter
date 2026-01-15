import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import nock from 'nock'
import { mockConfig, unmockConfig } from '../__fixtures__/config.js'
import { mockGraphqlQuery } from '../__fixtures__/graphql.js'
import { getReleasePayload, nockGetReleases } from '../__fixtures__/releases.js'
import { getEnvMock } from '../__fixtures__/env.js'
import { run as actionRun } from '../src/main.js'
import path from 'path'

/**
 * Helper to run the action in an isolated module context.
 * Especially useful for `@actions/github` which reads from process.env
 * at import time.
 */
const run = (...args: Parameters<typeof actionRun>) =>
  jest.isolateModulesAsync(async () => {
    await (await import(`../src/main.js`)).run(...args)
  })

describe('release-drafter', () => {
  beforeAll(() => {
    // Disable actual network requests.
    nock.disableNetConnect()

    jest.unstable_mockModule('@actions/core', () => core)
  })

  afterAll(() => {
    nock.restore()
    jest.resetAllMocks()
    jest.unstable_unmockModule('@actions/core')
    unmockConfig()
  })

  beforeEach(() => {
    nock('https://api.github.com')
      .post('/app/installations/179208/access_tokens')
      .reply(200, { token: 'test' })
  })

  afterEach(() => {
    nock.cleanAll()
    jest.resetModules()
    jest.resetAllMocks()
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
        mockConfig({ file: 'config.yml' })

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
          mockConfig({ file: 'config-non-master-branch.yml' })

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

        mockConfig({ file: 'config.yml' })

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
