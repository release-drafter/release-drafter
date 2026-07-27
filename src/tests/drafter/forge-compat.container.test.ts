import { describe, expect, inject, it } from 'vitest'
import { resolveRestOnly } from '#src/common/resolve-api-mode.ts'
import { draftRelease } from '#src/drafter.ts'
import { type ForgeFlavor, forgeApi } from '#tests/helpers/forge-container.ts'

/**
 * End-to-end compatibility checks against real Gitea and Forgejo servers, which
 * expose GitHub's REST surface but no GraphQL API.
 *
 * The servers are booted once by the global setup; see `npm run test:container`.
 */

const forges = inject('forges')
const FLAVORS = Object.keys(forges) as ForgeFlavor[]

describe.each(FLAVORS)('%s compatibility', (flavor) => {
  const forge = forges[flavor]

  const run = (overrides: Record<string, unknown> = {}) =>
    draftRelease({
      repo: { owner: forge.owner, repo: forge.repo },
      token: forge.token,
      apiUrl: forge.apiUrl,
      dryRun: true,
      ...overrides,
    })

  it('infers the REST-only paths from the forge API URL', () => {
    // Nothing tells these tests which forge they are on: both serve REST at
    // /api/v1, which is what distinguishes them from github.com and from GitHub
    // Enterprise Server's /api/v3.
    expect(forge.apiUrl).toMatch(/\/api\/v1$/)
    expect(resolveRestOnly({ apiUrl: forge.apiUrl, graphqlUrl: null })).toBe(
      true,
    )
  })

  it('drafts release notes from merged pull requests', async () => {
    const { releasePayload } = await run()

    expect(releasePayload.body).toContain('## Changes')
    expect(releasePayload.body).toContain('Add feature 1')
    expect(releasePayload.body).toContain('Add feature 2')
    // Merged before the baseline release, so it is outside the comparison range.
    expect(releasePayload.body).not.toContain('Groundwork')
    expect(releasePayload.tag).toBe('v1.0.1')
    expect(releasePayload.resolvedVersion).toBe('1.0.1')
  })

  it('resolves $NEW_CONTRIBUTORS without a GraphQL search API', async () => {
    const { releasePayload } = await run()

    // The newcomer has exactly one merged pull request; the owner has earlier
    // ones, so only the newcomer is a first-time contributor.
    expect(releasePayload.body).toContain('## New Contributors')
    expect(releasePayload.body).toContain(`@${forge.newcomer}`)
    expect(releasePayload.body).not.toMatch(
      new RegExp(`New Contributors[\\s\\S]*@${forge.owner}\\b`),
    )
  })

  it('loads config despite the raw media type being ignored', async () => {
    // Both forges answer `mediaType: 'raw'` with the JSON content object, so a
    // drafted body at all proves the base64 fallback ran.
    const { releasePayload } = await run()

    expect(releasePayload.body).toContain('## Changes')
  })

  it('loads config for a fully qualified branch ref', async () => {
    // Gitea's contents endpoint 404s on `refs/heads/<branch>` while its commits
    // endpoint accepts it, and Actions always supply `GITHUB_REF` qualified.
    const { releasePayload } = await run({ commitish: 'refs/heads/main' })

    expect(releasePayload.body).toContain('Add feature 1')
  })

  it('creates and then updates a single draft release', async () => {
    const created = await run({ dryRun: false })
    expect(created.upsertedRelease?.data.draft).toBe(true)

    const updated = await run({ dryRun: false })
    expect(updated.upsertedRelease?.data.id).toBe(
      created.upsertedRelease?.data.id,
    )

    const releases = (await forgeApi(
      forge,
      `/repos/${forge.owner}/${forge.repo}/releases`,
    )) as unknown as Array<{ draft: boolean }>
    expect(releases.filter((release) => release.draft)).toHaveLength(1)
  })
})
