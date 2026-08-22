import { describe, expect, it } from 'vitest'
import { createPathMatcher } from './path-matcher.ts'

describe('createPathMatcher', () => {
  it('matches basename, rooted, directory, and dotfile patterns', () => {
    expect(createPathMatcher(['*.md'])('docs/README.md')).toBe(true)
    expect(createPathMatcher(['/README.md'])('docs/README.md')).toBe(false)
    expect(createPathMatcher(['docs/'])('docs/guide.md')).toBe(true)
    expect(createPathMatcher(['.*'])('nested/.env')).toBe(true)
  })

  it('matches direct and nested children below a trailing globstar', () => {
    const matches = createPathMatcher(['generated/**/'])

    expect(matches('generated/file.ts')).toBe(true)
    expect(matches('generated/nested/file.ts')).toBe(true)
    expect(matches('generated')).toBe(false)
    expect(matches('other/file.ts')).toBe(false)
  })

  it('applies ordered negation without reopening ignored parents', () => {
    expect(createPathMatcher(['*.ts', '!skip.ts'])('skip.ts')).toBe(false)
    expect(
      createPathMatcher(['generated/', '!generated/keep.ts'])(
        'generated/keep.ts',
      ),
    ).toBe(true)
    expect(
      createPathMatcher(['generated/', '!generated/', '!generated/keep.ts'])(
        'generated/keep.ts',
      ),
    ).toBe(false)
  })

  it('preserves gitignore escaping and glob syntax', () => {
    expect(createPathMatcher([String.raw`\!important`])('!important')).toBe(
      true,
    )
    expect(createPathMatcher([String.raw`\#hash`])('#hash')).toBe(true)
    expect(createPathMatcher(['*.{js,ts}'])('file.js')).toBe(false)
    expect(createPathMatcher(['file+(1).js'])('file1.js')).toBe(false)
    expect(createPathMatcher(['file[0-9].js'])('file1.js')).toBe(true)
  })

  it('ignores empty rules and preserves escaped trailing spaces', () => {
    const matches = createPathMatcher([
      '',
      '# comment',
      '/',
      '!',
      'notes   ',
      String.raw`escaped\ `,
    ])

    expect(matches('notes')).toBe(true)
    expect(matches('escaped ')).toBe(true)
    expect(matches('')).toBe(false)
    expect(createPathMatcher(['docs/'])('docs')).toBe(false)
  })
})
