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

const FORGE_TEST_TOOLS = ['vitest', 'vite', 'testcontainers'] as const
export const CONFORMANCE_FORGES = ['gitea', 'forgejo', 'gitlab'] as const
export type ConformanceForge = (typeof CONFORMANCE_FORGES)[number]
const TARGETED_BRANCH_PREFIX = 'ci/'
const FORGE_MANIFESTS = [
  'package.json',
  ...FORGE_WORKSPACES.map((workspace) => `packages/${workspace}/package.json`),
]

export const FORGE_CONFORMANCE_PATHSPECS = [
  '.github/workflows/ci.yml',
  '.node-version',
  '.npmrc',
  ':(glob)tsconfig*.json',
  'vitest.forge.config.ts',
  'vitest.gitlab.config.ts',
  ':(glob)src/tests/integration/forge-conformance/**',
  ':(glob)src/tests/integration/gitlab/**',
  'src/scripts/forge-conformance-router.ts',
  ...FORGE_WORKSPACES.flatMap((workspace) => [
    `:(glob)packages/${workspace}/src/**`,
    `:(glob)packages/${workspace}/tsconfig*.json`,
  ]),
  ':(exclude,glob)packages/*/src/**/*.test.ts',
  ':(exclude)packages/release-drafter/src/cli.ts',
  ':(exclude)src/tests/integration/forge-conformance/github.test.ts',
] as const

export type ForgeConformanceEnvironment = {
  EVENT_NAME?: string
  HEAD_REF?: string
  PR_BASE_SHA?: string
  PUSH_BEFORE_SHA?: string
  REF_NAME?: string
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
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  link?: boolean
  resolved?: string
  dev?: boolean
}

type Manifest = LockPackage & Record<string, unknown>

/** Compare only package settings used to install, resolve, or run these suites. */
const forgeManifest = (path: string, manifest: Manifest) => {
  if (path === 'package.json') {
    const scripts = manifest.scripts as Record<string, string> | undefined
    return {
      type: manifest.type,
      imports: manifest.imports,
      workspaces: manifest.workspaces,
      engines: manifest.engines,
      overrides: manifest.overrides,
      scripts: Object.fromEntries(
        ['gitea', 'forgejo', 'gitea-forgejo', 'gitlab'].map((forge) => {
          const name = `test:conformance:${forge}`
          return [name, scripts?.[name]]
        }),
      ),
      testTools: Object.fromEntries(
        FORGE_TEST_TOOLS.map((name) => [
          name,
          manifest.devDependencies?.[name],
        ]),
      ),
    }
  }
  return {
    name: manifest.name,
    type: manifest.type,
    exports: manifest.exports,
    imports: manifest.imports,
    engines: manifest.engines,
    dependencies: manifest.dependencies,
    optionalDependencies: manifest.optionalDependencies,
    peerDependencies: manifest.peerDependencies,
    peerDependenciesMeta: manifest.peerDependenciesMeta,
  }
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
  const visit = (path: string) => {
    if (selected.has(path)) return
    const entry = packages[path]
    if (!entry) throw new Error(`Missing lockfile package ${path}`)
    // An unrelated workspace can change npm's dev classification through hoisting.
    const { dev: _dev, devDependencies: _devDependencies, ...identity } = entry
    // Manifest checks cover workspace requirements; compare their resolutions here.
    selected.set(
      path,
      path.startsWith('packages/') && !path.includes('/node_modules/')
        ? {}
        : identity,
    )
    if (entry.link) {
      if (!entry.resolved) throw new Error(`Missing workspace target ${path}`)
      visit(entry.resolved)
      return
    }
    // The suites use Node with coverage disabled. Optional peer integrations
    // (browser runners, coverage, CSS preprocessors, type packages) are unused.
    const peers = Object.fromEntries(
      Object.entries(entry.peerDependencies ?? {}).filter(
        ([name]) => !entry.peerDependenciesMeta?.[name]?.optional,
      ),
    )
    for (const name of Object.keys({
      ...entry.dependencies,
      ...entry.optionalDependencies,
      ...peers,
    })) {
      let dependency: string
      try {
        dependency = resolve(path, name)
      } catch (error) {
        if (name in (entry.optionalDependencies ?? {})) continue
        throw error
      }
      visit(dependency)
    }
  }

  for (const name of FORGE_TEST_TOOLS) visit(resolve('', name))
  for (const workspace of FORGE_WORKSPACES) visit(`packages/${workspace}`)
  return selected
}

export type ForgeConformanceDecision = {
  shouldRun: boolean
  reason: string
  warning?: string
  /** Forges to test when running; defaults to every conformance forge. */
  forges?: ConformanceForge[]
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
  const refName = environment.REF_NAME ?? ''

  // Pushes to ci/ branches iterate on forge test infrastructure before a pull
  // request exists, so the branch name selects the forges to run.
  if (eventName === 'push' && refName.startsWith(TARGETED_BRANCH_PREFIX)) {
    const branch = refName.toLowerCase()
    const forges = CONFORMANCE_FORGES.filter((forge) => branch.includes(forge))
    return forges.length > 0
      ? {
          shouldRun: true,
          reason: `branch ${refName} targets ${forges.join(', ')}`,
          forges,
        }
      : {
          shouldRun: false,
          reason: `branch ${refName} does not name a conformance forge`,
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
    const inputDiff = runGit('git', [
      'diff',
      '--name-only',
      '--no-renames',
      baseSha,
      'HEAD',
      '--',
      'package-lock.json',
      ...FORGE_MANIFESTS,
    ])
    if (
      inputDiff.error ||
      inputDiff.status !== 0 ||
      inputDiff.stdout === undefined
    )
      return failOpen('Dependency input diff failed; running forge conformance')
    const changedInputs = inputDiff.stdout.trim().split('\n').filter(Boolean)
    if (changedInputs.length > 0) {
      try {
        const readFile = (revision: string, path: string) => {
          const result = runGit('git', ['show', `${revision}:${path}`])
          if (result.error || result.status !== 0 || !result.stdout)
            throw new Error(`Cannot read ${path} at ${revision}`)
          return result.stdout
        }
        for (const path of changedInputs) {
          if (path === 'package-lock.json') {
            if (
              !isDeepStrictEqual(
                forgeLockPackages(readFile(baseSha, path)),
                forgeLockPackages(readFile('HEAD', path)),
              )
            )
              return { shouldRun: true, reason: 'forge dependencies changed' }
          } else if (FORGE_MANIFESTS.includes(path)) {
            if (
              !isDeepStrictEqual(
                forgeManifest(path, JSON.parse(readFile(baseSha, path))),
                forgeManifest(path, JSON.parse(readFile('HEAD', path))),
              )
            )
              return {
                shouldRun: true,
                reason: 'forge package settings changed',
              }
          } else {
            throw new Error(`Unexpected dependency input ${path}`)
          }
        }
      } catch {
        return failOpen(
          'Dependency input inspection failed; running forge conformance',
        )
      }
    }
    // PR branch names add coverage only after automatic detection finds no
    // relevant changes. Relevant changes and inspection failures run all forges.
    const headRef = environment.HEAD_REF ?? ''
    if (
      eventName === 'pull_request' &&
      headRef.startsWith(TARGETED_BRANCH_PREFIX)
    ) {
      const branch = headRef.toLowerCase()
      const forges = CONFORMANCE_FORGES.filter((forge) =>
        branch.includes(forge),
      )
      if (forges.length > 0) {
        return {
          shouldRun: true,
          reason: `branch ${headRef} targets ${forges.join(', ')}`,
          forges,
        }
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
    `should-run=${decision.shouldRun ? 'true' : 'false'}\nforges=${JSON.stringify(decision.forges ?? CONFORMANCE_FORGES)}\n`,
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
