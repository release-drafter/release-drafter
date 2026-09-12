import { describe, expect, it } from 'vitest'
import type { ParsedGroupChange, PullRequest } from '../types.ts'
import { groupChanges } from './group-changes.ts'

const rule = (
  overrides: Partial<ParsedGroupChange> = {},
): ParsedGroupChange => ({
  pattern: /^Bump (?<group>.+?) from (?<from>\S+) to (?<to>\S+)$/,
  'title-template': 'Bump $GROUP from $FIRST_FROM to $LAST_TO',
  groupNames: ['group'],
  captureNames: ['from', 'to'],
  ...overrides,
})

const suffixRule = (overrides: Partial<ParsedGroupChange> = {}) =>
  rule({
    pattern:
      /^Bump (?<group>.+?) from (?<from>\S+) to (?<to>\S+)(?<group_in> in .+)?$/,
    'title-template': 'Bump $GROUP from $FIRST_FROM to $LAST_TO$GROUP_IN',
    groupNames: ['group', 'group_in'],
    ...overrides,
  })

const pullRequest = (
  number: number,
  title: string,
  mergedAt?: string | null,
): PullRequest => ({
  number,
  title,
  // Merged in ascending pull request number order.
  mergedAt:
    mergedAt === undefined
      ? `2025-09-01T00:00:00.${String(number).padStart(4, '0')}Z`
      : mergedAt,
})

const bumps = [
  pullRequest(308, 'Bump njord.version from 0.9.1 to 0.9.2'),
  pullRequest(
    309,
    'Bump org.codehaus.mojo:versions-maven-plugin from 2.20.1 to 2.21.0',
  ),
  pullRequest(310, 'Bump njord.version from 0.9.2 to 0.9.3'),
  pullRequest(316, 'Bump njord.version from 0.9.3 to 0.9.5'),
]

const titles = (pullRequests: PullRequest[], rules?: ParsedGroupChange[]) =>
  groupChanges({ pullRequests, rules }).map((change) => ({
    title: change.title,
    numbers: change.pullRequests.map(({ number }) => number),
    representative: change.representative.number,
  }))

describe('groupChanges', () => {
  it('maps every pull request to its own change when no rule is configured', () => {
    expect(titles(bumps)).toEqual([
      { title: bumps[0].title, numbers: [308], representative: 308 },
      { title: bumps[1].title, numbers: [309], representative: 309 },
      { title: bumps[2].title, numbers: [310], representative: 310 },
      { title: bumps[3].title, numbers: [316], representative: 316 },
    ])
  })

  it('merges pull requests sharing a group and keeps the newest as representative', () => {
    expect(titles(bumps, [rule()])).toEqual([
      { title: bumps[1].title, numbers: [309], representative: 309 },
      {
        title: 'Bump njord.version from 0.9.1 to 0.9.5',
        numbers: [308, 310, 316],
        representative: 316,
      },
    ])
  })

  it('does not mutate or reorder the given pull requests', () => {
    const pullRequests = [...bumps]
    const snapshot = structuredClone(pullRequests)

    groupChanges({ pullRequests, rules: [rule()] })

    expect(pullRequests).toEqual(snapshot)
  })

  it('places a merged change where its representative was sorted', () => {
    const descending = [...bumps].reverse()

    expect(titles(descending, [rule()])).toEqual([
      {
        title: 'Bump njord.version from 0.9.1 to 0.9.5',
        numbers: [308, 310, 316],
        representative: 316,
      },
      { title: bumps[1].title, numbers: [309], representative: 309 },
    ])
  })

  it('keeps the original title when a rule matches a single pull request', () => {
    expect(titles([bumps[1]], [rule()])).toEqual([
      { title: bumps[1].title, numbers: [309], representative: 309 },
    ])
  })

  it('uses the first matching rule', () => {
    const first = rule({ 'title-template': 'first $GROUP' })
    const second = rule({ 'title-template': 'second $GROUP' })

    expect(titles(bumps, [first, second])[1].title).toBe('first njord.version')
  })

  it('keeps changes of different rules apart even when the group matches', () => {
    const scoped = rule({
      pattern:
        /^Bump (?<group>njord\.version) from (?<from>\S+) to (?<to>\S+)$/,
      'title-template': 'scoped $GROUP $FIRST_FROM $LAST_TO',
    })

    expect(titles([bumps[0], bumps[2], bumps[3]], [scoped, rule()])).toEqual([
      {
        title: 'scoped njord.version 0.9.1 0.9.5',
        numbers: [308, 310, 316],
        representative: 316,
      },
    ])
  })

  it('merges only pull requests where every group capture matches', () => {
    const modules = [
      pullRequest(1, 'Bump lib from 1.0.0 to 1.1.0 in /module-a'),
      pullRequest(2, 'Bump lib from 1.0.0 to 1.1.0 in /module-b'),
      pullRequest(3, 'Bump lib from 1.1.0 to 1.2.0 in /module-a'),
    ]

    expect(titles(modules, [suffixRule()])).toEqual([
      {
        title: 'Bump lib from 1.0.0 to 1.1.0 in /module-b',
        numbers: [2],
        representative: 2,
      },
      {
        title: 'Bump lib from 1.0.0 to 1.2.0 in /module-a',
        numbers: [1, 3],
        representative: 3,
      },
    ])
  })

  it('keeps a pull request without the optional group capture apart', () => {
    const mixed = [
      pullRequest(1, 'Bump lib from 1.0.0 to 1.1.0'),
      pullRequest(2, 'Bump lib from 1.1.0 to 1.2.0 in the libs group'),
      pullRequest(3, 'Bump lib from 1.2.0 to 1.3.0 in the libs group'),
    ]

    expect(titles(mixed, [suffixRule()])).toEqual([
      { title: mixed[0].title, numbers: [1], representative: 1 },
      {
        title: 'Bump lib from 1.1.0 to 1.3.0 in the libs group',
        numbers: [2, 3],
        representative: 3,
      },
    ])
  })

  it('leaves a pull request ungrouped when the group capture is empty', () => {
    const empty = rule({
      pattern: /^Bump (?<group>\s*) ?(?<from>\S+)?$/,
      captureNames: ['from'],
    })

    expect(titles([pullRequest(1, 'Bump  0.1.0')], [empty])).toEqual([
      { title: 'Bump  0.1.0', numbers: [1], representative: 1 },
    ])
  })

  it('renders a capture group that did not participate as an empty value', () => {
    const optional = rule({
      pattern: /^Bump (?<group>\S+)(?: from (?<from>\S+))? to (?<to>\S+)$/,
      'title-template': 'Bump $GROUP from $FIRST_FROM to $LAST_TO',
    })
    const pullRequests = [
      pullRequest(1, 'Bump lib to 1.0.0'),
      pullRequest(2, 'Bump lib from 1.0.0 to 2.0.0'),
    ]

    expect(titles(pullRequests, [optional])[0].title).toBe(
      'Bump lib from  to 2.0.0',
    )
  })

  it('leaves an unknown template variable untouched', () => {
    expect(
      titles(bumps, [rule({ 'title-template': 'Bump $GROUP to $LAST_TOO' })])[1]
        .title,
    ).toBe('Bump njord.version to $LAST_TOO')
  })

  it('orders members by pull request number when merge dates are missing', () => {
    const undated = [
      pullRequest(316, 'Bump njord.version from 0.9.3 to 0.9.5', null),
      pullRequest(308, 'Bump njord.version from 0.9.1 to 0.9.2', null),
      pullRequest(310, 'Bump njord.version from 0.9.2 to 0.9.3', null),
    ]

    expect(titles(undated, [rule()])).toEqual([
      {
        title: 'Bump njord.version from 0.9.1 to 0.9.5',
        numbers: [308, 310, 316],
        representative: 316,
      },
    ])
  })
})
