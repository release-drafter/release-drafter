import { normalizeFilepath } from 'src/common/config/normalize-filepath'
import { describe, expect, it } from 'vitest'

const testSuites: Array<{
  // Test cases for normalizeFilepath
  input: Parameters<typeof normalizeFilepath>
  expected: string | Error
}> = [
  {
    input: [
      {
        filepath: 'release-drafter.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      undefined,
    ],
    expected: '.github/release-drafter.yml',
  },
  {
    input: [
      {
        filepath: '/src/../configs/release-drafter.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      undefined,
    ],
    expected: 'configs/release-drafter.yml',
  },
  {
    input: [
      {
        filepath: '../configs/release-drafter.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      undefined,
    ],
    expected: 'configs/release-drafter.yml',
  },
  {
    input: [
      {
        filepath: 'release-drafter.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      {
        filepath: 'src/config.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
    ],
    expected: 'src/release-drafter.yml',
  },
  {
    input: [
      {
        filepath: '/absolute/path/to/file.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      undefined,
    ],
    expected: 'absolute/path/to/file.yml',
  },
  {
    input: [
      {
        filepath: '../relative/../file.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      {
        filepath: 'with/a/parent.yaml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
    ],
    expected: 'with/file.yml',
  },
  {
    input: [
      {
        filepath: '../very_long_relative/../../../file.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      {
        filepath: 'with/a/parent.yaml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
    ],
    expected: '../file.yml',
  },
  {
    input: [
      {
        filepath: '/absolute/path.yaml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      {
        filepath: 'with/a/parent.yaml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
    ],
    expected: 'absolute/path.yaml',
  },
  {
    input: [
      {
        filepath: './here-nearby.json',
        ref: 'v6',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      {
        filepath: 'with/a/parent.yaml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
    ],
    expected: '.github/here-nearby.json',
  },
  {
    input: [
      {
        filepath: './here-nearby.json',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      {
        filepath: 'with/a/parent.yaml',
        ref: 'main',
        repo: { owner: 'torvalds', repo: 'proj' },
      },
    ],
    expected: '.github/here-nearby.json',
  },
  {
    input: [
      {
        filepath: './here-nearby.json',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      {
        filepath: 'with/a/parent.yaml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'project' },
      },
    ],
    expected: '.github/here-nearby.json',
  },
  {
    input: [
      {
        filepath: './here-nearby.json',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
      {
        filepath: 'with/a/parent.yaml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
    ],
    expected: 'with/a/here-nearby.json',
  },
  {
    // Should not double-prepend .github/ when filepath already starts with .github/
    input: [
      {
        filepath: '.github/release-drafter.yml',
        ref: 'main',
        repo: { owner: 'ansible', repo: 'team-devtools' },
      },
      {
        filepath: '.github/release-drafter.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
    ],
    expected: '.github/release-drafter.yml',
  },
  {
    // Should not double-prepend .github/ for custom config names either
    input: [
      {
        filepath: '.github/custom-drafter.yml',
        ref: 'main',
        repo: { owner: 'ansible', repo: 'team-devtools' },
      },
      {
        filepath: '.github/release-drafter.yml',
        ref: 'main',
        repo: { owner: 'cchanche', repo: 'proj' },
      },
    ],
    expected: '.github/custom-drafter.yml',
  },
  {
    // Should not double-prepend .github/ without parent config
    input: [
      {
        filepath: '.github/release-drafter.yml',
        ref: 'main',
        repo: { owner: 'ansible', repo: 'team-devtools' },
      },
      undefined,
    ],
    expected: '.github/release-drafter.yml',
  },
]

describe('normalize filepath', () => {
  testSuites.forEach(({ input, expected }) => {
    it(`should normalize to ${expected instanceof Error ? 'Error' : JSON.stringify(expected)}`, () => {
      if (expected instanceof Error) {
        expect(() => normalizeFilepath(...input)).toThrowError(expected.message)
      } else {
        expect(normalizeFilepath(...input)).toBe(expected)
      }
    })
  })
})
