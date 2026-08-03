import { execFile as nodeExecFile } from 'node:child_process'
import {
  open as nodeOpen,
  realpath as nodeRealpath,
  stat as nodeStat,
} from 'node:fs/promises'
import process from 'node:process'
import { parseArgs } from 'node:util'
import {
  type CommonConfig,
  type DraftReleaseResult,
  draftRelease,
  type ForgeAdapter,
  type Logger,
  mergeInputAndConfig,
  type ParsedConfig,
  type ReleaseInput,
  type Repository,
} from '@release-drafter/core'
import {
  GitHubAdapter,
  type GitHubAdapterOptions,
} from '@release-drafter/github-adapter'
import { loadConfig } from './config.ts'
import {
  createLocalConfigFileReader,
  type LocalConfigFileReader,
} from './local-config-file.js'

export const CLI_PACKAGE_NAME = '@release-drafter/cli' as const
export const CLI_VERSION = '7.7.0'

export interface WritableStream {
  write(chunk: string): unknown
}

export type ExecFileResult = { stdout: string; stderr: string }
export type ExecFile = (
  file: string,
  args: readonly string[],
  options?: {
    encoding?: BufferEncoding
    env?: NodeJS.ProcessEnv
    maxBuffer?: number
    timeout?: number
    windowsHide?: boolean
  },
) => Promise<ExecFileResult>

export type CliAdapter = ForgeAdapter &
  Pick<GitHubAdapter, 'getRepositoryConfig' | 'octokit'>

export type DraftFunction = (params: {
  adapter: ForgeAdapter
  config: ParsedConfig
  input: ReleaseInput
  logger: Logger
  repository: Repository
}) => Promise<DraftReleaseResult>

export type CliDependencies = {
  stdout?: WritableStream
  stderr?: WritableStream
  env?: NodeJS.ProcessEnv
  cwd?: string | (() => string)
  readLocalFile?: LocalConfigFileReader
  execFile?: ExecFile
  adapterFactory?: (options: GitHubAdapterOptions) => CliAdapter
  draft?: DraftFunction
  version?: string
}

type ParsedOptions = {
  repository: Repository
  from?: string
  name?: string
  tag?: string
  releaseVersion?: string
  to?: string
  config: string
  dryRun: boolean
  publish: boolean
  prerelease?: boolean
  latest?: boolean
  json: boolean
  serverUrl: string
  apiUrl?: string
  graphqlUrl?: string
}

class UsageError extends Error {}

const USAGE = `Usage: release-drafter <owner/repo> [options]

Options:
  -f, --from <ref>             Change comparison base
  -n, --name <name>            Release name override
      --tag <tag>              Release tag override
  -r, --release-version <ver>  Release version override
  -t, --to <ref>               Target commitish
  -c, --config <target>        Config target (default: release-drafter.yml)
      --dry-run                Calculate without writing
      --publish [true|false]   Publish instead of drafting (default: false)
      --prerelease [true|false]
      --latest [true|false]
      --json                   Write one JSON result document to stdout
      --forge <name>           Forge implementation (github only)
      --server-url <url>       Forge web URL
      --api-url <url>          Forge REST API URL
      --graphql-url <url>      Forge GraphQL API URL
      --help                   Show help
      --version                Show version
`

const REPOSITORY_PATTERN = /^[^/\s]+\/[^/\s]+$/
const GH_AUTH_TIMEOUT_MS = 10_000
const GH_AUTH_MAX_BUFFER_BYTES = 16 * 1024

const writeLine = (stream: WritableStream, message: string) => {
  stream.write(`${message}\n`)
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const createLogger = (stderr: WritableStream): Logger => ({
  debug() {},
  info(message) {
    writeLine(stderr, message)
  },
  warning(error) {
    writeLine(stderr, `warning: ${errorMessage(error)}`)
  },
  error(error) {
    writeLine(stderr, `error: ${errorMessage(error)}`)
  },
})

const normalizeOptionalBooleans = (argv: readonly string[]) => {
  const optionalBooleans = new Set(['--publish', '--prerelease', '--latest'])
  const normalized: string[] = []
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!optionalBooleans.has(argument)) {
      normalized.push(argument)
      continue
    }
    const next = argv[index + 1]
    if (next === 'true' || next === 'false') {
      normalized.push(`${argument}=${next}`)
      index += 1
    } else {
      normalized.push(`${argument}=true`)
    }
  }
  return normalized
}

const OPTION_DEFINITIONS = {
  from: { type: 'string', short: 'f' },
  name: { type: 'string', short: 'n' },
  tag: { type: 'string' },
  'release-version': { type: 'string', short: 'r' },
  to: { type: 'string', short: 't' },
  config: { type: 'string', short: 'c', default: 'release-drafter.yml' },
  'dry-run': { type: 'boolean', default: false },
  publish: { type: 'string' },
  prerelease: { type: 'string' },
  latest: { type: 'string' },
  json: { type: 'boolean', default: false },
  forge: { type: 'string' },
  'server-url': { type: 'string' },
  'api-url': { type: 'string' },
  'graphql-url': { type: 'string' },
  help: { type: 'boolean', default: false },
  version: { type: 'boolean', default: false },
} as const

const parseArguments = (argv: readonly string[]) =>
  parseArgs({
    args: normalizeOptionalBooleans(argv),
    allowPositionals: true,
    strict: true,
    options: OPTION_DEFINITIONS,
  })

const parseOptionalBoolean = (
  value: string | undefined,
  option: string,
): boolean | undefined => {
  if (value === undefined) return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  throw new UsageError(`${option} must be true or false.`)
}

const parseUrl = (value: string | undefined, option: string) => {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
    if (url.username || url.password || url.search || url.hash) {
      throw new Error()
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    throw new UsageError(
      `${option} must be an absolute HTTP(S) URL without credentials, a query, or a fragment.`,
    )
  }
}

const matchesEndpoint = (
  endpoint: string,
  expectedProtocol: string,
  expectedHost: string,
  expectedPath: string,
): boolean => {
  const url = new URL(endpoint)
  return (
    url.protocol === expectedProtocol &&
    url.host.toLowerCase() === expectedHost &&
    url.pathname.replace(/\/+$/, '') === expectedPath
  )
}

const selectForge = (params: {
  forge?: string
  serverUrl?: string
  apiUrl?: string
  graphqlUrl?: string
}): 'github' => {
  if (params.forge) {
    const forge = params.forge.toLowerCase()
    if (forge !== 'github') {
      throw new UsageError(
        `Forge '${params.forge}' is not supported by this build. Only 'github' is available.`,
      )
    }
    return 'github'
  }
  if (!params.serverUrl && !params.apiUrl && !params.graphqlUrl) return 'github'

  const serverUrl = params.serverUrl ?? 'https://github.com'
  const server = new URL(serverUrl)
  const serverHost = server.hostname.toLowerCase()
  const serverAuthority = server.host.toLowerCase()
  const serverIsGitHub =
    serverHost === 'github.com' &&
    server.port === '' &&
    server.pathname.replace(/\/+$/, '') === ''
  const apiIsGitHub =
    params.apiUrl === undefined ||
    matchesEndpoint(
      params.apiUrl,
      serverIsGitHub ? 'https:' : server.protocol,
      serverIsGitHub ? 'api.github.com' : serverAuthority,
      serverIsGitHub ? '' : '/api/v3',
    )
  const graphqlIsGitHub =
    params.graphqlUrl === undefined ||
    matchesEndpoint(
      params.graphqlUrl,
      serverIsGitHub ? 'https:' : server.protocol,
      serverIsGitHub ? 'api.github.com' : serverAuthority,
      serverIsGitHub ? '/graphql' : '/api/graphql',
    )
  if (apiIsGitHub && graphqlIsGitHub) return 'github'

  throw new UsageError(
    'The custom endpoints are ambiguous. Pass --forge explicitly.',
  )
}

const parseCommandLine = (argv: readonly string[]) => {
  let parsed: ReturnType<typeof parseArguments>
  try {
    parsed = parseArguments(argv)
  } catch (error) {
    throw new UsageError(errorMessage(error))
  }

  const values = parsed.values
  if (values.help) return { kind: 'help' as const }
  if (values.version) return { kind: 'version' as const }
  const serverUrl =
    parseUrl(values['server-url'], '--server-url') ?? 'https://github.com'
  const apiUrl = parseUrl(values['api-url'], '--api-url')
  const graphqlUrl = parseUrl(values['graphql-url'], '--graphql-url')
  selectForge({
    forge: values.forge,
    serverUrl: values['server-url'] ? serverUrl : undefined,
    apiUrl,
    graphqlUrl,
  })
  if (parsed.positionals.length !== 1) {
    throw new UsageError('Exactly one repository argument is required.')
  }
  const repositoryName = parsed.positionals[0]
  if (!REPOSITORY_PATTERN.test(repositoryName)) {
    throw new UsageError('Repository must be exactly nonblank owner/name.')
  }
  const [owner, name] = repositoryName.split('/')

  const options: ParsedOptions = {
    repository: { owner, name, serverUrl },
    from: values.from,
    name: values.name,
    tag: values.tag,
    releaseVersion: values['release-version'],
    to: values.to,
    config: values.config,
    dryRun: values['dry-run'],
    publish: parseOptionalBoolean(values.publish, '--publish') ?? false,
    prerelease: parseOptionalBoolean(values.prerelease, '--prerelease'),
    latest: parseOptionalBoolean(values.latest, '--latest'),
    json: values.json,
    serverUrl,
    apiUrl,
    graphqlUrl,
  }
  return { kind: 'run' as const, options }
}

const defaultExecFile: ExecFile = (file, args, options) =>
  new Promise((resolve, reject) => {
    nodeExecFile(file, [...args], options, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) })
    })
  })

const resolveToken = async (params: {
  env: NodeJS.ProcessEnv
  execFile: ExecFile
  serverUrl: string
}): Promise<string> => {
  const isGitHubDotCom =
    new URL(params.serverUrl).hostname.toLowerCase() === 'github.com'
  const environmentToken = isGitHubDotCom
    ? params.env.GITHUB_TOKEN?.trim() || params.env.GH_TOKEN?.trim()
    : params.env.GH_ENTERPRISE_TOKEN?.trim() ||
      params.env.GITHUB_ENTERPRISE_TOKEN?.trim()
  if (environmentToken) return environmentToken

  const host = new URL(params.serverUrl).hostname
  const args = ['auth', 'token']
  if (host.toLowerCase() !== 'github.com') args.push('--hostname', host)
  try {
    const { stdout } = await params.execFile('gh', args, {
      encoding: 'utf8',
      env: params.env,
      timeout: GH_AUTH_TIMEOUT_MS,
      maxBuffer: GH_AUTH_MAX_BUFFER_BYTES,
      windowsHide: true,
    })
    const token = stdout.trim()
    if (token) return token
  } catch {
    // The stable diagnostic below deliberately excludes subprocess output.
  }
  throw new Error(
    isGitHubDotCom
      ? 'Unable to resolve a GitHub token from GITHUB_TOKEN, GH_TOKEN, or `gh auth token`.'
      : 'Unable to resolve a GitHub token from GH_ENTERPRISE_TOKEN, GITHUB_ENTERPRISE_TOKEN, or `gh auth token --hostname`.',
  )
}

const defaultBranch = async (
  adapter: CliAdapter,
  repository: Repository,
): Promise<string> => {
  const response = await adapter.octokit.rest.repos.get({
    owner: repository.owner,
    repo: repository.name,
  })
  const branch = response.data.default_branch?.trim()
  if (!branch) throw new Error('GitHub returned a blank default branch.')
  return branch
}

const resultDocument = (result: DraftReleaseResult) => {
  const release = result.release ?? result.plan.draftRelease
  const payload = result.releasePayload
  const dryRun = result.plan.action === 'dry-run'
  return {
    action: result.plan.action,
    ...(release?.id !== undefined ? { id: String(release.id) } : {}),
    ...(release?.url ? { html_url: release.url } : {}),
    ...(release?.uploadUrl ? { upload_url: release.uploadUrl } : {}),
    tag_name: dryRun ? payload.tag : (release?.tagName ?? payload.tag),
    name: dryRun ? payload.name : (release?.name ?? payload.name),
    ...(payload.resolvedVersion
      ? { resolved_version: payload.resolvedVersion }
      : {}),
    ...(payload.majorVersion ? { major_version: payload.majorVersion } : {}),
    ...(payload.minorVersion ? { minor_version: payload.minorVersion } : {}),
    ...(payload.patchVersion ? { patch_version: payload.patchVersion } : {}),
    ...(payload.prereleaseVersion
      ? { prerelease_version: payload.prereleaseVersion }
      : {}),
    target_commitish: payload.targetCommitish,
    draft: payload.draft,
    prerelease: payload.prerelease,
    latest: payload.makeLatest,
    dry_run: dryRun,
    body: payload.body,
  }
}

/**
 * Runs the private Release Drafter CLI without terminating the process.
 *
 * Importing this module is side-effect free. Runtime state and I/O are only
 * consulted after this function is called, and every external boundary can be
 * injected for deterministic tests.
 */
export function runCli(
  argv: readonly string[],
  injected?: CliDependencies,
): Promise<number>
export function runCli(
  argv: readonly string[],
  version?: string,
  injected?: CliDependencies,
): Promise<number>
export async function runCli(
  argv: readonly string[],
  versionOrDependencies: string | CliDependencies = CLI_VERSION,
  dependencies: CliDependencies = {},
): Promise<number> {
  const version =
    typeof versionOrDependencies === 'string'
      ? versionOrDependencies
      : (versionOrDependencies.version ?? CLI_VERSION)
  const injected =
    typeof versionOrDependencies === 'string'
      ? dependencies
      : versionOrDependencies
  const stdout = injected.stdout ?? process.stdout
  const stderr = injected.stderr ?? process.stderr
  const cliArgv =
    REPOSITORY_PATTERN.test(argv[0] ?? '') || argv[0]?.startsWith('-')
      ? argv
      : argv.slice(2)

  let command: ReturnType<typeof parseCommandLine>
  try {
    command = parseCommandLine(cliArgv)
  } catch (error) {
    writeLine(stderr, `error: ${errorMessage(error)}`)
    stderr.write(USAGE)
    return 2
  }
  if (command.kind === 'help') {
    stdout.write(USAGE)
    return 0
  }
  if (command.kind === 'version') {
    writeLine(stdout, `release-drafter ${version}`)
    return 0
  }

  const { options } = command
  const logger = createLogger(stderr)
  const env = injected.env ?? process.env
  const cwd =
    typeof injected.cwd === 'function'
      ? injected.cwd()
      : (injected.cwd ?? process.cwd())
  const readLocalFile =
    injected.readLocalFile ??
    createLocalConfigFileReader({
      open: nodeOpen,
      realpath: nodeRealpath,
      stat: nodeStat,
    })
  const execFile = injected.execFile ?? defaultExecFile
  const adapterFactory =
    injected.adapterFactory ??
    ((adapterOptions: GitHubAdapterOptions) =>
      new GitHubAdapter(adapterOptions))
  const draft = injected.draft ?? draftRelease

  try {
    const token = await resolveToken({
      env,
      execFile,
      serverUrl: options.serverUrl,
    })
    const adapter = adapterFactory({
      token,
      serverUrl: options.serverUrl,
      apiUrl: options.apiUrl,
      graphqlUrl: options.graphqlUrl,
      logger,
      env,
    })
    const branch =
      options.to ?? (await defaultBranch(adapter, options.repository))
    const validatedConfig = await loadConfig({
      target: options.config,
      repository: options.repository,
      ref: branch,
      cwd,
      reader: adapter,
      logger,
      readLocalFile,
    })
    const inputOverrides: CommonConfig = {
      ...(options.to !== undefined ? { commitish: options.to } : {}),
      ...(options.prerelease !== undefined
        ? { prerelease: options.prerelease }
        : {}),
      ...(options.latest !== undefined ? { latest: options.latest } : {}),
    }
    const config = mergeInputAndConfig({
      config: validatedConfig,
      input: inputOverrides,
      defaultCommitish: branch,
      logger,
    })
    const input: ReleaseInput = {
      publish: options.publish,
      dryRun: options.dryRun,
      ...(options.from !== undefined ? { from: options.from } : {}),
      ...(options.name !== undefined ? { name: options.name } : {}),
      ...(options.tag !== undefined ? { tag: options.tag } : {}),
      ...(options.releaseVersion !== undefined
        ? { version: options.releaseVersion }
        : {}),
    }
    const result = await draft({
      adapter,
      config,
      input,
      logger,
      repository: options.repository,
    })
    if (options.json) {
      writeLine(stdout, JSON.stringify(resultDocument(result)))
    } else {
      const document = resultDocument(result)
      writeLine(
        stderr,
        `${document.action}: ${document.tag_name}${document.html_url ? ` (${document.html_url})` : ''}`,
      )
    }
    return 0
  } catch (error) {
    writeLine(stderr, `error: ${errorMessage(error)}`)
    return 1
  }
}
