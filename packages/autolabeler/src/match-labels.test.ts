import { describe, expect, it, vi } from 'vitest'
import { configSchema } from './config/config.schema.ts'
import { parseConfig } from './config/parse-config.ts'
import { matchLabels } from './match-labels.ts'

const compile = (autolabeler: unknown[], fallback?: string) => {
  const warning = vi.fn()
  const config = parseConfig({
    config: configSchema.parse({
      autolabeler,
      'autolabeler-fallback-label': fallback,
    }),
    logger: { warning },
  })
  return { config, warning }
}

describe('matchLabels', () => {
  const pullRequest = {
    files: ['src/index.ts'],
    branch: 'feature/core',
    title: 'feat: core',
    body: 'details',
  }

  it('adds all labels and deduplicates within and across matching rules', () => {
    const { config } = compile([
      { label: 'core', branch: ['/feature/'] },
      { label: ['feature', 'core', 'feature'], title: ['/feat/'] },
      { label: ['ignored'], title: ['/fix/'] },
    ])
    expect(matchLabels({ config, pullRequest })).toEqual({
      labels: ['core', 'feature'],
      matches: [
        { label: 'core', matcher: 'branch' },
        { label: 'feature', matcher: 'title' },
        { label: 'core', matcher: 'title' },
        { label: 'feature', matcher: 'title' },
      ],
    })
  })

  it.each([
    ['files', ['src/**']],
    ['branch', ['/feature/']],
    ['title', ['/feat/']],
    ['body', ['/details/']],
  ])(
    'stops after a %s match, adding all labels and retaining prior labels',
    (matcher, patterns) => {
      const { config } = compile(
        [
          { label: 'prior', title: ['/feat/'] },
          {
            label: ['core', 'prior', 'feature'],
            [matcher as string]: patterns,
            'stop-on-match': true,
          },
          { label: 'later', title: ['/feat/'] },
        ],
        'needs-triage',
      )
      expect(matchLabels({ config, pullRequest })).toEqual({
        labels: ['prior', 'core', 'feature'],
        matches: [
          { label: 'prior', matcher: 'title' },
          { label: 'core', matcher },
          { label: 'prior', matcher },
          { label: 'feature', matcher },
        ],
      })
    },
  )

  it('stops on a matching rule even when its labels were already selected', () => {
    const { config } = compile([
      { label: 'core', title: ['/feat/'] },
      { label: ['core', 'core'], title: ['/feat/'], 'stop-on-match': true },
      { label: 'later', title: ['/feat/'] },
    ])
    expect(matchLabels({ config, pullRequest }).labels).toEqual(['core'])
  })

  it('continues past nonmatching stop rules and explicit false stop options', () => {
    const { config } = compile([
      { label: 'miss', title: ['/fix/'], 'stop-on-match': true },
      { label: 'empty', 'stop-on-match': true },
      { label: 'core', title: ['/feat/'], 'stop-on-match': false },
      { label: 'later', title: ['/feat/'] },
    ])
    expect(matchLabels({ config, pullRequest }).labels).toEqual([
      'core',
      'later',
    ])
  })

  it.each(
    [
      [],
      [{ label: 'miss', title: ['/fix/'], 'stop-on-match': true }],
      [{ label: 'empty' }],
    ].map((rules) => ({ rules })),
  )('adds the fallback when no rules match: $rules', ({ rules }) => {
    const { config } = compile(rules, 'needs-triage')
    expect(matchLabels({ config, pullRequest })).toEqual({
      labels: ['needs-triage'],
      matches: [{ label: 'needs-triage', matcher: 'fallback' }],
    })
  })

  it('does not add the fallback when any rule matches', () => {
    const { config } = compile(
      [
        { label: 'core', title: ['/feat/'] },
        { label: 'miss', title: ['/fix/'] },
      ],
      'needs-triage',
    )
    expect(matchLabels({ config, pullRequest })).toEqual({
      labels: ['core'],
      matches: [{ label: 'core', matcher: 'title' }],
    })
  })

  it('returns no labels or diagnostics for empty rules without a fallback', () => {
    const { config } = compile([])
    expect(matchLabels({ config, pullRequest })).toEqual({
      labels: [],
      matches: [],
    })
  })

  it('uses the fallback when invalid regexes leave no valid rules', () => {
    const { config, warning } = compile(
      [{ label: 'broken', title: ['/[/'], 'stop-on-match': true }],
      'needs-triage',
    )
    expect(warning).toHaveBeenCalledOnce()
    expect(matchLabels({ config, pullRequest }).labels).toEqual([
      'needs-triage',
    ])
  })

  it('uses files, branch, title, body order and preserves label order', () => {
    const { config } = compile([
      {
        label: 'first',
        files: ['src/**'],
        branch: ['/feature/'],
        title: ['/feat/'],
        body: ['/details/'],
      },
      { label: 'second', title: ['/feat/'] },
    ])
    const result = matchLabels({
      config,
      pullRequest: {
        files: ['src/index.ts'],
        branch: 'feature/core',
        title: 'feat: extract core',
        body: 'details',
      },
    })
    expect(result.labels).toEqual(['first', 'second'])
    expect(result.matches).toEqual([
      { label: 'first', matcher: 'files' },
      { label: 'second', matcher: 'title' },
    ])
  })

  it('deduplicates labels while retaining match diagnostics', () => {
    const { config } = compile([
      { label: 'core', branch: ['/feature/'] },
      { label: 'core', title: ['/feat/'] },
    ])
    const result = matchLabels({
      config,
      pullRequest: {
        files: [],
        branch: 'feature/core',
        title: 'feat: core',
        body: null,
      },
    })
    expect(result.labels).toEqual(['core'])
    expect(result.matches).toHaveLength(2)
  })

  it('honors gitignore negation and does not test a null body', () => {
    const { config } = compile([
      { label: 'files', files: ['*.ts', '!skip.ts'] },
      { label: 'body', body: ['/null/'] },
    ])
    expect(
      matchLabels({
        config,
        pullRequest: {
          files: ['skip.ts'],
          branch: 'main',
          title: 'chore: skip',
          body: null,
        },
      }).labels,
    ).toEqual([])
  })

  it('treats plain matcher strings literally', () => {
    const { config } = compile([{ label: 'literal', title: ['feat(core)'] }])

    expect(
      matchLabels({
        config,
        pullRequest: {
          files: [],
          branch: 'main',
          title: 'feat(core): extract autolabeler',
          body: null,
        },
      }).labels,
    ).toEqual(['literal'])
    expect(
      matchLabels({
        config,
        pullRequest: {
          files: [],
          branch: 'main',
          title: 'featcore: extract autolabeler',
          body: null,
        },
      }).labels,
    ).toEqual([])
  })

  it('is stable when a compiled global regex is evaluated repeatedly', () => {
    const { config } = compile([{ label: 'repeatable', title: ['feature'] }])
    const pullRequest = {
      files: [],
      branch: 'main',
      title: 'feature: extract autolabeler',
      body: null,
    }

    expect(matchLabels({ config, pullRequest }).labels).toEqual(['repeatable'])
    expect(matchLabels({ config, pullRequest }).labels).toEqual(['repeatable'])
  })
})
