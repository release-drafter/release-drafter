const nock = require('nock')
const { createRobot } = require('probot')
const { fn } = jest

const { decodeContent } = require('../lib/base46')
const { mockError, mockConfig, mockContent } = require('./helpers/mock-responses')
const app = require('../index')

nock.disableNetConnect()

describe('draftah', () => {
  let robot
  let github

  beforeEach(() => {
    robot = createRobot({})
    app(robot)

    github = {
      // Basic mocks, so we can perform `.not.toHaveBeenCalled()` assertions
      repos: {
        getContent: fn(),
        getReleases: fn(),
        updateFile: fn()
      },
      paginate: fn().mockImplementation((promise, fn) => promise.then(fn))
    }

    robot.auth = () => Promise.resolve(github)
  })

  describe('release', () => {
    describe('without a config', () => {
      it('does nothing', async () => {
        github.repos.getContent = fn().mockImplementationOnce(() => mockError(404))
        await robot.receive({ event: 'release', payload: require('./fixtures/release') })
        expect(github.repos.updateFile).not.toHaveBeenCalled()
      })
    })

    describe('with a config', () => {
      describe('with no releases', () => {
        it('does nothing', async () => {
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [] }))
          await robot.receive({ event: 'release', payload: require('./fixtures/release') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })

      describe('with a draft release', () => {
        it('does nothing', async () => {
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({
            data: [ require('./fixtures/release-draft').release ]
          }))
          await robot.receive({ event: 'release', payload: require('./fixtures/release') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })

      describe('with a release', () => {
        it('updates the files', async () => {
          const release = require('./fixtures/release').release
          const oldRelease = require('./fixtures/release-old-version').release

          github.repos.getContent = fn()
            .mockReturnValueOnce(mockConfig('config.yml'))
            .mockReturnValueOnce(mockContent(`
# Some project
https://download.com/v0.0.1/file.zip
https://download.com/v1.0.0/file.zip`))

          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ oldRelease, release ] }))

          await robot.receive({ event: 'release', payload: require('./fixtures/release') })

          const [ [ updateCall ] ] = github.repos.updateFile.mock.calls
          expect(decodeContent(updateCall.content)).toBe(`
# Some project
https://download.com/v1.0.2/file.zip
https://download.com/v1.0.2/file.zip`)

          expect(github.repos.updateFile).toBeCalledWith(
            expect.objectContaining({
              'message': 'Bump README.md for v1.0.2 release',
              'owner': 'toolmantim',
              'path': 'README.md',
              'repo': 'draftah-test-project',
              'sha': 'dcef71f84be19369d04d41c2a898b32c900320dc'
            })
          )
        })
      })

      describe('with an already updated readme', () => {
        it('does nothing', async () => {
          const release = require('./fixtures/release').release

          github.repos.getContent = fn()
            .mockReturnValueOnce(mockConfig('config.yml'))
            .mockReturnValueOnce(mockContent(`# Some project\nhttps://download.com/v1.0.2/file.zip`))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ release ] }))

          await robot.receive({ event: 'release', payload: require('./fixtures/release') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })

      describe('with a pre-release', () => {
        it('does nothing', async () => {
          const release = require('./fixtures/release-prerelease').release

          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ release ] }))

          await robot.receive({ event: 'release', payload: require('./fixtures/release-prerelease') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })

      describe('with a config file missing .updates', () => {
        it('does nothing', async () => {
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config-no-updates.yml'))
          await robot.receive({ event: 'release', payload: require('./fixtures/release') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })

      describe('with a config file missing .updates.path', () => {
        it('does nothing', async () => {
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config-updates-no-path.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ require('./fixtures/release').release ] }))
          await robot.receive({ event: 'release', payload: require('./fixtures/release') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })

      describe('with a config file missing .updates.pattern', () => {
        it('does nothing', async () => {
          github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config-updates-no-pattern.yml'))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ require('./fixtures/release').release ] }))
          await robot.receive({ event: 'release', payload: require('./fixtures/release') })
          expect(github.repos.updateFile).not.toHaveBeenCalled()
        })
      })
    })
  })

  describe('push', () => {
    describe('to a non-config file', () => {
      it('does nothing', async () => {
        github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
        await robot.receive({ event: 'push', payload: require('./fixtures/push-unrelated-change') })
        expect(github.repos.updateFile).not.toHaveBeenCalled()
      })
    })

    describe('to a non-master branch', () => {
      it('does nothing', async () => {
        github.repos.getContent = fn().mockReturnValueOnce(mockConfig('config.yml'))
        await robot.receive({ event: 'push', payload: require('./fixtures/push-non-master-branch') })
        expect(github.repos.updateFile).not.toHaveBeenCalled()
      })

      describe('when configured with the branch', () => {
        it('updates the files', async () => {
          const release = require('./fixtures/release').release

          github.repos.getContent = fn()
            .mockReturnValueOnce(mockConfig('config-with-non-master-branch.yml'))
            .mockReturnValueOnce(mockContent(`# Some project\nhttps://download.com/v0.0.1/file.zip`))
          github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ release ] }))

          await robot.receive({ event: 'push', payload: require('./fixtures/push-non-master-branch') })

          const [ [ updateCall ] ] = github.repos.updateFile.mock.calls
          expect(decodeContent(updateCall.content)).toBe(`# Some project\nhttps://download.com/v1.0.2/file.zip`)

          expect(github.repos.updateFile).toBeCalledWith(
            expect.objectContaining({
              'message': 'Bump README.md for v1.0.2 release',
              'owner': 'toolmantim',
              'path': 'README.md',
              'repo': 'draftah-test-project',
              'sha': '69c1bd14603c5afdb307d3dc332381037cbe4b1b'
            })
          )
        })
      })
    })

    describe('modifying .github/draftah.yml', () => {
      it('updates the files', async () => {
        const release = require('./fixtures/release').release

        github.repos.getContent = fn()
          .mockReturnValueOnce(mockConfig('config.yml'))
          .mockReturnValueOnce(mockContent(`# Some project\nhttps://download.com/v0.0.1/file.zip`))
        github.repos.getReleases = fn().mockReturnValueOnce(Promise.resolve({ data: [ release ] }))

        await robot.receive({ event: 'push', payload: require('./fixtures/push-config-change') })

        const [ [ updateCall ] ] = github.repos.updateFile.mock.calls
        expect(decodeContent(updateCall.content)).toBe(`# Some project\nhttps://download.com/v1.0.2/file.zip`)

        expect(github.repos.updateFile).toBeCalledWith(
          expect.objectContaining({
            'message': 'Bump README.md for v1.0.2 release',
            'owner': 'toolmantim',
            'path': 'README.md',
            'repo': 'draftah-test-project',
            'sha': '69c1bd14603c5afdb307d3dc332381037cbe4b1b'
          })
        )
      })
    })
  })
})
