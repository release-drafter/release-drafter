import * as core from '@actions/core'
import { stringToRegex } from 'src/common'
import { Config } from './config.schema'

/**
 * Returns a copy of `config`, updated with values from `input`.
 *
 * Also performs some validation.
 *
 * Input takes precedence, because it's more easy to change at runtime
 */
export const parseConfig = ({ config: originalConfig }: { config: Config }) => {
  const config = structuredClone(originalConfig)

  // Apply some transformations
  const autolabeler = config.autolabeler
    // convert 'branch', 'title' and 'body' to regex and remove invalid entries
    .map((autolabel) => {
      try {
        return {
          ...autolabel,
          branch: autolabel.branch.map((reg) => {
            return stringToRegex(reg)
          }),
          title: autolabel.title.map((reg) => {
            return stringToRegex(reg)
          }),
          body: autolabel.body.map((reg) => {
            return stringToRegex(reg)
          })
        }
      } catch {
        core.warning(
          `Bad autolabeler regex: '${autolabel.branch}', '${autolabel.title}' or '${autolabel.body}'`
        )
        return false
      }
    })
    .filter((a) => !!a)

  // Build parsed config object - alters original type
  const parsedConfig = {
    ...config,
    autolabeler
  }

  return parsedConfig
}

/**
 * Similar to Config, but with input values merged in and defaults applied.
 *
 * @see mergeInputAndConfig
 */
export type ParsedConfig = ReturnType<typeof parseConfig>
