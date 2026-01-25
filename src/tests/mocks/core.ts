import type * as core from '@actions/core'
import { ActionInput } from 'src/types'
import { vi } from 'vitest'

// When debugging tests, set tu true to get outputs
const DEBUG_TESTS = false

export const debug = vi.fn<typeof core.debug>(
  DEBUG_TESTS ? console.debug : undefined
)
export const error = vi.fn<typeof core.error>(
  DEBUG_TESTS ? console.error : undefined
)
export const info = vi.fn<typeof core.info>(
  DEBUG_TESTS ? console.info : undefined
)

export const getInput = vi.fn<typeof core.getInput>((name: string) => {
  switch (name as keyof ActionInput) {
    case 'token':
      return 'test'
    default:
      return ''
      break
  }
})
export const setOutput = vi.fn<typeof core.setOutput>()
export const setFailed = vi.fn<typeof core.setFailed>(
  DEBUG_TESTS ? console.error : undefined
)
export const warning = vi.fn<typeof core.warning>()
