import { parse as yamlparse } from 'yaml'
import { type Config, configSchema } from './config.schema.ts'

/** Parses and validates an autolabeler YAML document. */
export const parseConfigFile = async (configFile: string): Promise<Config> => {
  return configSchema.parse(yamlparse(configFile))
}
