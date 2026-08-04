import { inject } from 'vitest'
import type {
  ForgeAdapter,
  Release,
  Repository,
} from '../../../../packages/core/src/index.ts'
import { createForgeAdapter } from '../../../../packages/release-drafter/src/index.ts'
import { defineForgeAdapterConformance } from './contract.ts'
import { forgeApi, type RestForgeFixture } from './gitea-forgejo-container.ts'

type RestForgeExtension = ForgeAdapter & {
  getDefaultBranch(repository: Repository): Promise<string>
  getRepositoryConfig(options: {
    repository: Repository
    path: string
    ref?: string
  }): Promise<string>
}

for (const fixture of Object.values(inject('restForgeFixtures'))) {
  if (!fixture) continue
  const adapter = createForgeAdapter({
    forge: fixture.flavor,
    token: fixture.token,
    serverUrl: fixture.serverUrl,
  }) as RestForgeExtension
  const repoPath = `/repos/${fixture.repository.owner}/${fixture.repository.name}`

  defineForgeAdapterConformance({
    name: `${fixture.flavor} ${fixture.version}`,
    adapter,
    fixture,
    extensions: {
      getDefaultBranch: () => adapter.getDefaultBranch(fixture.repository),
      expectedDefaultBranch: 'main',
      getRepositoryConfig: () =>
        adapter.getRepositoryConfig({
          repository: fixture.repository,
          path: '.github/release-drafter.yml',
          ref: 'main',
        }),
      expectedRepositoryConfig: fixture.config,
      inspectReleaseBody: async (release) =>
        (
          await forgeApi<{ body: string }>(
            fixture,
            `${repoPath}/releases/${release.id}`,
          )
        ).body,
      deleteRelease: (release: Release) =>
        forgeApi<undefined>(
          fixture as RestForgeFixture,
          `${repoPath}/releases/${release.id}`,
          {
            method: 'DELETE',
          },
        ),
    },
  })
}
