import { describe, expect, it } from 'vitest'
import type { ActionInput } from './action-input.schema.ts'
import { toReleaseInput } from './runner.ts'

describe('Drafter Action input mapping', () => {
  it('maps from only to the core comparison baseline', () => {
    const releaseInput = toReleaseInput({
      'config-name': 'release-drafter.yml',
      from: 'v1.2.3',
      publish: false,
      token: 'token',
    } as ActionInput)

    expect(releaseInput).toEqual({ from: 'v1.2.3', publish: false })
    expect(releaseInput.version).toBeUndefined()
    expect(releaseInput.tag).toBeUndefined()
    expect(releaseInput.name).toBeUndefined()
  })

  it('preserves all existing release controls independently of from', () => {
    expect(
      toReleaseInput({
        'config-name': 'release-drafter.yml',
        from: 'baseline',
        name: 'Release name',
        tag: 'v3.0.0',
        version: '3.0.0',
        publish: true,
        'dry-run': true,
        token: 'token',
      } as ActionInput),
    ).toEqual({
      from: 'baseline',
      name: 'Release name',
      tag: 'v3.0.0',
      version: '3.0.0',
      publish: true,
      dryRun: true,
    })
  })
})
