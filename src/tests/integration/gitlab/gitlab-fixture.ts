import { createWriteStream, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { Repository } from '@release-drafter/core'
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers'
import type { ForgeConformanceFixture } from '../forge-conformance/contract.ts'
import { GITLAB_IMAGE } from './gitlab-image.ts'

// The image's documented root token for disposable test instances.
const GITLAB_TOKEN = 'glpat-gitlab-ce-warm-root-token'
const SEED_PATH = '/etc/gitlab-ce-warm/seed.json'

const HTTP_PORT = 8181
const STARTUP_TIMEOUT_MS = 5 * 60_000
const artifactsDirectory = resolve(
  process.env.GITLAB_TEST_ARTIFACTS ?? 'artifacts/gitlab',
)

/** Identifiers generated when the image seeded the conformance project. */
type GitLabSeed = {
  baseCommit: string
  headCommit: string
  mergeRequestNumber: number
  mergeCommit: string
  mergeRequestUrl: string
  mergedAt: string | null
}

export type GitLabFixture = {
  token: string
  serverUrl: string
  repository: Repository
  conformance: ForgeConformanceFixture
  configPath: string
  stop(options?: { collectLogs?: boolean }): Promise<void>
}

export const startGitLabFixture = async (): Promise<GitLabFixture> => {
  mkdirSync(artifactsDirectory, { recursive: true })
  const containerLogPath = join(artifactsDirectory, 'container.log')
  rmSync(containerLogPath, { force: true })
  const startedAt = performance.now()
  let container: StartedTestContainer | undefined

  const stopContainer = async (collectLogs = false) => {
    if (!container) return
    if (!collectLogs) {
      await container.stop()
      return
    }

    const logs = await container.logs()
    const writeLogs = pipeline(logs, createWriteStream(containerLogPath))
    try {
      await container.stop()
      await writeLogs
    } catch (error) {
      logs.destroy()
      await writeLogs.catch(() => {})
      throw error
    }
  }

  try {
    container = await new GenericContainer(GITLAB_IMAGE)
      .withExposedPorts(HTTP_PORT)
      .withWaitStrategy(
        Wait.forAll([
          Wait.forSuccessfulCommand(
            `curl --fail --silent http://127.0.0.1:${HTTP_PORT}/-/health | grep --quiet 'GitLab OK'`,
          ),
          Wait.forSuccessfulCommand(
            `curl --fail --silent 'http://127.0.0.1:${HTTP_PORT}/-/readiness?all=1' >/dev/null`,
          ),
        ]),
      )
      .withStartupTimeout(STARTUP_TIMEOUT_MS)
      .start()

    const seedResult = await container.exec(['cat', SEED_PATH])
    if (seedResult.exitCode !== 0) {
      throw new Error(`Cannot read ${SEED_PATH}: ${seedResult.output}`)
    }
    const seed = JSON.parse(seedResult.stdout) as GitLabSeed
    const serverUrl = `http://${container.getHost()}:${container.getMappedPort(HTTP_PORT)}`
    console.log(
      `GitLab started in ${((performance.now() - startedAt) / 1_000).toFixed(1)}s`,
    )
    const repository: Repository = {
      owner: 'release-drafter-tests/nested-fixtures',
      name: 'forge-conformance',
      serverUrl,
    }

    writeFileSync(
      join(artifactsDirectory, 'metadata.json'),
      `${JSON.stringify(
        {
          image: GITLAB_IMAGE,
          containerId: container.getId(),
          serverUrl,
          repository: `${repository.owner}/${repository.name}`,
        },
        null,
        2,
      )}\n`,
    )

    return {
      token: GITLAB_TOKEN,
      serverUrl,
      repository,
      conformance: {
        repository,
        baselineRelease: {
          id: 'v1.0.0',
          tagName: 'v1.0.0',
          name: 'Version 1.0.0',
          draft: false,
          prerelease: false,
        },
        commitishCases: [
          { commitish: 'main', expected: 'main' },
          { commitish: 'refs/heads/main', expected: 'main' },
          { commitish: seed.baseCommit, expected: seed.baseCommit },
          { commitish: 'refs/tags/v1.0.0', expected: seed.baseCommit },
          {
            commitish: `refs/merge-requests/${seed.mergeRequestNumber}/head`,
            expected: seed.headCommit,
          },
          {
            commitish: `refs/merge-requests/${seed.mergeRequestNumber}/merge`,
            expected: seed.mergeCommit,
          },
        ],
        findChanges: {
          comparison: { baseRef: 'v1.0.0', headRef: 'main' },
          pullRequestFields: {
            body: true,
            url: true,
            baseRefName: true,
            headRefName: true,
          },
          pullRequestLimit: 20,
          historyLimit: 20,
          includeChangedFiles: true,
          includeNewContributors: true,
          expectedCommitOids: [seed.headCommit, seed.mergeCommit],
          expectedPullRequests: [
            {
              number: seed.mergeRequestNumber,
              title: 'feat: exercise forge conformance',
              body: 'Exercises normalized change discovery against GitLab.',
              url: seed.mergeRequestUrl,
              mergedAt: seed.mergedAt,
              baseRefName: 'main',
              headRefName: 'feature/conformance',
              baseRepository: `${repository.owner}/${repository.name}`,
              isCrossRepository: false,
              author: { login: 'root' },
              labels: ['feature', 'integration'],
              changedFiles: ['README.md', 'src/feature.ts'],
              mergeCommitOid: seed.mergeCommit,
            },
          ],
          expectedNewContributorLogins: ['root'],
        },
        createPayload: {
          name: 'Conformance release',
          tag: 'v2.0.0-conformance',
          body: 'Created by ForgeAdapter conformance',
          targetCommitish: 'main',
          prerelease: false,
          makeLatest: false,
          draft: false,
        },
        expectedCreatedRelease: {
          tagName: 'v2.0.0-conformance',
          name: 'Conformance release',
          prerelease: false,
          draft: false,
        },
        updatePayload: {
          name: 'Updated conformance release',
          tag: 'v2.0.0-conformance',
          body: 'Updated by ForgeAdapter conformance',
          targetCommitish: 'main',
          prerelease: false,
          makeLatest: false,
          draft: false,
        },
        expectedUpdatedRelease: {
          tagName: 'v2.0.0-conformance',
          name: 'Updated conformance release',
          prerelease: false,
          draft: false,
        },
      },
      configPath: '.github/release-drafter.yml',
      async stop({ collectLogs = false } = {}) {
        await stopContainer(collectLogs)
      },
    }
  } catch (error) {
    await stopContainer(true).catch(() => {})
    throw error
  }
}
