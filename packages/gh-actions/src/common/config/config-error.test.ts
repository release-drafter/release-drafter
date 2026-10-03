import { describe, expect, it } from 'vitest'
import { ConfigError } from './config-error.ts'
import type { ConfigTarget } from './parse-config-target.ts'

const target: ConfigTarget = {
  scheme: 'github',
  filepath: '.github/release-drafter.yml',
  repo: { owner: 'acme', repo: 'widgets' },
  ref: 'main',
}

describe('config error annotations', () => {
  it('attaches a same-repository error to its source location', () => {
    expect(
      new ConfigError('invalid', [target], { line: 3, col: 2 }).annotation(
        target.repo,
        'main',
      ),
    ).toEqual({
      title: 'Invalid Release Drafter configuration',
      file: target.filepath,
      startLine: 3,
      startColumn: 2,
    })
  })

  it('does not attach external or merged config errors to a local file', () => {
    const external = { ...target, repo: { owner: 'acme', repo: '.github' } }
    for (const sources of [
      [external],
      [target, external],
      [{ ...target, ref: 'v1' }],
    ]) {
      expect(
        new ConfigError('invalid', sources, { line: 3, col: 2 }).annotation(
          target.repo,
          'main',
        ),
      ).toEqual({ title: 'Invalid Release Drafter configuration' })
    }
  })

  it('attaches a checked-out local file without requiring a repository match', () => {
    expect(
      new ConfigError('invalid', [{ ...target, scheme: 'file' }]).annotation(
        {
          owner: 'another',
          repo: 'repo',
        },
        'main',
      ).file,
    ).toBe(target.filepath)
  })
})
