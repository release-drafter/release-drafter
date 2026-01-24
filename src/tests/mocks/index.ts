import { vi } from 'vitest'

export * from './context'
export * as core from './core'
export { mockGraphqlQuery } from './graphql'
export { getReleasePayload, nockGetReleases } from './releases'
export { mockedLoadConfigFile } from './config'

const mocks = vi.hoisted(() => ({
  config: vi.fn<() => 'config' | 'config-non-master-branch' | undefined>(
    () => undefined
  )
}))

export { mocks }
