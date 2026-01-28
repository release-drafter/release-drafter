import { writeFileSync } from 'fs'
import { resolve } from 'path'
import {
  configSchema as drafterConfigSchema,
  replacersSchema
} from 'src/actions/drafter/config'
import {
  configSchema as autolabelerConfigSchema,
  autolabelerSchema as autolabelerSchemaFromConfig
} from 'src/actions/autolabeler/config'
import z from 'zod'

process.env.GITHUB_REF = '${{ github.ref }}'

const drafterSchema = z.toJSONSchema(
  z
    .object({
      ...drafterConfigSchema.shape,
      replacers: replacersSchema
    })
    .meta({ ...z.globalRegistry.get(drafterConfigSchema) })
)
const autolabelerSchema = z.toJSONSchema(
  z
    .object({
      ...autolabelerConfigSchema.shape,
      autolabeler: autolabelerSchemaFromConfig
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
