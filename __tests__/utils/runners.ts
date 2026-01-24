import { run as actionRun } from 'src/actions/drafter/runner'

export const runDrafter = async (...args: Parameters<typeof actionRun>) =>
  await (await import(`src/actions/drafter/runner`)).run(...args)
