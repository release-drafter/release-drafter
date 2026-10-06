import nock from 'nock'
import { describe, expect, it } from 'vitest'
import { runDrafter } from '#tests/helpers/index.ts'
import {
  mockContext,
  mockGraphqlQuery,
  mocks,
  nockGetAndPatchReleases,
  nockGetAndPostReleases,
  nockGetPrFiles,
} from '#tests/mocks/index.ts'

describe('drafter e2e', () => {
  describe('push', () => {
    describe('to a master branch', () => {
      it('creates a release draft targeting that branch', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue('config')
        mocks.getContextsConfigWasFetchedFrom.mockReturnValue([
          {
            filepath: '.github/release-drafter.yml',
            scheme: 'github',
            ref: 'master',
            repo: { owner: 'toolmantim', repo: 'release-drafter' },
          },
          {
            filepath: '.github/release-drafter-base.yml',
            scheme: 'github',
            ref: undefined,
            repo: { owner: 'toolmantim', repo: '.github' },
          },
        ])

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
              "target_commitish": "master",
            },
          ]
        `)
        expect(
          mocks.core.info.mock.calls
            .flat()
            .filter((message) => message.startsWith('Config fetched')),
        ).toEqual([
          'Config fetched from "toolmantim/release-drafter/.github/release-drafter.yml@master".',
          'Config fetched from "toolmantim/.github/.github/release-drafter-base.yml" on the default branch.',
        ])
        expect(mocks.core.setOutput).toHaveBeenCalledWith('id', '11691725')
        expect(mocks.core.setOutput).toHaveBeenCalledWith(
          'html_url',
          'https://github.com/toolmantim/release-drafter-test-project/releases/tag/v2.0.0',
        )
        expect(mocks.core.setOutput).toHaveBeenCalledWith(
          'upload_url',
          'https://uploads.github.com/repos/toolmantim/release-drafter-test-project/releases/11691725/assets{?name,label}',
        )
        expect(mocks.core.setOutput).toHaveBeenCalledWith('tag_name', 'v2.0.0')
        expect(mocks.core.setOutput).toHaveBeenCalledWith(
          'name',
          'v2.0.0 (✏️ Code Name)',
        )

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
              "target_commitish": "some-branch",
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
          suppressRecentPullRequestMock: true,
        })

        const scope = nockGetAndPostReleases({ fetchedReleases: ['release'] })
        const tagScope = nock('https://api.github.com')
          .post(
            '/graphql',
            (body) =>
              body.query.includes('query resolveCommitish') &&
              body.variables.expression === 'refs/tags/v1.0.0^{commit}',
          )
          .reply(200, {
            data: {
              repository: {
                object: {
                  __typename: 'Commit',
                  oid: '1496a1f82f32f240f7cbe1a42eb0b0c7a06a5093',
                },
              },
            },
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
              "target_commitish": "1496a1f82f32f240f7cbe1a42eb0b0c7a06a5093",
            },
          ]
        `)

        expect(scope.pendingMocks().length).toBe(0) // should call the mocked endpoints
        expect(tagScope.pendingMocks().length).toBe(0)
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "some-branch",
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
              "target_commitish": "master",
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
                "target_commitish": "master",
              },
            ]
          `)

          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })
      })

      describe('with group-changes config', () => {
        it('creates a new draft with matching changes merged into one entry', async () => {
          await mockContext('push')
          mocks.config.mockReturnValue('config-with-group-changes')

          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-dependabot-bumps',
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
            [
              {
                "body": "* Bump njord.version from 0.9.1 to 0.9.5 (#308, #310, #316) [@dependabot[bot]](https://github.com/apps/dependabot)
            * Bump org.codehaus.mojo:versions-maven-plugin from 2.20.1 to 2.21.0 (#309) [@dependabot[bot]](https://github.com/apps/dependabot)",
                "draft": true,
                "make_latest": "true",
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
              "target_commitish": "master",
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
                "target_commitish": "master",
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
              "target_commitish": "master",
            },
          ]
        `)
        expect(mocks.core.setOutput).toHaveBeenCalledWith('id', '11691725')
        expect(mocks.core.setOutput).toHaveBeenCalledWith(
          'html_url',
          'https://github.com/toolmantim/release-drafter-test-project/releases/tag/v2.0.0',
        )
        expect(mocks.core.setOutput).toHaveBeenCalledWith(
          'upload_url',
          'https://uploads.github.com/repos/toolmantim/release-drafter-test-project/releases/11691725/assets{?name,label}',
        )
        expect(mocks.core.setOutput).toHaveBeenCalledWith('tag_name', 'v2.0.0')
        expect(mocks.core.setOutput).toHaveBeenCalledWith(
          'name',
          'v2.0.0 (✏️ Code Name)',
        )

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
              "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
              },
            ]
          `)
          expect(scope.isDone()).toBe(true) // should call the mocked endpoints
          expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        })
      })

      describe('with associated pull requests from another repository', () => {
        it('excludes pull requests targeting another repository', async () => {
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
            * Bug fixes (#25) @jetersen, @TimonVS
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
                "target_commitish": "master",
              },
            ]
          `)
          expect(mocks.core.info).toHaveBeenCalledWith(
            'Found 8 merged pull requests targeting toolmantim/release-drafter-test-project: #28, #27, #25, #24, #23, #5, #4, #1',
          )
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
              "target_commitish": "master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })
  })

  describe('recent PR safety net', () => {
    it('recovers a PR missing from GraphQL associatedPullRequests index via direct PR query', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config')

      const gqlScope = mockGraphqlQuery([
        { payload: 'graphql-comparison-missing-pr' },
        {
          query: 'query findRecentMergedPullRequests',
          payload: 'graphql-recent-merged-prs',
        },
      ])

      const scope = nockGetAndPostReleases({ fetchedReleases: ['release'] })

      await runDrafter()

      expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": "# What's Changed

        * Add new feature (#6) @TimonVS
        ",
            "draft": true,
            "make_latest": "true",
            "name": "",
            "prerelease": false,
            "tag_name": "",
            "target_commitish": "master",
          },
        ]
      `)

      expect(scope.isDone()).toBe(true)
      expect(gqlScope.pendingMocks().length).toBe(0)
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })

    it('respects include-paths when recovering missing PRs', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-include-paths')

      const gqlScope = mockGraphqlQuery([
        {
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-missing-pr-with-paths',
        },
        {
          query: 'query findRecentMergedPullRequests',
          payload: 'graphql-recent-merged-prs-with-paths',
        },
      ])

      const scope = nockGetAndPostReleases({ fetchedReleases: ['release'] })
      const fileScopes = nockGetPrFiles({
        repo: {
          owner: 'toolmantim',
          repo: 'release-drafter-test-project',
        },
        entries: [
          [100, ['src/5.md']],
          [101, ['other/file.md']],
        ],
      })

      await runDrafter()

      expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "body": "# What's Changed
        * Touches src (#100) @TimonVS
        ",
            "draft": true,
            "make_latest": "true",
            "name": "v2.0.1 (Code name: Placeholder)",
            "prerelease": false,
            "tag_name": "v2.0.1",
            "target_commitish": "master",
          },
        ]
      `)

      expect(scope.isDone()).toBe(true)
      expect(fileScopes.every((fileScope) => fileScope.isDone())).toBe(true)
      expect(gqlScope.pendingMocks().length).toBe(0)
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })
  })
})
