import {
  actionInputSchema,
  configSchema,
  mergeInputAndConfig,
} from 'src/actions/drafter/config'
import type { buildReleasePayload } from 'src/actions/drafter/lib'
import { generateChangeLog } from 'src/actions/drafter/lib/build-release-payload/generate-changelog'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockContext } from '../mocks'

describe('generate changelog', () => {
  let config: ReturnType<typeof mergeInputAndConfig>

  beforeEach(async () => {
    await mockContext('push')
    config = mergeInputAndConfig({
      config: configSchema.parse({
        template: '$CHANGES',
        references: ['master'],
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
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) @[dependabot[bot]](https://github.com/apps/dependabot)"
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
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) @[dependabot[bot]](https://github.com/apps/dependabot)"
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
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) @[dependabot[bot]](https://github.com/apps/dependabot)"
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
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) @[dependabot[bot]](https://github.com/apps/dependabot)"
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
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) @[dependabot[bot]](https://github.com/apps/dependabot)"
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
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) @[dependabot[bot]](https://github.com/apps/dependabot)"
    `)
  })

  it('adds proper details/summary markdown when collapse-after is set and more than 3 PRs', () => {
    const changelog = generateChangeLog({
      config: {
        ...config,
        categories: [{ title: 'Bugs', 'collapse-after': 3, labels: ['bug'] }],
      },
      pullRequests,
    })
    expect(changelog).toMatchInlineSnapshot(`
      "* B2 (#2) @ghost
      * Rename __confgs\\confg.yml to __configs\\config.yml (#7) @ghost
      * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) @[dependabot[bot]](https://github.com/apps/dependabot)

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

  it('does not add proper details/summary markdown when collapse-after is set and less than 3 PRs', () => {
    const changelog = generateChangeLog({
      config: {
        ...config,
        categories: [
          { title: 'Feature', 'collapse-after': 3, labels: ['feature'] },
        ],
      },
      pullRequests,
    })

    expect(changelog).toMatchInlineSnapshot(`
      "* A1 (#1) @ghost
      * Adds missing <example> (#3) @jetersen
      * \`#code_block\` (#4) @jetersen
      * Fixes #4 (#5) @Happypig375
      * 2*2 should equal to 4*1 (#6) @jetersen
      * Rename __confgs\\confg.yml to __configs\\config.yml (#7) @ghost
      * Bump golang.org/x/crypto from 0.14.0 to 0.17.0 in /examples (#0) @[dependabot[bot]](https://github.com/apps/dependabot)

      ## Feature

      * B2 (#2) @ghost
      * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375"
    `)
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
      baseRefName: 'master',
      headRefName: 'fix-bug',
      isCrossRepository: false,
      merged: true,
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
      baseRefName: 'master',
      headRefName: 'implement-feature',
      isCrossRepository: false,
      merged: true,
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
    },
  ]
