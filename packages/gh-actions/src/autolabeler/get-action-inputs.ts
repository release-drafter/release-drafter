import * as core from '@actions/core'
import { type ActionInput, actionInputSchema } from './action-input.schema.ts'

export const getActionInput = (): ActionInput => {
  const getInput = (name: keyof ActionInput) => core.getInput(name) || undefined
  return actionInputSchema.parse({
    'config-name': getInput('config-name'),
    token: getInput('token'),
    'dry-run': getInput('dry-run'),
  })
}
