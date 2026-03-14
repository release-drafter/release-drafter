import { mergeInputAndConfig } from 'src/actions/drafter/config'
import { commonConfigSchema } from 'src/actions/drafter/config/schemas/common-config.schema'
import { configSchema } from 'src/actions/drafter/config/schemas/config.schema'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockContext, mocks } from '../mocks'

describe('mergeInputAndConfig', () => {
  beforeEach(async () => {
    await mockContext('push')
  })

  describe('override handling', () => {
    it('should merge input and config with input taking precedence for commitish', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'config-commitish',
      })
      const input = commonConfigSchema.parse({
        commitish: 'input-commitish',
      })

      const result = mergeInputAndConfig({ config, input })

      expect(result.commitish).toBe('input-commitish')
      expect(mocks.core.info).toHaveBeenCalledWith(
        'Input\'s commitish "input-commitish" overrides config\'s commitish "config-commitish"',
      )
    })

    it('should merge input and config with input taking precedence for header', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        header: 'config-header',
      })
      const input = commonConfigSchema.parse({
        header: 'input-header',
      })

      const result = mergeInputAndConfig({ config, input })

      expect(result.header).toBe('input-header')
      expect(mocks.core.info).toHaveBeenCalledWith(
        'Input\'s header "input-header" overrides config\'s header "config-header"',
      )
    })

    it('should merge input and config with input taking precedence for footer', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        footer: 'config-footer',
      })
      const input = commonConfigSchema.parse({
        footer: 'input-footer',
      })

      const result = mergeInputAndConfig({ config, input })

      expect(result.footer).toBe('input-footer')
      expect(mocks.core.info).toHaveBeenCalledWith(
        'Input\'s footer "input-footer" overrides config\'s footer "config-footer"',
      )
    })

    it('should merge input and config with input taking precedence for prerelease-identifier', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        'prerelease-identifier': 'config-identifier',
      })
      const input = commonConfigSchema.parse({
        'prerelease-identifier': 'input-identifier',
      })

      const result = mergeInputAndConfig({ config, input })

      expect(result['prerelease-identifier']).toBe('input-identifier')
      expect(mocks.core.info).toHaveBeenCalledWith(
        'Input\'s prerelease-identifier "input-identifier" overrides config\'s prerelease-identifier "config-identifier"',
      )
    })

    it('should merge input and config with input taking precedence for prerelease (boolean)', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        prerelease: true,
      })
      const input = commonConfigSchema.parse({
        prerelease: false,
      })

      const result = mergeInputAndConfig({ config, input })

      expect(result.prerelease).toBe(false)
      expect(mocks.core.info).toHaveBeenCalledWith(
        'Input\'s prerelease "false" overrides config\'s prerelease "true"',
      )
    })

    it('should merge input and config with input taking precedence for latest (boolean)', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        latest: false,
      })
      const input = commonConfigSchema.parse({
        latest: true,
      })

      const result = mergeInputAndConfig({ config, input })

      expect(result.latest).toBe(true)
      expect(mocks.core.info).toHaveBeenCalledWith(
        'Input\'s latest "true" overrides config\'s latest "false"',
      )
    })

    it('should use config values when input values are not provided', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'config-commitish',
        header: 'config-header',
        footer: 'config-footer',
        'prerelease-identifier': 'config-identifier',
        prerelease: true,
        latest: false,
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.commitish).toBe('config-commitish')
      expect(result.header).toBe('config-header')
      expect(result.footer).toBe('config-footer')
      expect(result['prerelease-identifier']).toBe('config-identifier')
      expect(result.prerelease).toBe(true)
      expect(result.latest).toBe(false)
    })

    it('should not log info message when input does not override config', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
      })
      const input = commonConfigSchema.parse({
        header: 'input-header',
      })

      mergeInputAndConfig({ config, input })

      // Should not log info when input provides value not in config
      expect(mocks.core.info).not.toHaveBeenCalled()
    })
  })

  describe('validation logic', () => {
    it('should set latest to false when both prerelease and latest are true', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        prerelease: true,
        latest: true,
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.latest).toBe(false)
      expect(result.prerelease).toBe(true)
      expect(mocks.core.warning).toHaveBeenCalledWith(
        "'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release.",
      )
    })

    it('should set prerelease to true when prerelease-identifier is set but prerelease is false', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        'prerelease-identifier': 'alpha',
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.prerelease).toBe(true)
      expect(mocks.core.warning).toHaveBeenCalledWith(
        "You specified a 'prerelease-identifier' (alpha), but 'prerelease' is set to false. Switching to true.",
      )
    })

    it('should not warn when both prerelease-identifier and prerelease are set correctly', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        'prerelease-identifier': 'alpha',
        prerelease: true,
      })
      const input = commonConfigSchema.parse({})

      mergeInputAndConfig({ config, input })

      expect(mocks.core.warning).not.toHaveBeenCalled()
    })
  })

  describe('defaults', () => {
    it('should default commitish to context.ref when not provided', async () => {
      await mockContext('push')

      const config = configSchema.parse({
        template: '$CHANGES',
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.commitish).toBe('refs/heads/master')
    })

    it('should default latest to true when not a boolean', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.latest).toBe(true)
    })

    it('should default prerelease to false when not a boolean', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.prerelease).toBe(false)
    })

    it('should respect boolean false for latest', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        latest: false,
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.latest).toBe(false)
    })

    it('should respect boolean true for prerelease', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        prerelease: true,
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.prerelease).toBe(true)
    })

    it('should use commitish from input when provided', async () => {
      await mockContext('push')

      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'config-commitish',
      })
      const input = commonConfigSchema.parse({
        commitish: 'input-commitish',
      })

      const result = mergeInputAndConfig({ config, input })

      expect(result.commitish).toBe('input-commitish')
    })
  })

  describe('replacers transformation', () => {
    it('should convert search strings to regex in replacers', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        replacers: [
          { search: 'foo', replace: 'bar' },
          { search: '/test.*/g', replace: 'replaced' },
        ],
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.replacers).toHaveLength(2)
      expect(result.replacers[0].search).toBeInstanceOf(RegExp)
      expect(result.replacers[0].search.source).toBe('foo')
      expect(result.replacers[0].search.flags).toBe('g')
      expect(result.replacers[0].replace).toBe('bar')
      expect(result.replacers[1].search).toBeInstanceOf(RegExp)
      expect(result.replacers[1].search.source).toBe('test.*')
      expect(result.replacers[1].search.flags).toBe('g')
      expect(result.replacers[1].replace).toBe('replaced')
    })

    it('should filter out invalid regex patterns with warning', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        replacers: [
          { search: 'valid-pattern', replace: 'bar' },
          { search: '/(?invalid/i', replace: 'baz' },
          { search: 'another-valid', replace: 'qux' },
        ],
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.replacers).toHaveLength(2)
      // Note: escape-string-regexp uses \x2d for hyphen
      expect(result.replacers[0].search.source).toBe('valid\\x2dpattern')
      expect(result.replacers[1].search.source).toBe('another\\x2dvalid')
      expect(mocks.core.warning).toHaveBeenCalledWith(
        "Bad replacer regex: '/(?invalid/i'",
      )
    })

    it('should handle empty replacers array', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        replacers: [],
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.replacers).toHaveLength(0)
    })

    it('should handle regex with special characters', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        replacers: [{ search: '/^v(\\d+\\.\\d+\\.\\d+)$/i', replace: '$1' }],
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.replacers).toHaveLength(1)
      expect(result.replacers[0].search).toBeInstanceOf(RegExp)
      expect(result.replacers[0].search.source).toBe('^v(\\d+\\.\\d+\\.\\d+)$')
      expect(result.replacers[0].search.flags).toBe('i')
    })
  })

  describe('conventional matcher normalization', () => {
    it('should normalize conventional matcher aliases into array-only fields', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        categories: [
          {
            title: 'Features',
            conventional: {
              orType: 'feat',
              andScope: 'ui',
              breaking: true,
            },
          },
        ],
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.categories[0].conventional).toEqual({
        types: new Set<string>(),
        andTypes: new Set<string>(),
        orTypes: new Set(['feat']),
        scopes: new Set<string>(),
        andScopes: new Set(['ui']),
        orScopes: new Set<string>(),
        breaking: true,
        andBreaking: undefined,
        orBreaking: undefined,
      })
    })

    it('should keep conventional undefined when category does not define it', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        categories: [
          {
            title: 'Features',
          },
        ],
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.categories[0].conventional).toBeUndefined()
    })

    it('should deduplicate matcher arrays as sets', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        categories: [
          {
            title: 'Features',
            conventional: {
              orTypes: ['feat', 'feat', 'fix', 'fix'],
            },
          },
        ],
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.categories[0].conventional).toEqual({
        types: new Set<string>(),
        andTypes: new Set<string>(),
        orTypes: new Set(['feat', 'fix']),
        scopes: new Set<string>(),
        andScopes: new Set<string>(),
        orScopes: new Set<string>(),
        breaking: undefined,
        andBreaking: undefined,
        orBreaking: undefined,
      })
    })

    it('should deduplicate category labels as a set', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        categories: [
          {
            title: 'Features',
            labels: ['enhancement', 'enhancement'],
            label: 'enhancement',
          },
        ],
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      expect(result.categories[0].labels).toEqual(new Set(['enhancement']))
    })

    it('should throw when multiple type matcher aliases are specified', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        categories: [
          {
            title: 'Features',
            conventional: {
              orType: 'feat',
              types: ['fix'],
            },
          },
        ],
      })
      const input = commonConfigSchema.parse({})

      expect(() => mergeInputAndConfig({ config, input })).toThrow(
        'only one type matcher alias can be used at a time',
      )
      expect(() => mergeInputAndConfig({ config, input })).toThrow(
        'Use exactly one of type, types, andType, andTypes, orType, orTypes',
      )
    })

    it('should throw when multiple scope matcher aliases are specified', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        categories: [
          {
            title: 'Features',
            conventional: {
              andScope: 'ui',
              scopes: ['api'],
            },
          },
        ],
      })
      const input = commonConfigSchema.parse({})

      expect(() => mergeInputAndConfig({ config, input })).toThrow(
        'only one scope matcher alias can be used at a time',
      )
      expect(() => mergeInputAndConfig({ config, input })).toThrow(
        'Use exactly one of scope, scopes, andScope, andScopes, orScope, orScopes',
      )
    })

    it('should throw when multiple breaking matcher aliases are specified', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        categories: [
          {
            title: 'Features',
            conventional: {
              breaking: true,
              andBreaking: false,
            },
          },
        ],
      })
      const input = commonConfigSchema.parse({})

      expect(() => mergeInputAndConfig({ config, input })).toThrow(
        'only one breaking matcher alias can be used at a time',
      )
      expect(() => mergeInputAndConfig({ config, input })).toThrow(
        'Use exactly one of breaking, andBreaking, orBreaking',
      )
    })
  })

  describe('error handling', () => {
    it('should throw error when commitish is not provided in config or input', async () => {
      // Create a context where ref is undefined
      await mockContext('push')
      const github = await import('@actions/github')

      // @ts-expect-error - modifying readonly property for testing
      github.context.ref = undefined
      github.context.payload.ref = undefined

      const config = configSchema.parse({
        template: '$CHANGES',
      })
      const input = commonConfigSchema.parse({})

      expect(() => mergeInputAndConfig({ config, input })).toThrow(
        "'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)",
      )
    })
    it('should throw error when multiple empty categories', async () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        categories: [
          {
            title: '📝 Other Changes',
          },
          {
            title: '📝 Yet Other Changes',
          },
        ],
      })
      const input = commonConfigSchema.parse({})

      expect(() =>
        mergeInputAndConfig({ config, input }),
      ).toThrowErrorMatchingInlineSnapshot(
        `[Error: Multiple categories detected with no labels. Only one category with no labels is supported for uncategorized pull requests.]`,
      )
    })
  })

  describe('complex scenarios', () => {
    it('should handle all overrides and validations together', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'config-commitish',
        header: 'config-header',
        footer: 'config-footer',
        'prerelease-identifier': 'config-identifier',
        prerelease: true,
        latest: true,
      })
      const input = commonConfigSchema.parse({
        commitish: 'input-commitish',
        header: 'input-header',
        footer: 'input-footer',
        'prerelease-identifier': 'input-identifier',
        prerelease: false,
        latest: false,
      })

      const result = mergeInputAndConfig({ config, input })

      // Check overrides took effect
      expect(result.commitish).toBe('input-commitish')
      expect(result.header).toBe('input-header')
      expect(result.footer).toBe('input-footer')
      expect(result['prerelease-identifier']).toBe('input-identifier')
      expect(result.prerelease).toBe(true)
      expect(result.latest).toBe(false)

      // Check that info messages were logged
      expect(mocks.core.info).toHaveBeenCalledTimes(6)
    })

    it('should not mutate original config object', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'original-commitish',
        replacers: [{ search: 'test', replace: 'replaced' }],
      })
      const originalConfig = JSON.parse(JSON.stringify(config))
      const input = commonConfigSchema.parse({
        commitish: 'new-commitish',
      })

      mergeInputAndConfig({ config, input })

      // Verify original config is not mutated (structuredClone protects it)
      expect(config).toEqual(originalConfig)
      expect(config.commitish).toBe('original-commitish')
    })

    it('should handle prerelease-identifier from input with prereleases validation', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        prerelease: false,
      })
      const input = commonConfigSchema.parse({
        'prerelease-identifier': 'beta',
      })

      const result = mergeInputAndConfig({ config, input })

      expect(result['prerelease-identifier']).toBe('beta')
      expect(result.prerelease).toBe(true)
      expect(mocks.core.warning).toHaveBeenCalledWith(
        "You specified a 'prerelease-identifier' (beta), but 'prerelease' is set to false. Switching to true.",
      )
    })

    it('should prioritize input boolean values over config boolean values for both prerelease and latest', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        prerelease: false,
        latest: false,
      })
      const input = commonConfigSchema.parse({
        prerelease: true,
        latest: true,
      })

      const result = mergeInputAndConfig({ config, input })

      // Input values should take precedence
      expect(result.prerelease).toBe(true)
      // But validation should still apply - latest should be false when prerelease is true
      expect(result.latest).toBe(false)
      expect(mocks.core.warning).toHaveBeenCalledWith(
        "'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release.",
      )
    })
  })

  describe('type safety', () => {
    it('should return ParsedConfig type with transformed replacers', () => {
      const config = configSchema.parse({
        template: '$CHANGES',
        commitish: 'main',
        replacers: [{ search: 'test', replace: 'replaced' }],
      })
      const input = commonConfigSchema.parse({})

      const result = mergeInputAndConfig({ config, input })

      // TypeScript should ensure this type is correct
      expect(result.replacers[0].search).toBeInstanceOf(RegExp)
      expect(typeof result.commitish).toBe('string')
      expect(typeof result.latest).toBe('boolean')
      expect(typeof result.prerelease).toBe('boolean')
    })
  })
})
