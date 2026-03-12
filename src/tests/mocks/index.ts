import type { composeConfigGet } from 'src/common'
import { vi } from 'vitest'
import type { AvailableConfigs } from './config'

export * from './context'

import type * as core from '@actions/core'

export { mockedConfigModule } from './config'
export { getGqlPayload, mockGraphqlQuery } from './graphql'
export { mockInput } from './input'
export { nockGetPrFiles } from './pull_requests'
export {
  getReleasePayload,
  nockGetAndPatchReleases,
  nockGetAndPostReleases,
  nockGetReleases,
  nockPostRelease,
} from './releases'

const mocks = vi.hoisted(() => {
  const DEBUG_TESTS = false

  return {
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
    /**
     * Use this mock as a nock().patch() body matcher, such as expectations
     * can be defined as :
     * @example expect(mocks.postPrLabelsBody.mock.lastCall).toMatchInlineSnapshot('...')
     */
    postPrLabelsBody: vi.fn(() => true),
    config: vi.fn<() => AvailableConfigs | undefined>(() => undefined),
    getContextsConfigWasFetchedFrom: vi.fn<
      () => Awaited<ReturnType<typeof composeConfigGet>>['contexts']
    >(() => [
      {
        filepath: 'oui',
        scheme: 'github',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
    ]),
    core: {
      debug: vi.fn<typeof core.debug>(DEBUG_TESTS ? console.debug : undefined),
      error: vi.fn<typeof core.error>(DEBUG_TESTS ? console.error : undefined),
      info: vi.fn<typeof core.info>(DEBUG_TESTS ? console.info : undefined),
      warning: vi.fn<typeof core.warning>(),
      setOutput: vi.fn<typeof core.setOutput>(),
      setFailed: vi.fn<typeof core.setFailed>(
        DEBUG_TESTS ? console.error : undefined,
      ),
    },
  }
})

export { mocks }
