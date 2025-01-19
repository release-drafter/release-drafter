const parse = require('joi-to-json')
const fs = require('node:fs')
const { schema } = require('../lib/schema')
const inputArguments = process.argv.slice(2) || []

const originalSchema = parse(
  schema(),
  'json',
  {},
  { includeSchemaDialect: true }
)

const jsonSchema = {
  title: 'JSON schema for Release Drafter yaml files',
  id: 'https://github.com/release-drafter/release-drafter/blob/master/schema.json',
  ...originalSchema,
}

exports.jsonSchema = jsonSchema

// template is only required after deep merged, should not be required in the JSON schema
// we should also remove the required field in case nothing remains after the filtering to keep draft04 compatibility
const requiredField = jsonSchema.required.filter((item) => item !== 'template')
if (requiredField.length > 0) {
  jsonSchema.required = requiredField
} else {
  delete jsonSchema.required
}

for (const [key, value] of Object.entries(jsonSchema.properties)) {
  if (typeof value.default === 'string' && value.default.includes('*')) {
    jsonSchema.properties[key].default = `'${value.default}'`
  }
}

if (inputArguments[0] === 'print') {
  fs.writeFileSync(
    './schema.json',
    `${JSON.stringify(jsonSchema, undefined, 2)}\n`
  )
}
