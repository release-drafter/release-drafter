const nock = require('nock')
const { Application } = require('probot')
const { fn } = jest

const { mockError, mockConfig } = require('./helpers/mock-responses')
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

    describe('to a non-master branch', () => {
      it('does nothing', async () => {
        github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
        await app.receive({ event: 'push', payload: require('./fixtures/push-non-master-branch') })
        expect(github.repos.createRelease).not.toHaveBeenCalled()
        expect(github.repos.editRelease).not.toHaveBeenCalled()
      })

      describe('when configured for that branch', () => {
        it('creates a release draft', async () => {
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config-non-master-branch.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ require('./fixtures/release') ] }))
          github.repos.compareCommits = fn().mockReturnValueOnce(Promise.resolve({ data: { commits: [] } }))
          await app.receive({ event: 'push', payload: require('./fixtures/push-non-master-branch') })
          expect(github.repos.createRelease).toBeCalledWith(
            expect.objectContaining({
              body: `# What's Changed\n\n* No changes\n`,
              draft: true,
              tag_name: ''
            })
          )
        })
      })
    })


    describe('with no past releases', () => {
      it('substitutes an empty string for $PREVIOUS_TAG')
    })

    describe('with many past releases', () => {
      it('creates a draft listing the changes')
    })
    
    describe('with no changes since the last release', () => {
      it('creates a draft with no changes')
    })

    describe('with an existing release', () => {
      it('updates the release body')
    })
  })
})
