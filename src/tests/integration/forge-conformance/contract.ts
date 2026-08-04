import { describe, expect, it } from 'vitest'
import type {
  FindChangesRequest,
  ForgeAdapter,
  PullRequest,
  Release,
  ReleasePayload,
  Repository,
} from '../../../../packages/core/src/index.ts'

export type ForgeConformanceFixture = {
  repository: Repository
  capabilities: ForgeAdapter['capabilities']
  baselineRelease: Partial<Release> & Pick<Release, 'tagName'>
  commitishCases: ReadonlyArray<{ commitish: string; expected: string }>
  findChanges: Omit<FindChangesRequest, 'repository'> & {
    expectedCommitOids: ReadonlyArray<string>
    expectedPullRequests: ReadonlyArray<Partial<PullRequest>>
    expectedNewContributorLogins: ReadonlyArray<string>
  }
  createPayload: ReleasePayload
  expectedCreatedRelease: Partial<Release>
  updatePayload: ReleasePayload
  expectedUpdatedRelease: Partial<Release>
}

export type ForgeConformanceExtensions = {
  getDefaultBranch?: () => Promise<string>
  expectedDefaultBranch?: string
  getRepositoryConfig?: () => Promise<string>
  expectedRepositoryConfig?: string
  inspectReleaseBody?: (release: Release) => Promise<string>
  deleteRelease?: (release: Release) => Promise<void>
}

export const defineForgeAdapterConformance = ({
  name,
  adapter,
  fixture,
  extensions = {},
}: {
  name: string
  adapter: ForgeAdapter
  fixture: ForgeConformanceFixture
  extensions?: ForgeConformanceExtensions
}) => {
  const { repository } = fixture

  describe(`${name} ForgeAdapter conformance`, () => {
    it('reports normalized forge capabilities', () => {
      expect(adapter.capabilities).toEqual(fixture.capabilities)
    })

    it('lists normalized releases', async () => {
      const releases = await adapter.listReleases({ repository })
      expect(releases).toEqual(
        expect.arrayContaining([
          expect.objectContaining(fixture.baselineRelease),
        ]),
      )
    })

    it('resolves branch, tag, pull request, and direct commitishes', async () => {
      for (const testCase of fixture.commitishCases) {
        await expect(
          adapter.resolveCommitish({
            repository,
            commitish: testCase.commitish,
          }),
        ).resolves.toBe(testCase.expected)
      }
    })

    it('finds complete normalized changes', async () => {
      const {
        expectedCommitOids,
        expectedPullRequests,
        expectedNewContributorLogins,
        ...request
      } = fixture.findChanges
      const changes = await adapter.findChanges({ repository, ...request })

      expect(changes.commits.map(({ oid }) => oid)).toEqual(
        expect.arrayContaining([...expectedCommitOids]),
      )
      expect(changes.commits).toHaveLength(expectedCommitOids.length)
      for (const pullRequest of expectedPullRequests) {
        const expected = {
          ...pullRequest,
          ...(pullRequest.author
            ? { author: expect.objectContaining(pullRequest.author) }
            : {}),
        }
        expect(changes.pullRequests).toEqual(
          expect.arrayContaining([expect.objectContaining(expected)]),
        )
      }
      expect(changes.pullRequests).toHaveLength(expectedPullRequests.length)
      expect([...changes.newContributorLogins].sort()).toEqual(
        [...expectedNewContributorLogins].sort(),
      )

      for (const pullRequest of expectedPullRequests) {
        if (pullRequest.number === undefined) continue
        expect(
          changes.commits.some((commit) =>
            commit.associatedPullRequests?.some(
              (associated) => associated?.number === pullRequest.number,
            ),
          ),
        ).toBe(true)
      }
    })

    it('creates and updates a normalized release', async () => {
      let created: Release | undefined
      try {
        created = await adapter.createRelease({
          repository,
          payload: fixture.createPayload,
        })
        expect(created).toEqual(
          expect.objectContaining(fixture.expectedCreatedRelease),
        )
        expect(await adapter.listReleases({ repository })).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.id,
              tagName: created.tagName,
            }),
          ]),
        )

        const updated = await adapter.updateRelease({
          repository,
          release: created,
          payload: fixture.updatePayload,
        })
        expect(updated.id).toBe(created.id)
        expect(updated).toEqual(
          expect.objectContaining(fixture.expectedUpdatedRelease),
        )
        if (extensions.inspectReleaseBody) {
          await expect(extensions.inspectReleaseBody(updated)).resolves.toBe(
            fixture.updatePayload.body,
          )
        }
      } finally {
        if (created && extensions.deleteRelease) {
          await extensions.deleteRelease(created)
        }
      }
    })

    if (extensions.getDefaultBranch) {
      it('loads the default branch through the forge extension', async () => {
        await expect(extensions.getDefaultBranch?.()).resolves.toBe(
          extensions.expectedDefaultBranch,
        )
      })
    }

    if (extensions.getRepositoryConfig) {
      it('loads repository config through the forge extension', async () => {
        await expect(extensions.getRepositoryConfig?.()).resolves.toBe(
          extensions.expectedRepositoryConfig,
        )
      })
    }
  })
}
