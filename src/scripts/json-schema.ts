import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
// biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
import { configSchema as autolabelerConfigSchema } from '@release-drafter/autolabeler'
import {
  commonConfigSchema,
  configSchema as drafterConfigSchema,
  exclusiveConfigSchema,
  // biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
} from '@release-drafter/core'
// biome-ignore lint/correctness/useImportExtensions: this is a workspace package import.
import { extendsDeclarationSchema } from '@release-drafter/gh-actions/config'
import { globalRegistry, object, toJSONSchema } from 'zod'

// `_extends` is normalized by the raw config-file schema and stripped while
// the config chain is composed. Add the same input schema here so editors
// validate the raw YAML users write.
const drafterSchema = toJSONSchema(
  object({
    _extends: extendsDeclarationSchema,
    ...exclusiveConfigSchema.shape,
    ...commonConfigSchema.shape,
  }).meta({ ...globalRegistry.get(drafterConfigSchema) }),
  { io: 'input' },
)
const { id: _autolabelerSchemaId, ...autolabelerSchemaMetadata } =
  globalRegistry.get(autolabelerConfigSchema) ?? {}
const autolabelerSchema = toJSONSchema(
  object({
    _extends: extendsDeclarationSchema,
    ...autolabelerConfigSchema.shape,
  }).meta(autolabelerSchemaMetadata),
  { io: 'input' },
)

const drafterFilePath = resolve(
  import.meta.dirname,
  '../..',
  'drafter',
  'schema.json',
)

// Also place in root folder for json schema store to keep working
// see https://github.com/SchemaStore/schemastore/pull/895
const alternateDrafterFilePath = resolve(
  import.meta.dirname,
  '../..',
  'schema.json',
)

const autolabelerFilePath = resolve(
  import.meta.dirname,
  '../..',
  'autolabeler',
  'schema.json',
)

async function writeFormatted(filePath: string, content: unknown) {
  const raw = JSON.stringify(content, null, 2)
  const formatted = execFileSync(
    'npx',
    ['biome', 'format', '--stdin-file-path', filePath],
    { input: raw, encoding: 'utf-8' },
  )
  await writeFile(filePath, formatted, { encoding: 'utf-8', flag: 'w' })
}

await writeFormatted(drafterFilePath, drafterSchema)
await writeFormatted(alternateDrafterFilePath, drafterSchema)
await writeFormatted(autolabelerFilePath, autolabelerSchema)
