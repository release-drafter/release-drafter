import nock from 'nock'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.restore()
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
})

afterEach(() => {
  nock.cleanAll()
})
