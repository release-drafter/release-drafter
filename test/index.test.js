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
        getReleases: fn().mockImplementationOnce(() => mockError(500)),
        compareCommits: fn().mockImplementationOnce(() => mockError(500)),
        createRelease: fn().mockImplementationOnce(() => mockError(500)),
        editRelease: fn().mockImplementationOnce(() => mockError(500))
      },
      pullRequests: {
        get: fn().mockImplementationOnce(() => mockError(500))
      },
      paginate: fn().mockImplementation((promise, fn) => promise.then(fn))
    }

    app.auth = () => Promise.resolve(github)
  })

  describe('push', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        github.repos.getContent = fn()
          .mockImplementationOnce(() => mockError(404))
          .mockImplementationOnce(() => mockError(404))

        await app.receive({ event: 'push', payload: require('./fixtures/push') })

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
          github.repos.createRelease = fn()

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
      it('sets $CHANGES based on all commits, and $PREVIOUS_TAG to blank', async () => {
        github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config-previous-tag.yml'))
        github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [] }))
        github.repos.getCommits = fn().mockReturnValueOnce(Promise.resolve({ data: require('./fixtures/commits') }))
        github.pullRequests.get = fn()
          .mockReturnValueOnce(Promise.resolve(require('./fixtures/pull-request-1')))
          .mockReturnValueOnce(Promise.resolve(require('./fixtures/pull-request-2')))
        github.repos.createRelease = fn()

        await app.receive({ event: 'push', payload: require('./fixtures/push') })

        expect(github.repos.createRelease).toBeCalledWith(
          expect.objectContaining({
            body: `Changes:
* More cowbell (#1) @toolmantim
* Integrate alien technology (#2) @another-user

Previous tag: ''
`,
            draft: true,
            tag_name: ''
          })
        )
      })
    })

    describe('with past releases', () => {
      it('creates a new draft listing the changes', async () => {
        github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
        github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data:
          // Tests whether it sorts releases properly
          [ require('./fixtures/release-2'),
            require('./fixtures/release'),
            require('./fixtures/release-3') ]
        }))
        github.repos.compareCommits = fn().mockReturnValueOnce(Promise.resolve({ data: {
          commits: require('./fixtures/commits')
        } }))
        github.pullRequests.get = fn()
          .mockReturnValueOnce(Promise.resolve(require('./fixtures/pull-request-1')))
          .mockReturnValueOnce(Promise.resolve(require('./fixtures/pull-request-2')))

        github.repos.createRelease = fn()

        await app.receive({ event: 'push', payload: require('./fixtures/push') })

        expect(github.repos.compareCommits).toBeCalledWith(
          expect.objectContaining({
            'base': 'v2.0.0',
            'head': 'master'
          })
        )
        expect(github.repos.createRelease).toBeCalledWith(
          expect.objectContaining({
            body: `# What's Changed

* More cowbell (#1) @toolmantim
* Integrate alien technology (#2) @another-user
`,
            draft: true,
            tag_name: ''
          })
        )
      })

      describe('with custom changes-template config', () => {
        it('creates a new draft using the template', async () => {
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config-with-changes-templates.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ require('./fixtures/release') ] }))
          github.repos.compareCommits = fn().mockReturnValueOnce(Promise.resolve({ data: {
            commits: require('./fixtures/commits')
          } }))
          github.pullRequests.get = fn()
            .mockReturnValueOnce(Promise.resolve(require('./fixtures/pull-request-1')))
            .mockReturnValueOnce(Promise.resolve(require('./fixtures/pull-request-2')))

          github.repos.createRelease = fn()

          await app.receive({ event: 'push', payload: require('./fixtures/push') })

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
    })

    describe('with no changes since the last release', () => {
      it('creates a new draft with no changes', async () => {
        github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
        github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data:
          // Tests whether it sorts releases properly
          [ require('./fixtures/release-2'),
            require('./fixtures/release'),
            require('./fixtures/release-3') ]
        }))
        github.repos.compareCommits = fn().mockReturnValueOnce(Promise.resolve({ data: { commits: [] } }))
        github.repos.createRelease = fn()

        await app.receive({ event: 'push', payload: require('./fixtures/push') })

        expect(github.repos.compareCommits).toBeCalledWith(
          expect.objectContaining({
            'base': 'v2.0.0',
            'head': 'master'
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
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config-with-changes-templates.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [] }))
          github.repos.getCommits = fn().mockReturnValueOnce(Promise.resolve({ data: [] }))
          github.repos.createRelease = fn()

          await app.receive({ event: 'push', payload: require('./fixtures/push') })

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
        github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
        github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ require('./fixtures/release-draft.json') ] }))
        github.repos.getCommits = fn().mockReturnValueOnce(Promise.resolve({ data: require('./fixtures/commits') }))
        github.pullRequests.get = fn()
          .mockReturnValueOnce(Promise.resolve(require('./fixtures/pull-request-1')))
          .mockReturnValueOnce(Promise.resolve(require('./fixtures/pull-request-2')))
        github.repos.editRelease = fn()

        await app.receive({ event: 'push', payload: require('./fixtures/push') })

        expect(github.repos.editRelease).toBeCalledWith(
          expect.objectContaining({
            body: `# What's Changed

* More cowbell (#1) @toolmantim
* Integrate alien technology (#2) @another-user
`
          })
        )
      })
    })
  })
})
