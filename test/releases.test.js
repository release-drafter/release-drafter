const { generateChangeLog, findReleases } = require('../lib/releases')
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

  describe('findReleases', () => {
    it('should retrieve last release respecting semver, stripped prefix', async () => {
      const paginate = jest.fn().mockResolvedValue([
        {
          tag_name: 'test-1.0.1',
          target_commitish: 'master',
          created_at: '2021-06-29T05:45:15Z',
        },
        {
          tag_name: 'test-1.0.0',
          target_commitish: 'master',
          created_at: '2022-06-29T05:45:15Z',
        },
      ])

      const context = {
        log: {
          info: jest.fn(),
        },
        repo: jest.fn(),
        payload: {
          repository: 'test',
        },
        octokit: {
          paginate,
          repos: { listReleases: { endpoint: { merge: jest.fn() } } },
        },
      }
      const targetCommitish = 'refs/heads/master'
      const filterByCommitish = ''
      const tagPrefix = 'test-'

      const { lastRelease } = await findReleases({
        context,
        targetCommitish,
        filterByCommitish,
        tagPrefix,
      })
      expect(lastRelease.tag_name).toEqual('test-1.0.1')
    })

    const paginateMock = jest.fn()
    const context = {
      payload: { repository: { full_name: 'test' } },
      octokit: {
        paginate: paginateMock,
        repos: { listReleases: { endpoint: { merge: jest.fn() } } },
      },
      repo: jest.fn(),
      log: { info: jest.fn(), warn: jest.fn() },
    }

    it('should return last release without draft and prerelease', async () => {
      paginateMock.mockResolvedValueOnce([
        { tag_name: 'v1.0.0', draft: true, prerelease: false },
        { tag_name: 'v1.0.1', draft: false, prerelease: false },
        { tag_name: 'v1.0.2-rc.1', draft: false, prerelease: true },
      ])

      const { lastRelease } = await findReleases({
        context,
        targetCommitish: 'refs/heads/master',
        tagPrefix: '',
      })

      expect(lastRelease).toEqual({
        tag_name: 'v1.0.1',
        draft: false,
        prerelease: false,
      })
    })

    it('should return last draft release', async () => {
      paginateMock.mockResolvedValueOnce([
        { tag_name: 'v1.0.0', draft: true, prerelease: false },
        { tag_name: 'v1.0.1', draft: false, prerelease: false },
        { tag_name: 'v1.0.2-rc.1', draft: false, prerelease: true },
      ])

      const { draftRelease } = await findReleases({
        context,
        targetCommitish: 'refs/heads/master',
        tagPrefix: '',
      })

      expect(draftRelease).toEqual({
        tag_name: 'v1.0.0',
        draft: true,
        prerelease: false,
      })
    })

    it('should return last prerelease as last release when includePreReleases is true', async () => {
      paginateMock.mockResolvedValueOnce([
        { tag_name: 'v1.0.0', draft: true, prerelease: false },
        { tag_name: 'v1.0.1', draft: false, prerelease: false },
        { tag_name: 'v1.0.2-rc.1', draft: false, prerelease: true },
      ])

      const { lastRelease } = await findReleases({
        context,
        targetCommitish: 'refs/heads/master',
        tagPrefix: '',
        includePreReleases: true,
      })

      expect(lastRelease).toEqual({
        tag_name: 'v1.0.2-rc.1',
        draft: false,
        prerelease: true,
      })
    })
  })
})
