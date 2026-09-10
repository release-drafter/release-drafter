import { defineActionInputNames } from '../common/action-contract.ts'
import type { ActionInput } from './action-input.schema.ts'

export const actionInputNames = defineActionInputNames<ActionInput>()([
  'token',
  'config-name',
  'dry-run',
])

export const actionOutputNames = ['number', 'labels'] as const
