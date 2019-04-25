const log = require('./log')

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
    customReplacers.forEach(({ search, replace, flags }) => {
      str = str.replace(new RegExp(search, flags), replace)
    })
  }
  return str
}

function validateReplacers({ app, context, replacers }) {
  return replacers
    .map(replacer => {
      if (replacer.flags === undefined || replacer.flags === null) {
        replacer.flags = 'g'
      }
      return replacer
    })
    .filter(replacer => {
      try {
        new RegExp(replacer.search, replacers.flags)
        return true
      } catch (e) {
        log({
          app,
          context,
          message: `Bad replacer regex: '${replacer.search}', flags: ${
            replacer.flags
          }`
        })
        return false
      }
    })
}

module.exports.template = template
module.exports.validateReplacers = validateReplacers
