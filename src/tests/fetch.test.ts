import { describe, expect, it } from 'vite-plus/test'
import { requestBody, requestUrl } from './fetch.ts'

describe('fetch test helpers', () => {
  const url = 'https://forge.example/api/releases'

  it.each([url, new URL(url), new Request(url)])(
    'extracts the URL from a fetch input',
    (input) => expect(requestUrl(input)).toBe(url),
  )

  it('preserves a serialized request body', () => {
    expect(requestBody({ body: '{"tag":"v1"}' })).toBe('{"tag":"v1"}')
  })

  it.each([undefined, { body: new URLSearchParams({ tag: 'v1' }) }])(
    'rejects a body that the JSON fixtures cannot parse',
    (init) => {
      expect(() => requestBody(init)).toThrow('Expected a string request body')
    },
  )
})
