import { describe, expect, it } from 'vitest'
import {
  exclusiveConfigSchema,
  commonConfigSchema
} from 'src/actions/drafter/config'
import { configSchema as autolabelerConfigSchema } from 'src/actions/autolabeler/config'
import { toJSONSchema, object, globalRegistry } from 'zod'
import { configSchema as drafterConfigSchema } from 'src/actions/drafter/config'
import { check, format, resolveConfig } from 'prettier'

/**
 * Mirrors the schema generation in src/scripts/json-schema.ts
 * so that regressions are caught by tests.
 */
function generateDrafterJSONSchema() {
  return toJSONSchema(
    object({
      ...exclusiveConfigSchema.shape,
      ...commonConfigSchema.shape
    }).meta({ ...globalRegistry.get(drafterConfigSchema) }),
    { io: 'input' }
  )
}

function generateAutolabelerJSONSchema() {
  return toJSONSchema(
    object({ ...autolabelerConfigSchema.shape }).meta({
      ...globalRegistry.get(autolabelerConfigSchema)
    }),
    { io: 'input' }
  )
}

async function isPrettierFormatted(filename: string, content: unknown) {
  const prettierConfig = await resolveConfig(filename)
  const formatted = await format(JSON.stringify(content), {
    ...prettierConfig,
    filepath: filename
  })
  return check(formatted, { ...prettierConfig, filepath: filename })
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
      (key) => properties[key] && 'default' in properties[key]
    )

    expect(
      requiredWithDefaults,
      `These fields have defaults but are marked as required: ${requiredWithDefaults.join(', ')}`
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
    const categoryItems = categories['categories']?.items
    if (!categoryItems?.required || !categoryItems?.properties) return

    const requiredWithDefaults = categoryItems.required.filter(
      (key) =>
        categoryItems.properties![key] &&
        'default' in categoryItems.properties![key]
    )

    expect(
      requiredWithDefaults,
      `Category item fields have defaults but are marked as required: ${requiredWithDefaults.join(', ')}`
    ).toEqual([])
  })

  it('generated drafter schema should be prettier-formatted', async () => {
    expect(
      await isPrettierFormatted('schema.json', generateDrafterJSONSchema())
    ).toBe(true)
  })

  it('generated autolabeler schema should be prettier-formatted', async () => {
    expect(
      await isPrettierFormatted(
        'autolabeler/schema.json',
        generateAutolabelerJSONSchema()
      )
    ).toBe(true)
  })
})
