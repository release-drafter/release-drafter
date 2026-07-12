import { beforeEach, describe, expect, it } from 'vitest'
import {
  actionInputSchema,
  configSchema,
  mergeInputAndConfig,
} from '#src/actions/drafter/config/index.ts'
import { generateChangeLog } from '#src/actions/drafter/lib/build-release-payload/generate-changelog.ts'
import { generateContributorsSentence } from '#src/actions/drafter/lib/build-release-payload/generate-contributors-sentence.ts'
import { buildReleasePayload } from '#src/actions/drafter/lib/index.ts'
import { mockContext, mocks as sharedMocks } from '#tests/mocks/index.ts'

describe('generate changelog', () => {
  let config: ReturnType<typeof mergeInputAndConfig>

  beforeEach(async () => {
    await mockContext('push')
    config = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
      }),
      input: actionInputSchema.parse({
        token: 'test',
      }),
    })
  })

  it('does not escape titles without setting change-title-escapes', () => {
    const changelog = generateChangeLog({
      config,
      pullRequests,
    })

    expect(changelog).toMatchInlineSnapshot(`
      "* A1 (#1) @ghost
      * B2 (#2) @ghost
      * Adds missing <example> (#3) @jetersen
      * \`#code_block\` (#4) @jetersen
      * Fixes #4 (#5) @Happypig375
      * 2*2 should equal to 4*1 (#6) @jetersen
      * Rename __confgs\\confg.yml to __configs\\config.yml (#7) @ghost
      * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) [@dependabot[bot]](https://github.com/apps/dependabot)"
    `)
  })

  it('escapes titles with \\s correctly', () => {
    const changelog = generateChangeLog({
      config: { ...config, 'change-title-escapes': '\\' },
      pullRequests,
    })

    expect(changelog).toMatchInlineSnapshot(`
      "* A1 (#1) @ghost
      * B2 (#2) @ghost
      * Adds missing <example> (#3) @jetersen
      * \`#code_block\` (#4) @jetersen
      * Fixes #4 (#5) @Happypig375
      * 2*2 should equal to 4*1 (#6) @jetersen
      * Rename __confgs\\\\confg.yml to __configs\\\\config.yml (#7) @ghost
      * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) [@dependabot[bot]](https://github.com/apps/dependabot)"
    `)
  })

  it('escapes titles with \\<*_& correctly', () => {
    const changelog = generateChangeLog({
      config: { ...config, 'change-title-escapes': '\\<*_&' },
      pullRequests,
    })

    expect(changelog).toMatchInlineSnapshot(`
      "* A1 (#1) @ghost
      * B2 (#2) @ghost
      * Adds missing \\<example> (#3) @jetersen
      * \`#code_block\` (#4) @jetersen
      * Fixes #4 (#5) @Happypig375
      * 2\\*2 should equal to 4\\*1 (#6) @jetersen
      * Rename \\_\\_confgs\\\\confg.yml to \\_\\_configs\\\\config.yml (#7) @ghost
      * Adds @nullable annotations to the 1\\*1+2\\*4 test in \`tests.java\` (#0) @Happypig375
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) [@dependabot[bot]](https://github.com/apps/dependabot)"
    `)
  })

  it('escapes titles with @s correctly', () => {
    const changelog = generateChangeLog({
      config: { ...config, 'change-title-escapes': '@' },
      pullRequests,
    })
    expect(changelog).toMatchInlineSnapshot(`
      "* A1 (#1) @ghost
      * B2 (#2) @ghost
      * Adds missing <example> (#3) @jetersen
      * \`#code_block\` (#4) @jetersen
      * Fixes #4 (#5) @Happypig375
      * 2*2 should equal to 4*1 (#6) @jetersen
      * Rename __confgs\\confg.yml to __configs\\config.yml (#7) @ghost
      * Adds @<!---->nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) [@dependabot[bot]](https://github.com/apps/dependabot)"
    `)
  })

  it('escapes titles with @s and #s correctly', () => {
    const changelog = generateChangeLog({
      config: { ...config, 'change-title-escapes': '@#' },
      pullRequests,
    })

    expect(changelog).toMatchInlineSnapshot(`
      "* A1 (#1) @ghost
      * B2 (#2) @ghost
      * Adds missing <example> (#3) @jetersen
      * \`#code_block\` (#4) @jetersen
      * Fixes #<!---->4 (#5) @Happypig375
      * 2*2 should equal to 4*1 (#6) @jetersen
      * Rename __confgs\\confg.yml to __configs\\config.yml (#7) @ghost
      * Adds @<!---->nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) [@dependabot[bot]](https://github.com/apps/dependabot)"
    `)
  })

  it('escapes titles with \\<@*_&`# correctly', () => {
    const changelog = generateChangeLog({
      config: { ...config, 'change-title-escapes': '\\<@*_&`#' },
      pullRequests,
    })

    expect(changelog).toMatchInlineSnapshot(`
      "* A1 (#1) @ghost
      * B2 (#2) @ghost
      * Adds missing \\<example> (#3) @jetersen
      * \\\`#<!---->code\\_block\\\` (#4) @jetersen
      * Fixes #<!---->4 (#5) @Happypig375
      * 2\\*2 should equal to 4\\*1 (#6) @jetersen
      * Rename \\_\\_confgs\\\\confg.yml to \\_\\_configs\\\\config.yml (#7) @ghost
      * Adds @<!---->nullable annotations to the 1\\*1+2\\*4 test in \\\`tests.java\\\` (#0) @Happypig375
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) [@dependabot[bot]](https://github.com/apps/dependabot)"
    `)
  })

  it('adds proper details/summary markdown when collapse-after is set and more than 3 PRs', () => {
    const categorizedConfig = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
        categories: [
          { title: 'Bugs', 'collapse-after': 3, when: { labels: ['bug'] } },
        ],
      }),
      input: actionInputSchema.parse({
        token: 'test',
      }),
    })
    const changelog = generateChangeLog({
      config: categorizedConfig,
      pullRequests,
    })
    expect(changelog).toMatchInlineSnapshot(`
      "* B2 (#2) @ghost
      * Rename __confgs\\confg.yml to __configs\\config.yml (#7) @ghost
      * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) [@dependabot[bot]](https://github.com/apps/dependabot)

      ## Bugs

      <details>
      <summary>5 changes</summary>

      * A1 (#1) @ghost
      * Adds missing <example> (#3) @jetersen
      * \`#code_block\` (#4) @jetersen
      * Fixes #4 (#5) @Happypig375
      * 2*2 should equal to 4*1 (#6) @jetersen
      </details>"
    `)
  })

  it('adds proper details/summary markdown when collapse-after is set to 0 and has a PR', () => {
    const categorizedConfig = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
        categories: [
          { title: 'Bugs', 'collapse-after': 0, when: { labels: ['bug'] } },
        ],
      }),
      input: actionInputSchema.parse({
        token: 'test',
      }),
    })
    const changelog = generateChangeLog({
      config: categorizedConfig,
      pullRequests: pullRequests.slice(0, 1),
    })
    expect(changelog).toMatchInlineSnapshot(`
      "## Bugs

      <details>
      <summary>1 change</summary>

      * A1 (#1) @ghost
      </details>"
    `)
  })

  it('does not collapse when the category has exactly collapse-after pull requests', () => {
    const categorizedConfig = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
        categories: [
          {
            title: 'Feature',
            'collapse-after': 2,
            when: { labels: ['feature'] },
          },
        ],
      }),
      input: actionInputSchema.parse({
        token: 'test',
      }),
    })
    const changelog = generateChangeLog({
      config: categorizedConfig,
      pullRequests,
    })

    expect(changelog).not.toContain('<details>')
    expect(changelog).toContain('## Feature')
  })

  it('does not collapse when collapse-after is disabled with -1', () => {
    const categorizedConfig = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
        categories: [
          { title: 'Bugs', 'collapse-after': -1, when: { labels: ['bug'] } },
        ],
      }),
      input: actionInputSchema.parse({
        token: 'test',
      }),
    })
    const changelog = generateChangeLog({
      config: categorizedConfig,
      pullRequests,
    })

    expect(changelog).not.toContain('<details>')
    expect(changelog).toContain('## Bugs')
  })

  it('does not add proper details/summary markdown when collapse-after is set and less than 3 PRs', () => {
    const categorizedConfig = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
        categories: [
          {
            title: 'Feature',
            'collapse-after': 3,
            when: { labels: ['feature'] },
          },
        ],
      }),
      input: actionInputSchema.parse({
        token: 'test',
      }),
    })
    const changelog = generateChangeLog({
      config: categorizedConfig,
      pullRequests,
    })

    expect(changelog).toMatchInlineSnapshot(`
      "* A1 (#1) @ghost
      * Adds missing <example> (#3) @jetersen
      * \`#code_block\` (#4) @jetersen
      * Fixes #4 (#5) @Happypig375
      * 2*2 should equal to 4*1 (#6) @jetersen
      * Rename __confgs\\confg.yml to __configs\\config.yml (#7) @ghost
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) [@dependabot[bot]](https://github.com/apps/dependabot)

      ## Feature

      * B2 (#2) @ghost
      * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375"
    `)
  })

  it('returns no-changes-template when no pull requests are provided', () => {
    const changelog = generateChangeLog({
      config,
      pullRequests: [],
    })

    expect(changelog).toBe('* No changes')
  })

  it('returns no-changes-template when all pull requests are excluded by exclude-labels', () => {
    const excludedConfig = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
        'exclude-labels': ['bug', 'feature', 'bugfix', 'dependencies'],
      }),
      input: actionInputSchema.parse({
        token: 'test',
      }),
    })
    const changelog = generateChangeLog({
      config: excludedConfig,
      pullRequests,
    })

    expect(changelog).toBe('* No changes')
  })

  it('returns no-changes-template when no pull requests match include-labels', () => {
    const includedConfig = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
        'include-labels': ['non-existent-label'],
      }),
      input: actionInputSchema.parse({
        token: 'test',
      }),
    })
    const changelog = generateChangeLog({
      config: includedConfig,
      pullRequests,
    })

    expect(changelog).toBe('* No changes')
  })
})

describe('build release payload', () => {
  let config: ReturnType<typeof mergeInputAndConfig>

  beforeEach(async () => {
    await mockContext('push')
    config = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
      }),
      input: actionInputSchema.parse({
        token: 'test',
      }),
    })
  })

  it('falls back to the default branch for tag refs', () => {
    const releasePayload = buildReleasePayload({
      commits: [],
      config: { ...config, commitish: 'refs/tags/v1.2.3' },
      input: actionInputSchema.parse({ token: 'test' }),
      lastRelease: undefined,
      pullRequests: [],
    })

    expect(releasePayload.targetCommitish).toBe('')
    expect(sharedMocks.core.warning).toHaveBeenCalledWith(
      'refs/tags/v1.2.3 is not supported as release target (commitish), falling back to default branch',
    )
  })

  it('falls back to the default branch for pull request refs', () => {
    const releasePayload = buildReleasePayload({
      commits: [],
      config: { ...config, commitish: 'refs/pull/123/merge' },
      input: actionInputSchema.parse({ token: 'test' }),
      lastRelease: undefined,
      pullRequests: [],
    })

    expect(releasePayload.targetCommitish).toBe('')
    expect(sharedMocks.core.warning).toHaveBeenCalledWith(
      'refs/pull/123/merge is not supported as release target (commitish), falling back to default branch',
    )
  })

  it('keeps branch refs unchanged', () => {
    const releasePayload = buildReleasePayload({
      commits: [],
      config,
      input: actionInputSchema.parse({ token: 'test' }),
      lastRelease: undefined,
      pullRequests: [],
    })

    expect(releasePayload.targetCommitish).toBe('refs/heads/master')
    expect(sharedMocks.core.warning).not.toHaveBeenCalled()
  })
})

const pullRequests: Parameters<typeof buildReleasePayload>[0]['pullRequests'] =
  [
    {
      __typename: 'PullRequest',
      title: 'A1',
      number: 1,
      body: 'A1 body',
      url: 'https://github.com',
      labels: {
        __typename: 'LabelConnection',
        nodes: [{ __typename: 'Label', name: 'bug' }],
      },
      author: {
        __typename: 'User',
        login: 'ghost',
        url: 'https://github.com/ghost',
      },
      baseRefName: 'master',
      headRefName: 'fix-bug',
      isCrossRepository: false,
      merged: true,
      mergedAt: '2024-01-01T00:00:00Z',
      baseRepository: {
        __typename: 'Repository',
        nameWithOwner: 'toolmantim/release-drafter',
      },
    },
    {
      __typename: 'PullRequest',
      title: 'B2',
      number: 2,
      body: 'B2 body',
      url: 'https://github.com',
      labels: {
        __typename: 'LabelConnection',
        nodes: [{ __typename: 'Label', name: 'feature' }],
      },
      author: {
        __typename: 'User',
        login: 'ghost',
        url: 'https://github.com/ghost',
      },
      baseRefName: 'master',
      headRefName: 'implement-feature',
      isCrossRepository: false,
      merged: true,
      mergedAt: '2024-01-01T00:00:00Z',
      baseRepository: {
        __typename: 'Repository',
        nameWithOwner: 'toolmantim/release-drafter',
      },
    },
    {
      __typename: 'PullRequest',
      title: 'Adds missing <example>',
      number: 3,
      body: 'Adds missing <example> body',
      url: 'https://github.com',
      labels: {
        __typename: 'LabelConnection',
        nodes: [{ __typename: 'Label', name: 'bug' }],
      },
      author: {
        __typename: 'User',
        login: 'jetersen',
        url: 'https://github.com/jetersen',
      },
      baseRefName: 'master',
      headRefName: 'fix-bug',
      isCrossRepository: false,
      merged: true,
      mergedAt: '2024-01-01T00:00:00Z',
      baseRepository: {
        __typename: 'Repository',
        nameWithOwner: 'toolmantim/release-drafter',
      },
    },
    {
      __typename: 'PullRequest',
      title: '`#code_block`',
      number: 4,
      body: '`#code block` body',
      url: 'https://github.com',
      labels: {
        __typename: 'LabelConnection',
        nodes: [{ __typename: 'Label', name: 'bug' }],
      },
      author: {
        __typename: 'User',
        login: 'jetersen',
        url: 'https://github.com/jetersen',
      },
      baseRefName: 'master',
      headRefName: 'fix-bug',
      isCrossRepository: false,
      merged: true,
      mergedAt: '2024-01-01T00:00:00Z',
      baseRepository: {
        __typename: 'Repository',
        nameWithOwner: 'toolmantim/release-drafter',
      },
    },
    {
      __typename: 'PullRequest',
      title: 'Fixes #4',
      number: 5,
      body: 'Fixes #4 body',
      url: 'https://github.com',
      labels: {
        __typename: 'LabelConnection',
        nodes: [{ __typename: 'Label', name: 'bug' }],
      },
      author: {
        __typename: 'User',
        login: 'Happypig375',
        url: 'https://github.com/Happypig375',
      },
      baseRefName: 'master',
      headRefName: 'fix-bug',
      isCrossRepository: false,
      merged: true,
      mergedAt: '2024-01-01T00:00:00Z',
      baseRepository: {
        __typename: 'Repository',
        nameWithOwner: 'toolmantim/release-drafter',
      },
    },
    {
      __typename: 'PullRequest',
      title: '2*2 should equal to 4*1',
      number: 6,
      body: '2*2 should equal to 4*1 body',
      url: 'https://github.com',
      labels: {
        __typename: 'LabelConnection',
        nodes: [{ __typename: 'Label', name: 'bug' }],
      },
      author: {
        __typename: 'User',
        login: 'jetersen',
        url: 'https://github.com/jetersen',
      },
      baseRefName: 'master',
      headRefName: 'fix-bug',
      isCrossRepository: false,
      merged: true,
      mergedAt: '2024-01-01T00:00:00Z',
      baseRepository: {
        __typename: 'Repository',
        nameWithOwner: 'toolmantim/release-drafter',
      },
    },
    {
      __typename: 'PullRequest',
      title: 'Rename __confgs\\confg.yml to __configs\\config.yml',
      number: 7,
      body: 'Rename __confg to __config body',
      url: 'https://github.com',
      labels: {
        __typename: 'LabelConnection',
        nodes: [{ __typename: 'Label', name: 'bugfix' }],
      },
      author: {
        __typename: 'User',
        login: 'ghost',
        url: 'https://github.com/ghost',
      },
      baseRefName: 'master',
      headRefName: 'fix-bug',
      isCrossRepository: false,
      merged: true,
      mergedAt: '2024-01-01T00:00:00Z',
      baseRepository: {
        __typename: 'Repository',
        nameWithOwner: 'toolmantim/release-drafter',
      },
    },
    {
      __typename: 'PullRequest',
      title: 'Adds @nullable annotations to the 1*1+2*4 test in `tests.java`',
      number: 0,
      body: 'Adds @nullable annotations to the 1*1+2*4 test in `tests.java`',
      url: 'https://github.com',
      labels: {
        __typename: 'LabelConnection',
        nodes: [{ __typename: 'Label', name: 'feature' }],
      },
      author: {
        __typename: 'User',
        login: 'Happypig375',
        url: 'https://github.com/Happypig375',
      },
      baseRefName: 'master',
      headRefName: 'implement-feature',
      isCrossRepository: false,
      merged: true,
      mergedAt: '2024-01-01T00:00:00Z',
      baseRepository: {
        __typename: 'Repository',
        nameWithOwner: 'toolmantim/release-drafter',
      },
    },
    {
      __typename: 'PullRequest',
      title: 'Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples',
      number: 0,
      body: 'Updates the dependency ....',
      url: 'https://github.com',
      labels: {
        __typename: 'LabelConnection',
        nodes: [{ __typename: 'Label', name: 'dependencies' }],
      },
      author: {
        login: 'dependabot',
        // although the RESTful API returns a `type: "Bot"`, GraphQL only allows us to look up based on the `__typename`
        __typename: 'Bot',
        url: 'https://github.com/apps/dependabot',
      },
      baseRefName: 'master',
      headRefName: 'dependabot/go_modules/examples/golang.org/x/crypto-0.17.0',
      isCrossRepository: false,
      merged: true,
      mergedAt: '2024-01-01T00:00:00Z',
      baseRepository: {
        __typename: 'Repository',
        nameWithOwner: 'toolmantim/release-drafter',
      },
    },
  ]

describe('generate contributors sentence', () => {
  let config: ReturnType<typeof mergeInputAndConfig>

  beforeEach(async () => {
    await mockContext('push')
    config = mergeInputAndConfig({
      config: configSchema.parse({ template: '$CONTRIBUTORS' }),
      input: actionInputSchema.parse({ token: 'test' }),
    })
  })

  const botPullRequest = pullRequests.at(-1)
  if (!botPullRequest) throw new Error('Missing bot pull request fixture')
  const ghostPullRequest = pullRequests.at(0)
  if (!ghostPullRequest) throw new Error('Missing ghost pull request fixture')
  const userPullRequest = pullRequests.find(
    (pullRequest) => pullRequest.author?.login === 'jetersen',
  )
  if (!userPullRequest) throw new Error('Missing user pull request fixture')
  const botCommit = {
    __typename: 'Commit',
    id: 'commit-id',
    oid: 'commit-oid',
    committedDate: '2024-01-01T00:00:00Z',
    message: 'Update dependencies',
    author: {
      __typename: 'GitActor',
      name: 'dependabot[bot]',
      user: { __typename: 'User', login: 'dependabot[bot]' },
    },
    authors: {
      __typename: 'GitActorConnection',
      nodes: [
        {
          __typename: 'GitActor',
          name: 'dependabot[bot]',
          user: { __typename: 'User', login: 'dependabot[bot]' },
        },
      ],
    },
    associatedPullRequests: {
      __typename: 'PullRequestConnection',
      nodes: [botPullRequest],
    },
  } as Parameters<typeof generateContributorsSentence>[0]['commits'][number]

  it('normalizes and deduplicates bot contributors before rendering', () => {
    expect(
      generateContributorsSentence({
        commits: [botCommit],
        pullRequests: [userPullRequest, botPullRequest],
        config,
      }),
    ).toBe(
      '@jetersen and [@dependabot[bot]](https://github.com/apps/dependabot)',
    )
  })

  it('includes co-authors after the pull request author', () => {
    const pullRequest = {
      ...userPullRequest,
      author: {
        __typename: 'User' as const,
        login: 'octocat',
        url: 'https://github.com/octocat',
      },
    }
    const commit = {
      ...botCommit,
      authors: {
        __typename: 'GitActorConnection' as const,
        nodes: [
          {
            __typename: 'GitActor' as const,
            name: 'The Octocat',
            user: {
              __typename: 'User' as const,
              login: 'octocat',
            },
          },
          {
            __typename: 'GitActor' as const,
            name: 'Joseph Petersen',
            user: { __typename: 'User' as const, login: 'jetersen' },
          },
          {
            __typename: 'GitActor' as const,
            name: 'Clément Chanchevrier',
            user: { __typename: 'User' as const, login: 'cchanche' },
          },
        ],
      },
      associatedPullRequests: {
        __typename: 'PullRequestConnection' as const,
        nodes: [pullRequest],
      },
    }

    expect(
      generateContributorsSentence({
        commits: [commit],
        pullRequests: [pullRequest],
        config,
      }),
    ).toBe('@octocat, @cchanche and @jetersen')

    expect(
      generateChangeLog({
        commits: [commit],
        pullRequests: [pullRequest],
        config: { ...config, 'change-template': '$AUTHORS' },
      }),
    ).toBe('@octocat, @cchanche, @jetersen')

    expect(
      generateChangeLog({
        commits: [commit],
        pullRequests: [pullRequest],
        config: {
          ...config,
          'change-template': '$AUTHORS',
          'change-authors-final-separator': ' and ',
        },
      }),
    ).toBe('@octocat, @cchanche and @jetersen')

    expect(
      generateChangeLog({
        commits: [commit],
        pullRequests: [pullRequest],
        config: {
          ...config,
          'change-template': 'authors:\n$AUTHORS',
          'change-author-template': '  - $AUTHOR',
          'change-authors-separator': '\n',
        },
      }),
    ).toBe('authors:\n  - octocat\n  - cchanche\n  - jetersen')
  })

  it('sorts users before bots regardless of pull request order', () => {
    const renovatePullRequest = {
      ...botPullRequest,
      number: 10,
      author: {
        __typename: 'Bot' as const,
        login: 'renovate',
        url: 'https://github.com/apps/renovate',
      },
    }
    const cchanchePullRequest = {
      ...userPullRequest,
      number: 11,
      author: {
        __typename: 'User' as const,
        login: 'cchanche',
        url: 'https://github.com/cchanche',
      },
    }

    expect(
      generateContributorsSentence({
        commits: [],
        pullRequests: [
          renovatePullRequest,
          userPullRequest,
          botPullRequest,
          cchanchePullRequest,
        ],
        config,
      }),
    ).toBe(
      '@cchanche, @jetersen, [@dependabot[bot]](https://github.com/apps/dependabot) and [@renovate[bot]](https://github.com/apps/renovate)',
    )
  })

  it('renders deleted users as @ghost', () => {
    expect(
      generateContributorsSentence({
        commits: [],
        pullRequests: [ghostPullRequest],
        config,
      }),
    ).toBe('@ghost')
  })

  it('excludes contributors whose pull requests are excluded', () => {
    const skippedPullRequest = {
      ...botPullRequest,
      labels: {
        __typename: 'LabelConnection' as const,
        nodes: [{ __typename: 'Label' as const, name: 'skip-changelog' }],
      },
    }
    const skippedCommit = {
      ...botCommit,
      associatedPullRequests: {
        __typename: 'PullRequestConnection' as const,
        nodes: [skippedPullRequest],
      },
    }
    const skipConfig = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CONTRIBUTORS',
        categories: [
          { type: 'pre-exclude', when: { label: 'skip-changelog' } },
        ],
      }),
      input: actionInputSchema.parse({ token: 'test' }),
    })

    expect(
      generateContributorsSentence({
        commits: [skippedCommit],
        pullRequests: [skippedPullRequest],
        config: skipConfig,
      }),
    ).toBe('No contributors')
  })
})
