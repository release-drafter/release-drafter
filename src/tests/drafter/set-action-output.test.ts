import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActionOutput } from '#src/actions/drafter/config/set-action-output.ts'
import { mocks } from '#tests/mocks/index.ts'

describe('setActionOutput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets the effective release tag and state', () => {
    setActionOutput({
      upsertedRelease: undefined,
      releasePayload: {
        body: 'Release notes',
        draft: false,
        name: 'v8.0.0-beta.1',
        prerelease: true,
        tag: 'v8.0.0-beta.1',
      } as never,
    })

    expect(mocks.core.setOutput).toHaveBeenCalledWith(
      'tag_name',
      'v8.0.0-beta.1',
    )
    expect(mocks.core.setOutput).toHaveBeenCalledWith('draft', 'false')
    expect(mocks.core.setOutput).toHaveBeenCalledWith('prerelease', 'true')
  })
})
