import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  configSchema as drafterConfigSchema,
  exclusiveConfigSchema,
  commonConfigSchema
} from 'src/actions/drafter/config'
import { configSchema as autolabelerConfigSchema } from 'src/actions/autolabeler/config'
import { toJSONSchema, object, globalRegistry } from 'zod'

const drafterSchema = toJSONSchema(
  object({
    ...exclusiveConfigSchema.shape,
    ...commonConfigSchema.shape
  }).meta({ ...globalRegistry.get(drafterConfigSchema) }),
  { io: 'input' }
)
const autolabelerSchema = toJSONSchema(
  object({
    ...autolabelerConfigSchema.shape
  }).meta({ ...globalRegistry.get(autolabelerConfigSchema) }),
  { io: 'input' }
)

const drafterFilePath = resolve(
  import.meta.dirname,
  '../..',
  'drafter',
  'schema.json'
)

// Also place in root folder for json schema store to keep working
// see https://github.com/SchemaStore/schemastore/pull/895
const alternateDrafterFilePath = resolve(
  import.meta.dirname,
  '../..',
  'schema.json'
)

const autolabelerFilePath = resolve(
  import.meta.dirname,
  '../..',
  'autolabeler',
  'schema.json'
)

writeFileSync(drafterFilePath, JSON.stringify(drafterSchema, null, 2) + '\n', {
  encoding: 'utf-8',
  flag: 'w'
})
writeFileSync(
  alternateDrafterFilePath,
  JSON.stringify(drafterSchema, null, 2) + '\n',
  {
    encoding: 'utf-8',
    flag: 'w'
  }
)
writeFileSync(
  autolabelerFilePath,
  JSON.stringify(autolabelerSchema, null, 2) + '\n',
  {
    encoding: 'utf-8',
    flag: 'w'
  }
)
