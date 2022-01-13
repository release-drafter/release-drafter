// joi-to-json-schema currently does not support v16 of Joi (https://github.com/lightsofapollo/joi-to-json-schema/issues/57)
const convert = require('joi-to-json-schema')
const fs = require('fs')
const { schema } = require('../lib/schema')
const inputArguments = process.argv.slice(2) || []

const jsonSchema = {
  title: 'JSON schema for Release Drafter yaml files',
  id: 'https://github.com/release-drafter/release-drafter/blob/master/schema.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  ...convert(schema()),
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

if (inputArguments[0] === 'print') {
  fs.writeFileSync(
    './schema.json',
    `${JSON.stringify(jsonSchema, undefined, 2)}\n`
  )
}
