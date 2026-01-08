/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import nock from 'nock'
import { getGithubMock } from '../__fixtures__/github.js'
import mockedEnv, { RestoreFn } from 'mocked-env'
import { mockReleaseDrafterConfig } from '../__fixtures__/config.js'

// Mocks should be declared before the module being tested is imported.

describe('release-drafter', () => {
  let restoreEnvironment: RestoreFn

  beforeAll(() => {
    // Disable actual network requests.
    nock.disableNetConnect()

    jest.unstable_mockModule('@actions/core', () => core)
  })

  afterAll(() => {
    nock.restore()
    jest.unstable_unmockModule('@actions/core')
  })

  beforeEach(() => {
    nock('https://api.github.com')
      .post('/app/installations/179208/access_tokens')
      .reply(200, { token: 'test' })

    const mockEnvironment: Record<string, string | undefined> = {}

    /**
     * We have to delete all the GITHUB_* envs before every test, because if
     * we're running the tests themselves inside a GitHub Actions container
     * they'll mess with the tests, and also because we set some of them in
     * tests and we don't want them to leak into other tests.
     *
     * GITHUB_* variables are parsed by the `@actions/github` package to
     * populate the `github.context` object.
     *
     * This package is mocked in these tests, but we still want to ensure
     * that the environment is clean to avoid any unexpected issues.
     *
     * @see ../__fixtures__/github.ts
     */
    for (const key of Object.keys(process.env).filter((key) =>
      key.match(/^GITHUB_/)
    )) {
      mockEnvironment[key] = undefined
    }

    restoreEnvironment = mockedEnv(mockEnvironment)
  })

  afterEach(() => {
    nock.cleanAll()
    restoreEnvironment()
    jest.resetAllMocks()
    jest.unstable_unmockModule('@actions/github')
  })

  /**
   * ###################################
   * Release-drafter tests
   * ###################################
   */

  describe('push', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        // Mocks should be declared before the module being tested is imported.
        jest.unstable_mockModule('@actions/github', () =>
          getGithubMock({
            eventName: 'push',
            payload: 'push'
          })
        )

        // Mock config file missing
        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/contents/.github%2Frelease-drafter.yml'
          )
          .reply(404)
          .get(
            '/repos/toolmantim/.github/contents/.github%2Frelease-drafter.yml'
          )
          .reply(404)

        // The module being tested should be imported dynamically. This ensures that the
        // mocks are used in place of any actual dependencies.
        await (await import('../src/main.js')).run()

        expect(core.setOutput).not.toHaveBeenCalled()
        expect(core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('to a non-master branch', () => {
      it('does nothing', async () => {
        // Mocks should be declared before the module being tested is imported.
        jest.unstable_mockModule('@actions/github', () =>
          getGithubMock({
            eventName: 'push',
            payload: 'push-non-master-branch'
          })
        )

        mockReleaseDrafterConfig()

        nock('https://api.github.com')
          .post('/repos/:owner/:repo/releases')
          .reply(200, () => {
            throw new Error("Shouldn't create a new release")
          })
          .patch('/repos/:owner/:repo/releases/:release_id')
          .reply(200, () => {
            throw new Error("Shouldn't update an existing release")
          })

        // The module being tested should be imported dynamically. This ensures that the
        // mocks are used in place of any actual dependencies.
        await (await import('../src/main.js')).run()

        expect(core.setOutput).not.toHaveBeenCalled()
        expect(core.setFailed).not.toHaveBeenCalled()
      })
    })
  })
})
