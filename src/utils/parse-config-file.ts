import { parse as yamlparse } from 'yaml'
import { configSchema, type Config } from '../types/config.schema.js'

export const parseConfigFile = async (configFile: string): Promise<Config> => {
  return configSchema.parse(yamlparse(configFile))
}
