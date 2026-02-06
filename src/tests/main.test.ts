import { describe, expect, it } from 'vitest'
import {
  mockContext,
  mockGraphqlQuery,
  core,
  mocks,
  nockGetAndPostReleases
} from './mocks'
import { runDrafter } from './helpers'

describe('release-drafter', () => {
  describe('push', () => {
    describe('to a master branch', () => {
      it('creates a release draft targeting that branch', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-no-prs'
        })

        const scope = nockGetAndPostReleases({ fetchedReleases: ['release'] })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "# What's Changed

          * No changes
          ",
              "draft": true,
              "make_latest": "true",
              "name": "",
              "prerelease": false,
              "tag_name": "",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)

        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.pendingMocks().length).toBe(0) // should call the mocked endpoints
        expect(core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('to a non-master branch', () => {
      it('creates a release draft targeting that branch', async () => {
        await mockContext('push-non-master-branch')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-no-prs'
        })

        const scope = nockGetAndPostReleases({ fetchedReleases: ['release'] })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "# What's Changed

          * No changes
          ",
              "draft": true,
              "make_latest": "true",
              "name": "",
              "prerelease": false,
              "tag_name": "",
              "target_commitish": "refs/heads/some-branch",
            },
          ]
        `)

        expect(scope.pendingMocks().length).toBe(0) // should call the mocked endpoints
        expect(gqlScope.pendingMocks().length).toBe(0) // should call the mocked endpoints
        expect(core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('to a tag', () => {
      it('creates a release draft', async () => {
        await mockContext('push-tag')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit'
        })

        const scope = nockGetAndPostReleases({ fetchedReleases: ['release'] })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
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
            },
          ]
        `)

        expect(scope.pendingMocks().length).toBe(0) // should call the mocked endpoints
        expect(gqlScope.pendingMocks().length).toBe(0) // should call the mocked endpoints
        expect(core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with no past releases', () => {
      it('sets $CHANGES based on all commits, and $PREVIOUS_TAG to blank', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-previous-tag')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit'
        })

        const scope = nockGetAndPostReleases({ fetchedReleases: [] })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Changes:
          * Add documentation (#5) @TimonVS
          * Update dependencies (#4) @TimonVS
          * Bug fixes (#3) @TimonVS
          * Add big feature (#2) @TimonVS
          * 👽 Add alien technology (#1) @TimonVS

          Previous tag: ''
          ",
              "draft": true,
              "make_latest": "true",
              "name": "",
              "prerelease": false,
              "tag_name": "",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)

        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with past releases', () => {
      it('creates a new draft listing the changes', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit'
        })
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'release', 'release-3']
        })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
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
              "target_commitish": "refs/heads/master",
            },
          ]
        `)

        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(core.setFailed).not.toHaveBeenCalled()
      })

      it('creates a new draft non-master-branch', async () => {
        await mockContext('push-non-master-branch')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit'
        })
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'release', 'release-3']
        })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
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
              "target_commitish": "refs/heads/some-branch",
            },
          ]
        `)

        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(core.setFailed).not.toHaveBeenCalled()
      })

      it('makes next versions available as template placeholders', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-next-versioning')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit'
        })
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release']
        })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values are next major=3.0.0 (major=3, minor=0, patch=0), minor=2.1.0 (major=2, minor=1, patch=0), patch=2.0.1 (major=2, minor=0, patch=1)",
              "draft": true,
              "make_latest": "true",
              "name": "v2.0.1 (Code name: Placeholder)",
              "prerelease": false,
              "tag_name": "v2.0.1",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)

        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(core.setFailed).not.toHaveBeenCalled()
      })

      describe('with custom changes-template config', () => {
        it('creates a new draft using the template', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-changes-templates')

          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release']
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-commits-merge-commit'
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "* Change: #5 'Add documentation' @TimonVS
            * Change: #4 'Update dependencies' @TimonVS
            * Change: #3 'Bug fixes' @TimonVS
            * Change: #2 'Add big feature' @TimonVS
            * Change: #1 '👽 Add alien technology' @TimonVS",
                "draft": true,
                "make_latest": "true",
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)

          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(core.setFailed).not.toHaveBeenCalled()
        })
      })

      describe('with custom changes-template config that includes a pull request body', () => {
        it('creates a new draft using the template', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-changes-templates-and-body')

          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release']
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-commits-merge-commit'
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "* Change: #5 'Add documentation' ✍️ writing docs all day
            * Change: #4 'Update dependencies' 📦 Package time! 📦
            * Change: #3 'Bug fixes' 🐛 squashing
            * Change: #2 'Add big feature' ![I'm kind of a big deal](https://media.giphy.com/media/9LFBOD8a1Ip2M/giphy.gif)
            * Change: #1 '👽 Add alien technology' Space invasion 👾",
                "draft": true,
                "make_latest": "true",
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)

          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(core.setFailed).not.toHaveBeenCalled()
        })
      })

      describe('with custom changes-template config that includes a pull request URL', () => {
        it('creates a new draft using the template', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-changes-templates-and-url')

          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release']
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-commits-merge-commit'
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "* Change: https://github.com/toolmantim/release-drafter-test-project/pull/5 'Add documentation' @TimonVS
            * Change: https://github.com/toolmantim/release-drafter-test-project/pull/4 'Update dependencies' @TimonVS
            * Change: https://github.com/toolmantim/release-drafter-test-project/pull/3 'Bug fixes' @TimonVS
            * Change: https://github.com/toolmantim/release-drafter-test-project/pull/2 'Add big feature' @TimonVS
            * Change: https://github.com/toolmantim/release-drafter-test-project/pull/1 '👽 Add alien technology' @TimonVS",
                "draft": true,
                "make_latest": "true",
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)

          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(core.setFailed).not.toHaveBeenCalled()
        })
      })

      describe('with contributors config', () => {
        it('adds the contributors', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-contributors')

          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release']
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-commits-merge-commit'
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "A big thanks to: @TimonVS and Ada Lovelace",
                "draft": true,
                "make_latest": "true",
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)

          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(core.setFailed).not.toHaveBeenCalled()
        })

        it('uses no-contributors-template when there are no contributors', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-contributors')

          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release']
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-commits-empty'
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "A big thanks to: Nobody",
                "draft": true,
                "make_latest": "true",
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)

          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(core.setFailed).not.toHaveBeenCalled()
        })
      })

      describe('with exclude-contributors config', () => {
        it('excludes matching contributors by username', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-exclude-contributors')

          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release']
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-commits-merge-commit'
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "A big thanks to: Ada Lovelace",
                "draft": true,
                "make_latest": "true",
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)

          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(core.setFailed).not.toHaveBeenCalled()
        })
      })
    })
  })
})
