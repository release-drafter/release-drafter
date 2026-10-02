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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
            },
          ]
        `)
        expect(scope.isDone()).toBe(true) // should call the mocked endpoints
        expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
        expect(mocks.core.setFailed).not.toHaveBeenCalled()
      })

      it('doesnt let a config prerelease-identifier turn the release into a prerelease', async () => {
        await mockContext('push')
        await mockInput('prerelease', 'false')
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
