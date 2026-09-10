import { defineActionInputNames } from '../common/action-contract.ts'
import type { ActionInput } from './action-input.schema.ts'

export const actionInputNames = defineActionInputNames<ActionInput>()([
  'config-name',
  'token',
])

export const actionOutputNames = [] as const
