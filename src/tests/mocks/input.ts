import type { actionInputSchema } from 'src/actions/drafter/config'
import { expect, vi } from 'vitest'
import type * as z from 'zod'

/**
 * Mocking GitHub Action inputs for testing.
 *
 * The defined environments variables will determine the behavior of `@actions/core.getInput()`
 * when it is executed.
 */
export const mockInput = async (
  key: keyof z.input<typeof actionInputSchema>,
  value: string,
) => {
  const envKey = `INPUT_${key.replace(/ /g, '_').toUpperCase()}`

  vi.stubEnv(envKey, value)

  // Verify the context has been set up correctly
  const dynamicGetInput = (await import('@actions/core')).getInput
  expect(dynamicGetInput(key)).toEqual(value)
}
