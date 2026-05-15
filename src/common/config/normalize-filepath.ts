import { dirname, isAbsolute, join, normalize } from 'node:path'
import type { ConfigTarget } from './parse-config-target.ts'

/**
 * current path is assumed to be the ".github" folder in your repo
 * root path is assumed to be the root of your repo
 * @example
 *  filepath: release-drafter.yml
 *  output: [repo root]/.github/release-drafter.yml
 * @example
 *  filepath: /src/../configs/release-drafter.yml
 *  output: [repo root]/configs/release-drafter.yml
 * @example
 *  filepath: ../configs/release-drafter.yml
 *  output: [repo root]/configs/release-drafter.yml
 * @example
 *  filepath: /src/../configs/release-drafter.yml
 *  output: [repo root]/configs/release-drafter.yml
 *
 * When specifying a target using _extends in the same repo & ref, current path is assumed to be
 * the dirname of the current (parent) config file, instead of the .github repository.
 * This allows files to reference each-other in a more natural way.
 */
export const normalizeFilepath = (
  config: Pick<ConfigTarget, 'ref' | 'repo' | 'filepath'>,
  parentConfig?: Pick<ConfigTarget, 'ref' | 'repo' | 'filepath'>,
): string => {
  const _filepath = normalize(config.filepath)

  if (isAbsolute(_filepath)) {
    if (_filepath.startsWith('/')) {
      // Remove leading slash to make it relative to repo root
      return _filepath.slice(1)
    } else {
      throw new Error(`Encountered malformed absolute path ${_filepath}`)
    }
  } else {
    if (
      parentConfig &&
      // repo & refs are identical
      parentConfig.repo.owner === config.repo.owner &&
      parentConfig.repo.repo === config.repo.repo &&
      config.ref === parentConfig.ref
    ) {
      // Resolve relative to the parent config file's directory
      return normalize(join(dirname(parentConfig.filepath), _filepath))
    } else {
      // Prepend .github/ unless the path already starts with .github/
      if (_filepath.startsWith('.github/')) {
        return _filepath
      }
      return join('.github', _filepath)
    }
  }
}
