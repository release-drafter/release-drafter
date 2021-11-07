const { DEFAULT_CONFIG } = require('../lib/default-config')
const { getConfig } = require('../lib/config')
const { SORT_DIRECTIONS } = require('../lib/sort-pull-requests')

function createGetConfigMock(config) {
  return (context, configName, defaults) =>
    Promise.resolve({ ...defaults, ...config })
}

describe('getConfig', () => {
  it('returns defaults', async () => {
    const context = {
      payload: { repository: { default_branch: 'master' } },
      config: createGetConfigMock({
        template: '$CHANGES',
      }),
      log: { info: jest.fn(), warn: jest.fn() },
    }

    const config = await getConfig({
      context,
    })

    expect(config).toEqual({
      ...DEFAULT_CONFIG,
      template: '$CHANGES',
      references: ['master'],
    })
  })

  it('config file does not exist', async () => {
    let warnMessage
    let warnStack
    const context = {
      payload: { repository: { default_branch: 'master' } },
      config: null,
      log: {
        info: jest.fn(),
        warn: jest.fn((e, m) => {
          warnMessage = m
          warnStack = e.stack
        }),
      },
    }

    const config = await getConfig({
      context,
    })

    expect(config).toBeNull()
    expect(warnMessage).toContain('Invalid config file')
    expect(warnStack).toContain(
      'context.config is not a function'
      // In the test, this message is set by Probot. Actually the message below:
      // 'Configuration file .github/release-drafter.yml is not found. The configuration file must reside in your default branch.'
    )
  })

  describe('`replacers` option', () => {
    it('validates `replacers` option', async () => {
      let infoMessage
      let warnMessage
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({ replacers: 'bogus' }),
        log: {
          info: jest.fn((m) => {
            infoMessage = m
          }),
          warn: jest.fn((_, m) => {
            warnMessage = m
          }),
        },
      }

      const config = await getConfig({
        context,
      })

      expect(config).toBeNull()
      expect(warnMessage).toContain('Invalid config file')
      expect(infoMessage).toContain('"replacers" must be an array')
    })

    it('accepts valid `replacers`', async () => {
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({
          template: '$CHANGES',
          replacers: [{ search: 'search', replace: 'replace' }],
        }),
        log: { info: jest.fn(), warn: jest.fn() },
      }

      const config = await getConfig({
        context,
      })

      expect(config['replacers']).toEqual([
        { search: expect.any(RegExp), replace: 'replace' },
      ])
    })
  })

  describe('`sort-direction` option', () => {
    it('validates `sort-direction` option', async () => {
      let infoMessage
      let warnMessage
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({ 'sort-direction': 'bogus' }),
        log: {
          info: jest.fn((m) => {
            infoMessage = m
          }),
          warn: jest.fn((_, m) => {
            warnMessage = m
          }),
        },
      }

      const config = await getConfig({
        context,
      })

      expect(config).toBeNull()
      expect(warnMessage).toContain('Invalid config file')
      expect(infoMessage).toContain(
        '"sort-direction" must be one of [ascending, descending]'
      )
    })

    it('accepts a valid `sort-direction`', async () => {
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({
          template: '$CHANGES',
          'sort-direction': SORT_DIRECTIONS.ascending,
        }),
        log: { info: jest.fn(), warn: jest.fn() },
      }

      const config = await getConfig({
        context,
      })

      expect(config['sort-direction']).toBe(SORT_DIRECTIONS.ascending)
    })
  })
})
