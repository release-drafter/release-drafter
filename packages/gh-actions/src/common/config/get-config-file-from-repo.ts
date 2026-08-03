import process from 'node:process'
import { getGitHubAdapter } from '../github.ts'
import type { ConfigTarget } from './parse-config-target.ts'

export const getConfigFileFromRepo = async (
  configTarget: ConfigTarget,
  token = process.env.GITHUB_TOKEN ?? '',
): Promise<string> =>
  getGitHubAdapter(token).getRepositoryConfig({
    repository: {
      owner: configTarget.repo.owner,
      name: configTarget.repo.repo,
      serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
    },
    path: configTarget.filepath,
    ref: configTarget.ref,
  })
