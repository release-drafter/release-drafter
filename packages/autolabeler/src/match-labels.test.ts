import { describe, expect, it, vi } from 'vitest'
import { configSchema } from './config/config.schema.ts'
import { parseConfig } from './config/parse-config.ts'
import { matchLabels } from './match-labels.ts'

const compile = (autolabeler: unknown[]) => {
  const warning = vi.fn()
  const config = parseConfig({
    config: configSchema.parse({ autolabeler }),
    logger: { warning },
  })
  return { config, warning }
}

describe('matchLabels', () => {
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

  it('drops an entire rule when one regex is invalid', () => {
    const { config, warning } = compile([
      { label: 'broken', branch: ['/[/'] },
      { label: 'valid', title: ['/feat/'] },
    ])
    expect(config.autolabeler).toHaveLength(1)
    expect(warning).toHaveBeenCalledOnce()
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
