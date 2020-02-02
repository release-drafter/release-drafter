const { DEFAULT_CONFIG } = require('../lib/default-config')
const { getConfig } = require('../lib/config')
const { SORT_DIRECTIONS } = require('../lib/sort-pull-requests')

function createGetConfigMock(config) {
  return (context, configName, defaults) =>
    Promise.resolve({ ...defaults, ...config })
}

describe('getConfig', () => {
  it('returns defaults', async () => {
    const app = { log: { info: jest.fn(), warn: jest.fn() } }
    const context = {
      payload: { repository: { default_branch: 'master' } },
      config: createGetConfigMock({
        template: '$CHANGES'
      })
    }

    const config = await getConfig({
      app,
      context
    })

    expect(config).toEqual({
      ...DEFAULT_CONFIG,
      template: '$CHANGES',
      branches: ['master']
    })
  })

  describe('`replacers` option', () => {
    it('validates `replacers` option', async () => {
      const app = { log: { info: jest.fn(), warn: jest.fn() } }
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({ replacers: 'bogus' })
      }

      expect(
        getConfig({
          app,
          context
        })
      ).rejects.toThrow(
        'child "replacers" fails because ["replacers" must be an array]'
      )
    })

    it('accepts valid `replacers`', async () => {
      const app = { log: { info: jest.fn(), warn: jest.fn() } }
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({
          template: '$CHANGES',
          replacers: [{ search: 'search', replace: 'replace' }]
        })
      }

      const config = await getConfig({
        app,
        context
      })

      expect(config['replacers']).toEqual([
        { search: expect.any(RegExp), replace: 'replace' }
      ])
    })
  })

  describe('`sort-direction` option', () => {
    it('validates `sort-direction` option', async () => {
      const app = { log: { info: jest.fn(), warn: jest.fn() } }
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({ 'sort-direction': 'bogus' })
      }

      expect(
        getConfig({
          app,
          context
        })
      ).rejects.toThrow(
        '"sort-direction" must be one of [ascending, descending]'
      )
    })

    it('accepts a valid `sort-direction`', async () => {
      const app = { log: { info: jest.fn(), warn: jest.fn() } }
      const context = {
        payload: { repository: { default_branch: 'master' } },
        config: createGetConfigMock({
          template: '$CHANGES',
          'sort-direction': SORT_DIRECTIONS.ascending
        })
      }

      const config = await getConfig({
        app,
        context
      })

      expect(config['sort-direction']).toBe(SORT_DIRECTIONS.ascending)
    })
  })
})
