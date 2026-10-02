import { parse as yamlparse } from 'yaml'
import { type Config, configSchema } from './config.schema.ts'
import { validateConfig } from './validate-config.ts'

/** Parses and validates an autolabeler YAML document. */
export const parseConfigFile = async (configFile: string): Promise<Config> => {
  const config = configSchema.parse(yamlparse(configFile))
  validateConfig(config)
  return config
}
