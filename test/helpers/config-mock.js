const fs = require('fs')
const nock = require('nock')

function configFixture(fileName = 'config.yml') {
  return fs.readFileSync(`${__dirname}/../fixtures/config/${fileName}`)
}

module.exports = function getConfigMock(
  fileName,
  repoFileName = 'release-drafter.yml'
) {
  return nock('https://api.github.com')
    .get(
      `/repos/toolmantim/release-drafter-test-project/contents/.github%2F${repoFileName}`
    )
    .reply(200, configFixture(fileName, repoFileName))
}
