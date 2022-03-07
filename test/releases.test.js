const { generateChangeLog } = require('../lib/releases')
const { DEFAULT_CONFIG } = require('../lib/default-config')

const pullRequests = [
  {
    title: 'A1',
    number: 1,
    body: 'A1 body',
    url: 'https://github.com',
    labels: { nodes: [{ name: 'bug' }] },
    baseRefName: 'master',
    headRefName: 'fix-bug',
  },
  {
    title: 'B2',
    number: 2,
    body: 'B2 body',
    url: 'https://github.com',
    labels: { nodes: [{ name: 'feature' }] },
    baseRefName: 'master',
    headRefName: 'implement-feature',
  },
  {
    title: 'Adds missing <example>',
    number: 3,
    body: 'Adds missing <example> body',
    url: 'https://github.com',
    labels: { nodes: [{ name: 'bug' }] },
    author: { login: 'jetersen' },
    baseRefName: 'master',
    headRefName: 'fix-bug',
  },
  {
    title: '`#code_block`',
    number: 4,
    body: '`#code block` body',
    url: 'https://github.com',
    labels: { nodes: [{ name: 'bug' }] },
    author: { login: 'jetersen' },
    baseRefName: 'master',
    headRefName: 'fix-bug',
  },
  {
    title: 'Fixes #4',
    number: 5,
    body: 'Fixes #4 body',
    url: 'https://github.com',
    labels: { nodes: [{ name: 'bug' }] },
    author: { login: 'Happypig375' },
    baseRefName: 'master',
    headRefName: 'fix-bug',
  },
  {
    title: '2*2 should equal to 4*1',
    number: 6,
    body: '2*2 should equal to 4*1 body',
    url: 'https://github.com',
    labels: { nodes: [{ name: 'bug' }] },
    author: { login: 'jetersen' },
    baseRefName: 'master',
    headRefName: 'fix-bug',
  },
  {
    title: 'Rename __confgs\\confg.yml to __configs\\config.yml',
    number: 7,
    body: 'Rename __confg to __config body',
    url: 'https://github.com',
    labels: { nodes: [{ name: 'bugfix' }] },
    author: { login: 'ghost' },
    baseRefName: 'master',
    headRefName: 'fix-bug',
  },
  {
    title: 'Adds @nullable annotations to the 1*1+2*4 test in `tests.java`',
    number: 0,
    body: 'Adds @nullable annotations to the 1*1+2*4 test in `tests.java`',
    url: 'https://github.com',
    labels: { nodes: [{ name: 'feature' }] },
    author: { login: 'Happypig375' },
    baseRefName: 'master',
    headRefName: 'implement-feature',
  },
]
const baseConfig = {
  ...DEFAULT_CONFIG,
  template: '$CHANGES',
  references: ['master'],
}

describe('releases', () => {
  describe('generateChangeLog', () => {
    it('does not escape titles without setting change-title-escapes', () => {
      const changelog = generateChangeLog(pullRequests, baseConfig)
      expect(changelog).toMatchInlineSnapshot(`
        "* A1 (#1) @ghost
        * B2 (#2) @ghost
        * Adds missing <example> (#3) @jetersen
        * \`#code_block\` (#4) @jetersen
        * Fixes #4 (#5) @Happypig375
        * 2*2 should equal to 4*1 (#6) @jetersen
        * Rename __confgs\\\\confg.yml to __configs\\\\config.yml (#7) @ghost
        * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375"
      `)
    })
    it('escapes titles with \\s correctly', () => {
      const config = {
        ...baseConfig,
        'change-title-escapes': '\\',
      }
      const changelog = generateChangeLog(pullRequests, config)
      expect(changelog).toMatchInlineSnapshot(`
        "* A1 (#1) @ghost
        * B2 (#2) @ghost
        * Adds missing <example> (#3) @jetersen
        * \`#code_block\` (#4) @jetersen
        * Fixes #4 (#5) @Happypig375
        * 2*2 should equal to 4*1 (#6) @jetersen
        * Rename __confgs\\\\\\\\confg.yml to __configs\\\\\\\\config.yml (#7) @ghost
        * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375"
      `)
    })
    it('escapes titles with \\<*_& correctly', () => {
      const config = {
        ...baseConfig,
        'change-title-escapes': '\\<*_&',
      }
      const changelog = generateChangeLog(pullRequests, config)
      expect(changelog).toMatchInlineSnapshot(`
        "* A1 (#1) @ghost
        * B2 (#2) @ghost
        * Adds missing \\\\<example> (#3) @jetersen
        * \`#code_block\` (#4) @jetersen
        * Fixes #4 (#5) @Happypig375
        * 2\\\\*2 should equal to 4\\\\*1 (#6) @jetersen
        * Rename \\\\_\\\\_confgs\\\\\\\\confg.yml to \\\\_\\\\_configs\\\\\\\\config.yml (#7) @ghost
        * Adds @nullable annotations to the 1\\\\*1+2\\\\*4 test in \`tests.java\` (#0) @Happypig375"
      `)
    })
    it('escapes titles with @s correctly', () => {
      const config = {
        ...baseConfig,
        'change-title-escapes': '@',
      }
      const changelog = generateChangeLog(pullRequests, config)
      expect(changelog).toMatchInlineSnapshot(`
        "* A1 (#1) @ghost
        * B2 (#2) @ghost
        * Adds missing <example> (#3) @jetersen
        * \`#code_block\` (#4) @jetersen
        * Fixes #4 (#5) @Happypig375
        * 2*2 should equal to 4*1 (#6) @jetersen
        * Rename __confgs\\\\confg.yml to __configs\\\\config.yml (#7) @ghost
        * Adds @<!---->nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375"
      `)
    })
    it('escapes titles with @s and #s correctly', () => {
      const config = {
        ...baseConfig,
        'change-title-escapes': '@#',
      }
      const changelog = generateChangeLog(pullRequests, config)
      expect(changelog).toMatchInlineSnapshot(`
        "* A1 (#1) @ghost
        * B2 (#2) @ghost
        * Adds missing <example> (#3) @jetersen
        * \`#code_block\` (#4) @jetersen
        * Fixes #<!---->4 (#5) @Happypig375
        * 2*2 should equal to 4*1 (#6) @jetersen
        * Rename __confgs\\\\confg.yml to __configs\\\\config.yml (#7) @ghost
        * Adds @<!---->nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375"
      `)
    })
    it('escapes titles with \\<@*_&`# correctly', () => {
      const config = {
        ...baseConfig,
        'change-title-escapes': '\\<@*_&`#',
      }
      const changelog = generateChangeLog(pullRequests, config)
      expect(changelog).toMatchInlineSnapshot(`
        "* A1 (#1) @ghost
        * B2 (#2) @ghost
        * Adds missing \\\\<example> (#3) @jetersen
        * \\\\\`#<!---->code\\\\_block\\\\\` (#4) @jetersen
        * Fixes #<!---->4 (#5) @Happypig375
        * 2\\\\*2 should equal to 4\\\\*1 (#6) @jetersen
        * Rename \\\\_\\\\_confgs\\\\\\\\confg.yml to \\\\_\\\\_configs\\\\\\\\config.yml (#7) @ghost
        * Adds @<!---->nullable annotations to the 1\\\\*1+2\\\\*4 test in \\\\\`tests.java\\\\\` (#0) @Happypig375"
      `)
    })
    it('adds proper details/summary markdown when collapse-after is set and more than 3 PRs', () => {
      const config = {
        ...baseConfig,
        categories: [{ title: 'Bugs', 'collapse-after': 3, labels: 'bug' }],
      }
      const changelog = generateChangeLog(pullRequests, config)
      expect(changelog).toMatchInlineSnapshot(`
        "* B2 (#2) @ghost
        * Rename __confgs\\\\confg.yml to __configs\\\\config.yml (#7) @ghost
        * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375

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
      const config = {
        ...baseConfig,
        categories: [
          { title: 'Feature', 'collapse-after': 3, labels: 'feature' },
        ],
      }
      const changelog = generateChangeLog(pullRequests, config)
      expect(changelog).toMatchInlineSnapshot(`
        "* A1 (#1) @ghost
        * Adds missing <example> (#3) @jetersen
        * \`#code_block\` (#4) @jetersen
        * Fixes #4 (#5) @Happypig375
        * 2*2 should equal to 4*1 (#6) @jetersen
        * Rename __confgs\\\\confg.yml to __configs\\\\config.yml (#7) @ghost

        ## Feature

        * B2 (#2) @ghost
        * Adds @nullable annotations to the 1*1+2*4 test in \`tests.java\` (#0) @Happypig375"
      `)
    })
  })
})
