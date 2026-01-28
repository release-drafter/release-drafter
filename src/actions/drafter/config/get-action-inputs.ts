import * as core from '@actions/core'
import { ActionInput, actionInputSchema } from './action-input.schema'

export const getActionInput = (): ActionInput => {
  // getInput returns an empty string if the value is not defined.
  // We want to convert that to undefined for optional inputs.
  const getInput = (name: keyof ActionInput) => core.getInput(name) || undefined

  // Boolean inputs are handled by zod's stringBool() during parsing.

  return actionInputSchema.parse({
    // exclusive to action input
    'config-name': getInput('config-name'),
    name: getInput('name'),
    tag: getInput('tag'),
    version: getInput('version'),
    publish: getInput('publish'),
    token: getInput('token'),

    // can override the config
    latest: getInput('latest'),
    prerelease: getInput('prerelease'),
    'initial-commits-since': getInput('initial-commits-since'),
    'prerelease-identifier': getInput('prerelease-identifier'),
    commitish: getInput('commitish'),
    header: getInput('header'),
    footer: getInput('footer')
  })
}
