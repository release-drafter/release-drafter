import * as core from '@actions/core'
import { type ActionInput, actionInputSchema } from './action-input.schema.ts'

export const getActionInput = (): ActionInput =>
  actionInputSchema.parse({
    'config-name': core.getInput('config-name') || undefined,
    token: core.getInput('token') || undefined,
  })
