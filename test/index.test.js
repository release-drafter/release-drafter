const nock = require('nock')
const route = require('nock-knock/lib').default
const { Probot, Octokit } = require('probot')
const getConfigMock = require('./helpers/config-mock')
const releaseDrafter = require('../index')

nock.disableNetConnect()

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
        getConfigMock()

        nock('https://api.github.com')
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
          getConfigMock('config-non-master-branch.yml')

          nock('https://api.github.com')
            .post('/graphql', body =>
              body.query.includes('query getCommitsWithAssociatedPullRequests')
            )
            .reply(200, require('./fixtures/graphql-commits-empty.json'))

          nock('https://api.github.com')
            .get('/repos/toolmantim/release-drafter-test-project/releases')
            .query(true)
            .reply(200, [require('./fixtures/release')])
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
        getConfigMock('config-previous-tag.yml')

        nock('https://api.github.com')
          .post('/graphql', body =>
            body.query.includes('query getCommitsWithAssociatedPullRequests')
          )
          .reply(200, require('./fixtures/graphql-commits-merge-commit.json'))

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [])

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            body => {
              expect(body).toMatchObject({
                body: `Changes:
* Implement homepage (#3) @TimonVS
* Add Prettier config (#2) @TimonVS
* Add EditorConfig (#1) @TimonVS

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
        getConfigMock()

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [
            require('./fixtures/release-2'),
            require('./fixtures/release'),
            require('./fixtures/release-3')
          ])

        nock('https://api.github.com')
          .post('/graphql', body =>
            body.query.includes('query getCommitsWithAssociatedPullRequests')
          )
          .reply(200, require('./fixtures/graphql-commits-merge-commit.json'))

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            body => {
              expect(body).toMatchObject({
                body: `# What's Changed

* Implement homepage (#3) @TimonVS
* Add Prettier config (#2) @TimonVS
* Add EditorConfig (#1) @TimonVS
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
        getConfigMock('config-with-next-versioning.yml')

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [require('./fixtures/release')])

        nock('https://api.github.com')
          .post('/graphql', body =>
            body.query.includes('query getCommitsWithAssociatedPullRequests')
          )
          .reply(200, require('./fixtures/graphql-commits-merge-commit.json'))

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
          getConfigMock('config-with-changes-templates.yml')

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [require('./fixtures/release')])

          nock('https://api.github.com')
            .post('/graphql', body =>
              body.query.includes('query getCommitsWithAssociatedPullRequests')
            )
            .reply(200, require('./fixtures/graphql-commits-merge-commit.json'))

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              body => {
                expect(body).toMatchObject({
                  body: `* Change: #2 'Integrate alien technology' @another-user
* Change: #1 'More cowbell' @toolmantim`,
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
      })

      describe('with contributors config', () => {
        it('adds the contributors', async () => {
          getConfigMock('config-with-contributors.yml')

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [require('./fixtures/release')])

          nock('https://api.github.com')
            .post('/graphql', body =>
              body.query.includes('query getCommitsWithAssociatedPullRequests')
            )
            .reply(200, require('./fixtures/graphql-commits-merge-commit.json'))

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              body => {
                expect(body).toMatchObject({
                  body: `A big thanks to: @another-user, @toolmantim and Ada`,
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
      })
    })

    describe('with no changes since the last release', () => {
      it('creates a new draft with no changes', async () => {
        getConfigMock()

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [
            require('./fixtures/release-2'),
            require('./fixtures/release'),
            require('./fixtures/release-3')
          ])

        nock('https://api.github.com')
          .post('/graphql', body =>
            body.query.includes('query getCommitsWithAssociatedPullRequests')
          )
          .reply(200, require('./fixtures/graphql-commits-merge-commit.json'))

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            body => {
              expect(body).toMatchObject({
                body: `# What's Changed

* No changes
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

      describe('with custom no-changes-template config', () => {
        it('creates a new draft with the template', async () => {
          getConfigMock('config-with-changes-templates.yml')

          nock('https://api.github.com')
            .get('/repos/toolmantim/release-drafter-test-project/releases')
            .query(true)
            .reply(200, [])

          nock('https://api.github.com')
            .post('/graphql', body =>
              body.query.includes('query getCommitsWithAssociatedPullRequests')
            )
            .reply(200, require('./fixtures/graphql-commits-merge-commit.json'))

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              body => {
                expect(body).toMatchObject({
                  body: `* No changes mmkay`,
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
      })
    })

    describe('with an existing draft release', () => {
      it('updates the existing release’s body', async () => {
        getConfigMock()

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [require('./fixtures/release-draft.json')])

        nock('https://api.github.com')
          .post('/graphql', body =>
            body.query.includes('query getCommitsWithAssociatedPullRequests')
          )
          .reply(200, require('./fixtures/graphql-commits-merge-commit.json'))

        nock('https://api.github.com')
          .patch(
            '/repos/toolmantim/release-drafter-test-project/releases/11691725',
            body => {
              expect(body).toMatchObject({
                body: `# What's Changed

* Integrate alien technology (#2) @another-user
* More cowbell (#1) @toolmantim
`
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
    })

    describe('with categories config', () => {
      it('categorizes pull requests', async () => {
        getConfigMock('config-with-categories.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [require('./fixtures/release')])

        nock('https://api.github.com')
          .post('/graphql', body =>
            body.query.includes('query getCommitsWithAssociatedPullRequests')
          )
          .reply(200, require('./fixtures/graphql-commits-merge-commit.json'))

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            body => {
              expect(body).toMatchObject({
                body: `# What's Changed

* Updated documentation (#4) @another-user

## 🚀 Features

* More cowbell (#1) @toolmantim

## 🐛 Bug Fixes

* Fixed a bug (#3) @another-user
* Integrate alien technology (#2) @another-user
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
    })

    describe('with exclude-labels config', () => {
      it('excludes pull requests', async () => {
        getConfigMock('config-with-exclude-labels.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [require('./fixtures/release')])
          .get(
            '/repos/toolmantim/release-drafter-test-project/compare/v2.0.0...master'
          )
          .reply(200, {
            commits: require('./fixtures/commits-2')
          })

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/pulls/1')
          .reply(200, require('./fixtures/pull-request-1.json'))
          .get('/repos/toolmantim/release-drafter-test-project/pulls/2')
          .reply(200, require('./fixtures/pull-request-2.json'))
          .get('/repos/toolmantim/release-drafter-test-project/pulls/3')
          .reply(200, require('./fixtures/pull-request-3.json'))
          .get('/repos/toolmantim/release-drafter-test-project/pulls/4')
          .reply(200, require('./fixtures/pull-request-4.json'))

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            body => {
              expect(body).toMatchObject({
                body: `# What's Changed

* Updated documentation (#4) @another-user

## 🐛 Bug Fixes

* Fixed a bug (#3) @another-user
* Integrate alien technology (#2) @another-user
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
    })

    describe('with version-template config', () => {
      it('generates next version variables as major.minor.patch', async () => {
        getConfigMock('config-with-major-minor-patch-version-template.yml')

        nock('https://api.github.com')
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

      it('generates next version variables as major.minor', async () => {
        getConfigMock('config-with-major-minor-version-template.yml')

        nock('https://api.github.com')
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
                body: `Placeholder with example. Automatically calculated values are next major=3.0, minor=2.1, patch=2.0`,
                draft: true,
                name: 'v2.1 (Code name: Placeholder)',
                tag_name: 'v2.1'
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

      it('generates next version variables as major', async () => {
        getConfigMock('config-with-major-version-template.yml')

        nock('https://api.github.com')
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
                body: `Placeholder with example. Automatically calculated values are next major=3, minor=2, patch=2`,
                draft: true,
                name: 'v3 (Code name: Placeholder)',
                tag_name: 'v3'
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
    })
  })
})
