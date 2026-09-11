import { changeDate, changeTitle } from '../change.ts'
import type { Config } from '../config/config.schema.ts'
import type { Logger } from '../ports.ts'
import type { Change } from '../types.ts'

export const sortChanges = (params: {
  changes: Change[]
  logger: Logger
  config: Pick<Config, 'sort-by' | 'sort-direction'>
}) => {
  const {
    changes,
    logger,
    config: { 'sort-by': sortBy, 'sort-direction': sortDirection },
  } = params

  const getSortField = sortBy === 'title' ? changeTitle : changeDate

  const sort = sortDirection === 'ascending' ? sortAscending : sortDescending

  return structuredClone(changes).sort((a, b) => {
    try {
      const left = getSortField(a)
      const right = getSortField(b)
      return sort(
        sortBy === 'date' ? parseDate(left, logger) : left,
        sortBy === 'date' ? parseDate(right, logger) : right,
      )
    } catch (error) {
      logger.warning(
        `Failed to sort changes by ${sortBy} in ${sortDirection} order. Returning unsorted.`,
      )
      logger.error(error as Error)
      return 0
    }
  })
}

type TData = string | number | null | undefined

const parseDate = (
  value: string | null | undefined,
  logger: Logger,
): number | null | undefined => {
  if (value == null) return value
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    logger.warning(`Failed to parse change date "${value}". Sorting it last.`)
    return undefined
  }
  return timestamp
}

const sortAscending = (a: TData, b: TData) => {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (a > b) return 1
  if (a < b) return -1
  return 0
}

const sortDescending = (a: TData, b: TData) => {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  return sortAscending(a, b) * -1
}
