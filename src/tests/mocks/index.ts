import { composeConfigGet } from 'src/common'
import { vi } from 'vitest'
export * from './context'
export * as core from './core'
export { mockGraphqlQuery } from './graphql'
export { getReleasePayload, nockGetReleases } from './releases'
export { mockedConfigModule } from './config'

const mocks = vi.hoisted(() => ({
  config: vi.fn<() => 'config' | undefined>(() => undefined),
  getContextsConfigWasFetchedFrom: vi.fn<
    () => Awaited<ReturnType<typeof composeConfigGet>>['contexts']
  >(() => [
    {
      filepath: 'oui',
      scheme: 'github',
      ref: 'main',
      repo: { owner: 'cchanche', repo: 'proj' }
    }
  ])
}))

export { mocks }
