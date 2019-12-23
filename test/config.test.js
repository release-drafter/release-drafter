const { getConfig, DEFAULT_CONFIG } = require('../lib/config')
const { SORT_DIRECTIONS } = require('../lib/sort-pull-requests')

function createGetConfigMock(config) {
  return (context, configName, defaults) =>
    Promise.resolve({ ...defaults, ...config })
}

describe('getConfig', () => {
  it('returns defaults', async () => {
    const app = { log: jest.fn() }
    const context = {
      payload: { repository: { default_branch: '' } }
    }

    const config = await getConfig({
      app,
      context,
      getConfig: createGetConfigMock({})
    })

    expect(config).toEqual({ ...DEFAULT_CONFIG, branches: expect.any(String) })
  })

  describe('`replacers` option', () => {
    it('validates `replacers` option', async () => {
      const app = { log: jest.fn() }
      const context = { payload: { repository: { default_branch: '' } } }

      const config = await getConfig({
        app,
        context,
        getConfig: createGetConfigMock({ replacers: 'bogus' })
      })

      expect(config['replacers']).toEqual([])
    })

    it('accepts valid `replacers`', async () => {
      const app = { log: jest.fn() }
      const context = { payload: { repository: { default_branch: '' } } }

      const config = await getConfig({
        app,
        context,
        getConfig: createGetConfigMock({
          replacers: [{ search: 'search', replace: 'replace' }]
        })
      })

      expect(config['replacers']).toEqual([
        { search: expect.any(RegExp), replace: 'replace' }
      ])
    })
  })

  describe('`sort-direction` option', () => {
    it('validates `sort-direction` option', async () => {
      const app = { log: jest.fn() }
      const context = { payload: { repository: { default_branch: '' } } }

      const config = await getConfig({
        app,
        context,
        getConfig: createGetConfigMock({ 'sort-direction': 'bogus' })
      })

      expect(config['sort-direction']).toBe(SORT_DIRECTIONS.descending)
    })

    it('accepts a valid `sort-direction`', async () => {
      const app = { log: jest.fn() }
      const context = { payload: { repository: { default_branch: '' } } }

      const config = await getConfig({
        app,
        context,
        getConfig: createGetConfigMock({
          'sort-direction': SORT_DIRECTIONS.ascending
        })
      })

      expect(config['sort-direction']).toBe(SORT_DIRECTIONS.ascending)
    })
  })
})
