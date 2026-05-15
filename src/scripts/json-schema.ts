import { execFileSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { globalRegistry, object, toJSONSchema } from 'zod'
import { configSchema as autolabelerConfigSchema } from '#src/actions/autolabeler/config/index.ts'
import {
  commonConfigSchema,
  configSchema as drafterConfigSchema,
  exclusiveConfigSchema,
} from '#src/actions/drafter/config/index.ts'

const drafterSchema = toJSONSchema(
  object({
    ...exclusiveConfigSchema.shape,
    ...commonConfigSchema.shape,
  }).meta({ ...globalRegistry.get(drafterConfigSchema) }),
  { io: 'input' },
)
const autolabelerSchema = toJSONSchema(
  object({
    ...autolabelerConfigSchema.shape,
  }).meta({ ...globalRegistry.get(autolabelerConfigSchema) }),
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
