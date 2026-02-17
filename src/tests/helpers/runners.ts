import { run as actionRun } from 'src/actions/drafter/runner'

export const runDrafter = async (...args: Parameters<typeof actionRun>) =>
  await (await import(`src/actions/drafter/runner`)).run(...args)

export const runAutolabeler = async (...args: Parameters<typeof actionRun>) =>
  await (await import(`src/actions/autolabeler/runner`)).run(...args)
