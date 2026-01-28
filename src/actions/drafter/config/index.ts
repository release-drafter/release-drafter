export { setActionOutput } from './set-action-output'
export { configSchema, replacersSchema, type Config } from './config.schema'
export {
  actionInputSchema,
  type ActionInput,
  type ConfigOverridesInput,
  type ExclusiveInput,
  configOverridesInputSchema,
  exclusiveInputSchema
} from './action-input.schema'
export { getActionInput } from './get-action-inputs'
export { mergeInputAndConfig } from './merge-input-and-config'
export { parseConfigFile } from './parse-config-file'
