import { GenericContainer, Wait } from 'testcontainers'

/**
 * Boots a real Gitea or Forgejo instance and seeds it with a repository that has
 * a published release and two merged pull requests — the minimum shape the
 * drafter needs to produce a changelog.
 *
 * These forges expose GitHub's REST surface but no GraphQL API, and they diverge
 * from it in ways only a real server reveals: `mediaType: 'raw'` is ignored, the
 * comparison payload omits the `url` key that drives Octokit's pagination
 * unwrapping, and Gitea's contents endpoint rejects fully qualified refs. Mocks
 * would encode today's guesses about those behaviours rather than check them, and
 * a forge upgrade could fix or break one without any test noticing.
 */

export type ForgeFlavor = 'gitea' | 'forgejo'

const IMAGES: Record<ForgeFlavor, string> = {
  gitea: 'gitea/gitea:latest',
  forgejo: 'codeberg.org/forgejo/forgejo:14',
}

/** The admin CLI is named after the project, and both ship it as the `git` user. */
const BINARIES: Record<ForgeFlavor, string> = {
  gitea: 'gitea',
  forgejo: 'forgejo',
}

const PORT = 3000
const USERNAME = 'rdadmin'
/** Authors exactly one pull request, so they are a first-time contributor. */
const NEWCOMER = 'newcomer'
const PASSWORD = 'Passw0rd123!'

const CONFIG = `name-template: "v$RESOLVED_VERSION"
tag-template: "v$RESOLVED_VERSION"
template: |
  ## Changes

  $CHANGES
footer: |
  ## New Contributors

  $NEW_CONTRIBUTORS
categories:
  - title: Features
    labels: ["*"]
`

/**
 * Everything a test needs to talk to a running forge. Kept serializable so it can
 * cross the boundary from global setup into the test workers via `provide`.
 */
export type ForgeInfo = {
  flavor: ForgeFlavor
  apiUrl: string
  token: string
  version: string
  owner: string
  repo: string
  /** Authored exactly one merged pull request; the repo owner authored earlier ones. */
  newcomer: string
}

const readJson = async (response: Response) => {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${response.url} -> ${response.status} ${text}`)
  }
  // Several write routes (notably merging a pull request) answer 200 with an
  // empty body, so parsing is conditional.
  return text ? (JSON.parse(text) as Record<string, never>) : undefined
}

export const startForge = async (flavor: ForgeFlavor) => {
  const environmentPrefix = flavor === 'gitea' ? 'GITEA' : 'FORGEJO'
  const container = await new GenericContainer(IMAGES[flavor])
    .withExposedPorts(PORT)
    .withEnvironment({
      // Skips the interactive installer so the API is usable immediately.
      [`${environmentPrefix}__security__INSTALL_LOCK`]: 'true',
      [`${environmentPrefix}__log__LEVEL`]: 'error',
    })
    .withWaitStrategy(Wait.forHttp('/api/v1/version', PORT).forStatusCode(200))
    .withStartupTimeout(180_000)
    .start()

  const apiUrl = `http://${container.getHost()}:${container.getMappedPort(PORT)}/api/v1`

  // The first account has to be made through the CLI; there is no unauthenticated
  // signup route to bootstrap from.
  const createUser = async (username: string, admin: boolean) => {
    const result = await container.exec([
      '/bin/sh',
      '-c',
      `su git -c "${BINARIES[flavor]} admin user create ${admin ? '--admin ' : ''}--username ${username} --password '${PASSWORD}' --email ${username}@example.com --must-change-password=false"`,
    ])
    if (result.exitCode !== 0) {
      throw new Error(`failed to create user ${username}: ${result.output}`)
    }
  }

  await createUser(USERNAME, true)
  await createUser(NEWCOMER, false)

  const mintToken = async (username: string) =>
    (
      await readJson(
        await fetch(`${apiUrl}/users/${username}/tokens`, {
          method: 'POST',
          headers: {
            authorization: `Basic ${Buffer.from(`${username}:${PASSWORD}`).toString('base64')}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ name: 'release-drafter', scopes: ['all'] }),
        }),
      )
    )?.sha1 as unknown as string

  const token = await mintToken(USERNAME)
  const newcomerToken = await mintToken(NEWCOMER)

  const api = async (path: string, body?: unknown, method = 'POST') =>
    readJson(
      await fetch(`${apiUrl}${path}`, {
        method: body === undefined && method === 'POST' ? 'GET' : method,
        headers: {
          authorization: `token ${token}`,
          'content-type': 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    )

  /**
   * Both forges compute mergeability asynchronously and answer a merge attempt
   * with `405 Please try again later` until it has settled, so merges are gated
   * on the pull request reporting itself mergeable.
   */
  const merge = async (repoPath: string, pullNumber: number) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const response = await fetch(
        `${apiUrl}${repoPath}/pulls/${pullNumber}/merge`,
        {
          method: 'POST',
          headers: {
            authorization: `token ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ Do: 'merge' }),
        },
      )
      if (response.ok) return
      // The `mergeable` field is not a usable gate: it can read true while the
      // merge still answers 405, so the retry has to be on the merge itself.
      if (response.status !== 405) {
        throw new Error(
          `merge #${pullNumber} -> ${response.status} ${await response.text()}`,
        )
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    throw new Error(`pull request #${pullNumber} never became mergeable`)
  }

  const version = (await readJson(await fetch(`${apiUrl}/version`)))
    ?.version as unknown as string

  await api('/user/repos', {
    name: 'demo',
    auto_init: true,
    default_branch: 'main',
    private: false,
  })
  const repoPath = `/repos/${USERNAME}/demo`

  // Merged before the baseline release, so the owner has history predating the
  // range. Without this every author's first in-range pull request would also be
  // their first ever, and $NEW_CONTRIBUTORS could not distinguish anyone.
  await api(`${repoPath}/branches`, {
    new_branch_name: 'groundwork',
    old_branch_name: 'main',
  })
  await api(`${repoPath}/contents/groundwork.txt`, {
    branch: 'groundwork',
    content: Buffer.from('groundwork').toString('base64'),
    message: 'add groundwork',
  })
  const groundwork = await api(`${repoPath}/pulls`, {
    base: 'main',
    head: 'groundwork',
    title: 'Groundwork before the first release',
  })
  await merge(repoPath, Number(groundwork?.number))

  // Merge timestamps have one-second granularity, and the seeding below runs well
  // inside that. Without a gap the groundwork merge can share a timestamp with the
  // first in-range one, leaving "did this author merge anything strictly earlier"
  // genuinely ambiguous rather than false.
  await new Promise((resolve) => setTimeout(resolve, 1500))

  await api(`${repoPath}/releases`, {
    tag_name: 'v1.0.0',
    target_commitish: 'main',
    name: 'v1.0.0',
    body: 'initial',
    draft: false,
    prerelease: false,
  })

  for (const index of [1, 2]) {
    await api(`${repoPath}/branches`, {
      new_branch_name: `feat-${index}`,
      old_branch_name: 'main',
    })
    await api(`${repoPath}/contents/file${index}.txt`, {
      branch: `feat-${index}`,
      content: Buffer.from(`hello ${index}`).toString('base64'),
      message: `add file${index}`,
    })
    const pullRequest = await api(`${repoPath}/pulls`, {
      base: 'main',
      head: `feat-${index}`,
      title: `Add feature ${index}`,
      body: `Body of pull request ${index}`,
    })
    await merge(repoPath, Number(pullRequest?.number))
  }

  // A pull request from someone with no earlier merge, so $NEW_CONTRIBUTORS has a
  // true positive to find alongside the repeat author above.
  await api(
    `${repoPath}/collaborators/${NEWCOMER}`,
    { permission: 'write' },
    'PUT',
  )
  const asNewcomer = async (path: string, body: unknown) =>
    readJson(
      await fetch(`${apiUrl}${path}`, {
        method: 'POST',
        headers: {
          authorization: `token ${newcomerToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      }),
    )

  await asNewcomer(`${repoPath}/branches`, {
    new_branch_name: 'first-contribution',
    old_branch_name: 'main',
  })
  await asNewcomer(`${repoPath}/contents/newcomer.txt`, {
    branch: 'first-contribution',
    content: Buffer.from('hello from a newcomer').toString('base64'),
    message: 'add newcomer.txt',
  })
  const newcomerPullRequest = await asNewcomer(`${repoPath}/pulls`, {
    base: 'main',
    head: 'first-contribution',
    title: 'Add a first contribution',
    body: 'My first pull request.',
  })
  await merge(repoPath, Number(newcomerPullRequest?.number))

  await api(
    `${repoPath}/contents/${encodeURIComponent('.github/release-drafter.yml')}`,
    {
      branch: 'main',
      content: Buffer.from(CONFIG).toString('base64'),
      message: 'add release drafter config',
    },
  )

  const info: ForgeInfo = {
    flavor,
    apiUrl,
    token,
    version,
    owner: USERNAME,
    repo: 'demo',
    newcomer: NEWCOMER,
  }

  return { info, stop: () => container.stop() }
}

/** Authenticated read against a running forge, for assertions on server state. */
export const forgeApi = async (forge: ForgeInfo, path: string) =>
  readJson(
    await fetch(`${forge.apiUrl}${path}`, {
      headers: { authorization: `token ${forge.token}` },
    }),
  )
