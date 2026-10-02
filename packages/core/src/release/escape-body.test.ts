import { fromMarkdown } from 'mdast-util-from-markdown'
import { describe, expect, it } from 'vitest'
import { escapeBody } from './escape-body.ts'

describe('escapeBody', () => {
  it.each([undefined, ''])(
    'leaves the body unchanged with escapes %j',
    (escapes) => {
      const body = '<!-- hidden -->\n**Markdown** and `code`'
      expect(escapeBody(body, escapes)).toBe(body)
    },
  )

  it.each([undefined, null, ''])(
    'preserves an absent or empty body: %j',
    (body) => {
      expect(escapeBody(body, '<')).toBe(body)
    },
  )

  it.each([
    ['<!-- hidden -->', '\\<!-- hidden -->'],
    ['<!-- first --><!-- second -->', '\\<!-- first -->\\<!-- second -->'],
    ['<!-- hidden\nmultiline -->', '\\<!-- hidden\nmultiline -->'],
    ['<!-- hidden\r\nmultiline -->', '\\<!-- hidden\r\nmultiline -->'],
    ['<!-- unfinished', '\\<!-- unfinished'],
    ['<!-- `hidden` -->', '\\<!-- `hidden` -->'],
    ['Text <b>bold</b>', 'Text \\<b>bold\\</b>'],
  ])('makes HTML visible: %j', (body, expected) => {
    expect(escapeBody(body, '<')).toBe(expected)
  })

  it.each([
    '`<!-- cspell:words releasedrafter -->`',
    '``<!-- `example` -->``',
    '`multiline\ntext <!-- example -->`',
    '```md\n<!-- cspell:words releasedrafter -->\n```',
    '~~~md\n<!-- @@inject:table.csv -->\n~~~',
    '````md\n```md\n<!-- example -->\n```\n````',
    '    <!-- indented example -->',
    '\t<!-- tab-indented example -->',
    '> ```md\n> <!-- quoted example -->\n> ```',
    '- Example:\n\n  ```md\n  <!-- listed example -->\n  ```',
    '```md\r\n<!-- example -->\r\n```',
    '```md\n<!-- example without a closing fence -->',
  ])('preserves code examples: %j', (example) => {
    const body = `<!-- before -->\n\n${example}\n\n<!-- after -->`
    // An unclosed fence includes the remainder of the document as code.
    const after = example.endsWith('fence -->')
      ? '<!-- after -->'
      : '\\<!-- after -->'
    expect(escapeBody(body, '<')).toBe(
      `\\<!-- before -->\n\n${example}\n\n${after}`,
    )
  })

  it('preserves code delimiters even when they are selected for escaping', () => {
    const body = '*text* `*code*`\n\n~~~md\n*code*\n~~~'
    expect(escapeBody(body, '*`~')).toBe(
      '\\*text\\* `*code*`\n\n~~~md\n*code*\n~~~',
    )
  })

  it('escapes an unmatched or escaped backtick as ordinary text', () => {
    expect(escapeBody('`unmatched <tag>', '<')).toBe('`unmatched \\<tag>')
    expect(escapeBody('\\`<!-- hidden -->\\`', '<')).toBe(
      '\\`\\<!-- hidden -->\\`',
    )
  })

  it('handles regex metacharacters and Unicode without treating them as patterns', () => {
    expect(escapeBody('[*] 🛸', '[*]🛸')).toBe('\\[\\*\\] \\🛸')
  })

  it('prevents user and issue mentions outside code like title escaping', () => {
    expect(escapeBody('@octocat #42 `@octocat #42`', '@#')).toBe(
      '@<!---->octocat #<!---->42 `@octocat #42`',
    )
  })

  it.each([0, 1, 2, 3, 4])(
    'keeps comments visible after %i existing backslashes',
    (count) => {
      const body = `${'\\'.repeat(count)}<!-- hidden -->`
      const escaped = escapeBody(body, '<') as string
      expect(escaped).toBe(
        `${'\\'.repeat(count + (count % 2 === 0 ? 1 : 0))}<!-- hidden -->`,
      )
      expect(fromMarkdown(escaped).children).toMatchObject([
        { type: 'paragraph' },
      ])
    },
  )

  it('escapes backslashes without cancelling the HTML escape', () => {
    expect(escapeBody('\\<!-- hidden -->', '\\<')).toBe('\\\\\\<!-- hidden -->')
  })
})
