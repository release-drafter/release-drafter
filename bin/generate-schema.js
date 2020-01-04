// joi-to-json-schema currently does not support v16 of Joi (https://github.com/lightsofapollo/joi-to-json-schema/issues/57)
const convert = require('joi-to-json-schema')
const fs = require('fs')
const { schema } = require('../lib/schema')
const args = process.argv.slice(2) || []

const jsonSchema = {
  title: 'JSON schema for Release Drafter yaml files',
  id:
    'https://github.com/release-drafter/release-drafter/blob/master/schema.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  ...convert(schema())
}

// template is only required after deep merged, should not be required in the JSON schema
jsonSchema.required = jsonSchema.required.filter(item => item !== 'template')

if (args[0] === 'print') {
  fs.writeFileSync('./schema.json', `${JSON.stringify(jsonSchema, null, 2)}\n`)
}

module.exports.jsonSchema = jsonSchema
