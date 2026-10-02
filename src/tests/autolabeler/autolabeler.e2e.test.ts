import { context } from '@actions/github'
import nock from 'nock'
import { describe, expect, it } from 'vitest'
import { runAutolabeler } from '#tests/helpers/index.ts'
import {
  mockContext,
  mockInput,
  mocks,
  nockGetPrFiles,
} from '#tests/mocks/index.ts'
import { nockPostPrLabels } from '#tests/mocks/pull_requests.ts'

const labelsPath = '/repos/release-drafter/release-drafter/issues/1475/labels'
const nockCurrentLabels = (labels: string[]) =>
  nock('https://api.github.com')
    .get(labelsPath)
    .query({ per_page: 100 })
    .reply(
      200,
      labels.map((name) => ({ name })),
    )
const nockRemoveLabel = (name: string) =>
  nock('https://api.github.com')
    .delete(`${labelsPath}/${encodeURIComponent(name)}`)
    .reply(200, [])

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

  describe('sync-labels', () => {
    it('preserves stale labels without fetching labels when syncing is explicitly disabled', async () => {
      await mockContext('pull_request-synchronize')
      const pullRequest = context.payload.pull_request
      if (!pullRequest) throw new Error('Missing pull request in fixture')
      pullRequest.labels = [{ name: 'patch' }]
      mocks.config.mockReturnValue('config-autolabeler-sync-disabled')
      const filesScope = nockGetPrFiles({ filenames: [] })

      await runAutolabeler()

      expect(mocks.core.setFailed).not.toHaveBeenCalled()
      expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
      expect(mocks.core.setOutput).toHaveBeenCalledWith('number', '1475')
      expect(filesScope.isDone()).toBe(true)
    })

    it.each([
      {
        title: 'feat: new feature',
        current: [
          'PATCH',
          'needs-triage',
          'uncategorized',
          'later',
          'unused',
          'MINOR',
          'Shared',
          'external',
          'broken',
        ],
        selected: ['shared', 'minor', 'enhancement'],
        removed: ['PATCH', 'needs-triage', 'uncategorized', 'later', 'unused'],
      },
      {
        title: 'fix: regression',
        current: ['minor', 'enhancement', 'shared', 'external'],
        selected: ['shared', 'patch'],
        removed: ['minor', 'enhancement'],
      },
      {
        title: 'chore: cleanup',
        current: [
          'patch',
          'minor',
          'shared',
          'enhancement',
          'later',
          'external',
        ],
        selected: ['needs-triage', 'uncategorized'],
        removed: ['patch', 'minor', 'shared', 'enhancement', 'later'],
      },
      {
        title: 'feat: no existing labels',
        current: [],
        selected: ['shared', 'minor', 'enhancement'],
        removed: [],
      },
    ])(
      'syncs selected labels for "$title" and preserves unrelated labels',
      async ({ title, current, selected, removed }) => {
        await mockContext('pull_request-synchronize')
        const pullRequest = context.payload.pull_request
        if (!pullRequest) throw new Error('Missing pull request in fixture')
        pullRequest.title = title
        // The live API, rather than this stale webhook snapshot, determines removals.
        pullRequest.labels = [{ name: 'snapshot-only' }]
        mocks.config.mockReturnValue('config-autolabeler-sync-labels')
        const filesScope = nockGetPrFiles({ filenames: [] })
        const labelsScope = nockCurrentLabels(current)
        const postScope = nockPostPrLabels({})
        const removeScopes = removed.map(nockRemoveLabel)

        await runAutolabeler()

        expect(mocks.core.setFailed).not.toHaveBeenCalled()
        expect(mocks.postPrLabelsBody).toHaveBeenCalledExactlyOnceWith({
          labels: selected,
        })
        expect(mocks.core.setOutput).toHaveBeenCalledWith(
          'labels',
          selected.join(','),
        )
        expect(mocks.core.setOutput).toHaveBeenCalledWith('number', '1475')
        expect(
          [filesScope, labelsScope, postScope, ...removeScopes].every((scope) =>
            scope.isDone(),
          ),
        ).toBe(true)
      },
    )

    it.each([
      { current: ['patch', 'minor'], removed: ['patch', 'minor'] },
      { current: ['external'], removed: [] },
    ])(
      'syncs a run with no matches: $current',
      async ({ current, removed }) => {
        await mockContext('pull_request-synchronize')
        mocks.config.mockReturnValue('config-autolabeler-sync-no-match')
        const filesScope = nockGetPrFiles({ filenames: [] })
        const labelsScope = nockCurrentLabels(current)
        const removeScopes = removed.map(nockRemoveLabel)

        await runAutolabeler()

        expect(mocks.core.setFailed).not.toHaveBeenCalled()
        expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
        expect(mocks.core.setOutput).toHaveBeenCalledWith('number', '1475')
        expect(mocks.core.setOutput).not.toHaveBeenCalledWith(
          'labels',
          expect.anything(),
        )
        expect(
          [filesScope, labelsScope, ...removeScopes].every((scope) =>
            scope.isDone(),
          ),
        ).toBe(true)
      },
    )

    it('preserves all existing labels when the rule list is empty', async () => {
      await mockContext('pull_request-synchronize')
      mocks.config.mockReturnValue('config-autolabeler-sync-empty')
      const filesScope = nockGetPrFiles({ filenames: [] })
      const labelsScope = nockCurrentLabels(['patch', 'external'])

      await runAutolabeler()

      expect(mocks.core.setFailed).not.toHaveBeenCalled()
      expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
      expect(filesScope.isDone()).toBe(true)
      expect(labelsScope.isDone()).toBe(true)
    })

    it('reads every page of current labels before removing stale managed labels', async () => {
      await mockContext('pull_request-synchronize')
      mocks.config.mockReturnValue('config-autolabeler-sync-no-match')
      const filesScope = nockGetPrFiles({ filenames: [] })
      const labelsScope = nock('https://api.github.com')
        .get(labelsPath)
        .query({ per_page: 100 })
        .reply(
          200,
          Array.from({ length: 100 }, (_, i) => ({ name: `external-${i}` })),
          {
            link: `<https://api.github.com${labelsPath}?per_page=100&page=2>; rel="next"`,
          },
        )
        .get(labelsPath)
        .query({ per_page: 100, page: 2 })
        .reply(200, [{ name: 'patch' }])
      const removeScope = nockRemoveLabel('patch')

      await runAutolabeler()

      expect(mocks.core.setFailed).not.toHaveBeenCalled()
      expect(
        [filesScope, labelsScope, removeScope].every((scope) => scope.isDone()),
      ).toBe(true)
    })

    it.each([
      {
        config: 'config-autolabeler-sync-labels',
        selected: 'needs-triage,uncategorized',
      },
      { config: 'config-autolabeler-sync-no-match', selected: undefined },
    ] as const)(
      'reports removals without writing in dry runs: $config',
      async ({ config, selected }) => {
        await mockContext('pull_request-synchronize')
        await mockInput('dry-run', 'true')
        mocks.config.mockReturnValue(config)
        const filesScope = nockGetPrFiles({ filenames: [] })
        const labelsScope = nockCurrentLabels(['patch', 'external'])

        await runAutolabeler()

        expect(mocks.core.setFailed).not.toHaveBeenCalled()
        expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
        expect(mocks.core.info).toHaveBeenCalledWith(
          "[dry-run] Would remove label 'patch' from PR #1475",
        )
        if (selected) {
          expect(mocks.core.setOutput).toHaveBeenCalledWith('labels', selected)
          expect(mocks.core.info).toHaveBeenCalledWith(
            '[dry-run] Would add labels [needs-triage, uncategorized] to PR #1475',
          )
        } else {
          expect(mocks.core.setOutput).not.toHaveBeenCalledWith(
            'labels',
            expect.anything(),
          )
        }
        expect(filesScope.isDone()).toBe(true)
        expect(labelsScope.isDone()).toBe(true)
      },
    )

    it('fails without writing if current labels cannot be read', async () => {
      await mockContext('pull_request-synchronize')
      mocks.config.mockReturnValue('config-autolabeler-sync-labels')
      const filesScope = nockGetPrFiles({ filenames: [] })
      const labelsScope = nock('https://api.github.com')
        .get(labelsPath)
        .query({ per_page: 100 })
        .reply(403, { message: 'Cannot read labels' })

      await runAutolabeler()

      expect(mocks.core.setFailed).toHaveBeenCalledWith('Cannot read labels')
      expect(mocks.postPrLabelsBody).not.toHaveBeenCalled()
      expect(mocks.core.setOutput).not.toHaveBeenCalled()
      expect(filesScope.isDone()).toBe(true)
      expect(labelsScope.isDone()).toBe(true)
    })

    it('does not remove existing labels if adding selected labels fails', async () => {
      await mockContext('pull_request-synchronize')
      mocks.config.mockReturnValue('config-autolabeler-sync-labels')
      const filesScope = nockGetPrFiles({ filenames: [] })
      const labelsScope = nockCurrentLabels(['patch'])
      const postScope = nock('https://api.github.com')
        .post(labelsPath, { labels: ['needs-triage', 'uncategorized'] })
        .reply(403, { message: 'Cannot add labels' })

      await runAutolabeler()

      expect(mocks.core.setFailed).toHaveBeenCalledWith('Cannot add labels')
      expect(mocks.core.setOutput).not.toHaveBeenCalled()
      expect(
        [filesScope, labelsScope, postScope].every((scope) => scope.isDone()),
      ).toBe(true)
    })

    it('reports a failed removal', async () => {
      await mockContext('pull_request-synchronize')
      mocks.config.mockReturnValue('config-autolabeler-sync-no-match')
      const filesScope = nockGetPrFiles({ filenames: [] })
      const labelsScope = nockCurrentLabels(['patch'])
      const removeScope = nock('https://api.github.com')
        .delete(`${labelsPath}/patch`)
        .reply(403, { message: 'Cannot remove label' })

      await runAutolabeler()

      expect(mocks.core.setFailed).toHaveBeenCalledWith('Cannot remove label')
      expect(mocks.core.setOutput).not.toHaveBeenCalled()
      expect(
        [filesScope, labelsScope, removeScope].every((scope) => scope.isDone()),
      ).toBe(true)
    })
  })

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
