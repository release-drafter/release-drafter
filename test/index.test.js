const nock = require('nock')
const { Application } = require('probot')
const { fn } = jest

const { mockError } = require('./helpers/mock-responses')
const releaseDrafter = require('../index')

nock.disableNetConnect()

describe('release-drafter', () => {
  let app
  let github

  beforeEach(() => {
    app = new Application()
    app.load(releaseDrafter)

    github = {
      // Basic mocks, so we can perform `.not.toHaveBeenCalled()` assertions
      repos: {
        getReleases: fn(),
        compareCommits: fn(),
        createRelease: fn(),
        editRelease: fn()
      },
      pullRequests: {
        get: fn()
      },
      paginate: fn().mockImplementation((promise, fn) => promise.then(fn))
    }

    app.auth = () => Promise.resolve(github)
  })

  describe('push', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        github.repos.getContent = fn().mockImplementationOnce(() => mockError(404))
        await app.receive({ event: 'push', payload: require('./fixtures/push-config-change') })
        expect(github.repos.createRelease).not.toHaveBeenCalled()
        expect(github.repos.editRelease).not.toHaveBeenCalled()
      })
    })
  })
})
