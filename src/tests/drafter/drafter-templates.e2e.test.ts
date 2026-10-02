import { describe, expect, it } from 'vitest'
import { runDrafter } from '#tests/helpers/index.ts'
import {
  mockContext,
  mockGraphqlQuery,
  mockInput,
  mocks,
  nockGetAndPostReleases,
} from '#tests/mocks/index.ts'

describe('drafter e2e', () => {
  describe('push', () => {
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
                "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
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
})
