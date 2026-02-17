import { describe, expect, it } from 'vitest'
import { mockContext, mocks, nockGetPrFiles } from '../mocks'
import { runAutolabeler } from '../helpers'
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
})
