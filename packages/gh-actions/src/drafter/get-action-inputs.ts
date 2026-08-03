import * as core from '@actions/core'
import { type ActionInput, actionInputSchema } from './action-input.schema.ts'

export const getActionInput = (): ActionInput => {
  const getInput = (name: keyof ActionInput) => core.getInput(name) || undefined
  const input: Record<keyof ActionInput, ReturnType<typeof getInput>> = {
    'config-name': getInput('config-name'),
    from: getInput('from'),
    name: getInput('name'),
    tag: getInput('tag'),
    version: getInput('version'),
    publish: getInput('publish'),
    token: getInput('token'),
    latest: getInput('latest'),
    prerelease: getInput('prerelease'),
    'prerelease-identifier': getInput('prerelease-identifier'),
    'include-pre-releases': getInput('include-pre-releases'),
    commitish: getInput('commitish'),
    header: getInput('header'),
    footer: getInput('footer'),
    'dry-run': getInput('dry-run'),
    'filter-by-range': getInput('filter-by-range'),
  }
  return actionInputSchema.parse(input)
}
