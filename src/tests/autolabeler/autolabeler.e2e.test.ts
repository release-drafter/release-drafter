import { describe, expect, it } from 'vitest'
import { runAutolabeler } from '#tests/helpers/index.ts'
import {
  mockContext,
  mockInput,
  mocks,
  nockGetPrFiles,
} from '#tests/mocks/index.ts'
import { nockPostPrLabels } from '#tests/mocks/pull_requests.ts'

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
    expect(mocks.core.setOutput).toHaveBeenCalledWith('number', '1475')
    expect(mocks.core.setOutput).toHaveBeenCalledWith('labels', 'chore')
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

  it('submits deduplicated labels, diagnostics and outputs after stopping', async () => {
    await mockContext('pull_request-synchronize')
    mocks.config.mockReturnValue('config-autolabeler-rule-options')
    const getScope = nockGetPrFiles({ filenames: ['README.md'] })
    const postScope = nockPostPrLabels({})

    await runAutolabeler()

    expect(mocks.postPrLabelsBody).toHaveBeenCalledExactlyOnceWith({
      labels: ['prior', 'documentation', 'chore'],
    })
    expect(
      mocks.core.info.mock.calls
        .flat()
        .filter((message) => message.startsWith('Found label')),
    ).toEqual([
      "Found label for files: 'prior'",
      "Found label for files: 'documentation'",
      "Found label for files: 'chore'",
      "Found label for files: 'documentation'",
      "Found label for files: 'prior'",
    ])
    expect(mocks.core.setOutput).toHaveBeenCalledWith(
      'labels',
      'prior,documentation,chore',
    )
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
    expect(getScope.isDone()).toBe(true)
    expect(postScope.isDone()).toBe(true)
  })

  it.each([
    'config-autolabeler-rule-options',
    'config-autolabeler-fallback-only',
  ] as const)('adds and reports the fallback with %s', async (config) => {
    await mockContext('pull_request-synchronize')
    mocks.config.mockReturnValue(config)
    const getScope = nockGetPrFiles({ filenames: ['src/index.ts'] })
    const postScope = nockPostPrLabels({})

    await runAutolabeler()

    expect(mocks.postPrLabelsBody).toHaveBeenCalledExactlyOnceWith({
      labels: ['needs-triage', 'uncategorized'],
    })
    expect(mocks.core.info).toHaveBeenCalledWith(
      "Found label for fallback: 'needs-triage'",
    )
    expect(mocks.core.info).toHaveBeenCalledWith(
      "Found label for fallback: 'uncategorized'",
    )
    expect(mocks.core.setOutput).toHaveBeenCalledWith(
      'labels',
      'needs-triage,uncategorized',
    )
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
    expect(getScope.isDone()).toBe(true)
    expect(postScope.isDone()).toBe(true)
  })

  it('reports the fallback in dry runs without submitting labels', async () => {
    await mockContext('pull_request-synchronize')
    await mockInput('dry-run', 'true')
    mocks.config.mockReturnValue('config-autolabeler-fallback-only')
    const getScope = nockGetPrFiles({ filenames: [] })

    await runAutolabeler()

    expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
    expect(mocks.core.info).toHaveBeenCalledWith(
      '[dry-run] Would add labels [needs-triage, uncategorized] to PR #1475',
    )
    expect(mocks.core.setOutput).toHaveBeenCalledWith(
      'labels',
      'needs-triage,uncategorized',
    )
    expect(mocks.core.setFailed).not.toHaveBeenCalled()
    expect(getScope.isDone()).toBe(true)
  })

  it('rejects empty label lists before fetching files or submitting labels', async () => {
    await mockContext('pull_request-synchronize')
    mocks.config.mockReturnValue('config-autolabeler-invalid-labels')

    await runAutolabeler()

    expect(mocks.core.setFailed).toHaveBeenCalledOnce()
    expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
    expect(mocks.core.setOutput).not.toHaveBeenCalled()
  })

  it.each(['config-autolabeler-no-match', 'config-autolabeler-empty'] as const)(
    'sets the pull request number and performs no write without matches or fallback: %s',
    async (config) => {
      await mockContext('pull_request-synchronize')
      mocks.config.mockReturnValue(config)
      const getScope = nockGetPrFiles({ filenames: ['src/index.ts'] })

      await runAutolabeler()

      expect(mocks.core.setFailed).not.toHaveBeenCalled()
      expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
      expect(mocks.core.setOutput).toHaveBeenCalledWith('number', '1475')
      expect(mocks.core.setOutput).not.toHaveBeenCalledWith(
        'labels',
        expect.anything(),
      )
      expect(getScope.isDone()).toBe(true)
    },
  )

  it('fails without reading pull request files for unsupported events', async () => {
    await mockContext('push')
    mocks.config.mockReturnValue('config-autolabeler')

    await runAutolabeler()

    expect(mocks.core.setFailed).toHaveBeenCalledWith(
      "Event type is wrong. Expected 'pull_request' or 'pull_request_target', received 'push'",
    )
    expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
    expect(mocks.core.setOutput).not.toHaveBeenCalled()
  })
})
