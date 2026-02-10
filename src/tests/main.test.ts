import { describe, expect, it } from 'vitest'
import {
  mockContext,
  mockGraphqlQuery,
  mocks,
  nockGetAndPostReleases,
  nockGetAndPatchReleases,
  mockInput
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with past releases', () => {
      it('creates a new draft listing the changes', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')

        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'release', 'release-3']
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit'
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
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
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })
      })
    })

    describe('with no changes since the last release', () => {
      it('creates a new draft with no changes', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-empty'
        })
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'release', 'release-3']
        })
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
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      describe('with custom no-changes-template config', () => {
        it('creates a new draft with the template', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-changes-templates')

          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-commits-empty'
          })
          const scope = nockGetAndPostReleases({
            fetchedReleases: []
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "* No changes mmkay",
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
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })
      })
    })

    describe('with an existing draft release', () => {
      it('updates the existing release’s body', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')

        const scope = nockGetAndPatchReleases({
          fetchedReleases: ['release-draft']
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit'
        })

        await runDrafter()

        expect(mocks.patchReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
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
              "name": "v3.0.0-beta",
              "prerelease": false,
              "tag_name": "v3.0.0-beta",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)

        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with owner and repository templating', () => {
      it('include full-changelog link in output', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-compare-link')

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
              "body": "# What's Changed

          * Add documentation (#5) @TimonVS
          * Update dependencies (#4) @TimonVS

          ## 🚀 Features

          * Add big feature (#2) @TimonVS
          * 👽 Add alien technology (#1) @TimonVS

          ## 🐛 Bug Fixes

          * Bug fixes (#3) @TimonVS

          **Full Changelog**: https://github.com/toolmantim/release-drafter-test-project/compare/v2.0.0...v2.0.1
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with categories config', () => {
      it('categorizes pull requests with single label', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-categories')

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
              "body": "# What's Changed

          * Add documentation (#5) @TimonVS
          * Update dependencies (#4) @TimonVS

          ## 🚀 Features

          * Add big feature (#2) @TimonVS
          * 👽 Add alien technology (#1) @TimonVS

          ## 🐛 Bug Fixes

          * Bug fixes (#3) @TimonVS
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('categorizes pull requests with other category at the bottom', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue(
          'config-with-categories-with-other-category'
        )

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
              "body": "# What's Changed

          ## 🚀 Features

          * Add big feature (#2) @TimonVS
          * 👽 Add alien technology (#1) @TimonVS

          ## 🐛 Bug Fixes

          * Bug fixes (#3) @TimonVS

          ## 📝 Other Changes

          * Add documentation (#5) @TimonVS
          * Update dependencies (#4) @TimonVS
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('categorizes pull requests with multiple labels', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-categories-2')

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
              "body": "# What's Changed

          * Add documentation (#5) @TimonVS
          * Update dependencies (#4) @TimonVS

          ## 🚀 Features

          * Add big feature (#2) @TimonVS
          * 👽 Add alien technology (#1) @TimonVS

          ## 🐛 Bug Fixes

          * Bug fixes (#3) @TimonVS
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('categorizes pull requests with overlapping labels', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-categories-3')

        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release']
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-overlapping-label'
        })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "# What's Changed

          * Add documentation (#22) @jetersen
          * Update dependencies (#21) @jetersen

          ## 🚀 Features

          * Add big feature (#19) @jetersen
          * Add alien technology (#18) @jetersen

          ## 🐛 Bug Fixes

          * Bug fixes (#20) @jetersen
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('categorizes pull requests with overlapping labels into multiple categories', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-categories-4')

        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release']
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-overlapping-label'
        })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "# What's Changed

          * Add documentation (#22) @jetersen
          * Update dependencies (#21) @jetersen

          ## 🚀 Features

          * Add big feature (#19) @jetersen
          * Add alien technology (#18) @jetersen

          ## 🐛 Bug Fixes

          * Bug fixes (#20) @jetersen

          ## 🎖️ Sentry

          * Bug fixes (#20) @jetersen
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('categorizes pull requests with a collapsed category', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue(
          'config-with-categories-with-collapse-after'
        )

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
              "body": "# What's Changed

          * Update dependencies (#4) @TimonVS

          ## 🚀 All the things!

          <details>
          <summary>4 changes</summary>

          * Add documentation (#5) @TimonVS
          * Bug fixes (#3) @TimonVS
          * Add big feature (#2) @TimonVS
          * 👽 Add alien technology (#1) @TimonVS
          </details>
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with include-pre-releases true config', () => {
      it('includes pre releases', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-include-pre-releases-true')

        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'pre-release']
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-commits-merge-commit'
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
              "name": "v1.5.0",
              "prerelease": false,
              "tag_name": "v1.5.0",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)

        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with exclude-labels config', () => {
      it('excludes pull requests', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-exclude-labels')
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
                "body": "# What's Changed

            * Update dependencies (#4) @TimonVS

            ## 🚀 Features

            * Add big feature (#2) @TimonVS
            * 👽 Add alien technology (#1) @TimonVS

            ## 🐛 Bug Fixes

            * Bug fixes (#3) @TimonVS
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with include-labels config', () => {
      it('includes pull requests', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-include-labels')
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
              "body": "# What's Changed

          ## 🚀 Features

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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with version-template config', () => {
      it('generates next version variables as major.minor.patch', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue(
          'config-with-major-minor-patch-version-template'
        )
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('generates next version variables as major.minor', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-major-minor-version-template')
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
              "body": "Placeholder with example. Automatically calculated values are next major=3.0 (major=3, minor=0, patch=0), minor=2.1 (major=2, minor=1, patch=0), patch=2.0 (major=2, minor=0, patch=1)",
              "draft": true,
              "make_latest": "true",
              "name": "v2.1 (Code name: Placeholder)",
              "prerelease": false,
              "tag_name": "v2.1",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('generates next version variables as major', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-major-version-template')
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
              "body": "Placeholder with example. Automatically calculated values are next major=3 (major=3, minor=0, patch=0), minor=2 (major=2, minor=1, patch=0), patch=2 (major=2, minor=0, patch=1)",
              "draft": true,
              "make_latest": "true",
              "name": "v3 (Code name: Placeholder)",
              "prerelease": false,
              "tag_name": "v3",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with header and footer config', () => {
      it('only header', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-header-template')
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
              "body": "This is at top
          This is the template in the middle
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
      it('only footer', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-footer-template')
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
              "body": "This is the template in the middle
          This is at bottom
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
      it('header and footer', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-header-and-footer-template')
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
              "body": "This is at top
          This is the template in the middle
          This is at bottom
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
      it('header and footer without line break and without space', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue(
          'config-with-header-and-footer-no-nl-no-space-template'
        )
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
              "body": "This is at topThis is the template in the middleThis is at bottom",
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
      it('only header from input', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-header-template')
        await mockInput(
          'header',
          'I AM AWESOME_mockenv_strips_newline_and_trailing_spaces_'
        )
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
              "body": "I AM AWESOME_mockenv_strips_newline_and_trailing_spaces_This is the template in the middle
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
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })
  })
})
