const { log } = require('./log')
const regexParser = require('regex-parser')
const regexEscape = require('escape-string-regexp')

/**
 * replaces all uppercase dollar templates with their string representation from object
 * if replacement is undefined in object the dollar template string is left untouched
 */

const template = (string, object, customReplacers) => {
  let input = string.replace(/(\$[A-Z_]+)/g, (_, k) => {
    let result
    if (object[k] === undefined || object[k] === null) {
      result = k
    } else if (typeof object[k] === 'object') {
      result = template(object[k].template, object[k])
    } else {
      result = `${object[k]}`
    }
    return result
  })
  if (customReplacers) {
    for (const { search, replace } of customReplacers) {
      input = input.replace(search, replace)
    }
  }
  return input
}

function toRegex(search) {
  return /^\/.+\/[AJUXgimsux]*$/.test(search)
    ? regexParser(search)
    : new RegExp(regexEscape(search), 'g')
}

function validateReplacers({ context, replacers }) {
  return replacers
    .map((replacer) => {
      try {
        return { ...replacer, search: toRegex(replacer.search) }
      } catch {
        log({
          context,
          message: `Bad replacer regex: '${replacer.search}'`,
        })
        return false
      }
    })
    .filter(Boolean)
}

function validateAutolabeler({ context, autolabeler }) {
  return autolabeler
    .map((autolabel) => {
      try {
        return {
          ...autolabel,
          branch: autolabel.branch.map((reg) => {
            return toRegex(reg)
          }),
          title: autolabel.title.map((reg) => {
            return toRegex(reg)
          }),
          body: autolabel.body.map((reg) => {
            return toRegex(reg)
          }),
        }
      } catch {
        log({
          context,
          message: `Bad autolabeler regex: '${autolabel.branch}', '${autolabel.title}' or '${autolabel.body}'`,
        })
        return false
      }
    })
    .filter(Boolean)
}

function validateCategories({ categories }) {
  if (
    categories.filter((category) => category.labels.length === 0).length > 1
  ) {
    throw new Error(
      'Multiple categories detected with no labels.\nOnly one category with no labels is supported for uncategorized pull requests.'
    )
  }
}

exports.template = template
exports.validateReplacers = validateReplacers
exports.validateAutolabeler = validateAutolabeler
exports.validateCategories = validateCategories
