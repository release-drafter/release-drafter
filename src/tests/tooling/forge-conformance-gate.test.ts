import { describe, expect, it } from 'vitest'
import {
  evaluateForgeConformanceGate,
  type ForgeConformanceGateEnvironment,
} from '../../scripts/forge-conformance-gate.ts'

const baseEnvironment: ForgeConformanceGateEnvironment = {
  SCOPE_RESULT: 'success',
  SHOULD_RUN: 'true',
  MATRIX_RESULT: 'success',
}

describe('forge conformance gate', () => {
  it.each([
    [
      'scope failure',
      { ...baseEnvironment, SCOPE_RESULT: 'failure' },
      false,
      'Forge conformance scope finished with failure',
    ],
    [
      'requested matrix success',
      baseEnvironment,
      true,
      'Requested forge conformance matrix passed',
    ],
    [
      'requested matrix failure',
      { ...baseEnvironment, MATRIX_RESULT: 'failure' },
      false,
      'Requested forge conformance matrix finished with failure',
    ],
    [
      'intentional skip',
      {
        ...baseEnvironment,
        SHOULD_RUN: 'false',
        MATRIX_RESULT: 'skipped',
      },
      true,
      'Forge conformance matrix was intentionally skipped',
    ],
    [
      'unexpected state',
      {
        ...baseEnvironment,
        SHOULD_RUN: 'false',
        MATRIX_RESULT: 'success',
      },
      false,
      'Unexpected forge conformance result: should-run=false matrix=success',
    ],
  ])('handles %s', (_name, environment, success, message) => {
    expect(evaluateForgeConformanceGate(environment)).toEqual({
      success,
      message,
    })
  })
})
