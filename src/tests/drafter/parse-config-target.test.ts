import { describe, expect, it } from 'vitest'
import {
  type ConfigTarget,
  parseConfigTarget,
} from '#src/common/config/parse-config-target.ts'

const testSuites: Array<{
  input: [string, Pick<ConfigTarget, 'ref' | 'repo'>]
  expected: ConfigTarget | Error
  suiteName?: string
}> = [
  {
    suiteName: 'basic github target',
    input: [
      'release-drafter.yml',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: 'release-drafter.yml',
      ref: 'main',
      repo: { owner: 'cchanche', repo: 'hello-world' },
    },
  },
  {
    suiteName: 'github target with explicit github: scheme',
    input: [
      'github:release-drafter.yml',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: 'release-drafter.yml',
      ref: 'main',
      repo: { owner: 'cchanche', repo: 'hello-world' },
    },
  },
  {
    suiteName: 'github target with repo specifier',
    input: [
      'github:bye-world:release-drafter.yml',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: 'release-drafter.yml',
      ref: undefined,
      repo: { owner: 'cchanche', repo: 'bye-world' },
    },
  },
  {
    suiteName: 'github target with repo specifier and no explicit ref',
    input: [
      'github:bye-world:release-drafter.yml',
      {
        repo: { owner: 'cchanche', repo: 'hello-world' },
        ref: 'feature/destroyer-of-worlds',
      },
    ],
    expected: {
      scheme: 'github',
      filepath: 'release-drafter.yml',
      ref: undefined,
      repo: { owner: 'cchanche', repo: 'bye-world' },
    },
  },
  {
    suiteName: 'github target with repo and ref specifiers',
    input: [
      'github:bye-world:release-drafter.yml@main',
      {
        repo: { owner: 'cchanche', repo: 'hello-world' },
        ref: 'feature/destroyer-of-worlds',
      },
    ],
    expected: {
      scheme: 'github',
      filepath: 'release-drafter.yml',
      ref: 'main',
      repo: { owner: 'cchanche', repo: 'bye-world' },
    },
  },
  {
    suiteName:
      'github target with repo and ref specifiers, no explicit github: scheme',
    input: [
      'bye-world:release-drafter.yml@main',
      {
        repo: { owner: 'cchanche', repo: 'hello-world' },
        ref: 'feature/destroyer-of-worlds',
      },
    ],
    expected: {
      scheme: 'github',
      filepath: 'release-drafter.yml',
      ref: 'main',
      repo: { owner: 'cchanche', repo: 'bye-world' },
    },
  },
  {
    suiteName: 'github target with owner/repo specifier',
    input: [
      'worlds/bye-world:release-drafter.yml',
      {
        repo: { owner: 'cchanche', repo: 'hello-world' },
        ref: 'feature/destroyer-of-worlds',
      },
    ],
    expected: {
      scheme: 'github',
      filepath: 'release-drafter.yml',
      ref: undefined,
      repo: { owner: 'worlds', repo: 'bye-world' },
    },
  },
  {
    suiteName: 'github target with owner/repo, filepath, and ref',
    input: [
      'worlds/bye-world:release-drafter.yml@main',
      {
        repo: { owner: 'cchanche', repo: 'hello-world' },
        ref: 'feature/destroyer-of-worlds',
      },
    ],
    expected: {
      scheme: 'github',
      filepath: 'release-drafter.yml',
      ref: 'main',
      repo: { owner: 'worlds', repo: 'bye-world' },
    },
  },
  {
    suiteName: 'different config name',
    input: [
      'alternative-config-name.json',
      {
        repo: { owner: 'cchanche', repo: 'hello-world' },
        ref: 'feature/destroyer-of-worlds',
      },
    ],
    expected: {
      scheme: 'github',
      filepath: 'alternative-config-name.json',
      ref: 'feature/destroyer-of-worlds',
      repo: { owner: 'cchanche', repo: 'hello-world' },
    },
  },
  {
    suiteName: 'file scheme',
    input: [
      'file:conf.yaml',
      {
        repo: { owner: 'does', repo: 'not' },
        ref: 'matter',
      },
    ],
    expected: {
      scheme: 'file',
      filepath: 'conf.yaml',
      ref: 'matter',
      repo: { owner: 'does', repo: 'not' },
    },
  },
  {
    suiteName: 'file scheme with @ (invalid)',
    input: [
      'file:conf.yaml@main',
      {
        repo: { owner: 'does', repo: 'not' },
        ref: 'matter',
      },
    ],
    expected: new Error(
      'invalid format: "conf.yaml@main". Expected format [github:][owner/repo:]filepath[@ref] or file:filepath. Local file targets cannot have "@" github specifiers.',
    ),
  },
  {
    suiteName: 'repo-only without colon (owner/repo)',
    input: [
      'ansible/team-devtools',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: '',
      ref: undefined,
      repo: { owner: 'ansible', repo: 'team-devtools' },
    },
  },
  {
    suiteName: 'repo-only without colon (repo)',
    input: [
      'team-devtools',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: '',
      ref: undefined,
      repo: { owner: 'cchanche', repo: 'team-devtools' },
    },
  },
  {
    suiteName: 'repo-only without colon with ref (owner/repo@ref)',
    input: [
      'ansible/team-devtools@v2',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: '',
      ref: 'v2',
      repo: { owner: 'ansible', repo: 'team-devtools' },
    },
  },
  {
    suiteName: 'repo-only with colon and no filepath',
    input: [
      'ansible/team-devtools:',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: '',
      ref: undefined,
      repo: { owner: 'ansible', repo: 'team-devtools' },
    },
  },
  {
    suiteName: 'repo-only with explicit github: scheme (owner/repo)',
    input: [
      'github:ansible/team-devtools',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: '',
      ref: undefined,
      repo: { owner: 'ansible', repo: 'team-devtools' },
    },
  },
  {
    suiteName: 'repo-only without owner with ref (repo@ref)',
    input: [
      'team-devtools@v2',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: '',
      ref: 'v2',
      repo: { owner: 'cchanche', repo: 'team-devtools' },
    },
  },
  {
    suiteName: 'repo-only with colon, ref, and no filepath',
    input: [
      'ansible/team-devtools:@main',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'develop' },
    ],
    expected: {
      scheme: 'github',
      filepath: '',
      ref: 'main',
      repo: { owner: 'ansible', repo: 'team-devtools' },
    },
  },
  {
    suiteName: 'repo-only with explicit github: scheme and trailing colon',
    input: [
      'github:ansible/team-devtools:',
      { repo: { owner: 'cchanche', repo: 'hello-world' }, ref: 'main' },
    ],
    expected: {
      scheme: 'github',
      filepath: '',
      ref: undefined,
      repo: { owner: 'ansible', repo: 'team-devtools' },
    },
  },
  {
    suiteName: 'invalid string with only specifiers',
    input: [
      ':@',
      {
        repo: { owner: 'does', repo: 'not' },
        ref: 'matter',
      },
    ],
    expected: new Error(
      'invalid format: ":@". Expected format [github:][owner/repo:]filepath[@ref] or file:filepath. Missing ref specifier.',
    ),
  },
  {
    suiteName: 'repo and filepath',
    input: [
      'hello:world',
      {
        repo: { owner: 'does', repo: 'not' },
        ref: 'matter',
      },
    ],
    expected: {
      scheme: 'github',
      filepath: 'world',
      ref: undefined,
      repo: { owner: 'does', repo: 'hello' },
    },
  },
  {
    suiteName: 'invalid string with too many specifiers',
    input: [
      'for:those:who:come:after',
      {
        repo: { owner: 'does', repo: 'not' },
        ref: 'matter',
      },
    ],
    expected: new Error(
      'invalid format: "for:those:who:come:after". Expected format [github:][owner/repo:]filepath[@ref] or file:filepath. ":" or "@" was specified more than once.',
    ),
  },
]

describe('parse a config target', () => {
  testSuites.forEach(({ input, expected, suiteName }) => {
    it(`${suiteName}`, () => {
      if (expected instanceof Error) {
        expect(() => parseConfigTarget(...input)).toThrowError(expected.message)
      } else {
        expect(parseConfigTarget(...input)).toEqual(expected)
      }
    })
  })
})
