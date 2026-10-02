import nock from 'nock'
import { describe, expect, it } from 'vitest'
import { runDrafter } from '#tests/helpers/index.ts'
import {
  mockContext,
  mockGraphqlQuery,
  mockInput,
  mocks,
  nockGetAndPatchReleases,
  nockGetAndPostReleases,
  nockGetReleases,
} from '#tests/mocks/index.ts'

describe('drafter e2e', () => {
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "name": "v0.0.1 🌈",
              "prerelease": false,
              "tag_name": "v0.0.1",
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with resolved tag templates', () => {
      it.each([
        { inputTag: undefined, tag: 'foobar_v2.1.1', version: '2.1.1' },
        {
          inputTag: 'override-v3.0.0',
          tag: 'override-v3.0.0',
          version: '3.0.0',
        },
        {
          inputTag: 'override-v$RESOLVED_VERSION',
          tag: 'override-v2.1.1',
          version: '2.1.1',
        },
      ])(
        'uses $tag in compare links and the release payload',
        async ({ inputTag, tag, version }) => {
          await mockContext('push')
          if (inputTag !== undefined) await mockInput('tag', inputTag)
          mocks.config.mockReturnValue('config-with-resolved-tag-template')
          const scope = nockGetAndPostReleases({
            fetchedReleases: ['release'],
            fetchedReleasesOverrides: [{ tag_name: 'foobar_v2.1.0' }],
          })
          const gqlScope = mockGraphqlQuery({
            payload: 'graphql-comparison-no-prs',
          })

          await runDrafter()

          expect(mocks.postReleaseBody.mock.lastCall).toEqual([
            expect.objectContaining({
              tag_name: tag,
              body: `Tag: ${tag}\nhttps://github.com/toolmantim/release-drafter-test-project/compare/foobar_v2.1.0...${tag}\nVersion: ${version}\n`,
            }),
          ])
          expect(scope.isDone()).toBe(true)
          expect(gqlScope.isDone()).toBe(true)
          expect(mocks.core.setFailed).not.toHaveBeenCalled()
        },
      )
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('with category-based version resolver', () => {
      it('major beats others', async () => {
        await mockContext('push')
        mocks.config.mockReturnValue(
          'config-with-category-version-resolver-major',
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
    describe('with a pull request merge ref', () => {
      it('forces output-only mode, disables publishing, and warns when dry-run is not enabled', async () => {
        await mockContext('push')
        await mockInput('commitish', 'refs/pull/123/merge')
        await mockInput('publish', 'true')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-no-prs',
          suppressRecentPullRequestMock: true,
        })
        const pullRequestScope = nock('https://api.github.com')
          .post(
            '/graphql',
            (body) =>
              body.query.includes('query resolvePullRequestCommitish') &&
              body.variables.number === 123,
          )
          .reply(200, {
            data: {
              repository: {
                pullRequest: {
                  headRefOid: '1111111111111111111111111111111111111111',
                  mergeCommit: null,
                  potentialMergeCommit: {
                    oid: '2222222222222222222222222222222222222222',
                  },
                },
              },
            },
          })
        const scope = nockGetReleases({ releaseFiles: ['release'] })

        await runDrafter()

        expect(mocks.postReleaseBody).not.toHaveBeenCalled()
        expect(mocks.core.warning).toHaveBeenCalledWith(
          'refs/pull/123/merge points to an ephemeral pull request merge commit; forcing dry-run mode and disabling publish. Set dry-run: true explicitly to suppress this warning.',
        )
        expect(
          mocks.core.info.mock.calls
            .flat()
            .some(
              (message) =>
                message.includes('[dry-run]') &&
                message.includes('"draft": true'),
            ),
        ).toBe(true)
        expect(scope.isDone()).toBe(true)
        expect(gqlScope.pendingMocks()).toHaveLength(0)
        expect(pullRequestScope.pendingMocks()).toHaveLength(0)
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('does not warn when dry-run is explicitly enabled', async () => {
        await mockContext('push')
        await mockInput('commitish', 'refs/pull/123/merge')
        await mockInput('dry-run', 'true')
        mocks.config.mockReturnValue('config')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-no-prs',
          suppressRecentPullRequestMock: true,
        })
        const pullRequestScope = nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query resolvePullRequestCommitish'),
          )
          .reply(200, {
            data: {
              repository: {
                pullRequest: {
                  headRefOid: '1111111111111111111111111111111111111111',
                  mergeCommit: null,
                  potentialMergeCommit: {
                    oid: '2222222222222222222222222222222222222222',
                  },
                },
              },
            },
          })
        const scope = nockGetReleases({ releaseFiles: ['release'] })

        await runDrafter()

        expect(mocks.postReleaseBody).not.toHaveBeenCalled()
        expect(mocks.core.warning).not.toHaveBeenCalled()
        expect(scope.isDone()).toBe(true)
        expect(gqlScope.pendingMocks()).toHaveLength(0)
        expect(pullRequestScope.pendingMocks()).toHaveLength(0)
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('when no existing draft release exists (create)', () => {
      it('does not perform any write operations, logs the payload, and sets computed outputs', async () => {
        await mockContext('push')
        await mockInput('dry-run', 'true')
        mocks.config.mockReturnValue('config-with-resolved-version-template')

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
        expect(mocks.core.setOutput).toHaveBeenCalledWith('tag_name', 'v2.0.1')
        expect(mocks.core.setOutput).toHaveBeenCalledWith('name', 'v2.0.1 🌈')
        expect(
          mocks.core.setOutput.mock.calls.filter(([output]) =>
            ['id', 'html_url', 'upload_url'].includes(output),
          ),
        ).toEqual([])

        expect(scope.isDone()).toBe(true) // GET releases was called
        expect(gqlScope.pendingMocks().length).toBe(0)
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })

    describe('when an existing draft release exists (update)', () => {
      it('does not perform any write operations, logs the payload, and sets computed outputs', async () => {
        await mockContext('push')
        await mockInput('dry-run', 'true')
        mocks.config.mockReturnValue('config-with-resolved-version-template')

        const gqlScope = mockGraphqlQuery({
          payload: 'graphql-comparison-no-prs',
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
        expect(mocks.core.setOutput).toHaveBeenCalledWith('tag_name', 'v2.0.1')
        expect(mocks.core.setOutput).toHaveBeenCalledWith('name', 'v2.0.1 🌈')
        expect(
          mocks.core.setOutput.mock.calls.filter(([output]) =>
            ['id', 'html_url', 'upload_url'].includes(output),
          ),
        ).toEqual([])

        expect(scope.isDone()).toBe(true) // GET releases was called
        expect(gqlScope.pendingMocks().length).toBe(0)
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })
    })
  })
})
