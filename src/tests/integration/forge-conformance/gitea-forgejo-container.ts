import { createWriteStream, mkdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers'
import type { ForgeConformanceFixture } from './contract.ts'

export type RestForgeFlavor = 'gitea' | 'forgejo'

const FORGES = {
  gitea: {
    image:
      'gitea/gitea:1.27.1@sha256:34e3f6b75f5cbb6aebce588037fc5a53c84213e4d4b00da0a8d73e031a558e52',
    binary: 'gitea',
    environmentPrefix: 'GITEA',
    expectedVersion: '1.27.1',
  },
  forgejo: {
    image:
      'data.forgejo.org/forgejo/forgejo:16.0.2@sha256:2fdfe28b5c68f82f49580e227b84e2afb43af0250e0631a54a386ef3b1d9b759',
    binary: 'forgejo',
    environmentPrefix: 'FORGEJO',
    expectedVersion: '16.0.2',
  },
} as const

const PORT = 3000
const OWNER = 'rdadmin'
const NEWCOMER = 'newcomer'
const REPOSITORY = 'conformance'
const PASSWORD = 'Passw0rd123!'
const CONFIG = 'template: "$CHANGES"\n'

type JsonObject = Record<string, unknown>

export type RestForgeFixture = ForgeConformanceFixture & {
  flavor: RestForgeFlavor
  serverUrl: string
  apiUrl: string
  token: string
  version: string
  config: string
}

const responseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(
      `${response.url} returned ${response.status}: ${text.slice(0, 1_000)}`,
    )
  }
  return (text ? JSON.parse(text) : undefined) as T
}

const authenticatedFetch = (
  fixture: Pick<RestForgeFixture, 'apiUrl' | 'token'>,
  path: string,
  init: RequestInit = {},
) =>
  fetch(`${fixture.apiUrl}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/json',
      Authorization: `token ${fixture.token}`,
      ...(init.body === undefined
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
  })

export const forgeApi = async <T>(
  fixture: Pick<RestForgeFixture, 'apiUrl' | 'token'>,
  path: string,
  init: RequestInit = {},
) => responseJson<T>(await authenticatedFetch(fixture, path, init))

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

export const startRestForge = async (flavor: RestForgeFlavor) => {
  const forge = FORGES[flavor]
  const prefix = forge.environmentPrefix
  const artifactsDirectory = resolve(
    process.env.REST_FORGE_TEST_ARTIFACTS ?? `artifacts/${flavor}`,
  )
  const containerLogPath = join(artifactsDirectory, 'container.log')
  mkdirSync(artifactsDirectory, { recursive: true })
  rmSync(containerLogPath, { force: true })

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
    const runningContainer = await new GenericContainer(forge.image)
      .withExposedPorts(PORT)
      // Match GitHub's public-runner CPU shape during local verification.
      .withResourcesQuota({ cpu: 4 })
      // Keep PR-check work on overlay storage; only SQLite is safe on tmpfs.
      .withTmpFs({
        '/var/lib/forge-test-db':
          'rw,nosuid,nodev,size=128m,uid=1000,gid=1000,mode=0700',
      })
      .withEnvironment({
        [`${prefix}__database__DB_TYPE`]: 'sqlite3',
        [`${prefix}__database__PATH`]: '/var/lib/forge-test-db/gitea.db',
        // Avoid a Gitea race between base-branch rechecks and saving a merge.
        [`${prefix}__repository.pull-request__DELAY_CHECK_FOR_INACTIVE_DAYS`]:
          '0',
        [`${prefix}__security__INSTALL_LOCK`]: 'true',
        [`${prefix}__server__HTTP_PORT`]: String(PORT),
        [`${prefix}__log__LEVEL`]: 'warn',
      })
      .withWaitStrategy(
        Wait.forHttp('/api/v1/version', PORT).forStatusCode(200),
      )
      .withStartupTimeout(180_000)
      .start()
    container = runningContainer

    const serverUrl = `http://${runningContainer.getHost()}:${runningContainer.getMappedPort(PORT)}`
    const apiUrl = `${serverUrl}/api/v1`

    const createUser = async (username: string, admin: boolean) => {
      const command = [
        forge.binary,
        'admin user create',
        `--username ${username}`,
        `--password '${PASSWORD}'`,
        `--email ${username}@example.com`,
        '--must-change-password=false',
        admin ? '--admin' : '',
      ]
        .filter(Boolean)
        .join(' ')
      const result = await runningContainer.exec([
        '/bin/sh',
        '-c',
        `su git -c "${command}"`,
      ])
      if (result.exitCode !== 0) {
        throw new Error(`Could not create ${username}: ${result.output}`)
      }
    }

    await createUser(OWNER, true)
    await createUser(NEWCOMER, false)

    const mintToken = async (username: string) => {
      const response = await responseJson<{ sha1?: string; sha?: string }>(
        await fetch(`${apiUrl}/users/${username}/tokens`, {
          method: 'POST',
          signal: AbortSignal.timeout(15_000),
          headers: {
            Accept: 'application/json',
            Authorization: `Basic ${Buffer.from(`${username}:${PASSWORD}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'release-drafter-conformance',
            scopes: ['all'],
          }),
        }),
      )
      const token = response.sha1 ?? response.sha
      if (!token) throw new Error(`${flavor} returned a blank API token`)
      return token
    }

    const token = await mintToken(OWNER)
    const newcomerToken = await mintToken(NEWCOMER)
    const client = { apiUrl, token }
    const newcomerClient = { apiUrl, token: newcomerToken }
    const api = <T>(path: string, body?: unknown, method = 'POST') =>
      forgeApi<T>(client, path, {
        method: body === undefined && method === 'POST' ? 'GET' : method,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    const newcomerApi = <T>(path: string, body: unknown, method = 'POST') =>
      forgeApi<T>(newcomerClient, path, {
        method,
        body: JSON.stringify(body),
      })

    const waitForChangedFile = async (
      pullNumber: number,
      expectedFile: string,
    ) => {
      let lastFiles: Array<{ filename?: string }> = []
      for (let attempt = 0; attempt < 120; attempt += 1) {
        lastFiles = await api<Array<{ filename?: string }>>(
          `${repoPath}/pulls/${pullNumber}/files`,
        )
        if (lastFiles.some(({ filename }) => filename === expectedFile)) return
        await sleep(250)
      }
      const pull = await api<{
        merge_base?: string
        mergeable?: boolean | null
        merged?: boolean
        state?: string
      }>(`${repoPath}/pulls/${pullNumber}`)
      throw new Error(
        `Pull request #${pullNumber} changed files never became available: ${JSON.stringify({ files: lastFiles, pull })}`,
      )
    }

    const merge = async (pullNumber: number) => {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const response = await authenticatedFetch(
          client,
          `/repos/${OWNER}/${REPOSITORY}/pulls/${pullNumber}/merge`,
          {
            method: 'POST',
            body: JSON.stringify({ Do: 'merge' }),
          },
        )
        if (response.ok) return
        const text = await response.text()
        if (response.status !== 405) {
          throw new Error(
            `Could not merge pull request #${pullNumber}: ${response.status} ${text}`,
          )
        }
        await sleep(500)
      }
      throw new Error(`Pull request #${pullNumber} never became mergeable`)
    }

    const version = (
      await responseJson<{ version: string }>(
        await fetch(`${apiUrl}/version`, {
          signal: AbortSignal.timeout(15_000),
        }),
      )
    ).version
    if (!version.startsWith(forge.expectedVersion)) {
      throw new Error(
        `Expected ${flavor} ${forge.expectedVersion}, but the container reported ${version}`,
      )
    }

    await api('/user/repos', {
      name: REPOSITORY,
      auto_init: true,
      default_branch: 'main',
      private: false,
    })
    const repoPath = `/repos/${OWNER}/${REPOSITORY}`

    await api(`${repoPath}/branches`, {
      new_branch_name: 'groundwork',
      old_branch_name: 'main',
    })
    await api(`${repoPath}/contents/groundwork.txt`, {
      branch: 'groundwork',
      content: Buffer.from('groundwork').toString('base64'),
      message: 'add groundwork',
    })
    const groundwork = await api<{ number: number }>(`${repoPath}/pulls`, {
      base: 'main',
      head: 'groundwork',
      title: 'Groundwork before baseline',
    })
    await merge(groundwork.number)

    await api(
      `${repoPath}/contents/${encodeURIComponent('.github/release-drafter.yml')}`,
      {
        branch: 'main',
        content: Buffer.from(CONFIG).toString('base64'),
        message: 'add release drafter config',
      },
    )
    const baseline = await api<JsonObject>(`${repoPath}/releases`, {
      tag_name: 'v1.0.0',
      target_commitish: 'main',
      name: 'Baseline',
      body: 'Baseline release',
      draft: false,
      prerelease: false,
    })
    const baselineCommit = await api<{ sha: string }>(
      `${repoPath}/git/commits/v1.0.0`,
    )

    await api(
      `${repoPath}/collaborators/${NEWCOMER}`,
      { permission: 'write' },
      'PUT',
    )
    await newcomerApi(`${repoPath}/branches`, {
      new_branch_name: 'feature',
      old_branch_name: 'main',
    })
    await newcomerApi(`${repoPath}/contents/feature.txt`, {
      branch: 'feature',
      content: Buffer.from('conformance feature').toString('base64'),
      message: 'add conformance feature',
    })
    const label = await api<{ id: number }>(`${repoPath}/labels`, {
      name: 'feature',
      color: '00aabb',
    })
    const openedPull = await newcomerApi<{ number: number }>(
      `${repoPath}/pulls`,
      {
        base: 'main',
        head: 'feature',
        title: 'Add conformance feature',
        body: 'Conformance pull request body',
      },
    )
    await api(`${repoPath}/issues/${openedPull.number}/labels`, {
      labels: [label.id],
    })
    const beforeMerge = await api<{
      head: { sha: string }
    }>(`${repoPath}/pulls/${openedPull.number}`)
    await waitForChangedFile(openedPull.number, 'feature.txt')
    await merge(openedPull.number)
    await waitForChangedFile(openedPull.number, 'feature.txt')
    const pull = await api<{
      number: number
      merge_commit_sha: string
      html_url: string
    }>(`${repoPath}/pulls/${openedPull.number}`)

    const fixture: RestForgeFixture = {
      flavor,
      serverUrl,
      apiUrl,
      token,
      version,
      config: CONFIG,
      repository: { owner: OWNER, name: REPOSITORY, serverUrl },
      baselineRelease: {
        id: baseline.id as string | number,
        tagName: 'v1.0.0',
        name: 'Baseline',
        targetCommitish: 'main',
        draft: false,
        prerelease: false,
      },
      commitishCases: [
        { commitish: 'main', expected: 'main' },
        {
          commitish: 'refs/heads/main',
          expected: flavor === 'forgejo' ? 'refs/heads/main' : 'main',
        },
        { commitish: baselineCommit.sha, expected: baselineCommit.sha },
        {
          commitish: 'refs/tags/v1.0.0',
          expected:
            flavor === 'forgejo' ? 'refs/tags/v1.0.0' : baselineCommit.sha,
        },
        {
          commitish: `refs/pull/${pull.number}/head`,
          expected: beforeMerge.head.sha,
        },
        {
          commitish: `refs/pull/${pull.number}/merge`,
          expected: pull.merge_commit_sha,
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
        expectedCommitOids: [beforeMerge.head.sha, pull.merge_commit_sha],
        expectedPullRequests: [
          {
            number: pull.number,
            title: 'Add conformance feature',
            body: 'Conformance pull request body',
            url: pull.html_url,
            baseRefName: 'main',
            headRefName: 'feature',
            baseRepository: `${OWNER}/${REPOSITORY}`,
            isCrossRepository: false,
            author: { login: NEWCOMER },
            labels: ['feature'],
            changedFiles: ['feature.txt'],
            mergeCommitOid: pull.merge_commit_sha,
          },
        ],
        expectedNewContributorLogins: [NEWCOMER],
      },
      createPayload: {
        name: 'Conformance draft',
        tag: 'v2.0.0-conformance',
        body: 'Created by ForgeAdapter conformance',
        targetCommitish: 'main',
        prerelease: true,
        makeLatest: false,
        draft: true,
      },
      expectedCreatedRelease: {
        tagName: 'v2.0.0-conformance',
        name: 'Conformance draft',
        targetCommitish: 'main',
        prerelease: true,
        draft: true,
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
        targetCommitish: 'main',
        prerelease: false,
        draft: false,
      },
    }

    return {
      fixture,
      stop: (options: { collectLogs?: boolean } = {}) =>
        stopContainer(options.collectLogs),
    }
  } catch (error) {
    await stopContainer(true).catch(() => {})
    throw error
  }
}
