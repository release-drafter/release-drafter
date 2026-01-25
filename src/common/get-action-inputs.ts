import * as core from '@actions/core'
import { ActionInput, actionInputSchema } from 'src/types'

export const getActionInput = (): ActionInput => {
  // getInput returns an empty string if the value is not defined.
  // We want to convert that to undefined for optional inputs.
  const getInput = (name: keyof ActionInput) => core.getInput(name) || undefined

  // Boolean inputs are handled by zod's stringBool() during parsing.

  return actionInputSchema.parse({
    'config-name': getInput('config-name'),
    token: getInput('token'),
    name: getInput('name'),
    tag: getInput('tag'),
    version: getInput('version'),
    publish: getInput('publish'),
    latest: getInput('latest'),
    prerelease: getInput('prerelease'),
    'prerelease-identifier': getInput('prerelease-identifier'),
    commitish: getInput('commitish'),
    header: getInput('header'),
    footer: getInput('footer'),
    'disable-releaser': getInput('disable-releaser'),
    'disable-autolabeler': getInput('disable-autolabeler')
  })
}
