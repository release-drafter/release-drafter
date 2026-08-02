import type { Logger } from '../ports.ts'
import type { ParsedConfig } from '../types.ts'
import type { getVersionInfo } from './get-version-info.ts'
import { renderTemplate } from './render-template/index.ts'

/**
 * Renders the release name,
 * based on the input and config.
 */
export const renderReleaseName = (params: {
  inputName: string | undefined
  config: Pick<ParsedConfig, 'name-template'>
  versionInfo: ReturnType<typeof getVersionInfo>
  logger: Logger
}) => {
  let name = structuredClone(params.inputName)
  const { config, versionInfo, logger } = params

  if (name === undefined) {
    name = versionInfo
      ? renderTemplate({
          template: config['name-template'] || '',
          object: versionInfo,
        })
      : ''
  } else if (versionInfo) {
    name = renderTemplate({
      template: name,
      object: versionInfo,
    })
  }

  logger.debug(`name: ${name}`)
  return name
}
