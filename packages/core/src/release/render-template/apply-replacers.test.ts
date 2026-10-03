import { describe, expect, it } from 'vitest'
import { applyReplacers } from './apply-replacers.ts'

describe('applyReplacers', () => {
  it.each(['global', 'change-body', 'change-title'] as const)(
    'isolates sticky regex state for repeated %s inputs',
    (target) => {
      const search = /^old/y
      search.lastIndex = 2
      const replacers = [{ target, search, replace: 'new' }]

      expect(
        ['old', 'old', 'old'].map((input) =>
          applyReplacers(input, replacers, target),
        ),
      ).toEqual(['new', 'new', 'new'])
      expect(search.lastIndex).toBe(2)
    },
  )

  it.each([
    [/old/, 'newold'],
    [/old/g, 'newnew'],
    [/old/y, 'newold'],
    [/old/gy, 'newnew'],
  ] as const)('preserves replacement flags for %s', (search, expected) => {
    const replacers = [{ search, replace: 'new' }]
    expect(applyReplacers('oldold', replacers)).toBe(expected)
    expect(applyReplacers('oldold', replacers)).toBe(expected)
  })

  it('keeps frozen caller-owned regexes usable across repeated inputs', () => {
    const search = /^old/y
    search.lastIndex = 2
    Object.freeze(search)
    const replacers = [
      { target: 'change-body' as const, search, replace: 'new' },
    ]

    expect(applyReplacers('old', replacers, 'change-body')).toBe('new')
    expect(applyReplacers('old', replacers, 'change-body')).toBe('new')
    expect(search.lastIndex).toBe(2)
  })

  it('uses changed source and flags when the caller recompiles a regex', () => {
    const search = /old/
    const replacers = [{ search, replace: 'new' }]

    expect(applyReplacers('old OLD old', replacers)).toBe('new OLD old')
    search.compile('old', 'g')
    expect(applyReplacers('old OLD old', replacers)).toBe('new OLD new')
    search.compile('OLD', 'g')
    expect(applyReplacers('old OLD old', replacers)).toBe('old new old')
  })
})
