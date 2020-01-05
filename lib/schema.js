const _ = require('lodash')
const Joi = require('@hapi/joi')
const { SORT_BY, SORT_DIRECTIONS } = require('./sort-pull-requests')
const { DEFAULT_CONFIG } = require('./default-config')
const { validateReplacers } = require('./template')

const schema = context => {
  const defaultBranch = _.get(
    context,
    'payload.repository.default_branch',
    'master'
  )
  return Joi.object().keys({
    branches: Joi.array()
      .items(Joi.string())
      .default([defaultBranch]),

    'change-template': Joi.string().default(DEFAULT_CONFIG['change-template']),

    'no-changes-template': Joi.string().default(
      DEFAULT_CONFIG['no-changes-template']
    ),

    'version-template': Joi.string().default(
      DEFAULT_CONFIG['version-template']
    ),

    'name-template': Joi.string()
      .allow('')
      .default(DEFAULT_CONFIG['name-template']),

    'tag-template': Joi.string()
      .allow('')
      .default(DEFAULT_CONFIG['tag-template']),

    'exclude-labels': Joi.array()
      .items(Joi.string())
      .default(DEFAULT_CONFIG['exclude-labels']),

    'sort-by': Joi.string()
      .valid(SORT_BY.mergedAt, SORT_BY.title)
      .default(DEFAULT_CONFIG['sort-by']),

    'sort-direction': Joi.string()
      .valid(SORT_DIRECTIONS.ascending, SORT_DIRECTIONS.descending)
      .default(DEFAULT_CONFIG['sort-direction']),

    prerelease: Joi.boolean().default(DEFAULT_CONFIG.prerelease),

    replacers: Joi.array()
      .items(
        Joi.object().keys({
          search: Joi.string()
            .required()
            .error(
              () => '"search" is required and must be a regexp or a string'
            ),
          replace: Joi.string()
            .allow('')
            .required()
        })
      )
      .default(DEFAULT_CONFIG.replacers),

    categories: Joi.array()
      .items(
        Joi.object()
          .keys({
            title: Joi.string().required(),
            label: Joi.string(),
            labels: Joi.array()
              .items(Joi.string())
              .single()
          })
          .xor('label', 'labels')
      )
      .default(DEFAULT_CONFIG.categories),

    template: Joi.string().required(),

    _extends: Joi.string()
  })
}

module.exports.schema = schema

const validateSchema = (app, context, repoConfig) => {
  const { error, value: config } = schema(context).validate(repoConfig, {
    abortEarly: false,
    allowUnknown: true
  })

  if (error) throw error

  try {
    config.replacers = validateReplacers({
      app,
      context,
      replacers: config.replacers
    })
  } catch (error) {
    config.replacers = []
  }

  return config
}

module.exports.validateSchema = validateSchema
