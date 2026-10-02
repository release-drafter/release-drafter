import type { Config } from './config.schema.ts'

/** Validates fallback rules after structural configuration parsing. */
export const validateConfig = (config: Config): void => {
  const fallbacks = config.autolabeler.filter((rule) => rule.fallback)
  if (fallbacks.length > 1) {
    throw new Error('Only one Autolabeler fallback rule is supported.')
  }
  const fallback = fallbacks[0]
  if (fallback?.['stop-on-match']) {
    throw new Error(
      "An Autolabeler rule cannot enable both 'fallback' and 'stop-on-match'.",
    )
  }
  if (
    fallback &&
    [fallback.files, fallback.branch, fallback.title, fallback.body].some(
      (matchers) => matchers.length > 0,
    )
  ) {
    throw new Error('An Autolabeler fallback rule must not specify matchers.')
  }
}
