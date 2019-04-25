const log = require('./log')
const regexParser = require('regex-parser')
const regexEscape = require('escape-string-regexp')

/**
 * replaces all uppercase dollar templates with their string representation from obj
 * if replacement is undefined in obj the dollar template string is left untouched
 */

const template = (string, obj, customReplacers) => {
  let str = string.replace(/(\$[A-Z_]+)/g, (_, k) => {
    let result
    if (obj[k] === undefined) {
      result = k
    } else if (typeof obj[k] === 'object') {
      result = template(obj[k].template, obj[k])
    } else {
      result = `${obj[k]}`
    }
    return result
  })
  if (customReplacers) {
    customReplacers.forEach(({ search, replace }) => {
      str = str.replace(search, replace)
    })
  }
  return str
}

function validateReplacers({ app, context, replacers }) {
  return replacers
    .map(replacer => {
      try {
        if (replacer.search.startsWith('/')) {
          return {
            search: regexParser(replacer.search),
            replace: replacer.replace
          }
        } else {
          // plain string
          return {
            search: new RegExp(regexEscape(replacer.search), 'g'),
            replace: replacer.replace
          }
        }
      } catch (e) {
        log({
          app,
          context,
          message: `Bad replacer regex: '${replacer.search}'`
        })
        return false
      }
    })
    .filter(Boolean)
}

module.exports.template = template
module.exports.validateReplacers = validateReplacers
