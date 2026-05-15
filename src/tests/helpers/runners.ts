import type { run as actionRun } from '#src/actions/drafter/runner.ts'

export const runDrafter = async (...args: Parameters<typeof actionRun>) =>
  await (await import(`#src/actions/drafter/runner.ts`)).run(...args)

export const runAutolabeler = async (...args: Parameters<typeof actionRun>) =>
  await (await import(`#src/actions/autolabeler/runner.ts`)).run(...args)
