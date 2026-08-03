// biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
import type { actionInputSchema as checkPrTitleInputSchema } from '@release-drafter/gh-actions/check-pr-title'
// biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
import type { actionInputSchema } from '@release-drafter/gh-actions/drafter'
import { expect, vi } from 'vitest'
import type * as z from 'zod'

/**
 * Mocking GitHub Action inputs for testing.
 *
 * The defined environments variables will determine the behavior of `@actions/core.getInput()`
 * when it is executed.
 */
export const mockInput = async (
  key: Extract<
    | keyof z.input<typeof actionInputSchema>
    | keyof z.input<typeof checkPrTitleInputSchema>,
    string
  >,
  value: string,
) => {
  const envKey = `INPUT_${key.replace(/ /g, '_').toUpperCase()}`

  vi.stubEnv(envKey, value)

  // Verify the context has been set up correctly
  const dynamicGetInput = (await import('@actions/core')).getInput
  expect(dynamicGetInput(key)).toEqual(value)
}
