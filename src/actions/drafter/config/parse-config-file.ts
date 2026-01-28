import { parse as yamlparse } from 'yaml'
import { Config, configSchema } from './config.schema'

export const parseConfigFile = async (configFile: string): Promise<Config> => {
  return configSchema.parse(yamlparse(configFile))
}
