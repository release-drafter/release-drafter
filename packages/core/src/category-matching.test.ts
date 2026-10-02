import { describe, expect, it } from 'vitest'
import {
  evaluateCategories,
  parseConventionalTitle,
} from './category-matching.ts'
import type { ParsedCategory } from './types.ts'

const modes = ['any', 'all', 'only', 'exactly'] as const

describe('path-based release categories', () => {
  it.each<{
    name: string
    files: string[] | undefined
    matched: readonly (typeof modes)[number][]
  }>([
    {
      name: 'one required area',
      files: ['src/index.ts'],
      matched: ['any', 'only'],
    },
    {
      name: 'every required area',
      files: ['src/index.ts', 'docs/guide.md'],
      matched: [...modes],
    },
    {
      name: 'required areas and unrelated files',
      files: ['src/index.ts', 'docs/guide.md', 'LICENSE'],
      matched: ['any', 'all'],
    },
    { name: 'unrelated files', files: ['LICENSE'], matched: [] },
    { name: 'an empty file list', files: [], matched: [] },
    { name: 'an absent file list', files: undefined, matched: [] },
  ])('selects the correct modes for $name', ({ files, matched }) => {
    for (const mode of modes) {
      const category: ParsedCategory = {
        type: 'changelog',
        title: 'Source and docs',
        exclusive: false,
        'collapse-after': -1,
        'semver-increment': 'minor',
        when: [
          {
            labels: [],
            'labels-mode': 'any',
            paths: ['src/**', 'docs/**'],
            'paths-mode': mode,
          },
        ],
      }
      const result = evaluateCategories({ changedFiles: files }, [category])
      const selected = matched.includes(mode)
      expect(result.changelogCategories, mode).toEqual(
        selected ? [category] : [],
      )
      expect(result.versionIncrement, mode).toBe(selected ? 'minor' : undefined)
    }
  })

  it('treats duplicate paths and duplicate file records as the same matching evidence', () => {
    const category: ParsedCategory = {
      type: 'pre-include',
      when: [
        {
          labels: [],
          'labels-mode': 'any',
          paths: ['src/**', 'src/**'],
          'paths-mode': 'exactly',
        },
      ],
    }
    expect(
      evaluateCategories({ changedFiles: ['src/a.ts', 'src/a.ts'] }, [category])
        .included,
    ).toBe(true)
    expect(
      evaluateCategories({ changedFiles: ['src/a.ts', 'LICENSE'] }, [category])
        .included,
    ).toBe(false)
  })

  it.each([undefined, ''])(
    'does not interpret an absent title as a conventional change: %s',
    (title) => {
      expect(parseConventionalTitle(title)).toBeUndefined()
    },
  )
})
