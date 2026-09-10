import { describe, expect, it } from 'vitest'
import { buildReplaceStringWithCasePreserved } from './search.ts'

describe('buildReplaceStringWithCasePreserved', () => {
  it.each([
    [null, 'Pattern', 'Pattern'],
    [[''], 'Pattern', 'Pattern'],
    [['FOO'], 'Pattern', 'PATTERN'],
    [['foo'], 'Pattern', 'pattern'],
    [['Foo'], 'pattern', 'Pattern'],
    [['fOO'], 'Pattern', 'pattern'],
    [['1Foo'], 'Pattern', 'Pattern'],
  ] as const)('preserves the case shape of %j', (matches, pattern, expected) => {
    expect(
      buildReplaceStringWithCasePreserved(
        matches === null ? null : [...matches],
        pattern,
      ),
    ).toBe(expected)
  })

  it('preserves case independently across matching hyphenated segments', () => {
    expect(buildReplaceStringWithCasePreserved(['FOO-bar'], 'baz-Qux')).toBe(
      'BAZ-qux',
    )
  })

  it('preserves case independently across matching underscored segments', () => {
    expect(buildReplaceStringWithCasePreserved(['FOO_bar'], 'baz_Qux')).toBe(
      'BAZ_qux',
    )
  })

  it('falls back to whole-pattern casing for mixed or mismatched separators', () => {
    expect(
      buildReplaceStringWithCasePreserved(['Foo-bar_baz'], 'qux-quux_corge'),
    ).toBe('Qux-quux_corge')
    expect(
      buildReplaceStringWithCasePreserved(['FOO-bar-baz'], 'qux-quux'),
    ).toBe('Qux-quux')
  })
})
