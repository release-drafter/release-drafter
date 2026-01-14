import { ActionInput } from '../types/action-input.schema.js'
import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { parse as yamlparse } from 'yaml'
import { configSchema, type Config } from '../types/config.schema.js'

export const getConfig = async (
  configFilename: ActionInput['config-name']
): Promise<Config> => {
  const contextPath = path.resolve(
    process.env.GITHUB_WORKSPACE || '',
    '.github'
  )

  if (!existsSync(contextPath)) {
    throw new Error(
      `GITHUB_WORKSPACE is not set or the path does not exist: ${contextPath}`
    )
  }

  const configPath = path.join(contextPath, configFilename)

  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`)
  }

  return configSchema.parse(yamlparse(readFileSync(configPath, 'utf8')))
}
