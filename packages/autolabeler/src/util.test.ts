import { describe, expect, it } from 'vitest'
import { stringToRegex } from './util.ts'

describe('stringToRegex', () => {
  it('escapes plain text and makes it globally matchable', () => {
    expect(stringToRegex('feat(core)')).toEqual(/feat\(core\)/g)
  })

  it('parses regex literals with escaped delimiters', () => {
    expect(stringToRegex(String.raw`/docs{0,1}\/.+/i`)).toEqual(
      /docs{0,1}\/.+/i,
    )
  })

  it('deduplicates supported flags and discards legacy flags', () => {
    expect(stringToRegex('/feature/ggiAJUX')).toEqual(/feature/gi)
  })

  it('rejects invalid regex sources', () => {
    expect(() => stringToRegex('/[/')).toThrow(SyntaxError)
  })
})
