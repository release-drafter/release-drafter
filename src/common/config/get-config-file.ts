import { parse as parseYaml } from 'yaml'
import { prettifyError, ZodError } from 'zod'
import { configFileSchema } from './extends.schema.ts'
import { getConfigFileFromFs } from './get-config-file-from-fs.ts'
import { getConfigFileFromRepo } from './get-config-file-from-repo.ts'
import { normalizeFilepath } from './normalize-filepath.ts'
import {
  type ConfigTarget,
  describeConfigTarget,
} from './parse-config-target.ts'

const SUPPORTED_FILE_EXTENSIONS = ['json', 'yml', 'yaml']

export const getConfigFile = async (
  configTarget: ConfigTarget,
  parentTarget?: ConfigTarget,
) => {
  const _configTarget = structuredClone(configTarget)
  const fileExtension = (
    _configTarget.filepath.split('.').pop() as string
  ).toLowerCase()

  if (!SUPPORTED_FILE_EXTENSIONS.includes(fileExtension)) {
    throw new Error(
      `Unsupported file extension: .${fileExtension}. Supported extensions are: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`,
    )
  }

  if (parentTarget?.scheme) {
    if (parentTarget?.scheme === 'github' && _configTarget.scheme === 'file') {
      throw new Error(
        `The '_extends' import-chain cannot contain github: to file: scheme transitions. Please change '_extends: ${configTarget.scheme}:${configTarget.filepath}' to use the github: scheme. ex: '_extends: ${parentTarget.repo.owner}/${parentTarget.repo.repo}:${configTarget.filepath}'`,
      )
    }
  }

  const filepath = normalizeFilepath(_configTarget, parentTarget)

  _configTarget.filepath = filepath

  const loadFromFs = _configTarget.scheme === 'file'

  // Fetch config file
  let configRaw: string
  if (loadFromFs) {
    try {
      configRaw = getConfigFileFromFs(_configTarget.filepath)
    } catch (error) {
      throw new Error(`Local load failed. ${(error as Error).message}`)
    }
  } else {
    try {
      configRaw = await getConfigFileFromRepo(_configTarget)
    } catch (error) {
      throw new Error(`Repo load failed. ${(error as Error).message}`)
    }
  }

  const rawConfig: unknown =
    fileExtension === 'json' ? JSON.parse(configRaw) : parseYaml(configRaw)

  let config: ReturnType<typeof configFileSchema.parse>
  try {
    config = configFileSchema.parse(rawConfig)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        `Invalid config in ${describeConfigTarget(_configTarget)}:\n${prettifyError(error)}`,
        { cause: error },
      )
    }
    throw error
  }

  return { config, fetchedFrom: _configTarget }
}
