import type { run as actionRun } from '@release-drafter/gh-actions/drafter'

export const runDrafter = async (...args: Parameters<typeof actionRun>) => {
  await (await import('@release-drafter/gh-actions/drafter')).run(...args)
}

export const runAutolabeler = async (...args: Parameters<typeof actionRun>) => {
  await (await import('@release-drafter/gh-actions/autolabeler')).run(...args)
}

export const runCheckPr = async (...args: Parameters<typeof actionRun>) => {
  await (await import('@release-drafter/gh-actions/check-pr')).run(...args)
}
