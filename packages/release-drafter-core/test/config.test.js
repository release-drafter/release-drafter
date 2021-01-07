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

  describe('`replacers` option', () => {
    it('validates `replacers` option', async () => {
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({ replacers: 'bogus' }),
        log: { info: jest.fn(), warn: jest.fn() },
      }

      expect(
        getConfig({
          context,
        })
      ).rejects.toThrow(
        'child "replacers" fails because ["replacers" must be an array]'
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

      expect(
        getConfig({
          context,
        })
      ).rejects.toThrow(
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
