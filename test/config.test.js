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
    const context = {
      payload: { repository: { default_branch: 'master' } },
      config: null,
      log: { info: jest.fn(), warn: jest.fn() },
    }
    const warnSpy = jest.spyOn(context.log, 'warn')

    const config = await getConfig({
      context,
    })

    expect(config).toBeNull()
    expect(warnSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        stack: expect.stringMatching(/context.config is not a function/),
        // In the test, this message is set by Probot. Actually the message below:
        // 'Configuration file .github/release-drafter.yml is not found. The configuration file must reside in your default branch.'
      }),
      expect.stringMatching(/Invalid config file/)
    )
  })

  describe('`replacers` option', () => {
    it('validates `replacers` option', async () => {
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({ replacers: 'bogus' }),
        log: { info: jest.fn(), warn: jest.fn() },
      }
      const warnSpy = jest.spyOn(context.log, 'warn')
      const infoSpy = jest.spyOn(context.log, 'info')

      const config = await getConfig({
        context,
      })

      expect(config).toBeNull()
      expect(warnSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({}),
        expect.stringMatching(/Invalid config file/)
      )
      expect(infoSpy).toHaveBeenLastCalledWith(
        expect.stringMatching(/"replacers" must be an array/)
      )
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
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({ 'sort-direction': 'bogus' }),
        log: { info: jest.fn(), warn: jest.fn() },
      }
      const warnSpy = jest.spyOn(context.log, 'warn')
      const infoSpy = jest.spyOn(context.log, 'info')

      const config = await getConfig({
        context,
      })

      expect(config).toBeNull()
      expect(warnSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({}),
        expect.stringMatching(/Invalid config file/)
      )
      expect(infoSpy).toHaveBeenLastCalledWith(
        expect.stringMatching(
          /"sort-direction" must be one of \[ascending, descending]/
        )
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
