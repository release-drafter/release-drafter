import { spawnSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { posix } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

const FORGE_WORKSPACES = [
  'core',
  'release-drafter',
  'github-adapter',
  'rest-adapter',
  'gitea-adapter',
  'forgejo-adapter',
  'gitlab-adapter',
] as const

export const FORGE_CONFORMANCE_PATHSPECS = [
  '.github/workflows/ci.yml',
  '.github/workflows/forge-conformance.yml',
  '.node-version',
  '.npmrc',
  'package.json',
  ':(glob)tsconfig*.json',
  ':(glob)vite*.config.ts',
  ':(glob)vitest*.config.ts',
  ':(glob)src/tests/integration/**',
  'src/scripts/forge-conformance-router.ts',
  ':(glob)packages/core/src/**',
  ':(glob)packages/release-drafter/src/**',
  ':(glob)packages/github-adapter/src/**',
  ':(glob)packages/rest-adapter/src/**',
  ':(glob)packages/gitea-adapter/src/**',
  ':(glob)packages/forgejo-adapter/src/**',
  ':(glob)packages/gitlab-adapter/src/**',
  ...FORGE_WORKSPACES.flatMap((workspace) => [
    `packages/${workspace}/package.json`,
    `:(glob)packages/${workspace}/tsconfig*.json`,
  ]),
] as const

export type ForgeConformanceEnvironment = {
  EVENT_NAME?: string
  EVENT_ACTION?: string
  LABEL_NAME?: string
  OVERRIDE_LABEL?: string
  HAS_OVERRIDE_LABEL?: string
  PR_BASE_SHA?: string
  PUSH_BEFORE_SHA?: string
}

export type GitRunner = (
  executable: string,
  args: readonly string[],
) => { status: number | null; error?: Error; stdout?: string }

type LockPackage = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  link?: boolean
  resolved?: string
  dev?: boolean
}

/** Follow npm's installed dependency graph, including nested and workspace links. */
const forgeLockPackages = (source: string) => {
  const lock = JSON.parse(source) as {
    lockfileVersion: number
    packages: Record<string, LockPackage>
  }
  if (lock.lockfileVersion !== 3 || !lock.packages?.[''])
    throw new Error('Expected an npm v3 lockfile with a root package')

  const packages = lock.packages
  const selected = new Map<string, LockPackage>()
  const visitedWithDev = new Set<string>()
  const resolve = (from: string, name: string): string => {
    let directory = from
    while (true) {
      const candidate = posix.join(directory, 'node_modules', name)
      if (packages[candidate]) return candidate
      if (!directory) throw new Error(`Cannot resolve ${name} from ${from}`)
      directory = posix.dirname(directory)
      if (directory === '.') directory = ''
    }
  }
  const visit = (path: string, includeDev = false) => {
    if (selected.has(path) && (!includeDev || visitedWithDev.has(path))) return
    if (includeDev) visitedWithDev.add(path)
    const entry = packages[path]
    if (!entry) throw new Error(`Missing lockfile package ${path}`)
    // An unrelated workspace can change npm's dev classification through hoisting.
    const { dev: _dev, ...identity } = entry
    selected.set(path, identity)
    if (entry.link) {
      if (!entry.resolved) throw new Error(`Missing workspace target ${path}`)
      visit(entry.resolved, includeDev)
      return
    }
    const optional = {
      ...entry.peerDependencies,
      ...entry.optionalDependencies,
    }
    for (const name of Object.keys({
      ...entry.dependencies,
      ...(includeDev ? entry.devDependencies : {}),
      ...optional,
    })) {
      let dependency: string
      try {
        dependency = resolve(path, name)
      } catch (error) {
        if (name in optional) continue
        throw error
      }
      visit(dependency)
    }
  }

  // Root dev dependencies supply Vitest, Vite, TypeScript and container tooling.
  selected.set('', packages[''])
  for (const name of Object.keys(packages[''].devDependencies ?? {}))
    visit(resolve('', name))
  for (const workspace of FORGE_WORKSPACES) visit(`packages/${workspace}`, true)
  return selected
}

export type ForgeConformanceDecision = {
  shouldRun: boolean
  reason: string
  warning?: string
}

const failOpen = (warning: string): ForgeConformanceDecision => ({
  shouldRun: true,
  reason: 'changed-file detection failed open',
  warning,
})

const isZeroSha = (sha: string) => /^0+$/.test(sha)

const defaultGitRunner: GitRunner = (executable, args) =>
  spawnSync(executable, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })

/** Routes forge conformance without evaluating event data through a shell. */
export const routeForgeConformance = (
  environment: ForgeConformanceEnvironment,
  runGit: GitRunner = defaultGitRunner,
): ForgeConformanceDecision => {
  const eventName = environment.EVENT_NAME ?? ''
  const eventAction = environment.EVENT_ACTION ?? ''
  const labelName = environment.LABEL_NAME ?? ''
  const overrideLabel = environment.OVERRIDE_LABEL ?? 'ci:forge-conformance'

  if (eventName === 'pull_request' && eventAction === 'labeled') {
    if (labelName === overrideLabel) {
      return {
        shouldRun: true,
        reason: `override label ${overrideLabel} was added`,
      }
    }
  }

  if (
    eventName === 'pull_request' &&
    environment.HAS_OVERRIDE_LABEL === 'true'
  ) {
    return {
      shouldRun: true,
      reason: `pull request has override label ${overrideLabel}`,
    }
  }

  const baseSha =
    eventName === 'pull_request'
      ? (environment.PR_BASE_SHA ?? '')
      : (environment.PUSH_BEFORE_SHA ?? '')
  if (!baseSha || isZeroSha(baseSha)) {
    return failOpen('Base SHA is missing or zero; running forge conformance')
  }

  const baseResult = runGit('git', ['cat-file', '-e', `${baseSha}^{commit}`])
  if (baseResult.error || baseResult.status !== 0) {
    return failOpen('Base SHA is invalid; running forge conformance')
  }

  const diffResult = runGit('git', [
    'diff',
    '--quiet',
    '--no-renames',
    baseSha,
    'HEAD',
    '--',
    ...FORGE_CONFORMANCE_PATHSPECS,
  ])
  if (diffResult.error || diffResult.status === null) {
    return failOpen('git diff failed to execute; running forge conformance')
  }
  if (diffResult.status === 0) {
    const lockDiff = runGit('git', [
      'diff',
      '--quiet',
      '--no-renames',
      baseSha,
      'HEAD',
      '--',
      'package-lock.json',
    ])
    if (lockDiff.error || (lockDiff.status !== 0 && lockDiff.status !== 1))
      return failOpen('Lockfile diff failed; running forge conformance')
    if (lockDiff.status === 1) {
      try {
        const readLock = (revision: string) => {
          const result = runGit('git', [
            'show',
            `${revision}:package-lock.json`,
          ])
          if (result.error || result.status !== 0 || !result.stdout)
            throw new Error(`Cannot read lockfile at ${revision}`)
          return forgeLockPackages(result.stdout)
        }
        if (!isDeepStrictEqual(readLock(baseSha), readLock('HEAD')))
          return { shouldRun: true, reason: 'forge dependencies changed' }
      } catch {
        return failOpen('Lockfile inspection failed; running forge conformance')
      }
    }
    return {
      shouldRun: false,
      reason: 'no relevant files or dependencies changed',
    }
  }
  if (diffResult.status === 1) {
    return { shouldRun: true, reason: 'relevant files changed' }
  }
  return failOpen(
    `git diff failed with status ${diffResult.status}; running forge conformance`,
  )
}

/** Writes the workflow output and human-readable routing diagnostics. */
export const emitForgeConformanceDecision = (
  decision: ForgeConformanceDecision,
  outputPath: string,
  effects: {
    appendFileSync: typeof appendFileSync
    log: (message: string) => void
    warn: (message: string) => void
  } = {
    appendFileSync,
    log: console.log,
    warn: console.warn,
  },
) => {
  effects.appendFileSync(
    outputPath,
    `should-run=${decision.shouldRun ? 'true' : 'false'}\n`,
  )
  if (decision.warning) effects.warn(`::warning::${decision.warning}`)
  effects.log(
    `Forge conformance should-run=${decision.shouldRun ? 'true' : 'false'}: ${decision.reason}`,
  )
}

const main = () => {
  const outputPath = process.env.GITHUB_OUTPUT
  if (!outputPath) throw new Error('GITHUB_OUTPUT is required')
  emitForgeConformanceDecision(routeForgeConformance(process.env), outputPath)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
