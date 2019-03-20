const nock = require('nock')
const route = require('nock-knock/lib').default
const { Probot, Octokit } = require('probot')
const { fn } = jest
const fs = require('fs')
const { encodeContent } = require('../lib/base64')
const http = require('http')

const { mockError, mockConfig } = require('./helpers/mock-responses')
const releaseDrafter = require('../index')

nock.disableNetConnect()

// TODO: move to helpers
function configFixture(fileName = 'config.yml') {
  return {
    type: 'file',
    encoding: 'base64',
    size: 5362,
    name: 'release-drafter.yml',
    path: '.github/release-drafter.yml',
    content: encodeContent(
      fs.readFileSync(`${__dirname}/fixtures/config/${fileName}`)
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

const cert = `-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQC2RTg7dNjQMwPzFwF0gXFRCcRHha4H24PeK7ey6Ij39ay1hy2o
H9NEZOxrmAb0bEBDuECImTsJdpgI6F3OwkJGsOkIH09xTk5tC4fkfY8N7LklK+uM
ndN4+VUXTPSj/U8lQtCd9JnnUL/wXDc46wRJ0AAKsQtUw5n4e44f+aYggwIDAQAB
AoGAW2/cJs+WWNPO3msjGrw5CYtZwPuJ830m6RSLYiAPXj0LuEEpIVdd18i9Zbht
fL61eoN7NEuSd0vcN1PCg4+mSRAb/LoauSO3HXote+6Lhg+y5mVYTNkE0ZAW1zUb
HOelQp9M6Ia/iQFIMykhrNLqMG9xQIdLH8BDGuqTE+Eh8jkCQQDyR6qfowD64H09
oYJI+QbsE7yDOnG68tG7g9h68Mp089YuQ43lktz0q3fhC7BhBuSnfkBHwMztABuA
Ow1+dP9FAkEAwJeYJYxJN9ron24IePDoZkL0T0faIWIX2htZH7kJODs14OP+YMVO
1CPShdTIgFeVp/HlAY2Qqk/do2fzyueZJwJBAN5GvdUjmRyRpJVMfdkxDxa7rLHA
huL7L0wX1B5Gl5fgtVlQhPhgWvLl9V+0d6csyc6Y16R80AWHmbN1ehXQhPkCQGfF
RsV0gT8HRLAiqY4AwDfZe6n8HRw/rnpmoe7l1IHn5W/3aOjbZ04Gvzg9HouIpaqI
O8xKathZkCKrsEBz6aECQQCLgqOCJz4MGIVHP4vQHgYp8YNZ+RMSfJfZA9AyAsgP
Pc6zWtW2XuNIGHw9pDj7v1yDolm7feBXLg8/u9APwHDy
-----END RSA PRIVATE KEY-----`

describe('release-drafter', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({ id: 179208, cert, Octokit })
    probot.load(releaseDrafter)

    nock('https://api.github.com')
      .post('/app/installations/179208/access_tokens')
      .reply(200, { token: 'test' })
  })

  afterAll(nock.restore)
  afterEach(nock.cleanAll)

  describe('push', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/contents/.github/release-drafter.yml'
          )
          .reply(404)
          .get('/repos/toolmantim/.github/contents/.github/release-drafter.yml')
          .reply(404)

        await probot.receive({
          name: 'push',
          payload: require('./fixtures/push')
        })
      })
    })

    describe('to a non-master branch', () => {
      it('does nothing', async () => {
        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/contents/.github/release-drafter.yml'
          )
          .reply(200, configFixture())
          .post(route('/repos/:owner/:repo/releases'))
          .reply(200, () => {
            throw new Error("Shouldn't create a new release")
          })
          .patch(route('/repos/:owner/:repo/releases/:release_id'))
          .reply(200, () => {
            throw new Error("Shouldn't update an existing release")
          })

        await probot.receive({
          name: 'push',
          payload: require('./fixtures/push-non-master-branch')
        })
      })

      describe('when configured for that branch', () => {
        it('creates a release draft', async () => {
          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/contents/.github/release-drafter.yml'
            )
            .reply(200, configFixture('config-non-master-branch.yml'))
            .get('/repos/toolmantim/release-drafter-test-project/releases')
            .query(true)
            .reply(200, [require('./fixtures/release')])
            .get(
              '/repos/toolmantim/release-drafter-test-project/compare/v2.0.0...some-branch'
            )
            .reply(200, { commits: [] })
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              body => {
                expect(body).toMatchObject({
                  name: '',
                  tag_name: '',
                  body: `# What's Changed\n\n* No changes\n`,
                  draft: true
                })
                return true
              }
            )
            .reply(200)

          await probot.receive({
            name: 'push',
            payload: require('./fixtures/push-non-master-branch')
          })
        })
      })
    })

    describe('with no past releases', () => {
      it('sets $CHANGES based on all commits, and $PREVIOUS_TAG to blank', async () => {
        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/contents/.github/release-drafter.yml'
          )
          .reply(200, configFixture('config-previous-tag.yml'))
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [])
          .get('/repos/toolmantim/release-drafter-test-project/commits')
          .query(true)
          .reply(200, require('./fixtures/commits'))

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/pulls/1')
          .reply(200, require('./fixtures/pull-request-1.json'))
          .get('/repos/toolmantim/release-drafter-test-project/pulls/2')
          .reply(200, require('./fixtures/pull-request-2.json'))

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            body => {
              expect(body).toMatchObject({
                body: `Changes:
* Integrate alien technology (#2) @another-user
* More cowbell (#1) @toolmantim

Previous tag: ''
`,
                draft: true,
                tag_name: ''
              })
              return true
            }
          )
          .reply(200)

        const payload = require('./fixtures/push')

        await probot.receive({
          name: 'push',
          payload
        })

        expect.assertions(1)
      })
    })

    describe('with past releases', () => {
      it('creates a new draft listing the changes', async () => {
        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/contents/.github/release-drafter.yml'
          )
          .reply(200, configFixture('config.yml'))
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [
            require('./fixtures/release-2'),
            require('./fixtures/release'),
            require('./fixtures/release-3')
          ])
          .get(
            '/repos/toolmantim/release-drafter-test-project/compare/v2.0.0...master'
          )
          .reply(200, {
            commits: require('./fixtures/commits')
          })

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/pulls/1')
          .reply(200, require('./fixtures/pull-request-1.json'))
          .get('/repos/toolmantim/release-drafter-test-project/pulls/2')
          .reply(200, require('./fixtures/pull-request-2.json'))

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            body => {
              expect(body).toMatchObject({
                body: `# What's Changed

* Integrate alien technology (#2) @another-user
* More cowbell (#1) @toolmantim
`,
                draft: true,
                tag_name: ''
              })
              return true
            }
          )
          .reply(200)

        await probot.receive({
          name: 'push',
          payload: require('./fixtures/push')
        })

        expect.assertions(1)
      })

      it('makes next versions available as template placeholders', async () => {
        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/contents/.github/release-drafter.yml'
          )
          .reply(200, configFixture('config-with-next-versioning.yml'))
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [require('./fixtures/release')])
          .get(
            '/repos/toolmantim/release-drafter-test-project/compare/v2.0.0...master'
          )
          .reply(200, {
            commits: require('./fixtures/commits')
          })

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/pulls/1')
          .reply(200, require('./fixtures/pull-request-1.json'))
          .get('/repos/toolmantim/release-drafter-test-project/pulls/2')
          .reply(200, require('./fixtures/pull-request-2.json'))

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            body => {
              expect(body).toMatchObject({
                body: `Placeholder with example. Automatically calculated values are next major=3.0.0, minor=2.1.0, patch=2.0.1`,
                draft: true,
                name: 'v2.0.1 (Code name: Placeholder)',
                tag_name: 'v2.0.1'
              })
              return true
            }
          )
          .reply(200)

        await probot.receive({
          name: 'push',
          payload: require('./fixtures/push')
        })

        expect.assertions(1)
      })

      describe('with custom changes-template config', () => {
        it('creates a new draft using the template', async () => {
          github.repos.getContents = fn().mockReturnValueOnce(
            mockConfig('config-with-changes-templates.yml')
          )
          github.repos.listReleases = fn().mockReturnValueOnce(
            Promise.resolve({ data: [require('./fixtures/release')] })
          )
          github.repos.compareCommits = fn().mockReturnValueOnce(
            Promise.resolve({
              data: {
                commits: require('./fixtures/commits')
              }
            })
          )
          github.pullRequests.get = fn()
            .mockReturnValueOnce(
              Promise.resolve(require('./fixtures/pull-request-1'))
            )
            .mockReturnValueOnce(
              Promise.resolve(require('./fixtures/pull-request-2'))
            )

          github.repos.createRelease = fn()

          await probot.receive({
            name: 'push',
            payload: require('./fixtures/push')
          })

          expect(github.repos.createRelease).toBeCalledWith(
            expect.objectContaining({
              body: `* Change: #1 'More cowbell' @toolmantim
* Change: #2 'Integrate alien technology' @another-user`,
              draft: true,
              tag_name: ''
            })
          )
        })
      })

      describe('with contributors config', () => {
        it('adds the contributors', async () => {
          github.repos.getContents = fn().mockReturnValueOnce(
            mockConfig('config-with-contributors.yml')
          )
          github.repos.listReleases = fn().mockReturnValueOnce(
            Promise.resolve({ data: [require('./fixtures/release')] })
          )
          github.repos.compareCommits = fn().mockReturnValueOnce(
            Promise.resolve({
              data: {
                commits: require('./fixtures/commits')
              }
            })
          )
          github.pullRequests.get = fn()
            .mockReturnValueOnce(
              Promise.resolve(require('./fixtures/pull-request-1'))
            )
            .mockReturnValueOnce(
              Promise.resolve(require('./fixtures/pull-request-2'))
            )

          github.repos.createRelease = fn()

          await probot.receive({
            name: 'push',
            payload: require('./fixtures/push')
          })

          expect(github.repos.createRelease).toBeCalledWith(
            expect.objectContaining({
              body: `A big thanks to: @another-user, @toolmantim and Ada`,
              draft: true,
              tag_name: ''
            })
          )
        })
      })
    })

    describe('with no changes since the last release', () => {
      it('creates a new draft with no changes', async () => {
        github.repos.getContents = fn().mockReturnValueOnce(
          mockConfig('config.yml')
        )
        github.repos.listReleases = fn().mockReturnValueOnce(
          Promise.resolve({
            data:
              // Tests whether it sorts releases properly
              [
                require('./fixtures/release-2'),
                require('./fixtures/release'),
                require('./fixtures/release-3')
              ]
          })
        )
        github.repos.compareCommits = fn().mockReturnValueOnce(
          Promise.resolve({ data: { commits: [] } })
        )
        github.repos.createRelease = fn()

        await probot.receive({
          name: 'push',
          payload: require('./fixtures/push')
        })

        expect(github.repos.compareCommits).toBeCalledWith(
          expect.objectContaining({
            base: 'v2.0.0',
            head: 'master'
          })
        )
        expect(github.repos.createRelease).toBeCalledWith(
          expect.objectContaining({
            body: `# What's Changed

* No changes
`,
            draft: true,
            tag_name: ''
          })
        )
      })

      describe('with custom no-changes-template config', () => {
        it('creates a new draft with the template', async () => {
          github.repos.getContents = fn().mockReturnValueOnce(
            mockConfig('config-with-changes-templates.yml')
          )
          github.repos.listReleases = fn().mockReturnValueOnce(
            Promise.resolve({ data: [] })
          )
          github.repos.listCommits = fn().mockReturnValueOnce(
            Promise.resolve({ data: [] })
          )
          github.repos.createRelease = fn()

          await probot.receive({
            name: 'push',
            payload: require('./fixtures/push')
          })

          expect(github.repos.createRelease).toBeCalledWith(
            expect.objectContaining({
              body: `* No changes mmkay`,
              draft: true,
              tag_name: ''
            })
          )
        })
      })
    })

    describe('with an existing draft release', () => {
      it('updates the existing release’s body', async () => {
        github.repos.getContents = fn().mockReturnValueOnce(
          mockConfig('config.yml')
        )
        github.repos.listReleases = fn().mockReturnValueOnce(
          Promise.resolve({ data: [require('./fixtures/release-draft.json')] })
        )
        github.repos.listCommits = fn().mockReturnValueOnce(
          Promise.resolve({ data: require('./fixtures/commits') })
        )
        github.pullRequests.get = fn()
          .mockReturnValueOnce(
            Promise.resolve(require('./fixtures/pull-request-1'))
          )
          .mockReturnValueOnce(
            Promise.resolve(require('./fixtures/pull-request-2'))
          )
        github.repos.updateRelease = fn()

        await probot.receive({
          name: 'push',
          payload: require('./fixtures/push')
        })

        expect(github.repos.updateRelease).toBeCalledWith(
          expect.objectContaining({
            body: `# What's Changed

* More cowbell (#1) @toolmantim
* Integrate alien technology (#2) @another-user
`
          })
        )
      })
    })

    describe('with categories config', () => {
      it('categorizes pull requests', async () => {
        github.repos.getContents = fn().mockReturnValueOnce(
          mockConfig('config-with-categories.yml')
        )
        github.repos.listReleases = fn().mockReturnValueOnce(
          Promise.resolve({ data: [require('./fixtures/release')] })
        )
        github.repos.compareCommits = fn().mockReturnValueOnce(
          Promise.resolve({
            data: {
              commits: require('./fixtures/commits-2')
            }
          })
        )
        github.pullRequests.get = fn()
          .mockReturnValueOnce(
            Promise.resolve(require('./fixtures/pull-request-1'))
          )
          .mockReturnValueOnce(
            Promise.resolve(require('./fixtures/pull-request-2'))
          )
          .mockReturnValueOnce(
            Promise.resolve(require('./fixtures/pull-request-3'))
          )
          .mockReturnValueOnce(
            Promise.resolve(require('./fixtures/pull-request-4'))
          )

        github.repos.createRelease = fn()

        await probot.receive({
          name: 'push',
          payload: require('./fixtures/push')
        })

        expect(github.repos.createRelease).toBeCalledWith(
          expect.objectContaining({
            body: `# What's Changed

* Updated documentation (#4) @another-user

## 🚀 Features

* More cowbell (#1) @toolmantim

## 🐛 Bug Fixes

* Integrate alien technology (#2) @another-user
* Fixed a bug (#3) @another-user
`,
            draft: true,
            tag_name: ''
          })
        )
      })
    })
  })
})
