import type { RequestError } from '@octokit/request-error'
import { getOctokit } from '../get-octokit.ts'
import type { ConfigTarget } from './parse-config-target.ts'

export const getConfigFileFromRepo = async (
  configTarget: ConfigTarget,
): Promise<string> => {
  const octokit = getOctokit()

  let res: Awaited<ReturnType<typeof octokit.rest.repos.getContent>>
  try {
    // see: https://docs.github.com/en/rest/repos/contents
    res = await octokit.rest.repos.getContent({
      owner: configTarget.repo.owner,
      repo: configTarget.repo.repo,
      path: configTarget.filepath,
      ref: configTarget.ref,
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
