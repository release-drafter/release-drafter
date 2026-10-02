import type { getOctokit } from '@actions/github'

type GitHub = ReturnType<typeof getOctokit>

export type ReleaseCandidate = {
  number: number
  version: string
  sha: string
  major: string
  published: boolean
}

const isNotFound = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  error.status === 404

/** Create missing release-state labels without overwriting existing styling. */
export const ensureReleaseLabels = async (
  github: GitHub,
  repository: { owner: string; repo: string },
): Promise<void> => {
  for (const label of [
    {
      name: 'autorelease: pending',
      color: 'fbca04',
      description: 'Release PR awaiting publication',
    },
    {
      name: 'autorelease: tagged',
      color: '0e8a16',
      description: 'Release PR has been published',
    },
  ]) {
    try {
      await github.rest.issues.getLabel({ ...repository, name: label.name })
    } catch (error) {
      if (!isNotFound(error)) throw error
      try {
        await github.rest.issues.createLabel({ ...repository, ...label })
      } catch (error) {
        // A concurrent preparer or publisher may have created the same label.
        if (
          typeof error !== 'object' ||
          error === null ||
          !('status' in error) ||
          error.status !== 422
        )
          throw error
        await github.rest.issues.getLabel({ ...repository, name: label.name })
      }
    }
  }
}

/** Find a pending releaser PR for the version on the trusted main commit. */
export const findReleaseCandidate = async (
  github: GitHub,
  options: { owner: string; repo: string; sha: string; version: string },
): Promise<ReleaseCandidate | undefined> => {
  const { owner, repo, sha, version } = options
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(version)) {
    throw new Error(`Invalid stable release version: ${version}`)
  }
  const repository = `${owner}/${repo}`
  const tag = `v${version}`

  for await (const { data: pulls } of github.paginate.iterator(
    github.rest.pulls.list,
    {
      owner,
      repo,
      state: 'closed',
      base: 'main',
      per_page: 100,
      sort: 'updated',
      direction: 'desc',
    },
  )) {
    for (const pull of pulls) {
      if (
        !pull.merged_at ||
        pull.base.ref !== 'main' ||
        pull.base.repo.full_name !== repository ||
        pull.head.repo?.full_name !== repository ||
        pull.user?.login !== 'release-drafter-releaser[bot]' ||
        !pull.labels.some((label) => label.name === 'autorelease: pending') ||
        pull.head.ref !== `release/${tag}`
      )
        continue

      const mergeSha = pull.merge_commit_sha
      if (!mergeSha || !/^[a-f0-9]{40}$/u.test(mergeSha)) {
        throw new Error(`Release PR #${pull.number} has no valid merge commit`)
      }

      let published = false
      try {
        const { data: release } = await github.rest.repos.getReleaseByTag({
          owner,
          repo,
          tag,
        })
        published = !release.draft
      } catch (error) {
        if (!isNotFound(error)) throw error
      }

      const { data: comparison } =
        await github.rest.repos.compareCommitsWithBasehead({
          owner,
          repo,
          basehead: `${mergeSha}...${sha}`,
        })
      if (comparison.status !== 'ahead' && comparison.status !== 'identical') {
        throw new Error(
          `Release PR #${pull.number} is not an ancestor of the workflow commit`,
        )
      }

      for (const path of [
        'package.json',
        'packages/release-drafter/package.json',
      ]) {
        const { data: content } = await github.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: mergeSha,
        })
        if (
          Array.isArray(content) ||
          content.type !== 'file' ||
          content.encoding !== 'base64'
        ) {
          throw new Error(`Release PR #${pull.number} has no readable ${path}`)
        }
        const manifest = JSON.parse(
          Buffer.from(content.content, 'base64').toString('utf8'),
        ) as { version?: string }
        if (manifest.version !== version) {
          throw new Error(
            `Release PR #${pull.number} has an unexpected version in ${path}`,
          )
        }
      }

      // A pre-existing tag must already identify the intended release commit.
      try {
        const { data: commit } = await github.rest.repos.getCommit({
          owner,
          repo,
          ref: `refs/tags/${tag}`,
        })
        if (commit.sha !== mergeSha)
          throw new Error(`Tag ${tag} points to a different commit`)
      } catch (error) {
        if (!isNotFound(error)) throw error
        if (published)
          throw new Error(`Published release ${tag} has no version tag`)
      }

      return {
        number: pull.number,
        version,
        sha: mergeSha,
        major: version.split('.')[0],
        published,
      }
    }
  }
  return undefined
}
