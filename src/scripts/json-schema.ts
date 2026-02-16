import { writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  configSchema as drafterConfigSchema,
  exclusiveConfigSchema,
  commonConfigSchema
} from 'src/actions/drafter/config'
import { configSchema as autolabelerConfigSchema } from 'src/actions/autolabeler/config'
import z from 'zod'

const drafterSchema = z.toJSONSchema(
  z
    .object({
      ...exclusiveConfigSchema.shape,
      ...commonConfigSchema.shape
    })
    .meta({ ...z.globalRegistry.get(drafterConfigSchema) })
)
const autolabelerSchema = z.toJSONSchema(
  z
    .object({
      ...autolabelerConfigSchema.shape
    })
    .meta({ ...z.globalRegistry.get(autolabelerConfigSchema) })
)

const drafterFilePath = resolve(
  import.meta.dirname,
  '../..',
  'drafter',
  'schema.json'
)

const autolabelerFilePath = resolve(
  import.meta.dirname,
  '../..',
  'autolabeler',
  'schema.json'
)

writeFileSync(drafterFilePath, JSON.stringify(drafterSchema), {
  encoding: 'utf-8',
  flag: 'w'
})
writeFileSync(autolabelerFilePath, JSON.stringify(autolabelerSchema), {
  encoding: 'utf-8',
  flag: 'w'
})
