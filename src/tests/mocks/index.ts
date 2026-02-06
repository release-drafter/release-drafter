import { composeConfigGet } from 'src/common'
import { vi } from 'vitest'
import { AvailableConfigs } from './config'
export * from './context'
export * as core from './core'
export { mockGraphqlQuery } from './graphql'
export {
  getReleasePayload,
  nockGetReleases,
  nockPostRelease,
  nockGetAndPostReleases,
  nockGetAndPatchReleases
} from './releases'
export { mockedConfigModule } from './config'

const mocks = vi.hoisted(() => ({
  /**
   * Use this mock as a nock().post() body matcher, such as expectations
   * can be defined as :
   * @example expect(mocks.postReleaseBody.mock.lastCall).toMatchInlineSnapshot('...')
   */
  postReleaseBody: vi.fn(() => true),
  /**
   * Use this mock as a nock().patch() body matcher, such as expectations
   * can be defined as :
   * @example expect(mocks.patchReleaseBody.mock.lastCall).toMatchInlineSnapshot('...')
   */
  patchReleaseBody: vi.fn(() => true),
  config: vi.fn<() => AvailableConfigs | undefined>(() => undefined),
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
