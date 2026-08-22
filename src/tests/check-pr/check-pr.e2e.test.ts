import { describe, expect, it } from 'vitest'
import { runCheckPr } from '#tests/helpers/index.ts'
import { mockContext, mocks } from '#tests/mocks/index.ts'

describe('check-pr e2e', () => {
  it('loads composed configuration, fails an invalid PR, and performs no writes or outputs', async () => {
    await mockContext('pull_request-synchronize')
    mocks.config.mockReturnValue('config-check-pr')
    mocks.getContextsConfigWasFetchedFrom.mockReturnValue([
      {
        filepath: '.github/release-drafter.yml',
        scheme: 'github',
        ref: undefined,
        repo: { owner: 'release-drafter', repo: 'release-drafter' },
      },
      {
        filepath: '.github/release-drafter-base.yml',
        scheme: 'github',
        ref: 'main',
        repo: { owner: 'release-drafter', repo: '.github' },
      },
    ])

    await runCheckPr()

    expect(mocks.core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('does not match'),
    )
    expect(mocks.core.setOutput).not.toHaveBeenCalled()
    expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
    expect(mocks.postReleaseBody).not.toHaveBeenCalled()
    expect(mocks.patchReleaseBody).not.toHaveBeenCalled()
    expect(mocks.core.info).toHaveBeenCalledWith(
      expect.stringContaining('release-drafter-base.yml@main'),
    )
  })
})
