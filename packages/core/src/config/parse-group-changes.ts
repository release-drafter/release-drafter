import type { Logger } from '../ports.ts'
import { stringToRegex } from '../string-to-regex.ts'
import type { ParsedGroupChange } from '../types.ts'
import type { Config } from './config.schema.ts'

/** Capture group names that `renderTemplate` can expand as `$FIRST_<NAME>`/`$LAST_<NAME>`. */
const templatableName = /^[A-Za-z_]+$/

/** Capture group names that build the grouping key: `group` and every `group_<name>`. */
const isGroupName = (name: string) => /^group(_|$)/i.test(name)

/**
 * Converts the configured `group-changes` patterns into regular expressions and
 * collects the capture group names their `title-template` can reference.
 *
 * Rules that cannot be used are dropped with a warning so that a single bad
 * pattern never fails the whole release, matching how `replacers` are handled.
 */
export const parseGroupChanges = (params: {
  groupChanges: Config['group-changes']
  logger: Logger
}): ParsedGroupChange[] => {
  const { groupChanges, logger } = params

  return groupChanges.flatMap((groupChange) => {
    let pattern: RegExp
    try {
      const converted = stringToRegex(groupChange.pattern)
      // `exec` keeps state in `lastIndex` with the `g`/`y` flags, which would
      // make every other title fail to match.
      pattern = new RegExp(
        converted.source,
        converted.flags.replace(/[gy]/g, ''),
      )
    } catch {
      logger.warning(`Bad group-changes pattern: '${groupChange.pattern}'`)
      return []
    }

    const names = captureNamesOf(pattern)
    const groupNames = names.filter(isGroupName)
    if (groupNames.length === 0) {
      logger.warning(
        `The group-changes pattern '${groupChange.pattern}' must be a regular expression literal, such as '/…/', with a 'group' capture group.`,
      )
      return []
    }

    // A name a template cannot reference still groups changes, it is only
    // missing from `title-template`.
    const templatable = names.filter((name) => {
      if (templatableName.test(name)) return true
      logger.warning(
        `The group-changes capture group '${name}' is not available in 'title-template'. Use letters and underscores only.`,
      )
      return false
    })

    return [
      {
        ...groupChange,
        pattern,
        groupNames,
        captureNames: templatable.filter((name) => !isGroupName(name)),
      },
    ]
  })
}

/**
 * Lists every named capture group of a pattern. Prefixing the source with an
 * empty alternative makes the expression match an empty string, so the match
 * reports all group names at once.
 */
const captureNamesOf = (pattern: RegExp) => {
  try {
    const probe = new RegExp(`|${pattern.source}`, pattern.flags)
    return Object.keys(probe.exec('')?.groups ?? {})
  } catch {
    return []
  }
}
