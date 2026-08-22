import { readActionInputs } from '../common/action-contract.ts'
import { actionInputSchema } from './action-input.schema.ts'
import { actionInputNames } from './action-metadata.ts'

export const getActionInput = () =>
  actionInputSchema.parse(readActionInputs(actionInputNames))
