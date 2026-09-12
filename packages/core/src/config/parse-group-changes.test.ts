import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Logger } from '../ports.ts'
import {
  commonConfigSchema,
  configSchema,
  mergeInputAndConfig,
} from './index.ts'

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
} satisfies Logger

const parse = (groupChanges: unknown[]) =>
  mergeInputAndConfig({
    config: configSchema.parse({
      template: '$CHANGES',
      commitish: 'refs/heads/main',
      'group-changes': groupChanges,
    }),
    input: commonConfigSchema.parse({}),
    logger,
  })['group-changes']

const bumpPattern = '/^Bump (?<group>.+?) from (?<from>\\S+) to (?<to>\\S+)$/'

describe('parseGroupChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to no rules', () => {
    expect(parse([])).toEqual([])
  })

  it('converts a pattern into a regular expression and collects its capture names', () => {
    const parsed = parse([
      { pattern: bumpPattern, 'title-template': 'Bump $GROUP' },
    ])

    expect(parsed).toHaveLength(1)
    expect(parsed?.[0].pattern.source).toBe(
      '^Bump (?<group>.+?) from (?<from>\\S+) to (?<to>\\S+)$',
    )
    expect(parsed?.[0].groupNames).toEqual(['group'])
    expect(parsed?.[0].captureNames).toEqual(['from', 'to'])
    expect(logger.warning).not.toHaveBeenCalled()
  })

  it('collects every group_<name> capture group as part of the grouping key', () => {
    const parsed = parse([
      {
        pattern:
          '/^Bump (?<group>.+?) from (?<from>\\S+) to (?<to>\\S+)(?<group_in> in .+)?$/',
        'title-template': 'Bump $GROUP from $FIRST_FROM to $LAST_TO$GROUP_IN',
      },
    ])

    expect(parsed?.[0].groupNames).toEqual(['group', 'group_in'])
    expect(parsed?.[0].captureNames).toEqual(['from', 'to'])
    expect(logger.warning).not.toHaveBeenCalled()
  })

  it('accepts a rule that groups by a group_<name> capture group alone', () => {
    const parsed = parse([
      { pattern: '/^Bump .+ in (?<group_in>.+)$/', 'title-template': '$GROUP' },
    ])

    expect(parsed?.[0].groupNames).toEqual(['group_in'])
  })

  it('strips the global flag so that matching is stateless', () => {
    const parsed = parse([
      { pattern: '/(?<group>Bump .+)/g', 'title-template': '$GROUP' },
    ])

    expect(parsed?.[0].pattern.flags).toBe('')
    expect(parsed?.[0].pattern.test('Bump a')).toBe(true)
    expect(parsed?.[0].pattern.test('Bump a')).toBe(true)
  })

  it('keeps supported flags', () => {
    const parsed = parse([
      { pattern: '/(?<group>bump .+)/i', 'title-template': '$GROUP' },
    ])

    expect(parsed?.[0].pattern.flags).toBe('i')
    expect(parsed?.[0].pattern.test('Bump a')).toBe(true)
  })

  it('drops a rule with an invalid regular expression', () => {
    expect(
      parse([{ pattern: '/(?<group>/', 'title-template': '$GROUP' }]),
    ).toEqual([])
    expect(logger.warning).toHaveBeenCalledWith(
      "Bad group-changes pattern: '/(?<group>/'",
    )
  })

  it('drops a rule without a group capture group', () => {
    expect(
      parse([{ pattern: '/^Bump (.+)$/', 'title-template': '$GROUP' }]),
    ).toEqual([])
    expect(logger.warning).toHaveBeenCalledWith(
      "The group-changes pattern '/^Bump (.+)$/' must be a regular expression literal, such as '/…/', with a 'group' capture group.",
    )
  })

  it('drops a plain text pattern, which cannot hold capture groups', () => {
    expect(
      parse([
        {
          pattern: '^Bump (?<group>.+)$',
          'title-template': '$GROUP',
        },
      ]),
    ).toEqual([])
    expect(logger.warning).toHaveBeenCalledTimes(1)
  })

  it('warns about a capture group that templates cannot reference', () => {
    const parsed = parse([
      {
        pattern: '/^Bump (?<group>.+) to (?<v2>\\S+)$/',
        'title-template': '$GROUP',
      },
    ])

    expect(parsed?.[0].captureNames).toEqual([])
    expect(logger.warning).toHaveBeenCalledWith(
      "The group-changes capture group 'v2' is not available in 'title-template'. Use letters and underscores only.",
    )
  })

  it('keeps grouping by a group capture group that templates cannot reference', () => {
    const parsed = parse([
      {
        pattern: '/^Bump (?<group>.+) in (?<group_2>.+)$/',
        'title-template': '$GROUP',
      },
    ])

    expect(parsed?.[0].groupNames).toEqual(['group', 'group_2'])
    expect(logger.warning).toHaveBeenCalledWith(
      "The group-changes capture group 'group_2' is not available in 'title-template'. Use letters and underscores only.",
    )
  })
})
