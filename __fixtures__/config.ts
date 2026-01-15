import { readFileSync } from 'fs'
import path from 'path'
import { jest } from '@jest/globals'
import { loadConfigFile } from '../src/utils/load-config-file.js'

const configs = ['config.yml', 'config-non-master-branch.yml'] as const
/**
 * Mock our own config loading function.
 *
 * @option file The config file to return as a mock. Default `config.yml`.
 * @option requestedFile The original config file name to mock. Default `release-drafter.yml`.
 */
export const mockConfig = (opts?: {
  file?: (typeof configs)[number]
  requestedFile?: string
}) => {
  return jest.unstable_mockModule('../src/utils/load-config-file.js', () => ({
    loadConfigFile: (configFileName: string) => {
      if (configFileName === (opts?.requestedFile || 'release-drafter.yml')) {
        const file = opts?.file || configs[0]
        return readFileSync(
          path.resolve(import.meta.dirname, 'config', file),
          'utf8'
        )
      } else {
        return loadConfigFile(configFileName)
      }
    }
  }))
}

export const unmockConfig = () => {
  jest.unstable_unmockModule('../src/utils/load-config-file.js')
}
