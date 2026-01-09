import { readFileSync } from 'fs'
import nock from 'nock'
import path from 'path'

export const mockReleaseDrafterConfig = (opts?: {
  fileName?: string
  repoFileName?: string
  repo?: { owner: string; repo: string }
}) => {
  const { repoFileName, repo, fileName } = opts || {}

  return nock('https://api.github.com')
    .get(
      `/repos/${repo?.owner || 'toolmantim'}/${repo?.repo || 'release-drafter-test-project'}/contents/.github%2F${repoFileName || 'release-drafter.yml'}`
    )
    .reply(
      200,
      readFileSync(
        path.join(
          path.dirname(import.meta.filename),
          'config',
          fileName || 'config.yml'
        ),
        { encoding: 'utf8' }
      )
    )
}
