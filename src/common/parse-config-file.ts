import { Config, configSchema } from 'src/types'
import { parse as yamlparse } from 'yaml'

export const parseConfigFile = async (configFile: string): Promise<Config> => {
  return configSchema.parse(yamlparse(configFile))
}
