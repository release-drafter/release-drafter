const nock = require('nock')
const { Probot, ProbotOctokit } = require('probot')
const { getConfigMock } = require('./helpers/config-mock')
const releaseDrafter = require('../index')
const mockedEnv = require('mocked-env')
const pino = require('pino')
const Stream = require('stream')
const pushPayload = require('./fixtures/push.json')
const pushTagPayload = require('./fixtures/push-tag.json')
const releasePayload = require('./fixtures/release.json')
const release2Payload = require('./fixtures/release-2.json')
const release3Payload = require('./fixtures/release-3.json')
const pushNonMasterPayload = require('./fixtures/push-non-master-branch.json')
const graphqlCommitsNoPRsPayload = require('./fixtures/graphql-commits-no-prs.json')
const graphqlCommitsMergeCommit = require('./fixtures/__generated__/graphql-commits-merge-commit.json')
const graphqlNullIncludePathMergeCommit = require('./fixtures/__generated__/graphql-include-null-path-merge-commit.json')
const graphqlIncludePathMergeCommit = require('./fixtures/__generated__/graphql-include-path-src-5.md-merge-commit.json')
const graphqlCommitsEmpty = require('./fixtures/graphql-commits-empty.json')
const releaseDrafterFixture = require('./fixtures/release-draft.json')
const graphqlCommitsOverlappingLabel = require('./fixtures/__generated__/graphql-commits-overlapping-label.json')
const graphqlCommitsRebaseMerging = require('./fixtures/__generated__/graphql-commits-rebase-merging.json')
const graphqlCommitsSquashMerging = require('./fixtures/__generated__/graphql-commits-squash-merging.json')
const releaseSharedCommitDate = require('./fixtures/release-shared-commit-date.json')
const graphqlCommitsForking = require('./fixtures/__generated__/graphql-commits-forking.json')
const graphqlCommitsPaginated1 = require('./fixtures/graphql-commits-paginated-1.json')
const graphqlCommitsPaginated2 = require('./fixtures/graphql-commits-paginated-2.json')

nock.disableNetConnect()

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
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
  let logger
  let restoreEnvironment

  const streamLogsToOutput = new Stream.Writable({ objectMode: true })
  streamLogsToOutput._write = (object, encoding, done) => {
    logger.push(JSON.parse(object))
    done()
  }

  probot = new Probot({
    appId: 179_208,
    privateKey,
    githubToken: 'test',
    Octokit: ProbotOctokit.defaults({
      retry: { enabled: false },
      throttle: { enabled: false },
    }),
    log: pino(streamLogsToOutput),
  })
  probot.load(releaseDrafter)

  beforeEach(() => {
    logger = []

    nock('https://api.github.com')
      .post('/app/installations/179208/access_tokens')
      .reply(200, { token: 'test' })

    let mockEnvironment = {}

    // We have to delete all the GITHUB_* envs before every test, because if
    // we're running the tests themselves inside a GitHub Actions container
    // they'll mess with the tests, and also because we set some of them in
    // tests and we don't want them to leak into other tests.
    for (const key of Object.keys(process.env).filter((key) =>
      key.match(/^GITHUB_/)
    )) {
      mockEnvironment[key] = undefined
    }

    restoreEnvironment = mockedEnv(mockEnvironment)
  })

  afterAll(nock.restore)

  afterEach(() => {
    nock.cleanAll()
    restoreEnvironment()
  })

  describe('push', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/contents/.github%2Frelease-drafter.yml'
          )
          .reply(404)
          .get(
            '/repos/toolmantim/.github/contents/.github%2Frelease-drafter.yml'
          )
          .reply(404)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })
      })
    })

    describe('to a non-master branch', () => {
      it('does nothing', async () => {
        getConfigMock()

        nock('https://api.github.com')
          .post('/repos/:owner/:repo/releases')
          .reply(200, () => {
            throw new Error("Shouldn't create a new release")
          })
          .patch('/repos/:owner/:repo/releases/:release_id')
          .reply(200, () => {
            throw new Error("Shouldn't update an existing release")
          })

        await probot.receive({
          name: 'push',
          payload: pushNonMasterPayload,
        })
      })

      describe('when configured for that branch', () => {
        it('creates a release draft targeting that branch', async () => {
          getConfigMock('config-non-master-branch.yml')

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsNoPRsPayload)

          nock('https://api.github.com')
            .get('/repos/toolmantim/release-drafter-test-project/releases')
            .query(true)
            .reply(200, [releasePayload])
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "# What's Changed

                  * No changes
                  ",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/some-branch",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushNonMasterPayload,
          })
        })
      })
    })

    describe('to a tag', () => {
      it('does nothing', async () => {
        getConfigMock('config-tag-reference.yml')

        nock('https://api.github.com')
          .post('/repos/:owner/:repo/releases')
          .reply(200, () => {
            throw new Error("Shouldn't create a new release")
          })
          .patch('/repos/:owner/:repo/releases/:release_id')
          .reply(200, () => {
            throw new Error("Shouldn't update an existing release")
          })

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })
      })

      describe('when configured for that tag', () => {
        it('creates a release draft', async () => {
          getConfigMock('config-tag-reference.yml')

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsMergeCommit)

          nock('https://api.github.com')
            .get('/repos/toolmantim/release-drafter-test-project/releases')
            .query(true)
            .reply(200, [releasePayload])
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "# What's Changed

                  * Add documentation (#5) @TimonVS
                  * Update dependencies (#4) @TimonVS
                  * Bug fixes (#3) @TimonVS
                  * Add big feature (#2) @TimonVS
                  * 👽 Add alien technology (#1) @TimonVS
                  ",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushTagPayload,
          })
        })
      })
    })

    describe('with no past releases', () => {
      it('sets $CHANGES based on all commits, and $PREVIOUS_TAG to blank', async () => {
        getConfigMock('config-previous-tag.yml')

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [])

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "Changes:
                * Add documentation (#5) @TimonVS
                * Update dependencies (#4) @TimonVS
                * Bug fixes (#3) @TimonVS
                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS

                Previous tag: ''
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        const payload = pushPayload

        await probot.receive({
          name: 'push',
          payload,
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
          .reply(200, [release2Payload, releasePayload, release3Payload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Add documentation (#5) @TimonVS
                * Update dependencies (#4) @TimonVS
                * Bug fixes (#3) @TimonVS
                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })

      it('creates a new draft when run as a GitHub Action', async () => {
        getConfigMock()

        // GitHub actions should use the GITHUB_REF and not the payload ref
        process.env['GITHUB_REF'] = 'refs/heads/master'
        process.env['GITHUB_ACTIONS'] = 'true'

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [release2Payload, releasePayload, release3Payload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Add documentation (#5) @TimonVS
                * Update dependencies (#4) @TimonVS
                * Bug fixes (#3) @TimonVS
                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          // This payload has a different ref to GITHUB_REF, which is how GitHub
          // Action merge push payloads behave
          payload: pushNonMasterPayload,
        })

        expect.assertions(1)
      })

      it('makes next versions available as template placeholders', async () => {
        getConfigMock('config-with-next-versioning.yml')

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "Placeholder with example. Automatically calculated values are next major=3.0.0 (major=3, minor=0, patch=0), minor=2.1.0 (major=2, minor=1, patch=0), patch=2.0.1 (major=2, minor=0, patch=1)",
                  "draft": true,
                  "name": "v2.0.1 (Code name: Placeholder)",
                  "prerelease": false,
                  "tag_name": "v2.0.1",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
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
            .reply(200, [releasePayload])

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsMergeCommit)

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "* Change: #5 'Add documentation' @TimonVS
                  * Change: #4 'Update dependencies' @TimonVS
                  * Change: #3 'Bug fixes' @TimonVS
                  * Change: #2 'Add big feature' @TimonVS
                  * Change: #1 '👽 Add alien technology' @TimonVS",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushPayload,
          })

          expect.assertions(1)
        })
      })

      describe('with custom changes-template config that includes a pull request body', () => {
        it('creates a new draft using the template', async () => {
          getConfigMock('config-with-changes-templates-and-body.yml')

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [releasePayload])

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsMergeCommit)

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "* Change: #5 'Add documentation' ✍️ writing docs all day
                  * Change: #4 'Update dependencies' 📦 Package time! 📦
                  * Change: #3 'Bug fixes' 🐛 squashing
                  * Change: #2 'Add big feature' ![I'm kind of a big deal](https://media.giphy.com/media/9LFBOD8a1Ip2M/giphy.gif)
                  * Change: #1 '👽 Add alien technology' Space invasion 👾",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushPayload,
          })

          expect.assertions(1)
        })
      })

      describe('with custom changes-template config that includes a pull request URL', () => {
        it('creates a new draft using the template', async () => {
          getConfigMock('config-with-changes-templates-and-url.yml')

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [releasePayload])

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsMergeCommit)

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "* Change: https://github.com/toolmantim/release-drafter-test-project/pull/5 'Add documentation' @TimonVS
                  * Change: https://github.com/toolmantim/release-drafter-test-project/pull/4 'Update dependencies' @TimonVS
                  * Change: https://github.com/toolmantim/release-drafter-test-project/pull/3 'Bug fixes' @TimonVS
                  * Change: https://github.com/toolmantim/release-drafter-test-project/pull/2 'Add big feature' @TimonVS
                  * Change: https://github.com/toolmantim/release-drafter-test-project/pull/1 '👽 Add alien technology' @TimonVS",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushPayload,
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
            .reply(200, [releasePayload])

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsMergeCommit)

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "A big thanks to: @TimonVS and Ada Lovelace",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushPayload,
          })

          expect.assertions(1)
        })

        it('uses no-contributors-template when there are no contributors', async () => {
          getConfigMock('config-with-contributors.yml')

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [releasePayload])

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsEmpty)

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "A big thanks to: Nobody",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushPayload,
          })

          expect.assertions(1)
        })
      })

      describe('with exclude-contributors config', () => {
        it('excludes matching contributors by username', async () => {
          getConfigMock('config-with-exclude-contributors.yml')

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [releasePayload])

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsMergeCommit)

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "A big thanks to: Ada Lovelace",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushPayload,
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
          .reply(200, [release2Payload, releasePayload, release3Payload])

        nock('https://api.github.com')
          .post('/graphql', (body) => {
            expect(body.variables.since).toBe(release3Payload.created_at)
            return body.query.includes(
              'query findCommitsWithAssociatedPullRequests'
            )
          })
          .reply(200, graphqlCommitsEmpty)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * No changes
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(2)
      })

      describe('with custom no-changes-template config', () => {
        it('creates a new draft with the template', async () => {
          getConfigMock('config-with-changes-templates.yml')

          nock('https://api.github.com')
            .get('/repos/toolmantim/release-drafter-test-project/releases')
            .query(true)
            .reply(200, [])

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsEmpty)

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "* No changes mmkay",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushPayload,
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
          .reply(200, [releaseDrafterFixture])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .patch(
            '/repos/toolmantim/release-drafter-test-project/releases/11691725',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Add documentation (#5) @TimonVS
                * Update dependencies (#4) @TimonVS
                * Bug fixes (#3) @TimonVS
                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS
                ",
                  "draft": true,
                  "name": "v3.0.0-beta",
                  "prerelease": false,
                  "tag_name": "v3.0.0-beta",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('with owner and repository templating', () => {
      it('include full-changelog link in output', async () => {
        getConfigMock('config-with-compare-link.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Add documentation (#5) @TimonVS
                * Update dependencies (#4) @TimonVS

                ## 🚀 Features

                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS

                ## 🐛 Bug Fixes

                * Bug fixes (#3) @TimonVS

                **Full Changelog**: https://github.com/toolmantim/release-drafter-test-project/compare/v2.0.0...v2.0.1
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('with categories config', () => {
      it('categorizes pull requests with single label', async () => {
        getConfigMock('config-with-categories.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Add documentation (#5) @TimonVS
                * Update dependencies (#4) @TimonVS

                ## 🚀 Features

                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS

                ## 🐛 Bug Fixes

                * Bug fixes (#3) @TimonVS
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })

      it('categorizes pull requests with other category at the bottom', async () => {
        getConfigMock('config-with-categories-with-other-category.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                ## 🚀 Features

                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS

                ## 🐛 Bug Fixes

                * Bug fixes (#3) @TimonVS

                ## 📝 Other Changes

                * Add documentation (#5) @TimonVS
                * Update dependencies (#4) @TimonVS
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })

      it('categorizes pull requests with multiple labels', async () => {
        getConfigMock('config-with-categories-2.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Add documentation (#5) @TimonVS
                * Update dependencies (#4) @TimonVS

                ## 🚀 Features

                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS

                ## 🐛 Bug Fixes

                * Bug fixes (#3) @TimonVS
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })

      it('categorizes pull requests with overlapping labels', async () => {
        getConfigMock('config-with-categories-3.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsOverlappingLabel)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Add documentation (#22) @jetersen
                * Update dependencies (#21) @jetersen

                ## 🚀 Features

                * Add big feature (#19) @jetersen
                * Add alien technology (#18) @jetersen

                ## 🐛 Bug Fixes

                * Bug fixes (#20) @jetersen
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })

      it('categorizes pull requests with overlapping labels into multiple categories', async () => {
        getConfigMock('config-with-categories-4.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsOverlappingLabel)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Add documentation (#22) @jetersen
                * Update dependencies (#21) @jetersen

                ## 🚀 Features

                * Add big feature (#19) @jetersen
                * Add alien technology (#18) @jetersen

                ## 🐛 Bug Fixes

                * Bug fixes (#20) @jetersen

                ## 🎖️ Sentry

                * Bug fixes (#20) @jetersen
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
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
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Update dependencies (#4) @TimonVS

                ## 🚀 Features

                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS

                ## 🐛 Bug Fixes

                * Bug fixes (#3) @TimonVS
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('with include-labels config', () => {
      it('includes pull requests', async () => {
        getConfigMock('config-with-include-labels.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                ## 🚀 Features

                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('with version-template config', () => {
      it('generates next version variables as major.minor.patch', async () => {
        getConfigMock('config-with-major-minor-patch-version-template.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "Placeholder with example. Automatically calculated values are next major=3.0.0 (major=3, minor=0, patch=0), minor=2.1.0 (major=2, minor=1, patch=0), patch=2.0.1 (major=2, minor=0, patch=1)",
                  "draft": true,
                  "name": "v2.0.1 (Code name: Placeholder)",
                  "prerelease": false,
                  "tag_name": "v2.0.1",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })

      it('generates next version variables as major.minor', async () => {
        getConfigMock('config-with-major-minor-version-template.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "Placeholder with example. Automatically calculated values are next major=3.0 (major=3, minor=0, patch=0), minor=2.1 (major=2, minor=1, patch=0), patch=2.0 (major=2, minor=0, patch=1)",
                  "draft": true,
                  "name": "v2.1 (Code name: Placeholder)",
                  "prerelease": false,
                  "tag_name": "v2.1",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })

      it('generates next version variables as major', async () => {
        getConfigMock('config-with-major-version-template.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "Placeholder with example. Automatically calculated values are next major=3 (major=3, minor=0, patch=0), minor=2 (major=2, minor=1, patch=0), patch=2 (major=2, minor=0, patch=1)",
                  "draft": true,
                  "name": "v3 (Code name: Placeholder)",
                  "prerelease": false,
                  "tag_name": "v3",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('with header and footer config', () => {
      it('only header', async () => {
        getConfigMock('config-with-header-template.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "This is at top
                This is the template in the middle
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
      it('only footer', async () => {
        getConfigMock('config-with-footer-template.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "This is the template in the middle
                This is at bottom
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
      it('header and footer', async () => {
        getConfigMock('config-with-header-and-footer-template.yml')

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "This is at top
                This is the template in the middle
                This is at bottom
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
      it('header and footer without line break and without space', async () => {
        getConfigMock(
          'config-with-header-and-footer-no-nl-no-space-template.yml'
        )

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "This is at topThis is the template in the middleThis is at bottom",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('merging strategies', () => {
      describe('merge commit', () => {
        it('sets $CHANGES based on all commits', async () => {
          getConfigMock()

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsMergeCommit)

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [])

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "# What's Changed

                  * Add documentation (#5) @TimonVS
                  * Update dependencies (#4) @TimonVS
                  * Bug fixes (#3) @TimonVS
                  * Add big feature (#2) @TimonVS
                  * 👽 Add alien technology (#1) @TimonVS
                  ",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          const payload = pushPayload

          await probot.receive({
            name: 'push',
            payload,
          })

          expect.assertions(1)
        })
      })

      describe('rebase merging', () => {
        it('sets $CHANGES based on all commits', async () => {
          getConfigMock()

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsRebaseMerging)

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [])

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "# What's Changed

                  * Add documentation (#10) @TimonVS
                  * Update dependencies (#9) @TimonVS
                  * Bug fixes (#8) @TimonVS
                  * Add big feature (#7) @TimonVS
                  * 👽 Add alien technology (#6) @TimonVS
                  ",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          const payload = pushPayload

          await probot.receive({
            name: 'push',
            payload,
          })

          expect.assertions(1)
        })
      })

      describe('squash merging', () => {
        it('sets $CHANGES based on all commits', async () => {
          getConfigMock()

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsSquashMerging)

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [])

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "# What's Changed

                  * Add documentation (#15) @TimonVS
                  * Update dependencies (#14) @TimonVS
                  * Bug fixes (#13) @TimonVS
                  * Add big feature (#12) @TimonVS
                  * 👽 Add alien technology (#11) @TimonVS
                  ",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          const payload = pushPayload

          await probot.receive({
            name: 'push',
            payload,
          })

          expect.assertions(1)
        })

        it('Commit from previous release tag is not included', async () => {
          getConfigMock()

          nock('https://api.github.com')
            .get(
              '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
            )
            .reply(200, [releaseSharedCommitDate])

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsSquashMerging)

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "# What's Changed

                  * Add documentation (#15) @TimonVS
                  * Update dependencies (#14) @TimonVS
                  * Bug fixes (#13) @TimonVS
                  * Add big feature (#12) @TimonVS
                  ",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushPayload,
          })

          expect.assertions(1)
        })
      })

      describe('with forked pull request', () => {
        it('exclude forked pull requests', async () => {
          getConfigMock()

          nock('https://api.github.com')
            .get('/repos/toolmantim/release-drafter-test-project/releases')
            .query(true)
            .reply(200, [releasePayload])

          nock('https://api.github.com')
            .post('/graphql', (body) =>
              body.query.includes('query findCommitsWithAssociatedPullRequests')
            )
            .reply(200, graphqlCommitsForking)

          nock('https://api.github.com')
            .post(
              '/repos/toolmantim/release-drafter-test-project/releases',
              (body) => {
                expect(body).toMatchInlineSnapshot(`
                  Object {
                    "body": "# What's Changed

                  * Add documentation (#28) @jetersen
                  * Update dependencies (#27) @jetersen
                  * Bug fixes (#25) @jetersen
                  * Add big feature (#24) @jetersen
                  * Add alien technology (#23) @jetersen
                  * Add documentation (#5) @TimonVS
                  * Update dependencies (#4) @TimonVS
                  ",
                    "draft": true,
                    "name": "",
                    "prerelease": false,
                    "tag_name": "",
                    "target_commitish": "refs/heads/master",
                  }
                `)
                return true
              }
            )
            .reply(200, releasePayload)

          await probot.receive({
            name: 'push',
            payload: pushPayload,
          })

          expect.assertions(1)
        })
      })
    })

    describe('pagination', () => {
      it('sets $CHANGES based on all commits', async () => {
        getConfigMock('config.yml')

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsPaginated1)
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsPaginated2)

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [])

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Added great distance (#16) @toolmantim
                * Oh hai (#15) @toolmantim
                * ❤️ Add MOAR THINGS (#14) @toolmantim
                * Add all the tests (#13) @toolmantim
                * 🤖 Add robots (#12) @toolmantim
                * 🎃 More pumpkins (#11) @toolmantim
                * 🐄 Moar cowbell (#10) @toolmantim
                * 1️⃣ Switch to a monorepo (#9) @toolmantim
                * 👽 Integrate Alien technology (#8) @toolmantim
                * Add ⛰ technology (#7) @toolmantim
                * 👽 Added alien technology (#6) @toolmantim
                * 🙅🏼‍♂️ 🐄 (#5) @toolmantim
                * 🐄 More cowbell (#4) @toolmantim
                * 🐒 Add monkeys technology (#3) @toolmantim
                * Adds a new Widgets API (#2) @toolmantim
                * Create new-feature.md (#1) @toolmantim
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        const payload = pushPayload

        await probot.receive({
          name: 'push',
          payload,
        })

        expect.assertions(1)
      })
    })

    describe('custom replacers', () => {
      it('replaces a string', async () => {
        getConfigMock('config-with-replacers.yml')

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsMergeCommit)

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [])

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "# What's Changed

                * Add documentation (#1000) @TimonVS
                * Update dependencies (#4) @TimonVS
                * Bug fixes (#3) @TimonVS
                * Add big feature (#2) @TimonVS
                * 👽 Add alien technology (#1) @TimonVS
                ",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        const payload = pushPayload

        await probot.receive({
          name: 'push',
          payload,
        })

        expect.assertions(1)
      })
    })
  })

  describe('with sort-by config', () => {
    it('sorts by title', async () => {
      getConfigMock('config-with-sort-by-title.yml')

      nock('https://api.github.com')
        .post('/graphql', (body) =>
          body.query.includes('query findCommitsWithAssociatedPullRequests')
        )
        .reply(200, graphqlCommitsPaginated1)
        .post('/graphql', (body) =>
          body.query.includes('query findCommitsWithAssociatedPullRequests')
        )
        .reply(200, graphqlCommitsPaginated2)

      nock('https://api.github.com')
        .get(
          '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
        )
        .reply(200, [])

      nock('https://api.github.com')
        .post(
          '/repos/toolmantim/release-drafter-test-project/releases',
          (body) => {
            expect(body).toMatchInlineSnapshot(`
              Object {
                "body": "# What's Changed

              * 🤖 Add robots (#12) @toolmantim
              * 🙅🏼‍♂️ 🐄 (#5) @toolmantim
              * 👽 Integrate Alien technology (#8) @toolmantim
              * 👽 Added alien technology (#6) @toolmantim
              * 🐒 Add monkeys technology (#3) @toolmantim
              * 🐄 More cowbell (#4) @toolmantim
              * 🐄 Moar cowbell (#10) @toolmantim
              * 🎃 More pumpkins (#11) @toolmantim
              * ❤️ Add MOAR THINGS (#14) @toolmantim
              * Oh hai (#15) @toolmantim
              * Create new-feature.md (#1) @toolmantim
              * Adds a new Widgets API (#2) @toolmantim
              * Added great distance (#16) @toolmantim
              * Add ⛰ technology (#7) @toolmantim
              * Add all the tests (#13) @toolmantim
              * 1️⃣ Switch to a monorepo (#9) @toolmantim
              ",
                "draft": true,
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "refs/heads/master",
              }
            `)
            return true
          }
        )
        .reply(200, releasePayload)

      const payload = pushPayload

      await probot.receive({
        name: 'push',
        payload,
      })

      expect.assertions(1)
    })
  })

  describe('with sort-direction config', () => {
    it('sorts ascending', async () => {
      getConfigMock('config-with-sort-direction-ascending.yml')

      nock('https://api.github.com')
        .post('/graphql', (body) =>
          body.query.includes('query findCommitsWithAssociatedPullRequests')
        )
        .reply(200, graphqlCommitsPaginated1)
        .post('/graphql', (body) =>
          body.query.includes('query findCommitsWithAssociatedPullRequests')
        )
        .reply(200, graphqlCommitsPaginated2)

      nock('https://api.github.com')
        .get(
          '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
        )
        .reply(200, [])

      nock('https://api.github.com')
        .post(
          '/repos/toolmantim/release-drafter-test-project/releases',
          (body) => {
            expect(body).toMatchInlineSnapshot(`
              Object {
                "body": "# What's Changed

              * Create new-feature.md (#1) @toolmantim
              * Adds a new Widgets API (#2) @toolmantim
              * 🐒 Add monkeys technology (#3) @toolmantim
              * 🐄 More cowbell (#4) @toolmantim
              * 🙅🏼‍♂️ 🐄 (#5) @toolmantim
              * 👽 Added alien technology (#6) @toolmantim
              * Add ⛰ technology (#7) @toolmantim
              * 👽 Integrate Alien technology (#8) @toolmantim
              * 1️⃣ Switch to a monorepo (#9) @toolmantim
              * 🐄 Moar cowbell (#10) @toolmantim
              * 🎃 More pumpkins (#11) @toolmantim
              * 🤖 Add robots (#12) @toolmantim
              * Add all the tests (#13) @toolmantim
              * ❤️ Add MOAR THINGS (#14) @toolmantim
              * Oh hai (#15) @toolmantim
              * Added great distance (#16) @toolmantim
              ",
                "draft": true,
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "refs/heads/master",
              }
            `)
            return true
          }
        )
        .reply(200, releasePayload)

      const payload = pushPayload

      await probot.receive({
        name: 'push',
        payload,
      })

      expect.assertions(1)
    })
  })

  describe('with include-paths config', () => {
    it('returns all PRs when not path filtered', async () => {
      getConfigMock('config-with-include-paths.yml')

      nock('https://api.github.com')
        .post('/graphql', (body) =>
          body.query.includes('query findCommitsWithAssociatedPullRequests')
        )
        .reply(200, graphqlCommitsMergeCommit)
        .post('/graphql', (body) =>
          body.query.includes('query findCommitsWithPathChangesQuery')
        )
        .reply(200, graphqlNullIncludePathMergeCommit)

      nock('https://api.github.com')
        .get(
          '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
        )
        .reply(200, [])

      nock('https://api.github.com')
        .post(
          '/repos/toolmantim/release-drafter-test-project/releases',
          (body) => {
            expect(body).toMatchInlineSnapshot(`
              Object {
                "body": "# What's Changed
              * Add documentation (#5) @TimonVS
              * Update dependencies (#4) @TimonVS
              * Bug fixes (#3) @TimonVS
              * Add big feature (#2) @TimonVS
              * 👽 Add alien technology (#1) @TimonVS
              ",
                "draft": true,
                "name": "v$INPUT_VERSION (Code name: Placeholder)",
                "prerelease": false,
                "tag_name": "v$INPUT_VERSION",
                "target_commitish": "refs/heads/master",
              }
            `)
            return true
          }
        )
        .reply(200, releasePayload)

      const payload = pushPayload

      await probot.receive({
        name: 'push',
        payload,
      })

      expect.assertions(1)
    })

    it('returns the modified paths', async () => {
      getConfigMock('config-with-include-paths.yml')

      nock('https://api.github.com')
        .post('/graphql', (body) =>
          body.query.includes('query findCommitsWithAssociatedPullRequests')
        )
        .reply(200, graphqlCommitsMergeCommit)
        .post('/graphql', (body) =>
          body.query.includes('query findCommitsWithPathChangesQuery')
        )
        .reply(200, graphqlIncludePathMergeCommit)

      nock('https://api.github.com')
        .get(
          '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
        )
        .reply(200, [])

      nock('https://api.github.com')
        .post(
          '/repos/toolmantim/release-drafter-test-project/releases',
          (body) => {
            expect(body).toMatchInlineSnapshot(`
              Object {
                "body": "# What's Changed
              * Add documentation (#5) @TimonVS
              ",
                "draft": true,
                "name": "v$INPUT_VERSION (Code name: Placeholder)",
                "prerelease": false,
                "tag_name": "v$INPUT_VERSION",
                "target_commitish": "refs/heads/master",
              }
            `)
            return true
          }
        )
        .reply(200, releasePayload)

      const payload = pushPayload

      await probot.receive({
        name: 'push',
        payload,
      })

      expect.assertions(1)
    })
  })

  describe('config error handling', () => {
    it('schema error', async () => {
      getConfigMock('config-with-schema-error.yml')

      const payload = pushPayload

      await probot.receive({
        name: 'push',
        payload,
      })
      expect(logger[0]).toEqual(
        expect.objectContaining({
          msg: expect.stringContaining('Invalid config file'),
          stack: expect.stringContaining(
            '"search" is required and must be a regexp or a string'
          ),
        })
      )
    })

    it('yaml exception', async () => {
      getConfigMock('config-with-yaml-exception.yml')

      const payload = pushPayload

      await probot.receive({
        name: 'push',
        payload,
      })
      expect(logger[0]).toEqual(
        expect.objectContaining({
          msg: expect.stringContaining('Invalid config file'),
          stack: expect.stringContaining(
            'Configuration could not be parsed from'
          ),
        })
      )
    })
  })

  describe('with config-name input', () => {
    it('loads from another config path', async () => {
      /*
        Mock
        with:
          config-name: 'config-name-input.yml'
      */
      let restoreEnvironment = mockedEnv({
        'INPUT_CONFIG-NAME': 'config-name-input.yml',
      })

      // Mock config request for file 'config-name-input.yml'
      const getConfigScope = getConfigMock(
        'config-name-input.yml',
        'config-name-input.yml'
      )

      nock('https://api.github.com')
        .post('/graphql', (body) =>
          body.query.includes('query findCommitsWithAssociatedPullRequests')
        )
        .reply(200, graphqlCommitsNoPRsPayload)

      nock('https://api.github.com')
        .get('/repos/toolmantim/release-drafter-test-project/releases')
        .query(true)
        .reply(200, [releasePayload])
        .post(
          '/repos/toolmantim/release-drafter-test-project/releases',
          (body) => {
            // Assert that the correct body was used
            expect(body).toMatchInlineSnapshot(`
              Object {
                "body": "# There's new stuff!
              ",
                "draft": true,
                "name": "",
                "prerelease": false,
                "tag_name": "",
                "target_commitish": "refs/heads/master",
              }
            `)
            return true
          }
        )
        .reply(200, releasePayload)

      await probot.receive({
        name: 'push',
        payload: pushPayload,
      })

      // Assert that the GET request was called for the correct config file
      expect(getConfigScope.isDone()).toBe(true)

      expect.assertions(2)

      restoreEnvironment()
    })
  })

  const overridesTest = async (overrides, expectedBody) => {
    let mockEnvironment = {}

    /*
      Mock
      with:
        # any combination (or none) of these input options (examples):
        version: '2.1.1'
        tag: 'v2.1.1-alpha'
        name: 'v2.1.1-alpha (Code name: Example)'
    */
    if (overrides) {
      if (overrides.version) {
        mockEnvironment['INPUT_VERSION'] = overrides.version
      }

      if (overrides.tag) {
        mockEnvironment['INPUT_TAG'] = overrides.tag
      }

      if (overrides.name) {
        mockEnvironment['INPUT_NAME'] = overrides.name
      }

      if (overrides.publish) {
        mockEnvironment['INPUT_PUBLISH'] = overrides.publish
      }

      if (overrides.prerelease) {
        mockEnvironment['INPUT_PRERELEASE'] = overrides.prerelease
      }
    }

    let restoreEnvironment_ = mockedEnv(mockEnvironment)

    const config =
      (overrides && overrides.configName) ||
      'config-with-input-version-template.yml'

    getConfigMock(config)

    nock('https://api.github.com')
      .get('/repos/toolmantim/release-drafter-test-project/releases')
      .query(true)
      .reply(200, [releasePayload])

    nock('https://api.github.com')
      .post('/graphql', (body) =>
        body.query.includes('query findCommitsWithAssociatedPullRequests')
      )
      .reply(200, graphqlCommitsMergeCommit)

    nock('https://api.github.com')
      .post(
        '/repos/toolmantim/release-drafter-test-project/releases',
        (body) => {
          expect(body).toMatchObject(expectedBody)
          return true
        }
      )
      .reply(200, releasePayload)

    await probot.receive({
      name: 'push',
      payload: pushPayload,
    })

    expect.assertions(1)

    restoreEnvironment_()
  }

  describe('input publish, prerelease, version, tag and name overrides', () => {
    // Method with all the test's logic, to prevent duplication

    describe('with just the version', () => {
      it('forces the version on templates', async () => {
        return overridesTest(
          { version: '2.1.1' },
          {
            body: `Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1. Manual input version is 2.1.1.`,
            draft: true,
            name: 'v2.1.1 (Code name: Placeholder)',
            tag_name: 'v2.1.1',
          }
        )
      })
    })

    describe('with just the tag', () => {
      it('gets the version from the tag and forces using the tag', async () => {
        return overridesTest(
          { tag: 'v2.1.1-alpha' },
          {
            body: `Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1. Manual input version is 2.1.1.`,
            draft: true,
            name: 'v2.1.1 (Code name: Placeholder)',
            tag_name: 'v2.1.1-alpha',
          }
        )
      })
    })

    describe('with just the tag containing variables', () => {
      it('gets the version from the tag and expands variables in it', async () => {
        return overridesTest(
          {
            tag: 'v$RESOLVED_VERSION-RC1',
            configName: 'config-with-name-and-tag-template.yml',
          },
          {
            body: `Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1.`,
            draft: true,
            name: 'v1.0.0-beta (Code name: Hello World)',
            tag_name: 'v1.0.0-RC1',
          }
        )
      })
    })

    describe('with just the name', () => {
      it('gets the version from the name and forces using the name', async () => {
        return overridesTest(
          { name: 'v2.1.1-alpha (Code name: Foxtrot Unicorn)' },
          {
            body: `Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1. Manual input version is 2.1.1.`,
            draft: true,
            name: 'v2.1.1-alpha (Code name: Foxtrot Unicorn)',
            tag_name: 'v2.1.1',
          }
        )
      })
    })

    describe('with just the name containing variables', () => {
      it('gets the version from the name and expands variables in it', async () => {
        return overridesTest(
          {
            name: 'v$RESOLVED_VERSION-RC1 (Code name: Hello World)',
            configName: 'config-with-name-and-tag-template.yml',
          },
          {
            body: `Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1.`,
            draft: true,
            name: 'v1.0.0-RC1 (Code name: Hello World)',
            tag_name: 'v1.0.0-beta',
          }
        )
      })
    })

    describe('with publish: true', () => {
      it('immediately publishes the created draft', async () => {
        return overridesTest(
          {
            version: '2.1.1',
            publish: 'true',
          },
          {
            body: `Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1. Manual input version is 2.1.1.`,
            draft: false,
            name: 'v2.1.1 (Code name: Placeholder)',
            tag_name: 'v2.1.1',
          }
        )
      })
    })

    describe('with input prerelease: true', () => {
      it('marks the created draft as prerelease', async () => {
        return overridesTest(
          {
            prerelease: 'true',
          },
          {
            draft: true,
            prerelease: true,
          }
        )
      })
    })

    describe('with input prerelease: false', () => {
      it('doesnt mark the created draft as prerelease', async () => {
        return overridesTest(
          {
            prerelease: 'false',
          },
          {
            draft: true,
            prerelease: false,
          }
        )
      })
    })

    describe('with input prerelease and publish: true', () => {
      it('marks the created release as a prerelease', async () => {
        return overridesTest(
          {
            prerelease: 'true',
            publish: 'true',
          },
          {
            draft: false,
            prerelease: true,
          }
        )
      })
    })

    describe('with input prerelease: true and config file prerelease: false', () => {
      it('marks the created draft as prerelease', async () => {
        return overridesTest(
          {
            prerelease: 'true',
            configName: 'config-without-prerelease.yml',
          },
          {
            draft: true,
            prerelease: true,
          }
        )
      })
    })

    describe('with input prerelease: false and config file prerelease: true', () => {
      it('doesnt mark the created draft as prerelease', async () => {
        return overridesTest(
          {
            prerelease: 'false',
            configName: 'config-with-prerelease.yml',
          },
          {
            draft: true,
            prerelease: false,
          }
        )
      })
    })

    describe('without input prerelease and config file prerelease: true', () => {
      it('marks the created draft as a prerelease', async () => {
        return overridesTest(
          {
            configName: 'config-with-prerelease.yml',
          },
          {
            draft: true,
            prerelease: true,
          }
        )
      })
    })

    describe('without input prerelease and config file prerelease: false', () => {
      it('doesnt mark the created draft as a prerelease', async () => {
        return overridesTest(
          {
            configName: 'config-without-prerelease.yml',
          },
          {
            draft: true,
            prerelease: false,
          }
        )
      })
    })

    describe('with tag and name', () => {
      it('gets the version from the tag and forces using the tag and name', async () => {
        return overridesTest(
          {
            tag: 'v2.1.1-foxtrot-unicorn-alpha',
            name: 'Foxtrot Unicorn',
          },
          {
            body: `Placeholder with example. Automatically calculated values based on previous releases are next major=3.0.0, minor=2.1.0, patch=2.0.1. Manual input version is 2.1.1.`,
            draft: true,
            name: 'Foxtrot Unicorn',
            tag_name: 'v2.1.1-foxtrot-unicorn-alpha',
          }
        )
      })
    })
  })

  describe('resolved version', () => {
    describe('without previous releases, overriding the tag', () => {
      it('resolves to the version extracted from the tag', async () => {
        let restoreEnvironment = mockedEnv({ INPUT_TAG: 'v1.0.2' })

        getConfigMock('config-with-resolved-version-template.yml')

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsEmpty)

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [])
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "## What's changed

                * No changes

                ## Contributors

                No contributors

                ## Previous release


                ",
                  "draft": true,
                  "name": "v1.0.2 🌈",
                  "prerelease": false,
                  "tag_name": "v1.0.2",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)

        restoreEnvironment()
      })
    })

    describe('with previous releases, overriding the tag', () => {
      it('resolves to the version extracted from the tag', async () => {
        let restoreEnvironment = mockedEnv({ INPUT_TAG: 'v1.0.2' })

        getConfigMock('config-with-resolved-version-template.yml')

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsNoPRsPayload)

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "## What's changed

                * No changes

                ## Contributors

                @TimonVS

                ## Previous release

                v2.0.0
                ",
                  "draft": true,
                  "name": "v1.0.2 🌈",
                  "prerelease": false,
                  "tag_name": "v1.0.2",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)

        restoreEnvironment()
      })
    })

    describe('without previous releases, no overrides', () => {
      it('resolves to the calculated version, which will be default', async () => {
        getConfigMock('config-with-resolved-version-template.yml')

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsEmpty)

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [])
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "## What's changed

                * No changes

                ## Contributors

                No contributors

                ## Previous release


                ",
                  "draft": true,
                  "name": "v0.1.0 🌈",
                  "prerelease": false,
                  "tag_name": "v0.1.0",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('with previous releases, no overrides', () => {
      it('resolves to the calculated version', async () => {
        getConfigMock('config-with-resolved-version-template.yml')

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsNoPRsPayload)

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [releasePayload])
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "## What's changed

                * No changes

                ## Contributors

                @TimonVS

                ## Previous release

                v2.0.0
                ",
                  "draft": true,
                  "name": "v2.0.1 🌈",
                  "prerelease": false,
                  "tag_name": "v2.0.1",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('with tag-prefix', () => {
      it('gets the version from the tag, stripping the prefix', async () => {
        getConfigMock('config-with-tag-prefix.yml')
        // Explicitly include a RC suffix in order to differentiate the
        // behaviour of semver.parse vs semver.coerce in versions.js
        //
        // We expect the release to be 2.1.4, not 2.1.5
        const alteredReleasePayload = {
          ...releasePayload,
          tag_name: 'static-tag-prefix-v2.1.4-RC3',
        }

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsNoPRsPayload)

        nock('https://api.github.com')
          .get('/repos/toolmantim/release-drafter-test-project/releases')
          .query(true)
          .reply(200, [alteredReleasePayload])
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "## Previous release

                static-tag-prefix-v2.1.4-RC3
                ",
                  "draft": true,
                  "name": "static-tag-prefix-v2.1.4 🌈",
                  "prerelease": false,
                  "tag_name": "static-tag-prefix-v2.1.4",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, alteredReleasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('with custom version resolver', () => {
      it('uses correct default when no labels exist', async () => {
        getConfigMock('config-with-custom-version-resolver-none.yml')

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsForking)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "dummy",
                  "draft": true,
                  "name": "v2.1.0",
                  "prerelease": false,
                  "tag_name": "v2.1.0",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
      it('when only patch label exists, use patch', async () => {
        getConfigMock('config-with-custom-version-resolver-patch.yml')

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsForking)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "dummy",
                  "draft": true,
                  "name": "v2.0.1",
                  "prerelease": false,
                  "tag_name": "v2.0.1",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
      it('minor beats patch', async () => {
        getConfigMock('config-with-custom-version-resolver-minor.yml')

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsForking)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "dummy",
                  "draft": true,
                  "name": "v2.1.0",
                  "prerelease": false,
                  "tag_name": "v2.1.0",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
      it('major beats others', async () => {
        getConfigMock('config-with-custom-version-resolver-major.yml')

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsForking)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "dummy",
                  "draft": true,
                  "name": "v3.0.0",
                  "prerelease": false,
                  "tag_name": "v3.0.0",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })

      it('major beats others partial config', async () => {
        getConfigMock('config-with-custom-version-resolver-partial.yml')

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsForking)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "dummy",
                  "draft": true,
                  "name": "v3.0.0",
                  "prerelease": false,
                  "tag_name": "v3.0.0",
                  "target_commitish": "refs/heads/master",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })

    describe('with commitish', () => {
      it('allows specification of a target commitish', async () => {
        getConfigMock('config-with-commitish.yml')

        nock('https://api.github.com')
          .get(
            '/repos/toolmantim/release-drafter-test-project/releases?per_page=100'
          )
          .reply(200, [releasePayload])

        nock('https://api.github.com')
          .post('/graphql', (body) =>
            body.query.includes('query findCommitsWithAssociatedPullRequests')
          )
          .reply(200, graphqlCommitsForking)

        nock('https://api.github.com')
          .post(
            '/repos/toolmantim/release-drafter-test-project/releases',
            (body) => {
              expect(body).toMatchInlineSnapshot(`
                Object {
                  "body": "dummy",
                  "draft": true,
                  "name": "",
                  "prerelease": false,
                  "tag_name": "",
                  "target_commitish": "staging",
                }
              `)
              return true
            }
          )
          .reply(200, releasePayload)

        await probot.receive({
          name: 'push',
          payload: pushPayload,
        })

        expect.assertions(1)
      })
    })
  })
})
