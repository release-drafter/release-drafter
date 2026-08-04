import { spawnSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const FORGE_CONFORMANCE_PATHSPECS = [
  '.github/workflows/ci.yml',
  '.github/workflows/forge-conformance.yml',
  '.node-version',
  'package.json',
  'package-lock.json',
  ':(glob)tsconfig*.json',
  ':(glob)vite*.config.ts',
  ':(glob)vitest*.config.ts',
  ':(glob)src/**',
  ':(glob)packages/*/src/**',
  ':(glob)packages/*/package.json',
  ':(glob)packages/*/tsconfig*.json',
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
) => { status: number | null; error?: Error }

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
  spawnSync(executable, args, { stdio: 'ignore' })

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
    return {
      shouldRun: false,
      reason: `labeled event was for ${labelName}`,
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
    return { shouldRun: false, reason: 'no relevant files changed' }
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
