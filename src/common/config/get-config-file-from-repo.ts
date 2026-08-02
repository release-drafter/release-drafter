import process from 'node:process'
import { getGitHubAdapter } from '../get-github-adapter.ts'
import type { ConfigTarget } from './parse-config-target.ts'

export const getConfigFileFromRepo = async (
  configTarget: ConfigTarget,
): Promise<string> =>
  getGitHubAdapter().getRepositoryConfig({
    repository: {
      owner: configTarget.repo.owner,
      name: configTarget.repo.repo,
      serverUrl: process.env.GITHUB_SERVER_URL ?? 'https://github.com',
    },
    path: configTarget.filepath,
    ref: configTarget.ref,
  })
