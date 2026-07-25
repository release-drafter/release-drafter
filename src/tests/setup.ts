/**
 * Vitest setup file.
 *
 * Run before each test file in the same process
 *
 * @see https://vitest.dev/config/setupfiles.html
 */

import nock from 'nock'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import type * as z from 'zod'
import type { sharedInputSchema } from '#src/common/shared-input.schema.ts'
import { mocks } from '#tests/mocks/index.ts'

/**
 * The call to vi.mock is hoisted, so it doesn't matter where you call it.
 * @see https://vitest.dev/api/vi.html#vi-mock
 */
vi.mock(
  import('#src/common/config/index.ts'),
  (await import('#tests/mocks/index.ts')).mockedConfigModule,
)
/**
 * `@actions/github` hands octokit an `undici`-backed `fetch` that nock cannot
 * intercept. Swap in Node's global `fetch`, which nock understands.
 *
 * Tests only — production keeps `@actions/github`'s `fetch` so its
 * `http_proxy`/`https_proxy` dispatcher survives.
 */
vi.mock(import('@actions/github'), async (iom) => {
  const om = await iom()
  return {
    ...om,
    getOctokit: ((token, options, ...plugins) =>
      om.getOctokit(
        token,
        {
          ...options,
          request: { ...options?.request, fetch: globalThis.fetch },
        },
        ...plugins,
      )) as typeof om.getOctokit,
  }
})

vi.mock(import('@actions/core'), async (iom) => {
  const om = await iom()
  return {
    ...om,
    ...mocks.core,
    getInput: (name: string) => {
      switch (name as keyof z.infer<typeof sharedInputSchema>) {
        case 'token':
          return 'test'
        default:
          return om.getInput(name) // will read from INPUT_* variables
      }
    },
  }
})

beforeAll(() => {
  // Disable actual network requests.
  nock.disableNetConnect()
})

afterAll(() => {
  nock.restore()
})

beforeEach(() => {
  nock('https://api.github.com')
    .post('/app/installations/179208/access_tokens')
    .reply(200, { token: 'test' })
  vi.resetAllMocks()
  vi.unstubAllEnvs()
})

afterEach(() => {
  nock.cleanAll()
})
