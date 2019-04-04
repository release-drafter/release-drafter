/**
 * replaces all uppercase dollar templates with their string representation from obj
 * if replacement is undefined in obj the dollar template string is left untouched
 */

module.exports.template = (string, obj) => {
  return string.replace(/(\$[A-Z_]+)/g, (_, k) =>
    obj[k] === undefined ? k : `${obj[k]}`
  )
}
