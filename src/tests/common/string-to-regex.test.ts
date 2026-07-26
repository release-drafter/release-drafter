import { describe, expect, it } from 'vitest'
import { stringToRegex } from '#src/common/string-to-regex.ts'

describe('stringToRegex', () => {
  it.each([
    ['release', 'release'],
    ['release.*', 'release\\.\\*'],
    ['', '(?:)'],
    ['/unterminated', '\\/unterminated'],
    ['/pattern/z', '\\/pattern/z'],
    ['//g', '\\/\\/g'],
  ])('treats %j as a global literal string', (search, source) => {
    expect(stringToRegex(search)).toEqual(new RegExp(source, 'g'))
  })

  it('preserves escaped slashes in a regex literal', () => {
    expect(stringToRegex('/github\\/release-drafter/i')).toEqual(
      /github\/release-drafter/i,
    )
  })

  it.each([
    ['/pattern/', ''],
    ['/pattern/gimsu', 'gimsu'],
    ['/pattern/ssggiimmuu', 'gimsu'],
    ['/pattern/AJUXx', ''],
    ['/pattern/GIMSU', 'g'],
  ])('parses flags from %j as %j', (search, flags) => {
    expect(stringToRegex(search).flags).toBe(flags)
  })

  it('uses the final slash as the delimiter', () => {
    expect(stringToRegex('///g')).toEqual(/\//g)
  })

  it.each([
    '/[/g',
    '/(/',
    '/foo{2,1}/',
  ])('throws for malformed regex literal %j', (search) => {
    expect(() => stringToRegex(search)).toThrow(SyntaxError)
  })
})
