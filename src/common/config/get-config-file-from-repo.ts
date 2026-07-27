import type { RequestError } from '@octokit/request-error'
import type { Octokit } from '../get-octokit.ts'
import type { ConfigTarget } from './parse-config-target.ts'

export const getConfigFileFromRepo = async (
  configTarget: ConfigTarget,
  octokit: Octokit,
): Promise<string> => {
  let res: Awaited<ReturnType<typeof octokit.rest.repos.getContent>>
  // Gitea's contents endpoint resolves only bare branch and tag names, 404ing on
  // every fully qualified form (`refs/heads/x`, `heads/x`, `refs/tags/x`) — even
  // though its own commits endpoint accepts them, and GitHub and Forgejo accept
  // both. Actions supply `GITHUB_REF` fully qualified, so strip the prefix; the
  // bare name resolves identically on every forge.
  const ref = configTarget.ref?.replace(/^(?:refs\/)?(?:heads|tags)\//, '')
  try {
    // see: https://docs.github.com/en/rest/repos/contents
    res = await octokit.rest.repos.getContent({
      owner: configTarget.repo.owner,
      repo: configTarget.repo.repo,
      path: configTarget.filepath,
      ref,
      mediaType: { format: 'raw' },
    })
  } catch (error) {
    if ((error as RequestError).status === 404) {
      throw new Error(
        `Config file not found with error 404. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ''}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ''})`,
      )
    }
    throw new Error(
      `Failed to fetch config from repo: ${(error as Error).message}`,
    )
  }

  if (Array.isArray(res.data)) {
    throw new Error(
      `Fetched content is a directory (array), expected a file. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ''}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ''})`,
    )
  }

  // GitHub honours `mediaType.format: 'raw'` and returns the file body as a
  // string. Gitea and Forgejo ignore it and always return the JSON content
  // object, so fall back to decoding the base64 payload they send instead.
  if (
    typeof res.data === 'object' &&
    'content' in res.data &&
    typeof res.data.content === 'string' &&
    res.data.encoding === 'base64'
  ) {
    return Buffer.from(res.data.content, 'base64').toString('utf8')
  }

  if (
    !res.headers['content-type']?.startsWith('application/vnd.github.v3.raw')
  ) {
    throw new Error(
      `Fetched content has wrong content-type (${res.headers['content-type']}), expected a raw file. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ''}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ''})`,
    )
  }

  if (typeof res.data !== 'string') {
    throw new Error(
      `Fetched content is not a string. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ''}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ''})`,
    )
  }

  return res.data as string // octokit does not type the "mediaType: { format: 'raw' }" path
}
