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

// Mocks should be declared before the module being tested is imported.

describe('release-drafter', () => {
  beforeAll(() => {
    // Disable actual network requests.
    nock.disableNetConnect()

    jest.unstable_mockModule('@actions/core', () => core)
  })

  beforeEach(() => {})

  afterEach(() => {
    jest.resetAllMocks()
    jest.unstable_unmockModule('@actions/core')
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
  })
})
