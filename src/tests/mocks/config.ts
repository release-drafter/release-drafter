import path from 'path'
import { mocks } from '.'
import { composeConfigGet } from 'src/common/config'
import { parse } from 'yaml'
import { readFileSync } from 'fs'

export const mockedConfigModule = async (
  iom: () => Promise<{ composeConfigGet: typeof composeConfigGet }>
) => {
  const om = await iom()

  const mockedComposeConfigGet: typeof composeConfigGet = async () => {
    const mockedConfig = mocks.config()
    if (mockedConfig) {
      const p = path.resolve(
        import.meta.dirname,
        '../fixtures',
        'config',
        mockedConfig + '.yml'
      )
      return {
        config: parse(readFileSync(p, 'utf-8')),
        contexts: mocks.getContextsConfigWasFetchedFrom()
      }
    } else {
      // will throw inside test-suites
      throw new Error(
        "composeGonfigGet was called without an associated mocked config. Please use mocks.config.mockReturnValue('config')"
      )
    }
  }

  return {
    ...om,
    composeConfigGet: mockedComposeConfigGet
  }
}
