import * as core from '@actions/core'
import {
  type ActionInput,
  actionInputSchema,
} from './schemas/action-input.schema'

export const getActionInput = (): ActionInput => {
  // getInput returns an empty string if the value is not defined.
  // We want to convert that to undefined for optional inputs.
  const getInput = (name: keyof ActionInput) => core.getInput(name) || undefined

  // Boolean inputs are handled by zod's stringBool() during parsing.

  // Make sure we don't miss any inputs from the schema
  const actionInput: Record<keyof ActionInput, ReturnType<typeof getInput>> = {
    // exclusive to action input
    'config-name': getInput('config-name'),
    name: getInput('name'),
    tag: getInput('tag'),
    version: getInput('version'),
    publish: getInput('publish'),
    token: getInput('token'),
    'disable-releaser': getInput('disable-releaser'),

    // can override the config
    latest: getInput('latest'),
    prerelease: getInput('prerelease'),
    'initial-commits-since': getInput('initial-commits-since'),
    'prerelease-identifier': getInput('prerelease-identifier'),
    'include-pre-releases': getInput('include-pre-releases'),
    commitish: getInput('commitish'),
    header: getInput('header'),
    footer: getInput('footer'),
    'dry-run': getInput('dry-run'),
    'filter-by-range': getInput('filter-by-range'),
  }

  return actionInputSchema.parse(actionInput)
}
