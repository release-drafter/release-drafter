import type { Logger } from '../util.ts'
import { stringToRegex } from '../util.ts'
import type { Config } from './config.schema.ts'

/** Compiles configured regex matchers while preserving all other config values. */
export const parseConfig = (params: { config: Config; logger: Logger }) => {
  const config = structuredClone(params.config)
  const autolabeler = config.autolabeler
    .map((rule) => {
      try {
        return {
          ...rule,
          branch: rule.branch.map(stringToRegex),
          title: rule.title.map(stringToRegex),
          body: rule.body.map(stringToRegex),
        }
      } catch {
        params.logger.warning(
          `Bad autolabeler regex: '${rule.branch}', '${rule.title}' or '${rule.body}'`,
        )
        return false
      }
    })
    .filter((rule) => !!rule)
  return { ...config, autolabeler }
}

/** Autolabeler config with branch, title, and body matchers compiled to regexes. */
export type ParsedConfig = ReturnType<typeof parseConfig>
