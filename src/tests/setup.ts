/**
 * Vitest setup file.
 *
 * Run before each test file in the same process
 *
 * @see https://vitest.dev/config/setupfiles.html
 */

import type { GitHubFetch } from '@release-drafter/github-adapter'
import nock from 'nock'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import type * as z from 'zod'
import type { sharedInputSchema } from '#gh-actions/common/shared-input.schema.ts'
import { mocks } from '#tests/mocks/index.ts'

/**
 * The call to vi.mock is hoisted, so it doesn't matter where you call it.
 * @see https://vitest.dev/api/vi.html#vi-mock
 */
vi.mock(
  import('#gh-actions/common/config/index.ts'),
  (await import('#tests/mocks/index.ts')).mockedConfigModule,
)
// Nock intercepts Node's fetch, so replace the Actions proxy transport in tests.
vi.mock(import('#gh-actions/common/github-fetch.ts'), () => ({
  createProxyAwareFetch: (): GitHubFetch => (input, init) =>
    globalThis.fetch(input, init),
}))

// Keep failed HTTP fixtures immediate without changing production retry defaults.
vi.mock(import('@release-drafter/github-adapter'), async (importOriginal) => {
  const adapter = await importOriginal()
  return {
    ...adapter,
    createGitHubAdapter: (
      options: Parameters<typeof adapter.createGitHubAdapter>[0],
    ) =>
      adapter.createGitHubAdapter({
        ...options,
        requestRetries: options.requestRetries ?? 0,
      }),
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
