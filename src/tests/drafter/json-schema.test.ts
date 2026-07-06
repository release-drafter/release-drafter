import { describe, expect, it } from 'vitest'
import { globalRegistry, object, toJSONSchema } from 'zod'
import {
  commonConfigSchema,
  configSchema as drafterConfigSchema,
  exclusiveConfigSchema,
} from '#src/actions/drafter/config/index.ts'
import { extendsDeclarationSchema } from '#src/common/config/extends.schema.ts'

/**
 * Mirrors the schema generation in src/scripts/json-schema.ts
 * so that regressions are caught by tests.
 */
function generateDrafterJSONSchema() {
  return toJSONSchema(
    object({
      _extends: extendsDeclarationSchema.optional(),
      ...exclusiveConfigSchema.shape,
      ...commonConfigSchema.shape,
    }).meta({ ...globalRegistry.get(drafterConfigSchema) }),
    { io: 'input' },
  )
}

describe('JSON schema', () => {
  /**
   * Fields with defaults should not be required in the JSON schema.
   * YAML LSPs use the JSON schema to validate config files, and marking
   * defaulted fields as required causes false validation errors.
   *
   * @see https://github.com/release-drafter/release-drafter/issues/1534
   */
  it('should not mark fields with defaults as required', () => {
    const schema = generateDrafterJSONSchema()

    const properties = schema.properties as Record<
      string,
      { default?: unknown }
    >
    const required = (schema.required as string[]) ?? []

    const requiredWithDefaults = required.filter(
      (key) => properties[key] && 'default' in properties[key],
    )

    expect(
      requiredWithDefaults,
      `These fields have defaults but are marked as required: ${requiredWithDefaults.join(', ')}`,
    ).toEqual([])
  })

  it('should not mark nested fields with defaults as required', () => {
    const schema = generateDrafterJSONSchema()

    const categories = schema.properties as Record<
      string,
      {
        items?: {
          required?: string[]
          properties?: Record<string, { default?: unknown }>
        }
      }
    >
    const categoryItems = categories.categories?.items
    expect(
      categoryItems,
      'Expected categories.categories.items to exist in schema',
    ).toBeDefined()
    const required = categoryItems?.required
    const properties = categoryItems?.properties
    if (!required || !properties) return

    const requiredWithDefaults = required.filter(
      (key) => properties[key] && 'default' in properties[key],
    )

    expect(
      requiredWithDefaults,
      `Category item fields have defaults but are marked as required: ${requiredWithDefaults.join(', ')}`,
    ).toEqual([])
  })

  /**
   * `_extends` never reaches the config schema, it is stripped while the
   * config chain is composed. The JSON schema validates the raw YAML a user
   * writes, so both of its forms have to be exposed there.
   */
  it('should expose both forms of the optional _extends key', () => {
    const schema = generateDrafterJSONSchema()
    const properties = schema.properties as Record<
      string,
      {
        anyOf?: Array<{
          type?: string
          minLength?: number
          required?: string[]
          additionalProperties?: boolean
          properties?: Record<
            string,
            {
              type?: string
              minLength?: number
              additionalProperties?: { enum?: string[] }
            }
          >
        }>
      }
    >
    const required = (schema.required as string[]) ?? []

    expect(required).not.toContain('_extends')

    const forms = properties._extends?.anyOf
    expect(forms, 'Expected _extends to allow more than one form').toBeDefined()

    const stringForm = forms?.find((form) => form.type === 'string')
    expect(stringForm).toMatchObject({ type: 'string', minLength: 1 })

    const mappingForm = forms?.find((form) => form.type === 'object')
    expect(mappingForm?.required).toEqual(['from'])
    // composition errors on unknown keys, so editors should flag them too
    expect(mappingForm?.additionalProperties).toBe(false)
    expect(mappingForm?.properties?.from).toMatchObject({
      type: 'string',
      minLength: 1,
    })
    expect(
      mappingForm?.properties?.strategy?.additionalProperties,
    ).toMatchObject({ enum: ['override', 'append', 'prepend'] })
  })

  it('should expose when.path and when.paths in the category condition JSON schema', () => {
    const schema = generateDrafterJSONSchema()
    const properties = schema.properties as Record<
      string,
      {
        items?: {
          properties?: Record<
            string,
            {
              anyOf?: Array<{
                type?: string
                items?: {
                  properties?: Record<
                    string,
                    {
                      type?: string
                      minLength?: number
                    }
                  >
                }
                properties?: Record<
                  string,
                  {
                    type?: string
                    minLength?: number
                  }
                >
              }>
            }
          >
        }
      }
    >
    const whenAnyOf = properties.categories?.items?.properties?.when?.anyOf

    expect(
      whenAnyOf,
      'Expected categories[*].when.anyOf to exist',
    ).toBeDefined()

    const singleConditionSchema = whenAnyOf?.find(
      (entry) => entry.type === 'object',
    )
    const multipleConditionsSchema = whenAnyOf?.find(
      (entry) => entry.type === 'array',
    )?.items

    expect(singleConditionSchema?.properties?.path).toMatchObject({
      type: 'string',
      minLength: 1,
    })
    expect(singleConditionSchema?.properties?.paths).toMatchObject({
      type: 'array',
    })
    expect(multipleConditionsSchema?.properties?.path).toMatchObject({
      type: 'string',
      minLength: 1,
    })
    expect(multipleConditionsSchema?.properties?.paths).toMatchObject({
      type: 'array',
    })
  })
})
