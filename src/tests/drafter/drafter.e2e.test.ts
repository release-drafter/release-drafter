import nock from 'nock'
import { describe, expect, it } from 'vitest'
import { runDrafter } from '../helpers'
import {
  getGqlPayload,
  mockContext,
  mockGraphqlQuery,
  mockInput,
  mocks,
  nockGetAndPatchReleases,
  nockGetAndPostReleases,
  nockGetReleases,
} from '../mocks'

describe('drafter e2e', () => {
  describe('push', () => {
    describe('to a master branch', () => {
      it('creates a release draft targeting that branch', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-no-prs',
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
          payload: 'graphql-comparison-no-prs',
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
          payload: 'graphql-comparison-merge-commit',
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
      it('inserts no comparison baseline warning, and $PREVIOUS_TAG to blank', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-previous-tag')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })

        const scope = nockGetAndPostReleases({ fetchedReleases: [] })

        await runDrafter()

        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Changes:
          * No changes

          Previous tag: ''

          ---
          > [!WARNING]
          > Release Drafter could not find a previous **published release** for \`toolmantim/release-drafter-test-project\`. This draft was created **without a comparison baseline**.

          > [!IMPORTANT]
          > Treat this draft as a manual starting point.
          > Review the proposed version, tag, and notes before publishing.

          If you did not expect this to happen, [open an issue](https://github.com/release-drafter/release-drafter/issues/new?template=previous-published-release-not-found.yml).

          ---
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
        expect(gqlScope.isDone()).toBe(false) // gql not called
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with past releases', () => {
      it('creates a new draft listing the changes', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')

        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'release', 'release-3'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          payload: 'graphql-comparison-merge-commit',
        })
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'release', 'release-3'],
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
          payload: 'graphql-comparison-merge-commit',
        })
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
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
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
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
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
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
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
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
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "A big thanks to: @TimonVS",
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
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-empty',
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
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "A big thanks to: No contributors",
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
          payload: 'graphql-comparison-empty',
        })
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'release', 'release-3'],
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
            payload: 'graphql-comparison-empty',
          })
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
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
      it("updates the existing release's body", async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')

        const scope = nockGetAndPatchReleases({
          fetchedReleases: ['release', 'release-draft'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          'config-with-categories-with-other-category',
        )

        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-overlapping-label',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-overlapping-label',
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
          'config-with-categories-with-collapse-after',
        )

        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release-2', 'pre-release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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

    describe('with include-pre-releases input override', () => {
      it('includes pre releases when the input is true', async () => {
        await mockContext('push')
        await mockInput('include-pre-releases', 'true')
        mocks.config.mockReturnValue('config-with-include-pre-releases-false')

        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'pre-release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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

      it('does not include pre releases when the input is false', async () => {
        await mockContext('push')
        await mockInput('include-pre-releases', 'false')
        mocks.config.mockReturnValue('config-with-include-pre-releases-true')

        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release-2', 'pre-release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })

        await runDrafter()

        const lastCallBody = mocks.postReleaseBody.mock.lastCall?.at(
          0,
        ) as unknown as { name: string; tag_name: string } | undefined
        expect(lastCallBody?.name).not.toBe('v1.5.0')
        expect(lastCallBody?.tag_name).not.toBe('v1.5.0')

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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          'config-with-major-minor-patch-version-template',
        )
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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

      describe('component helper variables', () => {
        it('with default version template', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-component-helpers-default')
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "Component helpers with default template behavior:
            - MAJOR: 3.0.0
            - MAJOR_MAJOR: 3
            - MAJOR_MINOR: 0
            - MAJOR_PATCH: 0

            - MINOR: 2.1.0
            - MINOR_MAJOR: 2
            - MINOR_MINOR: 1
            - MINOR_PATCH: 0

            - PATCH: 2.0.1
            - PATCH_MAJOR: 2
            - PATCH_MINOR: 0
            - PATCH_PATCH: 1

            - PRERELEASE: 2.0.1-0
            - PRERELEASE_PRE: -0

            - Resolved : 2.0.1
            ",
                "draft": true,
                "make_latest": "true",
                "name": "Release Drafter v2.0.1",
                "prerelease": false,
                "tag_name": "v2.0.1",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)
          expect(scope.isDone()).toBe(true)
          expect(gqlScope.isDone()).toBe(true)
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })

        it('with $MAJOR.$MINOR template', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue(
            'config-with-component-helpers-major-minor',
          )
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "Component helpers with $MAJOR.$MINOR template:
            - MAJOR: 3.0
            - MAJOR_MAJOR: 3
            - MAJOR_MINOR: 0
            - MAJOR_PATCH: 0

            - MINOR: 2.1
            - MINOR_MAJOR: 2
            - MINOR_MINOR: 1
            - MINOR_PATCH: 0

            - PATCH: 2.0
            - PATCH_MAJOR: 2
            - PATCH_MINOR: 0
            - PATCH_PATCH: 1

            - PRERELEASE: 2.0
            - PRERELEASE_PRE: -0

            - Resolved : 2.0
            ",
                "draft": true,
                "make_latest": "true",
                "name": "Release Drafter v2.0",
                "prerelease": false,
                "tag_name": "v2.0",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)
          expect(scope.isDone()).toBe(true)
          expect(gqlScope.isDone()).toBe(true)
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })

        it('with $MAJOR template', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-component-helpers-major')
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "Component helpers with $MAJOR template:
            - MAJOR: 3
            - MAJOR_MAJOR: 3
            - MAJOR_MINOR: 0
            - MAJOR_PATCH: 0

            - MINOR: 2
            - MINOR_MAJOR: 2
            - MINOR_MINOR: 1
            - MINOR_PATCH: 0

            - PATCH: 2
            - PATCH_MAJOR: 2
            - PATCH_MINOR: 0
            - PATCH_PATCH: 1

            - PRERELEASE: 2
            - PRERELEASE_PRE: -0

            - Resolved : 2
            ",
                "draft": true,
                "make_latest": "true",
                "name": "Release Drafter v3",
                "prerelease": false,
                "tag_name": "v3",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)
          expect(scope.isDone()).toBe(true)
          expect(gqlScope.isDone()).toBe(true)
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })

        it('with custom format template', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-component-helpers-custom')
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "Component helpers with custom template:
            - MAJOR: Major: 3, Minor: 0, Patch: 0, Prerelease: 
            - MAJOR_MAJOR: 3
            - MAJOR_MINOR: 0
            - MAJOR_PATCH: 0

            - MINOR: Major: 2, Minor: 1, Patch: 0, Prerelease: 
            - MINOR_MAJOR: 2
            - MINOR_MINOR: 1
            - MINOR_PATCH: 0

            - PATCH: Major: 2, Minor: 0, Patch: 1, Prerelease: 
            - PATCH_MAJOR: 2
            - PATCH_MINOR: 0
            - PATCH_PATCH: 1

            - PRERELEASE: Major: 2, Minor: 0, Patch: 1, Prerelease: -0

            - Resolved : Major: 2, Minor: 0, Patch: 1, Prerelease: 
            ",
                "draft": true,
                "make_latest": "true",
                "name": "Release Drafter vMajor: 2, Minor: 0, Patch: 1, Prerelease: ",
                "prerelease": false,
                "tag_name": "vMajor: 2, Minor: 0, Patch: 1, Prerelease: ",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)
          expect(scope.isDone()).toBe(true)
          expect(gqlScope.isDone()).toBe(true)
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })

        it('with prerelease enabled', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue(
            'config-with-component-helpers-prerelease',
          )
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "Component helpers with prerelease:
            - MAJOR: 3.0.0
            - MAJOR_MAJOR: 3
            - MAJOR_MINOR: 0
            - MAJOR_PATCH: 0

            - MINOR: 2.1.0
            - MINOR_MAJOR: 2
            - MINOR_MINOR: 1
            - MINOR_PATCH: 0

            - PATCH: 2.0.1
            - PATCH_MAJOR: 2
            - PATCH_MINOR: 0
            - PATCH_PATCH: 1

            - PRERELEASE: 2.0.1-0
            - PRERELEASE_PRE: -0

            - Resolved : 2.0.1
            ",
                "draft": true,
                "make_latest": "false",
                "name": "Release Drafter v2.0.1",
                "prerelease": true,
                "tag_name": "v2.0.1",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)
          expect(scope.isDone()).toBe(true)
          expect(gqlScope.isDone()).toBe(true)
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })

        it('with prerelease and prerelease-identifier', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue(
            'config-with-component-helpers-prerelease-identifier',
          )
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "Component helpers with prerelease and identifier:
            - MAJOR: 3.0.0
            - MAJOR_MAJOR: 3
            - MAJOR_MINOR: 0
            - MAJOR_PATCH: 0

            - MINOR: 2.1.0
            - MINOR_MAJOR: 2
            - MINOR_MINOR: 1
            - MINOR_PATCH: 0

            - PATCH: 2.0.1
            - PATCH_MAJOR: 2
            - PATCH_MINOR: 0
            - PATCH_PATCH: 1

            - PRERELEASE: 2.0.1-beta.0
            - PRERELEASE_PRE: -beta.0

            - Resolved : 2.0.1-beta.0
            ",
                "draft": true,
                "make_latest": "false",
                "name": "Release Drafter v2.0.1-beta.0",
                "prerelease": true,
                "tag_name": "v2.0.1-beta.0",
                "target_commitish": "refs/heads/master",
              },
            ]
          `)
          expect(scope.isDone()).toBe(true)
          expect(gqlScope.isDone()).toBe(true)
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })
      })
    })

    describe('with header and footer config', () => {
      it('only header', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-header-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          'config-with-header-and-footer-no-nl-no-space-template',
        )
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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
          'I AM AWESOME_mockenv_strips_newline_and_trailing_spaces_',
        )
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
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

    describe('merging strategies', () => {
      describe('merge commit', () => {
        it('sets $CHANGES based on all commits', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config')
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-merge-commit',
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
      })

      describe('rebase merging', () => {
        it('sets $CHANGES based on all commits', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config')
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-rebase-merging',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "# What's Changed

            * Add documentation (#10) @TimonVS
            * Update dependencies (#9) @TimonVS
            * Bug fixes (#8) @TimonVS
            * Add big feature (#7) @TimonVS
            * 👽 Add alien technology (#6) @TimonVS
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

      describe('squash merging', () => {
        it('sets $CHANGES based on all commits', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config')
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-squash-merging',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "# What's Changed

            * Add documentation (#15) @TimonVS
            * Update dependencies (#14) @TimonVS
            * Bug fixes (#13) @TimonVS
            * Add big feature (#12) @TimonVS
            * 👽 Add alien technology (#11) @TimonVS
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

        it('Commit from previous release tag is not included', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config')
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release-shared-commit-date'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-squash-merging',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "# What's Changed

            * Add documentation (#15) @TimonVS
            * Update dependencies (#14) @TimonVS
            * Bug fixes (#13) @TimonVS
            * Add big feature (#12) @TimonVS
            * 👽 Add alien technology (#11) @TimonVS
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

      describe('with forked pull request', () => {
        it('exclude forked pull requests', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config')
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-forking',
          })
          await runDrafter()
          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "# What's Changed

            * Add documentation (#28) @jetersen
            * Update dependencies (#27) @jetersen
            * Bug fixes (#25) @jetersen
            * Add big feature (#24) @jetersen
            * Add alien technology (#23) @jetersen
            * Add documentation (#5) @TimonVS
            * Update dependencies (#4) @TimonVS
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
    })

    describe('pagination', () => {
      it('sets $CHANGES based on all commits', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope1 = mockGraphqlQuery({
          payload: 'graphql-comparison-paginated-1',
        })
        const gqlScope2 = mockGraphqlQuery({
          payload: 'graphql-comparison-paginated-2',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "# What's Changed

          * Added great distance (#16) @toolmantim
          * Oh hai (#15) @toolmantim
          * ❤️ Add MOAR THINGS (#14) @toolmantim
          * Add all the tests (#13) @toolmantim
          * 🤖 Add robots (#12) @toolmantim
          * 🎃 More pumpkins (#11) @toolmantim
          * 🐄 Moar cowbell (#10) @toolmantim
          * 1️⃣ Switch to a monorepo (#9) @toolmantim
          * 👽 Integrate Alien technology (#8) @toolmantim
          * Add ⛰ technology (#7) @toolmantim
          * 👽 Added alien technology (#6) @toolmantim
          * 🙅🏼‍♂️ 🐄 (#5) @toolmantim
          * 🐄 More cowbell (#4) @toolmantim
          * 🐒 Add monkeys technology (#3) @toolmantim
          * Adds a new Widgets API (#2) @toolmantim
          * Create new-feature.md (#1) @toolmantim
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
        expect(gqlScope1.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope2.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('custom replacers', () => {
      it('replaces a string', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-replacers')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "# What's Changed

          * Add documentation (#1000) @TimonVS
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
    })
  })

  describe('with sort-by config', () => {
    it('sorts by title', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-sort-by-title')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope1 = mockGraphqlQuery({
        payload: 'graphql-comparison-paginated-1',
      })
      const gqlScope2 = mockGraphqlQuery({
        payload: 'graphql-comparison-paginated-2',
      })
      await runDrafter()
      expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": "# What's Changed

        * 🤖 Add robots (#12) @toolmantim
        * 🙅🏼‍♂️ 🐄 (#5) @toolmantim
        * 👽 Integrate Alien technology (#8) @toolmantim
        * 👽 Added alien technology (#6) @toolmantim
        * 🐒 Add monkeys technology (#3) @toolmantim
        * 🐄 More cowbell (#4) @toolmantim
        * 🐄 Moar cowbell (#10) @toolmantim
        * 🎃 More pumpkins (#11) @toolmantim
        * ❤️ Add MOAR THINGS (#14) @toolmantim
        * Oh hai (#15) @toolmantim
        * Create new-feature.md (#1) @toolmantim
        * Adds a new Widgets API (#2) @toolmantim
        * Added great distance (#16) @toolmantim
        * Add ⛰ technology (#7) @toolmantim
        * Add all the tests (#13) @toolmantim
        * 1️⃣ Switch to a monorepo (#9) @toolmantim
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
      expect(gqlScope1.isDone()).toBe(true) // should call the mocked endpoints
      expect(gqlScope2.isDone()).toBe(true) // should call the mocked endpoints
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })
  })

  describe('with sort-direction config', () => {
    it('sorts ascending', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-sort-direction-ascending')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope = mockGraphqlQuery({
        payload: [
          'graphql-comparison-paginated-1',
          'graphql-comparison-paginated-2',
        ],
      })
      await runDrafter()
      expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": "# What's Changed

        * Create new-feature.md (#1) @toolmantim
        * Adds a new Widgets API (#2) @toolmantim
        * 🐒 Add monkeys technology (#3) @toolmantim
        * 🐄 More cowbell (#4) @toolmantim
        * 🙅🏼‍♂️ 🐄 (#5) @toolmantim
        * 👽 Added alien technology (#6) @toolmantim
        * Add ⛰ technology (#7) @toolmantim
        * 👽 Integrate Alien technology (#8) @toolmantim
        * 1️⃣ Switch to a monorepo (#9) @toolmantim
        * 🐄 Moar cowbell (#10) @toolmantim
        * 🎃 More pumpkins (#11) @toolmantim
        * 🤖 Add robots (#12) @toolmantim
        * Add all the tests (#13) @toolmantim
        * ❤️ Add MOAR THINGS (#14) @toolmantim
        * Oh hai (#15) @toolmantim
        * Added great distance (#16) @toolmantim
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

  describe('with include-paths config', () => {
    it('returns all PRs when not path filtered', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-include-paths')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope = mockGraphqlQuery([
        {
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-merge-commit',
        },
        {
          query: 'query findCommitsWithPathChangesQuery',
          payload: 'graphql-include-null-path-merge-commit',
        },
      ])
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

    it('returns the modified paths', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-include-paths')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope = mockGraphqlQuery([
        {
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-merge-commit',
        },
        {
          query: 'query findCommitsWithPathChangesQuery',
          payload: 'graphql-include-path-src-5.md-merge-commit',
        },
      ])
      await runDrafter()
      expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": "# What's Changed
        * Add documentation (#5) @TimonVS
        ",
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

    it('excludes commits that touch excluded paths from the release', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-exclude-paths')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope = mockGraphqlQuery([
        {
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-merge-commit',
        },
        {
          query: 'query findCommitsWithPathChangesQuery',
          payload: 'graphql-exclude-path-merge-commit',
        },
      ])
      await runDrafter()
      expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": "# What's Changed
        * Bug fixes (#3) @TimonVS
        * Add big feature (#2) @TimonVS
        * 👽 Add alien technology (#1) @TimonVS
        ",
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

    it('exclude takes precedence over include when both list the same path', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-include-exclude-paths')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope = mockGraphqlQuery([
        {
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-merge-commit',
        },
        {
          query: 'query findCommitsWithPathChangesQuery',
          payload: 'graphql-include-path-src-5.md-merge-commit',
        },
        {
          query: 'query findCommitsWithPathChangesQuery',
          payload: 'graphql-include-path-src-5.md-merge-commit',
        },
      ])
      await runDrafter()
      expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": "# What's Changed
        * No changes
        ",
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
  })

  describe('with pull-request-limit config', () => {
    it('uses the correct default when not specified', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope = nock('https://api.github.com')
        .post('/graphql', (body) => {
          if (
            body.query.includes('query findCommitsInComparison') &&
            body.variables.pullRequestLimit === 5
          ) {
            return true
          }
          return false
        })
        .reply(200, getGqlPayload('graphql-comparison-no-prs'))

      await runDrafter()

      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })

    it('requests the specified number of associated PRs', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-pull-request-limit')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope = nock('https://api.github.com')
        .post('/graphql', (body) => {
          if (
            body.query.includes('query findCommitsInComparison') &&
            body.variables.pullRequestLimit === 34
          ) {
            return true
          }
          return false
        })
        .reply(200, getGqlPayload('graphql-comparison-no-prs'))

      await runDrafter()

      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })
  })

  describe('with history-limit config', () => {
    it('uses the correct default when not specified', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope = nock('https://api.github.com')
        .post('/graphql', (body) => {
          if (
            body.query.includes('query findCommitsInComparison') &&
            body.variables.historyLimit === 15
          ) {
            return true
          }
          return false
        })
        .reply(200, getGqlPayload('graphql-comparison-no-prs'))

      await runDrafter()

      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })

    it('requests the specified number of associated PRs', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-history-limit')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const gqlScope = nock('https://api.github.com')
        .post('/graphql', (body) => {
          if (
            body.query.includes('query findCommitsInComparison') &&
            body.variables.historyLimit === 42
          ) {
            return true
          }
          return false
        })
        .reply(200, getGqlPayload('graphql-comparison-no-prs'))

      await runDrafter()

      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })
  })

  describe('config error handling', () => {
    it('schema error', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-schema-error')

      await runDrafter()

      expect(mocks.core.setFailed.mock.lastCall?.[0]).toMatchInlineSnapshot(`
        "[
          {
            "expected": "string",
            "code": "invalid_type",
            "path": [
              "replacers",
              0,
              "search"
            ],
            "message": "Invalid input: expected string, received null"
          }
        ]"
      `)
    })

    it('yaml exception', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-yaml-exception')

      await runDrafter()

      expect(mocks.core.setFailed.mock.lastCall?.[0]).toMatchInlineSnapshot(`
        "Unexpected block-seq-ind on same line with key at line 1, column 18:

        change-template: - #$NUMBER '$TITLE' @$AUTHOR
                         ^
        "
      `)
    })
  })

  describe('input publish, prerelease, version, tag and name overrides', () => {
    describe('with just the version', () => {
      it('forces the version on templates', async () => {
        await mockContext('push')
        await mockInput('version', '2.1.1')
        mocks.config.mockReturnValue('config-with-input-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.2.0, patch=2.1.2. Manual input version is 2.1.1.",
              "draft": true,
              "make_latest": "true",
              "name": "v2.1.1 (Code name: Placeholder)",
              "prerelease": false,
              "tag_name": "v2.1.1",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with just the tag', () => {
      it('gets the version from the tag and forces using the tag', async () => {
        await mockContext('push')
        await mockInput('tag', 'v2.1.1-alpha')
        mocks.config.mockReturnValue('config-with-input-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.2.0, patch=2.1.1. Manual input version is 2.1.1.",
              "draft": true,
              "make_latest": "true",
              "name": "v2.1.1 (Code name: Placeholder)",
              "prerelease": false,
              "tag_name": "v2.1.1-alpha",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with just the tag containing variables', () => {
      it('gets the version from the tag and expands variables in it', async () => {
        await mockContext('push')
        await mockInput('tag', 'v$RESOLVED_VERSION-RC1')
        mocks.config.mockReturnValue('config-with-name-and-tag-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=2.0.0, minor=1.1.0, patch=1.0.1.",
              "draft": true,
              "make_latest": "true",
              "name": "v1.0.0-beta (Code name: Hello World)",
              "prerelease": false,
              "tag_name": "v1.0.0-RC1",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with just the name', () => {
      it('gets the version from the name and forces using the name', async () => {
        await mockContext('push')
        await mockInput('name', 'v2.1.1-alpha (Code name: Foxtrot Unicorn)')
        mocks.config.mockReturnValue('config-with-input-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.2.0, patch=2.1.2. Manual input version is 2.1.1.",
              "draft": true,
              "make_latest": "true",
              "name": "v2.1.1-alpha (Code name: Foxtrot Unicorn)",
              "prerelease": false,
              "tag_name": "v2.1.1",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with just the name containing variables', () => {
      it('gets the version from the name and expands variables in it', async () => {
        await mockContext('push')
        await mockInput(
          'name',
          'v$RESOLVED_VERSION-RC1 (Code name: Hello World)',
        )
        mocks.config.mockReturnValue('config-with-name-and-tag-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=2.0.0, minor=1.1.0, patch=1.0.1.",
              "draft": true,
              "make_latest": "true",
              "name": "v1.0.0-RC1 (Code name: Hello World)",
              "prerelease": false,
              "tag_name": "v1.0.0-beta",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with publish: true', () => {
      it('immediately publishes the created draft', async () => {
        await mockContext('push')
        await mockInput('version', '2.1.1')
        await mockInput('publish', 'true')
        mocks.config.mockReturnValue('config-with-input-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.2.0, patch=2.1.2. Manual input version is 2.1.1.",
              "draft": false,
              "make_latest": "true",
              "name": "v2.1.1 (Code name: Placeholder)",
              "prerelease": false,
              "tag_name": "v2.1.1",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with input prerelease: true', () => {
      it('marks the created draft as prerelease', async () => {
        await mockContext('push')
        await mockInput('prerelease', 'true')
        mocks.config.mockReturnValue('config-with-input-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1. Manual input version is 2.0.1.",
              "draft": true,
              "make_latest": "false",
              "name": "v2.0.1 (Code name: Placeholder)",
              "prerelease": true,
              "tag_name": "v2.0.1",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('resolves tag with incremented prerelease identifier', async () => {
        await mockContext('push')
        await mockInput('prerelease', 'true')
        mocks.config.mockReturnValue('config-with-pre-release-identifier')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "This is a Pre-release with identifier.",
              "draft": true,
              "make_latest": "false",
              "name": "v2.0.1-alpha.0",
              "prerelease": true,
              "tag_name": "v2.0.1-alpha.0",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with input prerelease: true and input prerelease-identifier', () => {
      it('resolves tag with incremented pre-release identifier', async () => {
        await mockContext('push')
        await mockInput('prerelease', 'true')
        await mockInput('prerelease-identifier', 'beta')
        mocks.config.mockReturnValue('config-with-pre-release-identifier')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "This is a Pre-release with identifier.",
              "draft": true,
              "make_latest": "false",
              "name": "v2.0.1-beta.0",
              "prerelease": true,
              "tag_name": "v2.0.1-beta.0",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with input prerelease: false', () => {
      it('doesnt mark the created draft as prerelease', async () => {
        await mockContext('push')
        await mockInput('prerelease', 'false')
        mocks.config.mockReturnValue('config-with-input-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1. Manual input version is 2.0.1.",
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
    })

    describe('with input prerelease and publish: true', () => {
      it('marks the created release as a prerelease', async () => {
        await mockContext('push')
        await mockInput('prerelease', 'true')
        await mockInput('publish', 'true')
        mocks.config.mockReturnValue('config-with-input-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1. Manual input version is 2.0.1.",
              "draft": false,
              "make_latest": "false",
              "name": "v2.0.1 (Code name: Placeholder)",
              "prerelease": true,
              "tag_name": "v2.0.1",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with input prerelease: true and config file prerelease: false', () => {
      it('marks the created draft as prerelease', async () => {
        await mockContext('push')
        await mockInput('prerelease', 'true')
        mocks.config.mockReturnValue('config-without-prerelease')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "This isn't a Pre-release.",
              "draft": true,
              "make_latest": "false",
              "name": "",
              "prerelease": true,
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

    describe('with input prerelease: false and config file prerelease: true', () => {
      it('doesnt mark the created draft as prerelease', async () => {
        await mockContext('push')
        await mockInput('prerelease', 'false')
        mocks.config.mockReturnValue('config-with-prerelease')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "This is a Pre-release.",
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

    describe('without input prerelease and config file prerelease: true', () => {
      it('marks the created draft as a prerelease', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-prerelease')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "This is a Pre-release.",
              "draft": true,
              "make_latest": "false",
              "name": "",
              "prerelease": true,
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

    describe('without input prerelease and config file prerelease: false', () => {
      it('doesnt mark the created draft as a prerelease', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-without-prerelease')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "This isn't a Pre-release.",
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

    describe('with tag and name', () => {
      it('gets the version from the tag and forces using the tag and name', async () => {
        await mockContext('push')
        await mockInput('tag', 'v2.1.1-foxtrot-unicorn-alpha')
        await mockInput('name', 'Foxtrot Unicorn')
        mocks.config.mockReturnValue('config-with-input-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.2.0, patch=2.1.1. Manual input version is 2.1.1.",
              "draft": true,
              "make_latest": "true",
              "name": "Foxtrot Unicorn",
              "prerelease": false,
              "tag_name": "v2.1.1-foxtrot-unicorn-alpha",
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

  describe('resolved version', () => {
    describe('without previous releases, overriding the tag', () => {
      it('resolves to the version extracted from the tag', async () => {
        await mockContext('push')
        await mockInput('tag', 'v1.0.2')
        mocks.config.mockReturnValue('config-with-resolved-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: [],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-empty',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "## What's changed

          * No changes

          ## Contributors

          No contributors

          ## Previous release



          ---
          > [!WARNING]
          > Release Drafter could not find a previous **published release** for \`toolmantim/release-drafter-test-project\`. This draft was created **without a comparison baseline**.

          > [!IMPORTANT]
          > Treat this draft as a manual starting point.
          > Review the proposed version, tag, and notes before publishing.

          If you did not expect this to happen, [open an issue](https://github.com/release-drafter/release-drafter/issues/new?template=previous-published-release-not-found.yml).

          ---
          ",
              "draft": true,
              "make_latest": "true",
              "name": "v1.0.2 🌈",
              "prerelease": false,
              "tag_name": "v1.0.2",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(false) // gql not called
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with previous releases, overriding the tag', () => {
      it('resolves to the version extracted from the tag', async () => {
        await mockContext('push')
        await mockInput('tag', 'v1.0.2')
        mocks.config.mockReturnValue('config-with-resolved-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-no-prs',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "## What's changed

          * No changes

          ## Contributors

          No contributors

          ## Previous release

          v2.0.0
          ",
              "draft": true,
              "make_latest": "true",
              "name": "v1.0.2 🌈",
              "prerelease": false,
              "tag_name": "v1.0.2",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('without previous releases, no overrides', () => {
      it('resolves to the calculated version, which will be default', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-resolved-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: [],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-empty',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "## What's changed

          * No changes

          ## Contributors

          No contributors

          ## Previous release



          ---
          > [!WARNING]
          > Release Drafter could not find a previous **published release** for \`toolmantim/release-drafter-test-project\`. This draft was created **without a comparison baseline**.

          > [!IMPORTANT]
          > Treat this draft as a manual starting point.
          > Review the proposed version, tag, and notes before publishing.

          If you did not expect this to happen, [open an issue](https://github.com/release-drafter/release-drafter/issues/new?template=previous-published-release-not-found.yml).

          ---
          ",
              "draft": true,
              "make_latest": "true",
              "name": "v0.1.0 🌈",
              "prerelease": false,
              "tag_name": "v0.1.0",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(false) // gql not called
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with previous releases, no overrides', () => {
      it('resolves to the calculated version', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-resolved-version-template')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-no-prs',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "## What's changed

          * No changes

          ## Contributors

          No contributors

          ## Previous release

          v2.0.0
          ",
              "draft": true,
              "make_latest": "true",
              "name": "v2.0.1 🌈",
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
    })

    describe('with tag-prefix', () => {
      it('gets the version from the tag, stripping the prefix', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-tag-prefix')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
          fetchedReleasesOverrides: [
            { tag_name: 'static-tag-prefix-v2.1.4-RC3' },
          ],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-no-prs',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "## Previous release

          static-tag-prefix-v2.1.4-RC3
          ",
              "draft": true,
              "make_latest": "true",
              "name": "static-tag-prefix-v2.1.4 🌈",
              "prerelease": false,
              "tag_name": "static-tag-prefix-v2.1.4",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with custom version resolver', () => {
      it('uses correct default when no labels exist', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-custom-version-resolver-none')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-forking',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "dummy",
              "draft": true,
              "make_latest": "true",
              "name": "v2.1.0",
              "prerelease": false,
              "tag_name": "v2.1.0",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('when only patch label exists, use patch', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue(
          'config-with-custom-version-resolver-patch',
        )
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-forking',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "dummy",
              "draft": true,
              "make_latest": "true",
              "name": "v2.0.1",
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

      it('minor beats patch', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue(
          'config-with-custom-version-resolver-minor',
        )
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-forking',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "dummy",
              "draft": true,
              "make_latest": "true",
              "name": "v2.1.0",
              "prerelease": false,
              "tag_name": "v2.1.0",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('major beats others', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue(
          'config-with-custom-version-resolver-major',
        )
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-forking',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "dummy",
              "draft": true,
              "make_latest": "true",
              "name": "v3.0.0",
              "prerelease": false,
              "tag_name": "v3.0.0",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('major beats others partial config', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue(
          'config-with-custom-version-resolver-partial',
        )
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-forking',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "dummy",
              "draft": true,
              "make_latest": "true",
              "name": "v3.0.0",
              "prerelease": false,
              "tag_name": "v3.0.0",
              "target_commitish": "refs/heads/master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with commitish', () => {
      it('allows specification of a target commitish', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-with-commitish')
        const scope = nockGetAndPostReleases({
          fetchedReleases: ['release'],
        })
        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-forking',
        })
        await runDrafter()
        expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "dummy",
              "draft": true,
              "make_latest": "true",
              "name": "",
              "prerelease": false,
              "tag_name": "",
              "target_commitish": "staging",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with filter-by-range', () => {
      it('allows specification of a filter-by-range', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config-filter-range')
        const scope = nockGetAndPatchReleases({
          fetchedReleases: [
            'release-2',
            'release',
            'release-3',
            'release-draft',
          ],
        })
        const gqlScope = mockGraphqlQuery({
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-empty',
        })
        await runDrafter()
        expect(mocks.patchReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
          [
            {
              "body": "# There's new stuff!

          ---
          > [!WARNING]
          > Release Drafter could not find a previous **published release** for \`toolmantim/release-drafter-test-project\`. This draft was created **without a comparison baseline**.

          > [!IMPORTANT]
          > Treat this draft as a manual starting point.
          > Review the proposed version, tag, and notes before publishing.

          If you did not expect this to happen, [open an issue](https://github.com/release-drafter/release-drafter/issues/new?template=previous-published-release-not-found.yml).

          ---
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
        expect(gqlScope.isDone()).toBe(false) // gql not called
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })
  })

  describe('dry-run', () => {
    describe('when no existing draft release exists (create)', () => {
      it('does not perform any write operations and logs the payload', async () => {
        await mockContext('push')
        await mockInput('dry-run', 'true')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-no-prs',
        })

        // Only a GET scope — no POST scope, so any attempt to create a release
        // would trigger an unmatched-request error from nock.
        const scope = nockGetReleases({ releaseFiles: ['release'] })

        await runDrafter()

        // No write request should have been made
        expect(mocks.postReleaseBody).not.toHaveBeenCalled()

        // Dry-run message should have been logged
        const infoMessages = mocks.core.info.mock.calls.flat()
        expect(infoMessages.some((msg) => msg.includes('[dry-run]'))).toBe(true)

        expect(scope.isDone()).toBe(true) // GET releases was called
        expect(gqlScope.pendingMocks().length).toBe(0)
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('when an existing draft release exists (update)', () => {
      it('does not perform any write operations and logs the payload', async () => {
        await mockContext('push')
        await mockInput('dry-run', 'true')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-merge-commit',
        })

        // Only a GET scope — no PATCH scope, so any attempt to update a release
        // would trigger an unmatched-request error from nock.
        const scope = nockGetReleases({
          releaseFiles: ['release', 'release-draft'],
        })

        await runDrafter()

        // No write request should have been made
        expect(mocks.patchReleaseBody).not.toHaveBeenCalled()

        // Dry-run message should have been logged
        const infoMessages = mocks.core.info.mock.calls.flat()
        expect(infoMessages.some((msg) => msg.includes('[dry-run]'))).toBe(true)

        expect(scope.isDone()).toBe(true) // GET releases was called
        expect(gqlScope.pendingMocks().length).toBe(0)
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })
  })
})
