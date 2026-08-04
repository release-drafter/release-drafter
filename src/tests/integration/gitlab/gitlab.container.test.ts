import { inject } from 'vitest'
import {
  createForgeAdapter,
  type ForgeAdapter,
  type Release,
  type Repository,
} from '../../../../packages/release-drafter/src/index.ts'
import { defineForgeAdapterConformance } from '../forge-conformance/contract.ts'
import type { ProvidedGitLabFixture } from './gitlab-global-setup.ts'

type GitLabExtension = ForgeAdapter & {
  getDefaultBranch(repository: Repository): Promise<string>
  getRepositoryConfig(options: {
    repository: Repository
    path: string
    ref?: string
  }): Promise<string>
}

const fixture = inject('gitlabFixture') as ProvidedGitLabFixture
const adapter = createForgeAdapter({
  forge: 'gitlab',
  token: fixture.token,
  serverUrl: fixture.serverUrl,
}) as GitLabExtension
const project = encodeURIComponent(
  `${fixture.repository.owner}/${fixture.repository.name}`,
)

const releaseApi = async <T>(release: Release, method = 'GET'): Promise<T> => {
  const response = await fetch(
    `${fixture.serverUrl}/api/v4/projects/${project}/releases/${encodeURIComponent(release.tagName)}`,
    {
      method,
      signal: AbortSignal.timeout(30_000),
      headers: { 'Private-Token': fixture.token, Accept: 'application/json' },
    },
  )
  const text = await response.text()
  if (!response.ok) {
    throw new Error(
      `GitLab ${method} release failed with ${response.status}: ${text}`,
    )
  }
  return (text ? JSON.parse(text) : undefined) as T
}

defineForgeAdapterConformance({
  name: 'GitLab CE 19.1.3',
  adapter,
  fixture: fixture.conformance,
  extensions: {
    getDefaultBranch: () => adapter.getDefaultBranch(fixture.repository),
    expectedDefaultBranch: 'main',
    getRepositoryConfig: () =>
      adapter.getRepositoryConfig({
        repository: fixture.repository,
        path: fixture.configPath,
        ref: 'main',
      }),
    expectedRepositoryConfig:
      'name-template: "v$RESOLVED_VERSION"\ntemplate: "$CHANGES"\n',
    inspectReleaseBody: async (release) =>
      (await releaseApi<{ description: string }>(release)).description,
    deleteRelease: (release) => releaseApi(release, 'DELETE'),
  },
})
