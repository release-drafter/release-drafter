import type { Logger } from '../util.ts'
import { stringToRegex } from '../util.ts'
import type { Config } from './config.schema.ts'
import { validateConfig } from './validate-config.ts'

/** Normalizes label shorthand and compiles configured regex matchers. */
export const parseConfig = (params: { config: Config; logger: Logger }) => {
  validateConfig(params.config)
  const config = structuredClone(params.config)
  const autolabeler = config.autolabeler
    .map((rule) => {
      try {
        return {
          ...rule,
          labels: [
            ...(rule.labels ?? []),
            ...(rule.label !== undefined ? [rule.label] : []),
          ],
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
