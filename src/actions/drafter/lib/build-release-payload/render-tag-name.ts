import { type Logger, noopLogger } from '#src/common/index.ts'
import type { ParsedConfig } from '../../config/index.ts'
import type { getVersionInfo } from './get-version-info.ts'
import { renderTemplate } from './render-template/index.ts'

/**
 * Renders the tag name for the release,
 * based on the input and config.
 */
export const renderTagName = (params: {
  logger?: Logger
  inputTagName: string | undefined
  config: Pick<ParsedConfig, 'tag-template'>
  versionInfo: ReturnType<typeof getVersionInfo>
}) => {
  const logger = params.logger ?? noopLogger
  let tagName = structuredClone(params.inputTagName)
  const { config, versionInfo } = params

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
