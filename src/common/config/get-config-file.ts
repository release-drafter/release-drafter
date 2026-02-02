import { ConfigTarget } from './parse-config-target'
import yaml from 'yaml'
import { getConfigFileFromFs } from './get-config-file-from-fs'
import { getConfigFileFromRepo } from './get-config-file-from-repo'
import { normalizeFilepath } from './normalize-filepath'

const SUPPORTED_FILE_EXTENSIONS = ['json', 'yml', 'yaml']

export const getConfigFile = async (
  configTarget: ConfigTarget,
  parentTarget?: ConfigTarget
) => {
  const _configTarget = structuredClone(configTarget)
  const fileExtension = (
    _configTarget.filepath.split('.').pop() as string
  ).toLowerCase()

  if (!SUPPORTED_FILE_EXTENSIONS.includes(fileExtension)) {
    throw new Error(
      `Unsupported file extension: .${fileExtension}. Supported extensions are: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`
    )
  }

  if (parentTarget?.scheme) {
    if (parentTarget?.scheme === 'github' && _configTarget.scheme === 'file') {
      throw new Error(
        `The '_extends' import-chain cannot contain github: to file: scheme transitions. Please change '_extends: ${configTarget.scheme}:${configTarget.filepath}' to use the github: scheme. ex: '_extends: ${parentTarget.repo.owner}/${parentTarget.repo.repo}:${configTarget.filepath}'`
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

  const config: Record<string, unknown> & { _extends?: string } =
    fileExtension === 'json' ? JSON.parse(configRaw) : yaml.parse(configRaw)

  return { config, fetchedFrom: _configTarget }
}
