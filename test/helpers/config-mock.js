const fs = require('fs')
const nock = require('nock')
const { encodeContent } = require('../../lib/base64')

function configFixture(fileName = 'config.yml') {
  return {
    type: 'file',
    encoding: 'base64',
    size: 5362,
    name: 'release-drafter.yml',
    path: '.github/release-drafter.yml',
    content: encodeContent(
      fs.readFileSync(`${__dirname}/../fixtures/config/${fileName}`)
    ),
    sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
    url:
      'https://api.github.com/repos/octokit/octokit.rb/contents/.github/release-drafter.yml',
    git_url:
      'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
    html_url:
      'https://github.com/octokit/octokit.rb/blob/master/.github/release-drafter.yml',
    download_url:
      'https://raw.githubusercontent.com/octokit/octokit.rb/master/.github/release-drafter.yml',
    _links: {
      git:
        'https://api.github.com/repos/octokit/octokit.rb/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
      self:
        'https://api.github.com/repos/octokit/octokit.rb/contents/.github/release-drafter.yml',
      html:
        'https://github.com/octokit/octokit.rb/blob/master/.github/release-drafter.yml'
    }
  }
}

module.exports = function getConfigMock(fileName) {
  return nock('https://api.github.com')
    .get(
      '/repos/toolmantim/release-drafter-test-project/contents/.github/release-drafter.yml'
    )
    .reply(200, configFixture(fileName))
}
