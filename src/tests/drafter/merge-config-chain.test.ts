import { describe, expect, it } from 'vitest'
import {
  configFileSchema,
  extendsDeclarationSchema,
} from '#src/common/config/extends.schema.ts'
import { mergeConfigChain } from '#src/common/config/merge-config-chain.ts'
import type { ConfigTarget } from '#src/common/config/parse-config-target.ts'

const target = (filepath: string): ConfigTarget => ({
  scheme: 'github',
  repo: { owner: 'octocat', repo: 'hello-world' },
  filepath,
})

/** builds a chain entry; pass entries leaf-first, like getConfigFiles returns them */
const entry = (filepath: string, config: Record<string, unknown>) => ({
  config: configFileSchema.parse(config),
  fetchedFrom: target(filepath),
})

describe('mergeConfigChain', () => {
  it('should let the extending file override inherited keys by default', () => {
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        _extends: 'base.yml',
        categories: [{ title: 'Child' }],
        template: 'child-template',
      }),
      entry('.github/base.yml', {
        categories: [{ title: 'Base' }],
        template: 'base-template',
        'tag-prefix': 'v',
      }),
    ])

    expect(merged).toEqual({
      categories: [{ title: 'Child' }],
      template: 'child-template',
      'tag-prefix': 'v',
    })
  })

  it('should default to override when the mapping form declares no strategy', () => {
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        _extends: { from: 'base.yml' },
        categories: [{ title: 'Child' }],
      }),
      entry('.github/base.yml', { categories: [{ title: 'Base' }] }),
    ])

    expect(merged.categories).toEqual([{ title: 'Child' }])
  })

  it('should append a list key to the inherited list', () => {
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        _extends: { from: 'base.yml', strategy: { categories: 'append' } },
        categories: [{ title: 'Child' }],
      }),
      entry('.github/base.yml', {
        categories: [{ title: 'Base' }],
        template: 'base-template',
      }),
    ])

    expect(merged).toEqual({
      categories: [{ title: 'Base' }, { title: 'Child' }],
      template: 'base-template',
    })
  })

  it('should prepend a list key onto the inherited list', () => {
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        _extends: { from: 'base.yml', strategy: { categories: 'prepend' } },
        categories: [{ title: 'Child' }],
      }),
      entry('.github/base.yml', { categories: [{ title: 'Base' }] }),
    ])

    expect(merged.categories).toEqual([{ title: 'Child' }, { title: 'Base' }])
  })

  it('should strip _extends from the merged config', () => {
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        _extends: { from: 'base.yml', strategy: { categories: 'append' } },
        categories: [{ title: 'Child' }],
      }),
      entry('.github/base.yml', { categories: [{ title: 'Base' }] }),
    ])

    expect(merged).not.toHaveProperty('_extends')
  })

  it("should apply each file's strategy only at its own merge step, not inherit it", () => {
    // A extends B extends C; B appends, A does not, so A's list replaces C+B
    const merged = mergeConfigChain([
      entry('.github/a.yml', {
        _extends: 'b.yml',
        categories: [{ title: 'A' }],
      }),
      entry('.github/b.yml', {
        _extends: { from: 'c.yml', strategy: { categories: 'append' } },
        categories: [{ title: 'B' }],
      }),
      entry('.github/c.yml', { categories: [{ title: 'C' }] }),
    ])

    expect(merged.categories).toEqual([{ title: 'A' }])
  })

  it('should chain strategies across multiple levels in base-first order', () => {
    const merged = mergeConfigChain([
      entry('.github/a.yml', {
        _extends: { from: 'b.yml', strategy: { categories: 'prepend' } },
        categories: [{ title: 'A' }],
      }),
      entry('.github/b.yml', {
        _extends: { from: 'c.yml', strategy: { categories: 'append' } },
        categories: [{ title: 'B' }],
      }),
      entry('.github/c.yml', { categories: [{ title: 'C' }] }),
    ])

    expect(merged.categories).toEqual([
      { title: 'A' },
      { title: 'C' },
      { title: 'B' },
    ])
  })

  it('should merge onto a key the inherited configs never set', () => {
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        _extends: { from: 'base.yml', strategy: { categories: 'append' } },
        categories: [{ title: 'Child' }],
      }),
      entry('.github/base.yml', { template: 'base-template' }),
    ])

    expect(merged.categories).toEqual([{ title: 'Child' }])
  })

  it('should treat a null value (empty YAML key) as an empty list when merging', () => {
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        _extends: { from: 'base.yml', strategy: { categories: 'append' } },
        categories: null,
      }),
      entry('.github/base.yml', { categories: [{ title: 'Base' }] }),
    ])

    expect(merged.categories).toEqual([{ title: 'Base' }])
  })

  it('should ignore strategies for keys the file does not set', () => {
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        _extends: { from: 'base.yml', strategy: { categories: 'append' } },
        template: 'child-template',
      }),
      entry('.github/base.yml', { categories: [{ title: 'Base' }] }),
    ])

    expect(merged.categories).toEqual([{ title: 'Base' }])
    expect(merged.template).toBe('child-template')
  })

  it('should accept an explicit override strategy', () => {
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        _extends: { from: 'base.yml', strategy: { categories: 'override' } },
        categories: [{ title: 'Child' }],
      }),
      entry('.github/base.yml', { categories: [{ title: 'Base' }] }),
    ])

    expect(merged.categories).toEqual([{ title: 'Child' }])
  })

  it('should throw when merging a key whose own value is not a list', () => {
    expect(() =>
      mergeConfigChain([
        entry('.github/child.yml', {
          _extends: { from: 'base.yml', strategy: { template: 'append' } },
          template: 'child-template',
        }),
        entry('.github/base.yml', { template: 'base-template' }),
      ]),
    ).toThrow(
      /Cannot append 'template'.*github:\.github\/child\.yml.*is not a list/,
    )
  })

  it('should throw when merging onto an inherited value that is not a list', () => {
    expect(() =>
      mergeConfigChain([
        entry('.github/child.yml', {
          _extends: { from: 'base.yml', strategy: { categories: 'prepend' } },
          categories: [{ title: 'Child' }],
        }),
        entry('.github/base.yml', { categories: 'oops' }),
      ]),
    ).toThrow(/Cannot prepend 'categories'.*inherited.*is not a list/)
  })

  it('should not crash on config keys that collide with Object.prototype', () => {
    // these keys resolve to inherited prototype members on a naive lookup
    const merged = mergeConfigChain([
      entry('.github/child.yml', {
        toString: 'child',
        constructor: 'child',
        hasOwnProperty: 'child',
      }),
    ])

    expect(merged.toString).toBe('child')
    expect(merged.constructor).toBe('child')
    expect(merged.hasOwnProperty).toBe('child')
  })
})

describe('extendsDeclarationSchema', () => {
  it('should normalize the plain target string form', () => {
    expect(extendsDeclarationSchema.parse('base.yml')).toEqual({
      from: 'base.yml',
      strategy: {},
    })
  })

  it('should normalize the mapping form with per-key strategies', () => {
    expect(
      extendsDeclarationSchema.parse({
        from: 'base.yml',
        strategy: { categories: 'append' },
      }),
    ).toEqual({ from: 'base.yml', strategy: { categories: 'append' } })
  })

  it('should return undefined for absent or null values', () => {
    expect(extendsDeclarationSchema.parse(undefined)).toBeUndefined()
    expect(extendsDeclarationSchema.parse(null)).toBeUndefined()
  })

  it('should treat an empty or blank string as absent', () => {
    expect(extendsDeclarationSchema.parse('')).toBeUndefined()
    expect(extendsDeclarationSchema.parse('   ')).toBeUndefined()
  })

  it('should treat a null strategy (empty YAML key) as no strategies', () => {
    expect(
      extendsDeclarationSchema.parse({ from: 'base.yml', strategy: null }),
    ).toEqual({ from: 'base.yml', strategy: {} })
  })

  it('should throw when the mapping form has no from', () => {
    expect(() =>
      extendsDeclarationSchema.parse({
        strategy: { categories: 'append' },
      }),
    ).toThrow(/from/)
  })

  it('should throw when the mapping form has a blank from target', () => {
    expect(() => extendsDeclarationSchema.parse({ from: '   ' })).toThrow(
      /from/,
    )
  })

  it('should throw on unknown keys in the mapping form', () => {
    expect(() =>
      extendsDeclarationSchema.parse({
        from: 'base.yml',
        stratagy: { categories: 'append' },
      }),
    ).toThrow(/stratagy/)
  })

  it('should throw on an unknown strategy value', () => {
    expect(() =>
      extendsDeclarationSchema.parse({
        from: 'base.yml',
        strategy: { categories: 'concat' },
      }),
    ).toThrow(/categories/)
  })

  it('should throw when strategy is not a mapping', () => {
    expect(() =>
      extendsDeclarationSchema.parse({
        from: 'base.yml',
        strategy: 'append',
      }),
    ).toThrow(/strategy/)
  })

  it('should throw when _extends is neither a string nor a mapping', () => {
    expect(() => extendsDeclarationSchema.parse(['base.yml'])).toThrow()
  })
})
