import { describe, expect, it } from 'vitest'
import type { PullRequest } from '../types.ts'
import {
  generateAuthorsSentence,
  generateNewContributorsList,
} from './generate-contributors-sentence.ts'

const pullRequest = (
  number: number,
  login: string,
  mergedAt: string,
): PullRequest => ({
  number,
  title: `Change ${number}`,
  baseRepository: 'acme/widgets',
  mergedAt,
  author: { login, url: `https://github.com/${login}` },
  url: `https://github.com/acme/widgets/pull/${number}`,
})

describe('contributor rendering', () => {
  it('retains named commit authors and orders PR authors before coauthors and bots', () => {
    const params = {
      serverUrl: 'https://github.com/',
      pullRequests: [
        { ...pullRequest(1, 'alice', '2026-01-01'), mergeCommitOid: 'merge' },
        {
          ...pullRequest(2, 'robot', '2026-01-02'),
          author: { login: 'robot', type: 'Bot' },
        },
      ],
      commits: [
        {
          oid: 'merge',
          authors: [
            { name: 'Named Author' },
            { login: 'zoe' },
            { login: 'worker[bot]' },
            null,
          ],
        },
        { oid: 'unrelated', author: { name: 'Excluded Author' } },
      ],
    }
    expect(generateAuthorsSentence(params)).toBe(
      '@alice, [@robot[bot]](https://github.com/apps/robot), Named Author, @zoe and [@worker[bot]](https://github.com/apps/worker)',
    )
    expect(
      generateAuthorsSentence({
        ...params,
        authorTemplate: '$AUTHOR_MENTION',
        authorsSeparator: ' | ',
        authorsFinalSeparator: ' + ',
      }),
    ).toBe(
      '@alice | [@robot[bot]](https://github.com/apps/robot) | Named Author | @zoe + [@worker[bot]](https://github.com/apps/worker)',
    )
  })

  it('uses each new contributor’s earliest PR and sorts ties by PR number', () => {
    const pullRequests = [
      pullRequest(4, 'alice', '2026-01-02'),
      pullRequest(3, 'bob', '2026-01-01'),
      pullRequest(2, 'alice', '2026-01-01'),
      pullRequest(5, 'alice', '2026-01-03'),
      pullRequest(6, 'excluded', '2026-01-01'),
      pullRequest(7, 'experienced', '2026-01-01'),
      { number: 8, title: 'No author' },
    ]
    expect(
      generateNewContributorsList({
        pullRequests,
        newContributorLogins: new Set(['alice', 'bob', 'excluded']),
        config: {
          categories: [],
          'exclude-contributors': ['excluded'],
          'new-contributor-template': '$AUTHOR_MENTION in #$NUMBER ($URL)',
          'no-new-contributor-template': 'None',
        },
      }),
    ).toBe(
      '@alice in #2 (https://github.com/acme/widgets/pull/2)\n@bob in #3 (https://github.com/acme/widgets/pull/3)',
    )
  })
})
