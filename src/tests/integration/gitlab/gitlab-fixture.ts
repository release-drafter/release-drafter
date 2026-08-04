import { randomBytes } from 'node:crypto'
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { type Readable, Transform } from 'node:stream'
import { finished } from 'node:stream/promises'
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers'
import {
  createForgeAdapter,
  type ForgeAdapter,
  type Release,
  type Repository,
} from '../../../../packages/release-drafter/src/index.ts'
import type { ForgeConformanceFixture } from '../forge-conformance/contract.ts'

export const GITLAB_IMAGE =
  'gitlab/gitlab-ce:19.1.3-ce.0@sha256:d160bc91d3a112fdcaead0ecd76076e3371677c1314f266d9c26b5c3d3363db1'

const HTTP_PORT = 80
const STARTUP_TIMEOUT_MS = 15 * 60_000
const REQUEST_TIMEOUT_MS = 30_000
const artifactsDirectory = resolve(
  process.env.GITLAB_TEST_ARTIFACTS ?? 'artifacts/gitlab',
)

const sleep = (milliseconds: number) =>
  new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds))

const redact = (value: string, ...secrets: readonly string[]) =>
  secrets.reduce(
    (redacted, secret) => redacted.replaceAll(secret, '[REDACTED]'),
    value,
  )

const createSecretRedactor = (secrets: readonly string[]) => {
  const longestSecret = Math.max(...secrets.map(({ length }) => length))
  let pending = ''

  return new Transform({
    transform(chunk, _encoding, callback) {
      const combined = pending + chunk.toString()
      let emitLength = Math.max(0, combined.length - longestSecret + 1)
      for (const secret of secrets) {
        const start = combined.lastIndexOf(secret, emitLength - 1)
        if (start >= 0 && start + secret.length > emitLength) emitLength = start
      }
      pending = combined.slice(emitLength)
      callback(null, redact(combined.slice(0, emitLength), ...secrets))
    },
    flush(callback) {
      callback(null, redact(pending, ...secrets))
    },
  })
}

type GitLabProject = {
  id: number
  default_branch: string
  path_with_namespace: string
}

type GitLabCommit = { id: string }
type GitLabMergeRequest = {
  iid: number
  state: string
  sha: string
  merge_commit_sha: string | null
  merged_at: string | null
  web_url: string
}
type GitLabGroup = { id: number }
type GitLabRelease = { description: string }

class GitLabApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    acceptedStatuses: readonly number[] = [200, 201],
  ): Promise<T> {
    let lastFailure = ''
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const response = await fetch(`${this.baseUrl}/api/v4${path}`, {
          method,
          redirect: 'manual',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: {
            Accept: 'application/json',
            'Private-Token': this.token,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        })
        const text = await response.text()
        if (acceptedStatuses.includes(response.status)) {
          return (text ? JSON.parse(text) : undefined) as T
        }
        lastFailure = `GitLab ${method} ${path} returned ${response.status}: ${redact(text, this.token).slice(0, 1_000)}`
        if (![409, 429, 502, 503, 504].includes(response.status)) break
      } catch (error) {
        lastFailure = `GitLab ${method} ${path} failed: ${error instanceof Error ? error.message : String(error)}`
      }
      if (attempt < 19) {
        await sleep(Math.min(1_000 * (attempt + 1), 5_000))
      }
    }
    throw new Error(lastFailure)
  }
}

export type GitLabFixture = {
  adapter: ForgeAdapter
  token: string
  serverUrl: string
  repository: Repository
  conformance: ForgeConformanceFixture
  configPath: string
  baseTag: string
  baseCommit: string
  headCommit: string
  mergeCommit: string
  mergeRequestNumber: number
  releaseTag: string
  inspectReleaseBody(release: Release): Promise<string>
  deleteRelease(release: Release): Promise<void>
  stop(): Promise<void>
}

const createAccessToken = async (
  container: StartedTestContainer,
  token: string,
) => {
  const ruby = [
    "user = User.find_by_username('root')",
    "token = PersonalAccessToken.new(user: user, name: 'release-drafter-integration', scopes: ['api'], expires_at: 1.day.from_now)",
    `token.set_token('${token}')`,
    'token.save!',
  ].join('; ')
  const result = await container.exec(['gitlab-rails', 'runner', ruby])
  if (result.exitCode !== 0) {
    throw new Error(
      `Could not create the GitLab integration token: ${redact(result.output, token)}`,
    )
  }
}

const waitForMergedRequest = async (
  api: GitLabApi,
  projectId: number,
  mergeRequestNumber: number,
) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      await api.request<GitLabMergeRequest>(
        'PUT',
        `/projects/${projectId}/merge_requests/${mergeRequestNumber}/merge`,
        { should_remove_source_branch: false },
      )
    } catch (error) {
      if (attempt === 29) throw error
    }
    const mergeRequest = await api.request<GitLabMergeRequest>(
      'GET',
      `/projects/${projectId}/merge_requests/${mergeRequestNumber}`,
    )
    if (mergeRequest.state === 'merged' && mergeRequest.merge_commit_sha) {
      return mergeRequest
    }
    await sleep(2_000)
  }
  throw new Error(`GitLab merge request !${mergeRequestNumber} did not merge`)
}

const bootstrapProject = async (api: GitLabApi) => {
  const parent = await api.request<GitLabGroup>('POST', '/groups', {
    name: 'Release Drafter Tests',
    path: 'release-drafter-tests',
  })
  const subgroup = await api.request<GitLabGroup>('POST', '/groups', {
    name: 'Nested Fixtures',
    path: 'nested-fixtures',
    parent_id: parent.id,
  })
  const project = await api.request<GitLabProject>('POST', '/projects', {
    name: 'Forge Conformance',
    path: 'forge-conformance',
    namespace_id: subgroup.id,
    initialize_with_readme: true,
    default_branch: 'main',
    visibility: 'private',
  })

  const baseCommit = await api.request<GitLabCommit>(
    'POST',
    `/projects/${project.id}/repository/commits`,
    {
      branch: 'main',
      commit_message: 'chore: seed release drafter fixture',
      actions: [
        {
          action: 'create',
          file_path: '.github/release-drafter.yml',
          content:
            'name-template: "v$RESOLVED_VERSION"\ntemplate: "$CHANGES"\n',
        },
        {
          action: 'create',
          file_path: 'src/base.ts',
          content: "export const base = 'base'\n",
        },
      ],
    },
  )
  await api.request('POST', `/projects/${project.id}/repository/tags`, {
    tag_name: 'v1.0.0',
    ref: baseCommit.id,
  })
  await api.request('POST', `/projects/${project.id}/repository/branches`, {
    branch: 'feature/conformance',
    ref: baseCommit.id,
  })
  const headCommit = await api.request<GitLabCommit>(
    'POST',
    `/projects/${project.id}/repository/commits`,
    {
      branch: 'feature/conformance',
      commit_message: 'feat: exercise forge conformance',
      actions: [
        {
          action: 'update',
          file_path: 'README.md',
          content: '# Forge Conformance\n\nGitLab integration fixture.\n',
        },
        {
          action: 'create',
          file_path: 'src/feature.ts',
          content: "export const feature = 'gitlab'\n",
        },
      ],
    },
  )
  const mergeRequest = await api.request<GitLabMergeRequest>(
    'POST',
    `/projects/${project.id}/merge_requests`,
    {
      source_branch: 'feature/conformance',
      target_branch: 'main',
      title: 'feat: exercise forge conformance',
      description: 'Exercises normalized change discovery against GitLab.',
      labels: 'feature,integration',
      remove_source_branch: false,
    },
  )
  const merged = await waitForMergedRequest(api, project.id, mergeRequest.iid)
  await api.request('POST', `/projects/${project.id}/releases`, {
    tag_name: 'v1.0.0',
    name: 'Version 1.0.0',
    description: 'Seed release',
  })

  return {
    project,
    baseCommit: baseCommit.id,
    headCommit: headCommit.id,
    mergeRequestNumber: mergeRequest.iid,
    mergeCommit: merged.merge_commit_sha as string,
    mergeRequestUrl: merged.web_url,
    mergedAt: merged.merged_at,
  }
}

export const startGitLabFixture = async (): Promise<GitLabFixture> => {
  mkdirSync(artifactsDirectory, { recursive: true })
  const containerLogPath = join(artifactsDirectory, 'container.log')
  const logWriter = createWriteStream(containerLogPath, { flags: 'w' })
  const rootPassword = `Release-Drafter-${randomBytes(24).toString('hex')}`
  const token = `glpat-${randomBytes(24).toString('hex')}`
  const logRedactor = createSecretRedactor([rootPassword, token])
  logRedactor.pipe(logWriter)
  let containerLogStream: Readable | undefined
  let container: StartedTestContainer | undefined

  const closeLogs = async () => {
    containerLogStream?.destroy()
    if (!logRedactor.writableEnded) logRedactor.end()
    await finished(logWriter)
  }

  try {
    container = await new GenericContainer(GITLAB_IMAGE)
      .withExposedPorts(HTTP_PORT)
      .withSharedMemorySize(256 * 1024 * 1024)
      .withEnvironment({
        GITLAB_ROOT_PASSWORD: rootPassword,
        GITLAB_OMNIBUS_CONFIG: [
          "external_url 'http://localhost'",
          "letsencrypt['enable'] = false",
          "prometheus_monitoring['enable'] = false",
          "gitlab_rails['usage_ping_enabled'] = false",
          "gitlab_rails['gitlab_signup_enabled'] = false",
        ].join('; '),
      })
      .withLogConsumer((stream) => {
        containerLogStream = stream
        stream.pipe(logRedactor, { end: false })
        stream.on('error', (error) =>
          logRedactor.write(
            `${error instanceof Error ? error.stack : error}\n`,
          ),
        )
      })
      .withWaitStrategy(
        Wait.forAll([
          Wait.forSuccessfulCommand(
            "curl --fail --silent http://127.0.0.1/-/health | grep --quiet 'GitLab OK'",
          ),
          Wait.forSuccessfulCommand(
            "curl --fail --silent 'http://127.0.0.1/-/readiness?all=1' >/dev/null",
          ),
        ]),
      )
      .withStartupTimeout(STARTUP_TIMEOUT_MS)
      .start()

    const serverUrl = `http://${container.getHost()}:${container.getMappedPort(HTTP_PORT)}`
    await createAccessToken(container, token)
    const api = new GitLabApi(serverUrl, token)
    await api.request('GET', '/version')
    const fixture = await bootstrapProject(api)
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
      adapter: createForgeAdapter({ forge: 'gitlab', token, serverUrl }),
      token,
      serverUrl,
      repository,
      conformance: {
        repository,
        capabilities: { draftReleases: false },
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
          { commitish: fixture.baseCommit, expected: fixture.baseCommit },
          { commitish: 'refs/tags/v1.0.0', expected: fixture.baseCommit },
          {
            commitish: `refs/merge-requests/${fixture.mergeRequestNumber}/head`,
            expected: fixture.headCommit,
          },
          {
            commitish: `refs/merge-requests/${fixture.mergeRequestNumber}/merge`,
            expected: fixture.mergeCommit,
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
          expectedCommitOids: [fixture.headCommit, fixture.mergeCommit],
          expectedPullRequests: [
            {
              number: fixture.mergeRequestNumber,
              title: 'feat: exercise forge conformance',
              body: 'Exercises normalized change discovery against GitLab.',
              url: fixture.mergeRequestUrl,
              mergedAt: fixture.mergedAt,
              baseRefName: 'main',
              headRefName: 'feature/conformance',
              baseRepository: `${repository.owner}/${repository.name}`,
              isCrossRepository: false,
              author: { login: 'root' },
              labels: ['feature', 'integration'],
              changedFiles: ['README.md', 'src/feature.ts'],
              mergeCommitOid: fixture.mergeCommit,
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
      baseTag: 'v1.0.0',
      baseCommit: fixture.baseCommit,
      headCommit: fixture.headCommit,
      mergeCommit: fixture.mergeCommit,
      mergeRequestNumber: fixture.mergeRequestNumber,
      releaseTag: 'v1.0.0',
      async inspectReleaseBody(release) {
        return (
          await api.request<GitLabRelease>(
            'GET',
            `/projects/${fixture.project.id}/releases/${encodeURIComponent(release.tagName)}`,
          )
        ).description
      },
      async deleteRelease(release) {
        await api.request(
          'DELETE',
          `/projects/${fixture.project.id}/releases/${encodeURIComponent(release.tagName)}`,
          undefined,
          [204],
        )
      },
      async stop() {
        try {
          await container?.stop({ timeout: 60_000 })
        } finally {
          await closeLogs()
        }
      },
    }
  } catch (error) {
    if (container) await container.stop({ timeout: 60_000 }).catch(() => {})
    await closeLogs()
    throw error
  }
}
