import type { Logger } from '../ports.ts'
import type { ParsedConfig } from '../types.ts'
import type { getVersionInfo } from './get-version-info.ts'
import { renderTemplate } from './render-template/index.ts'

/**
 * Renders the tag name for the release,
 * based on the input and config.
 */
export const renderTagName = (params: {
  inputTagName: string | undefined
  config: Pick<ParsedConfig, 'tag-template'>
  versionInfo: ReturnType<typeof getVersionInfo>
  logger: Logger
}) => {
  let tagName = structuredClone(params.inputTagName)
  const { config, versionInfo, logger } = params

  if (tagName === undefined) {
    tagName = versionInfo
      ? renderTemplate({
          template: config['tag-template'] || '',
          object: versionInfo,
        })
      : ''
  } else if (versionInfo) {
    tagName = renderTemplate({
      template: tagName,
      object: versionInfo,
    })
  }

  logger.debug(`tag: ${tagName}`)
  return tagName
}
