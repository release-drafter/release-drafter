import { describe, expect, it } from 'vitest'
import nock from 'nock'
import {
  getReleasePayload,
  nockGetReleases,
  mockContext,
  mockGraphqlQuery,
  core,
  mocks
} from './mocks'
import { runDrafter } from './helpers'
import path from 'path'

describe('release-drafter', () => {
  describe('push', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        await mockContext('push')

        mocks.config.mockClear()

        await runDrafter()

        expect(core.setOutput).not.toHaveBeenCalled()
        expect(core.setFailed).toHaveBeenCalledWith(
          `Config file not found: ${path.resolve(import.meta.dirname, '../..')}/.github/release-drafter.yml. Did you clone your sources ? (ex: using @actions/checkout)`
        )
      })
    })

    describe('to a non-master branch', () => {
      it('does nothing', async () => {
        await mockContext('push-non-master-branch')
        mocks.config.mockReturnValue('config')

        const scope = nock('https://api.github.com')
          .post('/repos/:owner/:repo/releases')
          .reply(200)
          .patch('/repos/:owner/:repo/releases/:release_id')
          .reply(200)

        await runDrafter()

        expect(scope.isDone()).toBe(false) // should NOT call the mocked endpoints
        expect(core.setOutput).not.toHaveBeenCalled()
        expect(core.setFailed).not.toHaveBeenCalled()
      })

      describe('when configured for that branch', () => {
        it('creates a release draft targeting that branch', async () => {
          await mockContext('push-non-master-branch')
          mocks.config.mockReturnValue('config-non-master-branch')

          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-commits-no-prs'
          })

          const scope = nockGetReleases({ releaseFiles: ['release'] })
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
            .reply(200, getReleasePayload('release'))

          await runDrafter()

          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(core.setFailed).not.toHaveBeenCalled()
        })
      })
    })

    describe('to a tag', () => {
      it('creates a release draft', async () => {
        await mockContext('push-tag')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit'
        })

        const scope = nockGetReleases({ releaseFiles: ['release'] })
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
          .reply(200, getReleasePayload('release'))

        await runDrafter()

        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(core.setFailed).not.toHaveBeenCalled()
      })
    })
  })
})
