import * as core from '@actions/core'
import type { Commit } from 'conventional-commits-parser'
import type { ParsedConfig } from 'src/actions/drafter/config'

type ConventionalConfig = NonNullable<
  ParsedConfig['categories'][number]['conventional']
>

/**
 * Checks whether a parsed conventional-commit string
 * matches a category's `conventional` criteria.
 */
export const matchesConventionalCategory = (
  parsed: Commit,
  conventional: ConventionalConfig,
): boolean => {}

export const hasConventionalCriteria = (conventional?: ConventionalConfig) => {
  if (!conventional) {
    return false
  }

  return (
    conventional.types.size > 0 ||
    conventional.andTypes.size > 0 ||
    conventional.orTypes.size > 0 ||
    conventional.scopes.size > 0 ||
    conventional.andScopes.size > 0 ||
    conventional.orScopes.size > 0 ||
    conventional.breaking !== undefined ||
    conventional.andBreaking !== undefined ||
    conventional.orBreaking !== undefined
  )
}
