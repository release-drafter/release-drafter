import type * as core from '@actions/core'
import { jest } from '@jest/globals'

// When debugging tests, set tu true to get outputs
const DEBUG_TESTS = true

export const debug = jest.fn<typeof core.debug>(
  DEBUG_TESTS ? console.debug : undefined
)
export const error = jest.fn<typeof core.error>(
  DEBUG_TESTS ? console.error : undefined
)
export const info = jest.fn<typeof core.info>(
  DEBUG_TESTS ? console.info : undefined
)

export const getInput = jest.fn<typeof core.getInput>()
export const setOutput = jest.fn<typeof core.setOutput>()
export const setFailed = jest.fn<typeof core.setFailed>(
  DEBUG_TESTS ? console.error : undefined
)
export const warning = jest.fn<typeof core.warning>()
