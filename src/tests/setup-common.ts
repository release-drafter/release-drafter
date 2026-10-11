import nock from 'nock'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vite-plus/test'

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
