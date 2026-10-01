export type { ParsedConfig } from '../types.ts'
export {
  type CommonConfig,
  commonConfigSchema,
} from './common-config.schema.ts'
export {
  type CategoryConfig,
  type ChangeConditionConfig,
  type Config,
  categorySchemaDefaults,
  changeConditionSchemaDefaults,
  configSchema,
  configSchemaDefaults,
  type ExclusiveConfig,
  exclusiveConfigSchema,
} from './config.schema.ts'
export { type LoadConfigOptions, loadConfig } from './load-config.ts'
export * from './local-config-file.ts'
export { mergeInputAndConfig } from './merge-input-and-config.ts'
export { parseCategories } from './parse-categories.ts'
