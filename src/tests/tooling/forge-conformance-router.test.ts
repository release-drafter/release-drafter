import type { SpawnSyncReturns } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import {
  emitForgeConformanceDecision,
  FORGE_CONFORMANCE_PATHSPECS,
  type ForgeConformanceEnvironment,
  type GitRunner,
  routeForgeConformance,
} from '../../scripts/forge-conformance-router.ts'

const baseEnvironment: ForgeConformanceEnvironment = {
  EVENT_NAME: 'pull_request',
  EVENT_ACTION: 'synchronize',
  LABEL_NAME: '',
  OVERRIDE_LABEL: 'ci:forge-conformance',
  HAS_OVERRIDE_LABEL: 'false',
  PR_BASE_SHA: 'abc123',
  PUSH_BEFORE_SHA: '',
}

const result = (
  status: number | null,
  error?: Error,
): SpawnSyncReturns<Buffer> =>
  ({
    pid: 1,
    output: [null, Buffer.alloc(0), Buffer.alloc(0)],
    stdout: Buffer.alloc(0),
    stderr: Buffer.alloc(0),
    status,
    signal: null,
    ...(error ? { error } : {}),
  }) as SpawnSyncReturns<Buffer>

const gitRunner = (...statuses: Array<number | null>) => {
  const run = vi.fn<GitRunner>()
  for (const status of statuses) run.mockReturnValueOnce(result(status))
  return run
}

describe('forge conformance router', () => {
  it.each([
    ['pull request relevant diff', baseEnvironment, [0, 1], true],
    ['pull request irrelevant diff', baseEnvironment, [0, 0], false],
    [
      'push relevant diff',
      {
        ...baseEnvironment,
        EVENT_NAME: 'push',
        PR_BASE_SHA: '',
        PUSH_BEFORE_SHA: 'def456',
      },
      [0, 1],
      true,
    ],
    [
      'push irrelevant diff',
      {
        ...baseEnvironment,
        EVENT_NAME: 'push',
        PR_BASE_SHA: '',
        PUSH_BEFORE_SHA: 'def456',
      },
      [0, 0],
      false,
    ],
  ])('routes a %s', (_name, environment, statuses, shouldRun) => {
    expect(
      routeForgeConformance(environment, gitRunner(...statuses)),
    ).toMatchObject({ shouldRun })
  })

  it('runs only for the exact override label on labeled events', () => {
    const runGit = gitRunner()

    expect(
      routeForgeConformance(
        {
          ...baseEnvironment,
          EVENT_ACTION: 'labeled',
          LABEL_NAME: 'ci:forge-conformance',
        },
        runGit,
      ),
    ).toEqual({
      shouldRun: true,
      reason: 'override label ci:forge-conformance was added',
    })
    expect(runGit).not.toHaveBeenCalled()
  })

  it('suppresses unrelated labeled events even when the override label already exists', () => {
    const runGit = gitRunner()

    expect(
      routeForgeConformance(
        {
          ...baseEnvironment,
          EVENT_ACTION: 'labeled',
          LABEL_NAME: 'documentation',
          HAS_OVERRIDE_LABEL: 'true',
        },
        runGit,
      ),
    ).toEqual({
      shouldRun: false,
      reason: 'labeled event was for documentation',
    })
    expect(runGit).not.toHaveBeenCalled()
  })

  it('runs non-labeled pull request events when the override label exists', () => {
    const runGit = gitRunner()

    expect(
      routeForgeConformance(
        { ...baseEnvironment, HAS_OVERRIDE_LABEL: 'true' },
        runGit,
      ),
    ).toEqual({
      shouldRun: true,
      reason: 'pull request has override label ci:forge-conformance',
    })
    expect(runGit).not.toHaveBeenCalled()
  })

  it.each([
    '',
    '0'.repeat(40),
  ])('fails open for a missing or zero base SHA (%s)', (baseSha) => {
    const runGit = gitRunner()

    expect(
      routeForgeConformance(
        { ...baseEnvironment, PR_BASE_SHA: baseSha },
        runGit,
      ),
    ).toMatchObject({ shouldRun: true, warning: expect.any(String) })
    expect(runGit).not.toHaveBeenCalled()
  })

  it.each([
    ['invalid base', [2]],
    ['diff status greater than one', [0, 2]],
    ['git process error', [0, null]],
  ])('fails open for %s', (_name, statuses) => {
    expect(
      routeForgeConformance(baseEnvironment, gitRunner(...statuses)),
    ).toMatchObject({
      shouldRun: true,
      reason: 'changed-file detection failed open',
      warning: expect.any(String),
    })
  })

  it('uses the exact fixed git pathspec arguments without a shell', () => {
    const runGit = gitRunner(0, 0)

    routeForgeConformance(baseEnvironment, runGit)

    expect(runGit).toHaveBeenNthCalledWith(1, 'git', [
      'cat-file',
      '-e',
      'abc123^{commit}',
    ])
    expect(runGit).toHaveBeenNthCalledWith(2, 'git', [
      'diff',
      '--quiet',
      '--no-renames',
      'abc123',
      'HEAD',
      '--',
      ...FORGE_CONFORMANCE_PATHSPECS,
    ])
    expect(FORGE_CONFORMANCE_PATHSPECS).toEqual([
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
    ])
  })

  it('appends the GitHub output and reports the decision and warning', () => {
    const appendFileSync = vi.fn()
    const log = vi.fn()
    const warn = vi.fn()

    emitForgeConformanceDecision(
      {
        shouldRun: true,
        reason: 'changed-file detection failed open',
        warning: 'git diff failed with status 2; running forge conformance',
      },
      '/tmp/github-output',
      { appendFileSync, log, warn },
    )

    expect(appendFileSync).toHaveBeenCalledWith(
      '/tmp/github-output',
      'should-run=true\n',
    )
    expect(warn).toHaveBeenCalledWith(
      '::warning::git diff failed with status 2; running forge conformance',
    )
    expect(log).toHaveBeenCalledWith(
      'Forge conformance should-run=true: changed-file detection failed open',
    )
  })
})
