import type { Config } from '../schemas/config.schema'

type ConventionalConfig = NonNullable<
  Config['categories'][number]['conventional']
>

type NormalizedConventionalConfig = {
  types: Set<string>
  andTypes: Set<string>
  orTypes: Set<string>
  scopes: Set<string>
  andScopes: Set<string>
  orScopes: Set<string>
  breaking?: boolean
  andBreaking?: boolean
  orBreaking?: boolean
}

const toUniqueSet = <T>(values: T[]) => new Set(values)

const hasValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.length > 0
  }

  return value !== undefined
}

const throwMultipleMatcherError = (params: {
  categoryTitle: string
  group: 'type' | 'scope' | 'breaking'
  allowed: string[]
  provided: string[]
}) => {
  const { categoryTitle, group, allowed, provided } = params

  throw new Error(
    `Invalid categories[].conventional matcher configuration for category "${categoryTitle}": only one ${group} matcher alias can be used at a time. Found ${provided.join(', ')}. Use exactly one of ${allowed.join(', ')}.`,
  )
}

const validateExclusiveMatcherAliases = (params: {
  categoryTitle: string
  conventional: ConventionalConfig
}) => {
  const { categoryTitle, conventional } = params

  const typeAliases = [
    'type',
    'types',
    'andType',
    'andTypes',
    'orType',
    'orTypes',
  ] as const
  const scopeAliases = [
    'scope',
    'scopes',
    'andScope',
    'andScopes',
    'orScope',
    'orScopes',
  ] as const
  const breakingAliases = [
    'breaking',
    'andBreaking',
    'orBreaking',
  ] as const

  const providedTypeAliases = typeAliases.filter((alias) =>
    hasValue(conventional[alias]),
  )
  const providedScopeAliases = scopeAliases.filter((alias) =>
    hasValue(conventional[alias]),
  )
  const providedBreakingAliases = breakingAliases.filter((alias) =>
    hasValue(conventional[alias]),
  )

  if (providedTypeAliases.length > 1) {
    throwMultipleMatcherError({
      categoryTitle,
      group: 'type',
      allowed: [...typeAliases],
      provided: [...providedTypeAliases],
    })
  }

  if (providedScopeAliases.length > 1) {
    throwMultipleMatcherError({
      categoryTitle,
      group: 'scope',
      allowed: [...scopeAliases],
      provided: [...providedScopeAliases],
    })
  }

  if (providedBreakingAliases.length > 1) {
    throwMultipleMatcherError({
      categoryTitle,
      group: 'breaking',
      allowed: [...breakingAliases],
      provided: [...providedBreakingAliases],
    })
  }
}

export const normalizeConventionalConfig = (params: {
  categoryTitle: string
  conventional?: ConventionalConfig
}) => {
  const { categoryTitle, conventional } = params

  if (!conventional) {
    return undefined
  }

  validateExclusiveMatcherAliases({ categoryTitle, conventional })

  const normalized: NormalizedConventionalConfig = {
    types: new Set(),
    andTypes: new Set(),
    orTypes: new Set(),
    scopes: new Set(),
    andScopes: new Set(),
    orScopes: new Set(),
    breaking: undefined,
    andBreaking: undefined,
    orBreaking: undefined,
  }

  if (conventional.type) {
    normalized.types = new Set([conventional.type])
  } else if (conventional.types.length > 0) {
    normalized.types = toUniqueSet(conventional.types)
  } else if (conventional.andType) {
    normalized.andTypes = new Set([conventional.andType])
  } else if (conventional.andTypes.length > 0) {
    normalized.andTypes = toUniqueSet(conventional.andTypes)
  } else if (conventional.orType) {
    normalized.orTypes = new Set([conventional.orType])
  } else if (conventional.orTypes.length > 0) {
    normalized.orTypes = toUniqueSet(conventional.orTypes)
  }

  if (conventional.scope) {
    normalized.scopes = new Set([conventional.scope])
  } else if (conventional.scopes.length > 0) {
    normalized.scopes = toUniqueSet(conventional.scopes)
  } else if (conventional.andScope) {
    normalized.andScopes = new Set([conventional.andScope])
  } else if (conventional.andScopes.length > 0) {
    normalized.andScopes = toUniqueSet(conventional.andScopes)
  } else if (conventional.orScope) {
    normalized.orScopes = new Set([conventional.orScope])
  } else if (conventional.orScopes.length > 0) {
    normalized.orScopes = toUniqueSet(conventional.orScopes)
  }

  if (conventional.breaking !== undefined) {
    normalized.breaking = conventional.breaking
  } else if (conventional.andBreaking !== undefined) {
    normalized.andBreaking = conventional.andBreaking
  } else if (conventional.orBreaking !== undefined) {
    normalized.orBreaking = conventional.orBreaking
  }

  return normalized
}
