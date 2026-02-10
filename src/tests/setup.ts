/**
 * Vitest setup file.
 *
 * Run before each test file in the same process
 *
 * @see https://vitest.dev/config/setupfiles.html
 */

import { afterEach, beforeEach, vi, beforeAll, afterAll } from 'vitest'
import nock from 'nock'
import { mocks } from './mocks'
import { sharedInputSchema } from 'src/common/shared-input.schema'
import z from 'zod'

/**
 * The call to vi.mock is hoisted, so it doesn't matter where you call it.
 * @see https://vitest.dev/api/vi.html#vi-mock
 */
vi.mock(
  import('src/common/config'),
  (await import('./mocks')).mockedConfigModule
)
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
    }
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
