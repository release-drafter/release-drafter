import { describe, expect, it } from 'vitest'
import { runDrafter } from '#tests/helpers/index.ts'
import {
  mockContext,
  mockGraphqlQuery,
  mockInput,
  mocks,
  nockGetAndPostReleases,
  nockGetPrFiles,
} from '#tests/mocks/index.ts'

describe('drafter e2e', () => {
  describe('push', () => {
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
              "target_commitish": "master",
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
                "target_commitish": "master",
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

  describe('with sort-by config', () => {
    it('sorts by title', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-sort-by-title')
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
            "target_commitish": "master",
          },
        ]
      `)
      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
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
            "target_commitish": "master",
          },
        ]
      `)
      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })
  })

  describe('with include-paths config', () => {
    it('returns the modified paths', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-include-paths')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const fileScopes = nockGetPrFiles({
        repo: {
          owner: 'toolmantim',
          repo: 'release-drafter-test-project',
        },
        entries: [
          [1, ['src/1.md']],
          [2, ['src/2.md']],
          [3, ['src/3.md']],
          [4, ['src/4.md', 'some/path']],
          [5, ['src/5.md', 'some/path']],
        ],
      })
      const gqlScope = mockGraphqlQuery([
        {
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-merge-commit',
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
            "target_commitish": "master",
          },
        ]
      `)
      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(fileScopes.every((fileScope) => fileScope.isDone())).toBe(true)
      expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })

    it('excludes commits that touch excluded paths from the release', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-exclude-paths')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const fileScopes = nockGetPrFiles({
        repo: {
          owner: 'toolmantim',
          repo: 'release-drafter-test-project',
        },
        entries: [
          [1, ['src/1.md']],
          [2, ['src/2.md']],
          [3, ['src/3.md']],
          [4, ['src/4.md', 'some/path']],
          [5, ['src/5.md', 'some/path']],
        ],
      })
      const gqlScope = mockGraphqlQuery([
        {
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-merge-commit',
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
            "target_commitish": "master",
          },
        ]
      `)
      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(fileScopes.every((fileScope) => fileScope.isDone())).toBe(true)
      expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })

    it('exclude takes precedence over include when both list the same path', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-include-exclude-paths')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const fileScopes = nockGetPrFiles({
        repo: {
          owner: 'toolmantim',
          repo: 'release-drafter-test-project',
        },
        entries: [
          [1, ['src/1.md']],
          [2, ['src/2.md']],
          [3, ['src/3.md']],
          [4, ['src/4.md', 'some/path']],
          [5, ['src/5.md', 'some/path']],
        ],
      })
      const gqlScope = mockGraphqlQuery([
        {
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-merge-commit',
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
            "target_commitish": "master",
          },
        ]
      `)
      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(fileScopes.every((fileScope) => fileScope.isDone())).toBe(true)
      expect(gqlScope.isDone()).toBe(true) // should call the mocked endpoints
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })
  })

  describe('with category-based pre-include path config', () => {
    it('returns the modified paths', async () => {
      await mockContext('push')
      mocks.config.mockReturnValue('config-with-category-pre-include-paths')
      const scope = nockGetAndPostReleases({
        fetchedReleases: ['release'],
      })
      const fileScopes = nockGetPrFiles({
        repo: {
          owner: 'toolmantim',
          repo: 'release-drafter-test-project',
        },
        entries: [
          [1, ['src/1.md']],
          [2, ['src/2.md']],
          [3, ['src/3.md']],
          [4, ['src/4.md', 'some/path']],
          [5, ['src/5.md', 'some/path']],
        ],
      })
      const gqlScope = mockGraphqlQuery([
        {
          query: 'query findCommitsInComparison',
          payload: 'graphql-comparison-merge-commit',
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
            "target_commitish": "master",
          },
        ]
      `)
      expect(scope.isDone()).toBe(true) // should call the mocked endpoints
      expect(fileScopes.every((fileScope) => fileScope.isDone())).toBe(true)
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
      const gqlScope = mockGraphqlQuery({
        payload: 'graphql-comparison-no-prs',
        variables: { pullRequestLimit: 5 },
      })

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
      const gqlScope = mockGraphqlQuery({
        payload: 'graphql-comparison-no-prs',
        variables: { pullRequestLimit: 34 },
      })

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
      const gqlScope = mockGraphqlQuery({
        payload: 'graphql-comparison-no-prs',
        variables: { historyLimit: 15 },
      })

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
      const gqlScope = mockGraphqlQuery({
        payload: 'graphql-comparison-no-prs',
        variables: { historyLimit: 42 },
      })

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
})
