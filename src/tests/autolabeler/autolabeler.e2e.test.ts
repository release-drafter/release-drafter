import { describe, it } from 'vitest'
import { mockContext } from '../mocks'
import { runAutolabeler } from '../helpers'

describe('autolabeler e2e', async () => {
  it('should label the PRs', async () => {
    await mockContext('push')

    await runAutolabeler()

    // TODO
  })
})
