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
      payload: { repository: { default_branch: 'master' } }
    }

    const config = await getConfig({
      app,
      context,
      getConfig: createGetConfigMock({
        template: '$CHANGES'
      })
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
      const context = { payload: { repository: { default_branch: 'master' } } }

      expect(
        getConfig({
          app,
          context,
          getConfig: createGetConfigMock({ replacers: 'bogus' })
        })
      ).rejects.toThrow(
        'child "replacers" fails because ["replacers" must be an array]'
      )
    })

    it('accepts valid `replacers`', async () => {
      const app = { log: { info: jest.fn(), warn: jest.fn() } }
      const context = { payload: { repository: { default_branch: 'master' } } }

      const config = await getConfig({
        app,
        context,
        getConfig: createGetConfigMock({
          template: '$CHANGES',
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
      const app = { log: { info: jest.fn(), warn: jest.fn() } }
      const context = { payload: { repository: { default_branch: 'master' } } }

      expect(
        getConfig({
          app,
          context,
          getConfig: createGetConfigMock({ 'sort-direction': 'bogus' })
        })
      ).rejects.toThrow(
        '"sort-direction" must be one of [ascending, descending]'
      )
    })

    it('accepts a valid `sort-direction`', async () => {
      const app = { log: { info: jest.fn(), warn: jest.fn() } }
      const context = { payload: { repository: { default_branch: 'master' } } }

      const config = await getConfig({
        app,
        context,
        getConfig: createGetConfigMock({
          template: '$CHANGES',
          'sort-direction': SORT_DIRECTIONS.ascending
        })
      })

      expect(config['sort-direction']).toBe(SORT_DIRECTIONS.ascending)
    })
  })
})
