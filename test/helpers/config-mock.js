import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import nock from 'nock'

function configFixture(fileName = 'config.yml') {
  return fs.readFileSync(
    `${path.dirname(
      url.fileURLToPath(import.meta.url)
    )}/../fixtures/config/${fileName}`
  )
}

export function getConfigMock(fileName, repoFileName = 'release-drafter.yml') {
  return nock('https://api.github.com')
    .get(
      `/repos/toolmantim/release-drafter-test-project/contents/.github%2F${repoFileName}`
    )
    .reply(200, configFixture(fileName, repoFileName))
}
