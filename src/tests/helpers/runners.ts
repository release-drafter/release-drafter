// biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
import type { run as actionRun } from '@release-drafter/gh-actions/drafter'

export const runDrafter = async (...args: Parameters<typeof actionRun>) => {
  // biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
  await (await import('@release-drafter/gh-actions/drafter')).run(...args)
}

export const runAutolabeler = async (...args: Parameters<typeof actionRun>) => {
  // biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
  await (await import('@release-drafter/gh-actions/autolabeler')).run(...args)
}

export const runCheckPrTitle = async (
  ...args: Parameters<typeof actionRun>
) => {
  // biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
  await (await import('@release-drafter/gh-actions/check-pr-title')).run(
    ...args,
  )
}
