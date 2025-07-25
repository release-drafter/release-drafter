const { DEFAULT_CONFIG } = require('../lib/default-config')
const { getConfig } = require('../lib/config')
const { SORT_DIRECTIONS } = require('../lib/sort-pull-requests')

function createGetConfigMock(config) {
  return (context, configName, defaults) =>
    Promise.resolve({ ...defaults, ...config })
}

function createOctokitMock(yamlContent) {
  return {
    repos: {
      getContent: jest.fn().mockResolvedValue({
        data: {
          content: Buffer.from(yamlContent).toString('base64'),
        },
      }),
    },
  }
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

describe('remote config', () => {
  const { getConfig } = require('../lib/config')

  it('loads config from a remote repo (success)', async () => {
    const yamlContent = 'template: "# Remote config!"\n'
    const context = {
      octokit: createOctokitMock(yamlContent),
      config: jest.fn(),
      log: { info: jest.fn(), warn: jest.fn() },
      payload: { repository: { full_name: 'org/repo' } },
    }
    const config = await getConfig({
      context,
      configName: 'repo:org/repo/.github/release-drafter.yml@main',
    })
    expect(config).not.toBeNull()
    expect(config.template).toBe('# Remote config!')
  })

  it('throws on invalid remote config format', async () => {
    const context = {
      octokit: {},
      config: jest.fn(),
      log: { info: jest.fn(), warn: jest.fn() },
      payload: { repository: { full_name: 'org/repo' } },
    }
    await expect(
      getConfig({
        context,
        configName: 'repo:badformat',
      })
    ).resolves.toBeNull()
  })

  it('handles fetch error from remote repo', async () => {
    const context = {
      octokit: {
        repos: {
          getContent: jest.fn().mockRejectedValue(new Error('Not found')),
        },
      },
      config: jest.fn(),
      log: { info: jest.fn(), warn: jest.fn() },
      payload: { repository: { full_name: 'org/repo' } },
    }
    await expect(
      getConfig({
        context,
        configName: 'repo:org/repo/.github/release-drafter.yml@main',
      })
    ).resolves.toBeNull()
  })
})
