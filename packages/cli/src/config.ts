import { dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path'
import { type Config, configSchema } from '@release-drafter/core'
import { parse as parseYaml } from 'yaml'
import {
  looseObject,
  prettifyError,
  record,
  strictObject,
  string,
  union,
  ZodError,
  enum as zenum,
  null as znull,
} from 'zod'
import {
  LocalConfigFileBoundaryError,
  type LocalConfigFileReader,
} from './local-config-file.js'

const SUPPORTED_EXTENSIONS = ['json', 'yml', 'yaml'] as const
const MAX_EXTENDS_DEPTH = 33
const MERGE_STRATEGIES = ['override', 'append', 'prepend'] as const

/** A repository address used by the CLI config loader. */
export type CliRepository = {
  owner: string
  name: string
  serverUrl: string
}

/** Side-effect boundary for config-loader diagnostics. */
export interface ConfigLogger {
  debug(message: string): void
  info(message: string): void
  warning(message: string): void
  error(message: string): void
}

/** Injected repository-content reader used instead of a global forge adapter. */
export interface RepositoryConfigReader {
  getRepositoryConfig(options: {
    repository: CliRepository
    path: string
    ref?: string
  }): Promise<string>
}

export interface LoadConfigOptions {
  /**
   * Config target using `[github:][[owner/]repo:]filepath[@ref]`,
   * `file:relative/path`, or a matching GitHub/GHES `/blob/<ref>/<path>` URL.
   * A repository target without an explicit repository uses `repository`, and a
   * repository-relative path outside an inheritance chain defaults to `.github/`.
   */
  target: string
  repository: CliRepository
  ref: string
  cwd: string
  reader: RepositoryConfigReader
  logger: ConfigLogger
  readLocalFile?: LocalConfigFileReader
}

type MergeStrategy = (typeof MERGE_STRATEGIES)[number]
type Scheme = 'file' | 'github'

type ConfigTarget = {
  scheme: Scheme
  repository: CliRepository
  path: string
  ref?: string
}

type ParsedTarget = ConfigTarget & {
  hasExplicitRepository: boolean
  alternatives?: ConfigTarget[]
}

type ExtendsDeclaration = {
  from: string
  strategy: Record<string, MergeStrategy>
}

type ConfigFile = Record<string, unknown> & {
  _extends?: ExtendsDeclaration
}

type LoadedConfig = {
  config: ConfigFile
  target: ConfigTarget
}

const mergeStrategySchema = zenum(MERGE_STRATEGIES)
const extendsDeclarationSchema = union([
  string(),
  znull(),
  strictObject({
    from: string().regex(/\S/, "'from' must not be blank"),
    strategy: record(string(), mergeStrategySchema).nullish(),
  }),
])
  .optional()
  .transform((value): ExtendsDeclaration | undefined => {
    if (value == null || (typeof value === 'string' && value.trim() === '')) {
      return undefined
    }
    if (typeof value === 'string') {
      return { from: value.trim(), strategy: {} }
    }
    return { from: value.from.trim(), strategy: value.strategy ?? {} }
  })

const configFileSchema = looseObject({
  _extends: extendsDeclarationSchema,
})

const sameRepository = (left: CliRepository, right: CliRepository): boolean =>
  left.owner === right.owner &&
  left.name === right.name &&
  normalizedServerUrl(left.serverUrl) === normalizedServerUrl(right.serverUrl)

const normalizedServerUrl = (serverUrl: string): string =>
  serverUrl.replace(/\/+$/, '')

const describeTarget = (target: ConfigTarget): string => {
  const repository = `${target.repository.owner}/${target.repository.name}`
  const ref = target.ref ? `@${target.ref}` : ''
  return `${target.scheme}:${repository}:${target.path}${ref}`
}

const safeTargetText = (target: string): string => {
  const withoutQuery = target.replace(/[?#].*$/, '')
  return withoutQuery.replace(/^(https?:\/\/)[^/@]+@/i, '$1')
}

const targetError = (target: string, detail: string): Error =>
  new Error(
    `Invalid config target "${safeTargetText(target)}": ${detail} Expected [github:][[owner/]repo:]filepath[@ref], file:relative/path, or a matching repository blob URL.`,
  )

const parseBlobUrl = (
  target: string,
  repository: CliRepository,
): ParsedTarget | undefined => {
  if (!/^https?:\/\//i.test(target)) return undefined

  let targetUrl: URL
  let serverUrl: URL
  try {
    targetUrl = new URL(target)
    serverUrl = new URL(repository.serverUrl)
  } catch {
    throw targetError(target, 'The URL is malformed.')
  }

  if (targetUrl.host !== serverUrl.host) {
    throw targetError(
      target,
      'The URL host does not match the repository server.',
    )
  }

  const serverPrefix = serverUrl.pathname.replace(/^\/+|\/+$/g, '')
  const targetParts = targetUrl.pathname.split('/').filter(Boolean)
  const prefixParts = serverPrefix ? serverPrefix.split('/') : []
  if (!prefixParts.every((part, index) => targetParts[index] === part)) {
    throw targetError(
      target,
      'The URL path does not match the repository server.',
    )
  }

  const parts = targetParts.slice(prefixParts.length)
  if (parts.length < 5 || parts[2] !== 'blob') {
    throw targetError(target, 'The URL must be a repository blob URL.')
  }

  const [owner, name, , ...refAndPathParts] = parts
  if (!owner || !name || refAndPathParts.length < 2) {
    throw targetError(
      target,
      'The blob URL is missing a repository, ref, or path.',
    )
  }

  const targetRepository = {
    owner: decodeURIComponent(owner),
    name: decodeURIComponent(name),
    serverUrl: normalizedServerUrl(repository.serverUrl),
  }
  const decodedParts = refAndPathParts.map((part) => decodeURIComponent(part))
  const candidates = decodedParts.slice(0, -1).map((_, splitIndex) => ({
    scheme: 'github' as const,
    repository: targetRepository,
    path: `/${decodedParts.slice(splitIndex + 1).join('/')}`,
    ref: decodedParts
      .slice(0, splitIndex + 1)
      .join('/')
      .replace(/^refs\/heads\//, ''),
  }))
  const [primary, ...alternatives] = candidates
  return {
    ...primary,
    hasExplicitRepository: true,
    alternatives,
  }
}

const parseTarget = (
  value: string,
  context: Pick<ConfigTarget, 'repository' | 'ref'>,
): ParsedTarget => {
  const target = value.trim()
  if (!target) throw targetError(value, 'The target is blank.')
  if (/\s/.test(target)) throw targetError(target, 'Spaces are not allowed.')

  const blobTarget = parseBlobUrl(target, context.repository)
  if (blobTarget) return blobTarget

  const scheme: Scheme = target.startsWith('file:') ? 'file' : 'github'
  let body = target
  if (body.startsWith('file:')) body = body.slice('file:'.length)
  else if (body.startsWith('github:')) body = body.slice('github:'.length)

  if (scheme === 'file') {
    if (!body) throw targetError(target, 'The local path is missing.')
    if (body.includes(':') || body.includes('@')) {
      throw targetError(
        target,
        'Local targets cannot contain repository or ref specifiers.',
      )
    }
    return {
      scheme,
      repository: context.repository,
      path: body,
      ref: context.ref,
      hasExplicitRepository: false,
    }
  }

  const colonIndex = body.indexOf(':')
  if (colonIndex !== body.lastIndexOf(':')) {
    throw targetError(target, '":" may be specified at most once.')
  }

  let repositorySpecifier: string | undefined
  let pathAndRef = body
  if (colonIndex >= 0) {
    repositorySpecifier = body.slice(0, colonIndex)
    pathAndRef = body.slice(colonIndex + 1)
    if (!repositorySpecifier) {
      throw targetError(target, 'The repository specifier is missing.')
    }
  } else {
    const atIndex = body.lastIndexOf('@')
    const withoutRef = atIndex >= 0 ? body.slice(0, atIndex) : body
    const basename = withoutRef.split('/').at(-1) ?? ''
    if (basename === '.github' || !basename.includes('.')) {
      repositorySpecifier = withoutRef
      pathAndRef = atIndex >= 0 ? body.slice(atIndex) : ''
    }
  }

  let targetRepository = context.repository
  if (repositorySpecifier !== undefined) {
    const repositoryParts = repositorySpecifier.split('/')
    if (
      repositoryParts.length > 2 ||
      repositoryParts.some((part) => part.length === 0)
    ) {
      throw targetError(
        target,
        'The repository must be `repo` or `owner/repo`.',
      )
    }
    targetRepository = {
      owner:
        repositoryParts.length === 2
          ? repositoryParts[0]
          : context.repository.owner,
      name:
        repositoryParts.length === 2 ? repositoryParts[1] : repositoryParts[0],
      serverUrl: normalizedServerUrl(context.repository.serverUrl),
    }
  }

  const atIndex = pathAndRef.lastIndexOf('@')
  if (atIndex !== pathAndRef.indexOf('@')) {
    throw targetError(target, '"@" may be specified at most once.')
  }

  const path = atIndex >= 0 ? pathAndRef.slice(0, atIndex) : pathAndRef
  const explicitRef = atIndex >= 0 ? pathAndRef.slice(atIndex + 1) : undefined
  if (atIndex >= 0 && !explicitRef) {
    throw targetError(target, 'The ref specifier is empty.')
  }

  return {
    scheme,
    repository: targetRepository,
    path,
    ref:
      explicitRef?.replace(/^refs\/heads\//, '') ??
      (sameRepository(targetRepository, context.repository)
        ? context.ref
        : undefined),
    hasExplicitRepository: repositorySpecifier !== undefined,
  }
}

const ensureSupportedExtension = (target: ConfigTarget): void => {
  const extension = target.path.split('.').pop()?.toLowerCase()
  if (
    !extension ||
    !SUPPORTED_EXTENSIONS.includes(
      extension as (typeof SUPPORTED_EXTENSIONS)[number],
    )
  ) {
    throw new Error(
      `Unsupported config extension for ${describeTarget(target)}. Supported extensions are .json, .yml, and .yaml.`,
    )
  }
}

const normalizeRepositoryPath = (
  target: ConfigTarget,
  parent?: ConfigTarget,
): string => {
  const rawPath = target.path.replaceAll('\\', '/')
  let normalized: string

  if (rawPath.startsWith('/')) {
    normalized = posix.normalize(rawPath).replace(/^\/+/, '')
  } else if (
    parent &&
    sameRepository(target.repository, parent.repository) &&
    target.ref === parent.ref
  ) {
    normalized = posix.normalize(
      posix.join(posix.dirname(parent.path), rawPath),
    )
  } else {
    normalized = posix.normalize(
      rawPath.startsWith('.github/') ? rawPath : posix.join('.github', rawPath),
    )
  }

  if (!normalized || normalized === '..' || normalized.startsWith('../')) {
    throw new Error(
      `Repository config path escapes the repository for ${describeTarget(target)}.`,
    )
  }
  return normalized
}

const normalizeLocalPathLexically = (
  target: ConfigTarget,
  parent: ConfigTarget | undefined,
  cwd: string,
): { absolutePath: string; relativePath: string } => {
  if (isAbsolute(target.path)) {
    throw new Error(
      `Local config path must be relative for ${describeTarget(target)}.`,
    )
  }

  const base = parent?.scheme === 'file' ? dirname(parent.path) : ''
  const candidate = resolve(cwd, base, target.path)
  const relativePath = relative(resolve(cwd), candidate)
  if (
    !relativePath ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error(
      `Local config path must remain within cwd for ${describeTarget(target)}.`,
    )
  }
  return { absolutePath: candidate, relativePath }
}

const isNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const candidate = error as {
    status?: unknown
    statusCode?: unknown
    code?: unknown
    response?: { status?: unknown }
    message?: unknown
  }
  if (
    candidate.status === 404 ||
    candidate.statusCode === 404 ||
    candidate.response?.status === 404 ||
    candidate.code === 'ENOENT' ||
    candidate.code === 'NOT_FOUND'
  ) {
    return true
  }
  return (
    typeof candidate.message === 'string' &&
    /(?:\b404\b|not[ -]?found|no such file)/i.test(candidate.message)
  )
}

const DANGEROUS_CONFIG_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const rejectDangerousConfigKeys = (
  value: unknown,
  target: ConfigTarget,
  path = '$',
  visited = new WeakSet<object>(),
): void => {
  if (value === null || typeof value !== 'object' || visited.has(value)) return
  visited.add(value)

  for (const key of Object.keys(value)) {
    const keyPath = `${path}.${key}`
    if (DANGEROUS_CONFIG_KEYS.has(key)) {
      throw new Error(
        `Unsafe config key '${key}' at ${keyPath} in ${describeTarget(target)}.`,
      )
    }
    rejectDangerousConfigKeys(
      (value as Record<string, unknown>)[key],
      target,
      keyPath,
      visited,
    )
  }
}

const parseConfigFile = (
  contents: string,
  target: ConfigTarget,
): ConfigFile => {
  const extension = target.path.split('.').pop()?.toLowerCase()
  let rawConfig: unknown
  try {
    rawConfig =
      extension === 'json' ? JSON.parse(contents) : parseYaml(contents)
  } catch {
    throw new Error(
      `Could not parse config syntax in ${describeTarget(target)}.`,
    )
  }

  rejectDangerousConfigKeys(rawConfig, target)

  try {
    return configFileSchema.parse(rawConfig) as ConfigFile
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        `Invalid config inheritance envelope in ${describeTarget(target)}:\n${prettifyError(error)}`,
      )
    }
    throw error
  }
}

const loadSingleConfigFile = async (
  target: ConfigTarget,
  options: LoadConfigOptions,
  parent?: ConfigTarget,
): Promise<LoadedConfig> => {
  if (parent?.scheme === 'github' && target.scheme === 'file') {
    throw new Error(
      `The _extends chain cannot transition from github to file at ${describeTarget(target)}.`,
    )
  }

  if (target.scheme === 'file') {
    const lexicalPath = normalizeLocalPathLexically(target, parent, options.cwd)
    const fetchedTarget = { ...target, path: lexicalPath.relativePath }
    ensureSupportedExtension(fetchedTarget)
    if (!options.readLocalFile) {
      throw new Error(
        `No local file reader was provided for ${describeTarget(fetchedTarget)}.`,
      )
    }
    let contents: string
    try {
      const localFile = await options.readLocalFile(
        lexicalPath.absolutePath,
        options.cwd,
      )
      const relativePath = relative(
        localFile.canonicalCwd,
        localFile.canonicalPath,
      )
      fetchedTarget.path = relativePath
      contents = localFile.contents
    } catch (error) {
      if (error instanceof LocalConfigFileBoundaryError) {
        const detail =
          error.reason === 'outside-cwd'
            ? 'Local config path must remain within cwd'
            : 'Local config path changed while it was being opened'
        throw new Error(`${detail} for ${describeTarget(fetchedTarget)}.`)
      }
      throw new Error(
        `Could not read local config ${describeTarget(fetchedTarget)}.`,
      )
    }
    return {
      config: parseConfigFile(contents, fetchedTarget),
      target: fetchedTarget,
    }
  }

  const fetchedTarget = {
    ...target,
    path: normalizeRepositoryPath(target, parent),
  }
  ensureSupportedExtension(fetchedTarget)
  let contents: string
  try {
    contents = await options.reader.getRepositoryConfig({
      repository: fetchedTarget.repository,
      path: fetchedTarget.path,
      ref: fetchedTarget.ref,
    })
  } catch (error) {
    const safeError = new Error(
      `Could not read repository config ${describeTarget(fetchedTarget)}.`,
    ) as Error & { configNotFound?: boolean }
    safeError.configNotFound = isNotFoundError(error)
    throw safeError
  }
  return {
    config: parseConfigFile(contents, fetchedTarget),
    target: fetchedTarget,
  }
}

const loadConfigFile = async (
  target: ParsedTarget | ConfigTarget,
  options: LoadConfigOptions,
  parent?: ConfigTarget,
): Promise<LoadedConfig> => {
  const { alternatives = [], ...primary } = target as ParsedTarget
  const candidates: ConfigTarget[] = [primary, ...alternatives]
  let lastNotFound: unknown

  for (const candidate of candidates) {
    try {
      return await loadSingleConfigFile(candidate, options, parent)
    } catch (error) {
      const configNotFound =
        error instanceof Error &&
        (error as Error & { configNotFound?: boolean }).configNotFound === true
      if (!configNotFound) throw error
      lastNotFound = error
    }
  }

  throw lastNotFound
}

const recursionKey = (target: ConfigTarget): string =>
  [
    target.scheme,
    normalizedServerUrl(target.repository.serverUrl),
    target.repository.owner,
    target.repository.name,
    target.ref ?? '',
    target.path,
  ].join('\u0000')

const localFileAlreadyLoaded = (
  files: LoadedConfig[],
  candidate: ConfigTarget,
): boolean =>
  candidate.scheme === 'github' &&
  files.some(
    ({ target }) =>
      target.scheme === 'file' &&
      sameRepository(target.repository, candidate.repository) &&
      target.path.replaceAll('\\', '/') ===
        candidate.path.replaceAll('\\', '/'),
  )

const toMergeableList = (
  value: unknown,
  strategy: MergeStrategy,
  key: string,
  target: ConfigTarget,
): unknown[] => {
  if (value == null) return []
  if (!Array.isArray(value)) {
    throw new Error(
      `Cannot ${strategy} '${key}' in ${describeTarget(target)} because the value is not a list.`,
    )
  }
  return value
}

const mergeConfigChain = (
  files: LoadedConfig[],
  logger: ConfigLogger,
): Record<string, unknown> => {
  const merged = Object.create(null) as Record<string, unknown>
  for (const { config, target } of [...files].reverse()) {
    const { _extends, ...ownConfig } = config
    const strategies = _extends?.strategy ?? {}

    for (const key of Object.keys(strategies)) {
      if (!Object.hasOwn(ownConfig, key)) {
        logger.warning(
          `_extends strategy declares '${key}' in ${describeTarget(target)}, but that file does not set '${key}'.`,
        )
      }
    }

    for (const [key, value] of Object.entries(ownConfig)) {
      const strategy = Object.hasOwn(strategies, key)
        ? strategies[key]
        : 'override'
      if (strategy === 'override') {
        merged[key] = value
        continue
      }

      const inherited = toMergeableList(merged[key], strategy, key, target)
      const own = toMergeableList(value, strategy, key, target)
      merged[key] =
        strategy === 'append' ? [...inherited, ...own] : [...own, ...inherited]
      logger.info(
        `_extends strategy ${strategy} merged ${own.length} '${key}' item(s) in ${describeTarget(target)}.`,
      )
    }
  }
  return merged
}

/**
 * Loads, composes, and validates a Release Drafter CLI configuration.
 *
 * All I/O and logging are injected. The loader does not read environment
 * variables, `process`, a global workspace, or the network directly.
 */
export async function loadConfig(options: LoadConfigOptions): Promise<Config> {
  const initialTarget = parseTarget(options.target, {
    repository: options.repository,
    ref: options.ref,
  })
  const canUseOrgFallback =
    initialTarget.scheme === 'github' &&
    !initialTarget.hasExplicitRepository &&
    sameRepository(initialTarget.repository, options.repository) &&
    options.repository.name !== '.github'

  options.logger.debug(`Loading config ${describeTarget(initialTarget)}.`)

  let initial: LoadedConfig
  try {
    initial = await loadConfigFile(initialTarget, options)
  } catch (error) {
    const configNotFound =
      error instanceof Error &&
      (error as Error & { configNotFound?: boolean }).configNotFound === true
    if (!canUseOrgFallback || !configNotFound) throw error

    const fallbackTarget: ConfigTarget = {
      ...initialTarget,
      repository: { ...options.repository, name: '.github' },
      ref: undefined,
    }
    options.logger.info(
      `Config not found in ${options.repository.owner}/${options.repository.name}; falling back to ${options.repository.owner}/.github.`,
    )
    initial = await loadConfigFile(fallbackTarget, options)
  }

  const files: LoadedConfig[] = [initial]
  const loadedTargets = new Set([recursionKey(initial.target)])
  let current = initial
  let depth = 0

  while (current.config._extends) {
    depth += 1
    if (depth > MAX_EXTENDS_DEPTH) {
      options.logger.error(
        `Maximum _extends depth (${MAX_EXTENDS_DEPTH}) exceeded at ${describeTarget(current.target)}.`,
      )
      throw new Error(
        `Maximum _extends depth (${MAX_EXTENDS_DEPTH}) exceeded at ${describeTarget(current.target)}.`,
      )
    }

    const declaration = current.config._extends
    const parsedParent = parseTarget(declaration.from, current.target)
    if (!parsedParent.path) {
      parsedParent.path = posix.basename(current.target.path)
    }

    const normalizedParent: ConfigTarget =
      parsedParent.scheme === 'file'
        ? {
            ...parsedParent,
            path: normalizeLocalPathLexically(
              parsedParent,
              current.target,
              options.cwd,
            ).relativePath,
          }
        : {
            ...parsedParent,
            path: normalizeRepositoryPath(parsedParent, current.target),
          }
    const key = recursionKey(normalizedParent)
    if (
      loadedTargets.has(key) ||
      localFileAlreadyLoaded(files, normalizedParent)
    ) {
      options.logger.warning(
        `Recursion detected. Ignoring "_extends: ${safeTargetText(declaration.from)}" in ${describeTarget(current.target)}.`,
      )
      break
    }

    options.logger.debug(
      `Loading inherited config ${describeTarget(normalizedParent)}.`,
    )
    const inherited = await loadConfigFile(
      parsedParent,
      options,
      current.target,
    )
    const inheritedKey = recursionKey(inherited.target)
    if (loadedTargets.has(inheritedKey)) {
      options.logger.warning(
        `Recursion detected. Ignoring "_extends: ${safeTargetText(declaration.from)}" in ${describeTarget(current.target)}.`,
      )
      break
    }
    files.push(inherited)
    loadedTargets.add(inheritedKey)
    current = inherited
  }

  const merged = mergeConfigChain(files, options.logger)
  try {
    return configSchema.parse(merged)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(
        `Invalid merged config rooted at ${describeTarget(initial.target)}:\n${prettifyError(error)}`,
      )
    }
    throw error
  }
}
