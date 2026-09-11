import { describe, expect, it, vi } from 'vitest'
import { selectChanges, splitCommitMessage } from '../change.ts'
import { configSchema } from '../config/config.schema.ts'
import { mergeInputAndConfig } from '../config/merge-input-and-config.ts'
import { noopLogger } from '../ports.ts'
import type { Commit, PullRequest } from '../types.ts'
import { buildReleasePayload } from './build-release-payload.ts'
import { changeToString } from './change-to-string.ts'
import { sortChanges } from './sort-changes.ts'

const directCommit = (overrides: Partial<Commit> = {}): Commit => ({
  oid: '1234567890abcdef',
  url: 'https://example.test/owner/repo/commit/1234567890abcdef',
  authoredAt: '2026-01-01T00:00:00Z',
  committedAt: '2026-01-02T00:00:00Z',
  message: 'feat(core): add commits\n\nRendered from the commit body.',
  author: {
    login: 'commit-author',
    url: 'https://example.test/commit-author',
  },
  associationStatus: 'none',
  ...overrides,
})

const pullRequest: PullRequest = {
  number: 42,
  title: 'fix: repair releases',
  url: 'https://example.test/owner/repo/pulls/42',
  mergedAt: '2026-01-03T00:00:00Z',
  baseRepository: 'owner/repo',
  author: { login: 'pr-author' },
}

const config = (overrides: Record<string, unknown> = {}) =>
  mergeInputAndConfig({
    config: configSchema.parse({
      commitish: 'main',
      template: '$CHANGES\n\n$CONTRIBUTORS',
      'include-commits': true,
      categories: [
        {
          title: 'Features',
          'semver-increment': 'minor',
          when: { conventional: { type: 'feat' } },
        },
        {
          title: 'Fixes',
          when: { conventional: { type: 'fix' } },
        },
      ],
      ...overrides,
    }),
    input: {},
    logger: noopLogger,
  })

describe('individual commit changes', () => {
  it('splits commit messages without retaining the separator', () => {
    expect(splitCommitMessage('Title\r\n\r\nBody\r\nline two')).toEqual({
      title: 'Title',
      body: 'Body\nline two',
    })
  })

  it('suppresses duplicate, associated, unknown, and merge-result commits', () => {
    const warning = vi.fn()
    const changes = selectChanges({
      commits: [
        directCommit(),
        directCommit(),
        directCommit({ oid: 'associated', associationStatus: 'associated' }),
        directCommit({
          oid: 'reported-association',
          associationStatus: 'none',
          associatedPullRequests: [
            { number: 99, baseRepository: 'someone/else' },
          ],
        }),
        directCommit({ oid: 'unknown', associationStatus: 'unknown' }),
        directCommit({ oid: 'merge-result', associationStatus: 'none' }),
      ],
      pullRequests: [{ ...pullRequest, mergeCommitOid: 'merge-result' }],
      config: config(),
      logger: { ...noopLogger, warning },
    })

    expect(changes.map((change) => change.type)).toEqual([
      'pull-request',
      'commit',
    ])
    expect(changes[1]).toMatchObject({
      type: 'commit',
      commit: { oid: '1234567890abcdef' },
    })
    expect(warning).toHaveBeenCalledWith(
      'Skipped 1 commit because pull request association could not be determined.',
    )
  })

  it('sorts pull requests and commits together by integration date', () => {
    const changes = selectChanges({
      commits: [directCommit()],
      pullRequests: [pullRequest],
      config: config(),
    })

    expect(
      sortChanges({ changes, config: config(), logger: noopLogger }).map(
        (change) => change.type,
      ),
    ).toEqual(['pull-request', 'commit'])
  })

  it('sorts dates chronologically across timezone offsets', () => {
    const changes = selectChanges({
      commits: [
        directCommit({
          oid: 'later',
          committedAt: '2026-01-02T01:00:00+01:00',
        }),
      ],
      pullRequests: [{ ...pullRequest, mergedAt: '2026-01-01T23:30:00Z' }],
      config: config({ 'sort-direction': 'ascending' }),
    })

    expect(
      sortChanges({
        changes,
        config: config({ 'sort-direction': 'ascending' }),
        logger: noopLogger,
      }).map((change) => change.type),
    ).toEqual(['pull-request', 'commit'])
  })

  it('renders generic and commit-specific variables', () => {
    expect(
      changeToString({
        changes: [{ type: 'commit', commit: directCommit() }],
        commits: [directCommit()],
        serverUrl: 'https://example.test',
        config: config({
          'commit-template':
            '$CHANGE_TYPE $CHANGE_TITLE $CHANGE_REFERENCE $COMMIT_BODY $COMMIT_AUTHORED_DATE $COMMIT_COMMITTED_DATE $CHANGE_AUTHORS',
        }),
      }),
    ).toBe(
      'commit feat(core): add commits [`1234567`](https://example.test/owner/repo/commit/1234567890abcdef) Rendered from the commit body. 2026-01-01T00:00:00Z 2026-01-02T00:00:00Z @commit-author',
    )
  })

  it('includes direct commit coauthors from trailers', () => {
    const commit = directCommit({
      message:
        'feat: collaborate\n\nCo-authored-by: Grace Hopper <grace@example.com>',
    })

    expect(
      changeToString({
        changes: [{ type: 'commit', commit }],
        commits: [commit],
        serverUrl: 'https://example.test',
        config: config({ 'commit-template': '$CHANGE_AUTHORS' }),
      }),
    ).toBe('@commit-author, Grace Hopper')
  })

  it('uses the same selected changes for changelog, versioning, and contributors', async () => {
    const resolveCommitish = vi.fn().mockResolvedValue('main')
    const result = await buildReleasePayload({
      adapter: { resolveCommitish },
      commits: [directCommit()],
      pullRequests: [pullRequest],
      config: config(),
      input: { publish: false },
      lastRelease: { id: 1, tagName: 'v1.0.0' },
      logger: noopLogger,
      repository: {
        owner: 'owner',
        name: 'repo',
        serverUrl: 'https://example.test',
      },
    })

    expect(result.body).toContain('## Features')
    expect(result.body).toContain(
      '* feat(core): add commits ([`1234567`](https://example.test/owner/repo/commit/1234567890abcdef)) @commit-author',
    )
    expect(result.body).toContain('## Fixes')
    expect(result.body).toContain('* fix: repair releases (#42) @pr-author')
    expect(result.body).toContain('@commit-author')
    expect(result.resolvedVersion).toBe('1.1.0')
  })
})
