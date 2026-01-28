import path from 'path'
import { readFileSync } from 'fs'
import { mocks } from '.'

export const mockedLoadConfigFile = async (
  iom: () => Promise<{ loadConfigFile: (filename: string) => string }>
) => {
  const om = await iom()
  return {
    loadConfigFile: () => {
      const mockedConfig = mocks.config()
      if (mockedConfig) {
        const p = path.resolve(
          import.meta.dirname,
          '../fixtures',
          'config',
          mockedConfig + '.yml'
        )
        return readFileSync(p, 'utf8')
      } else {
        return om.loadConfigFile('release-drafter.yml')
      }
    }
  }
}
