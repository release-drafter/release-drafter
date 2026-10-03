import { describe, expect, it } from 'vitest'
import { applyReplacers } from './apply-replacers.ts'

describe('applyReplacers', () => {
  it.each(['global', 'change-body'] as const)(
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
})
