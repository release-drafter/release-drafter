import { describe, expect, it } from 'vitest'
import { runAutolabeler } from '../helpers'
import { mockContext, mockInput, mocks, nockGetPrFiles } from '../mocks'
import { nockPostPrLabels } from '../mocks/pull_requests'

describe('autolabeler e2e', async () => {
  it('should label the PRs', async () => {
    await mockContext('pull_request-synchronize')
    mocks.config.mockReturnValue('config-autolabeler')

    const getScope = nockGetPrFiles({ files: 'files' })
    const postScope = nockPostPrLabels({})

    await runAutolabeler()

    expect(mocks.postPrLabelsBody.mock.lastCall).toMatchInlineSnapshot(`
      [
        {
          "labels": [
            "chore",
          ],
        },
      ]
    `)
    expect(getScope.isDone()).toBe(true) // should call the mocked endpoints
    expect(postScope.isDone()).toBe(true) // should call the mocked endpoints
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
  })

  describe('dry-run', () => {
    it('does not add labels and logs what it would have done', async () => {
      await mockContext('pull_request-synchronize')
      await mockInput('dry-run', 'true')
      mocks.config.mockReturnValue('config-autolabeler')

      // Only a GET scope — no POST scope, so any attempt to add labels
      // would trigger an unmatched-request error from nock.
      const getScope = nockGetPrFiles({ files: 'files' })

      await runAutolabeler()

      // No write request should have been made
      expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()

      // Dry-run message should have been logged
      const infoMessages = mocks.core.info.mock.calls.flat()
      expect(infoMessages.some((msg) => msg.includes('[dry-run]'))).toBe(true)

      expect(getScope.isDone()).toBe(true) // GET PR files was still called
      expect(mocks.core.setFailed).not.toHaveBeenCalled()
    })
  })
})
