import { describe, expect, it } from 'vitest'
import { configSchema, mergeInputAndConfig } from '../config/index.ts'
import { noopLogger } from '../ports.ts'
import type { PullRequest } from '../types.ts'
import type { ChangeGroup } from './group-changes.ts'
import { pullRequestToString } from './pull-request-to-string.ts'

const config = (overrides: Record<string, unknown> = {}) =>
  mergeInputAndConfig({
    config: configSchema.parse({
      template: '$CHANGES',
      commitish: 'main',
      ...overrides,
    }),
    input: {},
    logger: noopLogger,
  })

const pullRequest = (
  number: number,
  overrides: Partial<PullRequest> = {},
): PullRequest => ({
  number,
  title: `Change ${number}`,
  author: {
    login: `author-${number}`,
    url: `https://github.com/author-${number}`,
  },
  ...overrides,
})

const change = (pullRequests: PullRequest[], title?: string): ChangeGroup => ({
  pullRequests,
  representative: pullRequests[pullRequests.length - 1],
  title: title ?? pullRequests[pullRequests.length - 1].title,
})

const render = (changes: ChangeGroup[], overrides?: Record<string, unknown>) =>
  pullRequestToString({
    changes,
    commits: [],
    serverUrl: 'https://github.com',
    config: config(overrides),
  })

describe('pullRequestToString', () => {
  it('renders a single change with the default template', () => {
    expect(render([change([pullRequest(42)])])).toBe(
      '* Change 42 (#42) @author-42',
    )
  })

  it('renders $NUMBERS of a single change as its own number', () => {
    expect(
      render([change([pullRequest(42)])], {
        'change-template': '* $TITLE ($NUMBERS)',
      }),
    ).toBe('* Change 42 (#42)')
  })

  it('renders $NUMBERS of a merged change, oldest first', () => {
    const merged = change(
      [pullRequest(308), pullRequest(310), pullRequest(316)],
      'Bump njord.version from 0.9.1 to 0.9.5',
    )

    expect(render([merged], { 'change-template': '* $TITLE ($NUMBERS)' })).toBe(
      '* Bump njord.version from 0.9.1 to 0.9.5 (#308, #310, #316)',
    )
  })

  it('takes single valued variables from the newest pull request', () => {
    const merged = change([
      pullRequest(1, { body: 'first', url: 'https://example.com/1' }),
      pullRequest(2, { body: 'second', url: 'https://example.com/2' }),
    ])

    expect(
      render([merged], { 'change-template': '$NUMBER $AUTHOR $BODY $URL' }),
    ).toBe('2 author-2 second https://example.com/2')
  })

  it('lists the authors of every merged pull request without duplicates', () => {
    const merged = change([
      pullRequest(1, { author: { login: 'grace' } }),
      pullRequest(2, { author: { login: 'ada' } }),
      pullRequest(3, { author: { login: 'grace' } }),
    ])

    expect(render([merged], { 'change-template': '$AUTHORS' })).toBe(
      '@ada, @grace',
    )
  })

  it('escapes the merged title', () => {
    const merged = change([pullRequest(1), pullRequest(2)], 'Bump _lib_ to 2.0')

    expect(
      render([merged], {
        'change-template': '$TITLE',
        'change-title-escapes': '_',
      }),
    ).toBe('Bump \\_lib\\_ to 2.0')
  })

  it('escapes the newest body independently of the title and template', () => {
    const merged = change(
      [
        pullRequest(1, { body: '<!-- older -->' }),
        pullRequest(2, { body: '<!-- hidden -->\n\n`<!-- example -->`' }),
      ],
      '<title>',
    )
    expect(
      render([merged], {
        'change-template': '<!-- template -->\n$TITLE\n$BODY',
        'change-body-escapes': '<',
      }),
    ).toBe(
      '<!-- template -->\n<title>\n\\<!-- hidden -->\n\n`<!-- example -->`',
    )
  })

  it('does not apply title escapes to the body', () => {
    expect(
      render([change([pullRequest(1, { body: '<!-- body -->' })], '<title>')], {
        'change-template': '$TITLE\n$BODY',
        'change-title-escapes': '<',
      }),
    ).toBe('\\<title>\n<!-- body -->')
  })

  it('replaces title prefixes and case before escaping, independently of the body and template', () => {
    expect(
      render(
        [
          change([
            pullRequest(1, {
              title: 'feat(ui): add _feature_',
              body: 'feat(ui): add _feature_',
            }),
          ]),
        ],
        {
          'change-template': 'feat(ui): $TITLE\n$BODY',
          'change-title-escapes': '_',
          replacers: [
            {
              target: 'change-title',
              search: '/^feat\\(ui\\): (.*)$/',
              replace: '\\u$1',
            },
            { target: 'change-body', search: 'feat(ui):', replace: 'body:' },
            { search: 'feature', replace: 'global' },
          ],
        },
      ),
    ).toBe('feat(ui): Add \\_feature\\_\nbody: add _feature_')
  })

  it('applies a custom sticky regex independently to every title and repeated render', () => {
    const parsedConfig = config({ 'change-template': '$TITLE: $BODY' })
    const search = /^old/y
    search.lastIndex = 1
    parsedConfig.replacers = [
      { target: 'change-title', search, replace: 'new' },
    ]
    const params = {
      changes: [1, 2, 3].map((number) =>
        change([pullRequest(number, { title: 'old title', body: 'old body' })]),
      ),
      commits: [],
      serverUrl: 'https://github.com',
      config: parsedConfig,
    }

    const expected =
      'new title: old body\nnew title: old body\nnew title: old body'
    expect(pullRequestToString(params)).toBe(expected)
    expect(pullRequestToString(params)).toBe(expected)
    expect(search.lastIndex).toBe(1)
  })

  describe('body replacers', () => {
    const replacers = [
      { target: 'change-body', search: '/<!--.*?-->/gs', replace: '' },
    ]

    describe('section extraction with missing-match fallback', () => {
      const section = '## Release information'
      it.each([undefined, null, ''])(
        'treats a body of %j as empty when section rules are configured',
        (body) => {
          for (const notFound of ['empty', 'full'] as const) {
            expect(
              render([change([pullRequest(1, { body })])], {
                'change-template': '$BODY',
                replacers: [
                  { target: 'change-body', section, 'not-found': notFound },
                ],
              }),
            ).toBe('')
          }
        },
      )
      const extract = (body: string, notFound: 'empty' | 'full') =>
        render([change([pullRequest(1, { title: 'Keep _title_', body })])], {
          'change-template': '## Release information\n$TITLE\n$BODY',
          'change-body-escapes': '_',
          replacers: [
            {
              target: 'change-body',
              section,
              'not-found': notFound,
            },
          ],
        })

      it.each(['\n', '\r\n'])(
        'extracts raw section content before escaping with %j line endings',
        (newline) => {
          const body = [
            '## Description',
            'Internal context',
            '## Release information',
            '_Public notes_',
            '### Details',
            'Nested notes',
            '## Checklist',
            '- [x] Tested',
          ].join(newline)
          for (const notFound of ['empty', 'full'] as const) {
            expect(extract(body, notFound)).toBe(
              `## Release information\nKeep _title_\n\\_Public notes\\_${newline}### Details${newline}Nested notes${newline}`,
            )
          }
        },
      )

      it('extracts content at EOF and stops at a level-one heading', () => {
        expect(extract('## Release information\nPublic notes', 'empty')).toBe(
          '## Release information\nKeep _title_\nPublic notes',
        )
        expect(
          extract(
            '## Release information\nPublic notes\n# Other\nInternal notes',
            'empty',
          ),
        ).toBe('## Release information\nKeep _title_\nPublic notes\n')
      })

      it.each([
        '## Release information',
        '## Release information\n## Checklist\nInternal notes',
      ])(
        'retains an empty selected section even with full fallback for %j',
        (body) => {
          expect(extract(body, 'full')).toBe(
            '## Release information\nKeep _title_\n',
          )
        },
      )

      it('handles missing sections independently of matches in the template and other bodies', () => {
        const changes = [
          change([pullRequest(1, { body: '## Release information\nNotes' })]),
          change([
            pullRequest(2, { body: '## Description\n_Internal notes_' }),
          ]),
          change([pullRequest(3, { body: '' })]),
          change([
            pullRequest(4, { body: '## Release information\nMore notes' }),
          ]),
        ]
        for (const notFound of ['empty', 'full'] as const) {
          expect(
            render(changes, {
              'change-template': '## Release information: $NUMBER\n$BODY',
              'change-body-escapes': '_',
              replacers: [
                {
                  target: 'change-body',
                  section,
                  'not-found': notFound,
                },
              ],
            }),
          ).toBe(
            `## Release information: 1\nNotes\n## Release information: 2\n${notFound === 'full' ? '## Description\n\\_Internal notes\\_' : ''}\n## Release information: 3\n\n## Release information: 4\nMore notes`,
          )
        }
      })

      it('combines extraction and regex cleanup in configuration order', () => {
        expect(
          render(
            [
              change([
                pullRequest(1, {
                  body: '## Old heading\n<!-- hidden -->Public\n## Tests\nPrivate',
                }),
              ]),
            ],
            {
              'change-template': '$BODY',
              replacers: [
                {
                  target: 'change-body',
                  search: 'Old heading',
                  replace: 'Release information',
                },
                { target: 'change-body', section },
                {
                  target: 'change-body',
                  search: '/<!--.*?-->/gs',
                  replace: '',
                },
              ],
            },
          ),
        ).toBe('Public\n')
        expect(
          render([change([pullRequest(1, { body: '## Other\nPrivate' })])], {
            'change-template': '$BODY',
            replacers: [
              { target: 'change-body', section, 'not-found': 'empty' },
              {
                target: 'change-body',
                search: '/^$/',
                replace: 'No release notes',
              },
            ],
          }),
        ).toBe('No release notes')
      })
    })

    it('applies a custom sticky regex independently to every body and repeated render', () => {
      const parsedConfig = config({ 'change-template': '$BODY' })
      const search = /^old/y
      search.lastIndex = 1
      parsedConfig.replacers = [
        { target: 'change-body', search, replace: 'new' },
      ]
      const params = {
        changes: [1, 2, 3].map((number) =>
          change([pullRequest(number, { body: 'old body' })]),
        ),
        commits: [],
        serverUrl: 'https://github.com',
        config: parsedConfig,
      }

      expect(pullRequestToString(params)).toBe('new body\nnew body\nnew body')
      expect(pullRequestToString(params)).toBe('new body\nnew body\nnew body')
      expect(search.lastIndex).toBe(1)
    })

    it('removes multiline comments before escaping only the newest body', () => {
      const merged = change([
        pullRequest(1, { body: 'older body' }),
        pullRequest(2, {
          title: '<!-- title -->',
          body: '<!-- first\nsection --><!-- second\r\nsection --><b>Visible</b>',
        }),
      ])
      expect(
        render([merged], {
          'change-template': '<!-- template -->\n$TITLE\n$BODY',
          'change-body-escapes': '<',
          replacers,
        }),
      ).toBe('<!-- template -->\n<!-- title -->\n\\<b>Visible\\</b>')
    })

    it('applies ordered replacers independently to each body with shared replacement syntax', () => {
      expect(
        render(
          [1, 2].map((number) =>
            change([pullRequest(number, { body: 'old value $TITLE' })]),
          ),
          {
            'change-template': '$BODY',
            replacers: [
              { target: 'change-body', search: '/^(old)/', replace: '\\U$1' },
              { search: 'value', replace: 'global' },
              { target: 'change-body', search: 'OLD', replace: 'new' },
            ],
          },
        ),
      ).toBe('new value $TITLE\nnew value $TITLE')
    })

    it.each([undefined, null, ''])(
      'preserves existing behavior for a body of %j',
      (body) => {
        expect(
          render([change([pullRequest(1, { body })])], {
            'change-template': '$BODY',
            replacers,
          }),
        ).toBe(body == null ? '$BODY' : '')
      },
    )

    it('extracts release information without affecting other change fields', () => {
      expect(
        render(
          [
            change([
              pullRequest(1, {
                title: 'Keep title',
                body: '## Description\nInternal context\n## Release information\nPublic notes\n## Checklist\n- [x] Tested',
              }),
            ]),
          ],
          {
            'change-template': '$TITLE\n$BODY',
            replacers: [
              {
                target: 'change-body',
                search:
                  '/^[\\s\\S]*?## Release information\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |$)[\\s\\S]*$/',
                replace: '$1',
              },
            ],
          },
        ),
      ).toBe('Keep title\nPublic notes')
    })
  })

  describe('body escaping', () => {
    const renderBody = (body: string | null | undefined, escapes?: string) =>
      render([change([pullRequest(1, { body })])], {
        'change-template': '$BODY',
        'change-body-escapes': escapes,
      })

    it.each([undefined, ''])(
      'keeps the body unchanged with escapes %j',
      (escapes) => {
        const body = '<!-- hidden -->\n**Markdown** and `code`'
        expect(renderBody(body, escapes)).toBe(body)
      },
    )

    it.each([undefined, null])(
      'keeps existing missing-body behavior for %j',
      (body) => {
        expect(renderBody(body, '<')).toBe('$BODY')
      },
    )

    it('preserves an empty body', () => {
      expect(renderBody('', '<')).toBe('')
    })

    it.each([
      ['<!-- hidden -->', '\\<!-- hidden -->'],
      ['<!-- first --><!-- second -->', '\\<!-- first -->\\<!-- second -->'],
      ['<!-- hidden\nmultiline -->', '\\<!-- hidden\nmultiline -->'],
      ['<!-- hidden\r\nmultiline -->', '\\<!-- hidden\r\nmultiline -->'],
      ['<!-- unfinished', '\\<!-- unfinished'],
      ['Text <b>bold</b>', 'Text \\<b>bold\\</b>'],
    ])('escapes HTML characters: %j', (body, expected) => {
      expect(renderBody(body, '<')).toBe(expected)
    })

    it.each([
      '`<!-- cspell:words releasedrafter -->`',
      '```md\n<!-- cspell:words releasedrafter -->\n```',
      '```md\r\n<!-- @@inject:table.csv -->\r\n```',
    ])('skips backtick-delimited examples: %j', (example) => {
      expect(
        renderBody(`<!-- before -->\n${example}\n<!-- after -->`, '<'),
      ).toBe(`\\<!-- before -->\n${example}\n\\<!-- after -->`)
    })

    it('escapes backtick-delimited text when backticks are selected', () => {
      expect(renderBody('`<tag>`', '`<')).toBe('\\`\\<tag>\\`')
    })

    it('treats configured regex characters literally', () => {
      expect(renderBody('[*]', '[*]')).toBe('\\[\\*\\]')
    })

    it('prevents user and issue mentions like title escaping', () => {
      expect(renderBody('@octocat #42 `@octocat #42`', '@#')).toBe(
        '@<!---->octocat #<!---->42 `@octocat #42`',
      )
    })

    it.each([0, 1, 2, 3, 4])(
      'handles %i existing backslashes before HTML',
      (count) => {
        expect(renderBody(`${'\\'.repeat(count)}<!-- hidden -->`, '<')).toBe(
          `${'\\'.repeat(count + (count % 2 === 0 ? 1 : 0))}<!-- hidden -->`,
        )
      },
    )

    it('escapes backslashes without cancelling the HTML escape', () => {
      expect(renderBody('\\<!-- hidden -->', '\\<')).toBe(
        '\\\\\\<!-- hidden -->',
      )
    })
  })

  it.each([
    ['`<tag>` <tag>', '<', '`<tag>` \\<tag>'],
    ['`<tag>`', '`<', '\\`\\<tag>\\`'],
    ['\\<tag>', '<', '\\\\<tag>'],
    ['@octocat #42', '@#', '@<!---->octocat #<!---->42'],
  ])('preserves title escaping for %j', (title, escapes, expected) => {
    expect(
      render([change([pullRequest(1)], title)], {
        'change-template': '$TITLE',
        'change-title-escapes': escapes,
      }),
    ).toBe(expected)
  })
})
