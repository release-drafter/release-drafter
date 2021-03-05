const moment = require('moment')
const template = require('./template.js')

const dateSegment = ['$YYYY', '$YY', '$M', '$MM', '$D', '$DD']
const versionSegment = ['$MAJOR', '$MINOR', '$PATCH']
const calverSegment = dateSegment + versionSegment

const parseTemplate = (template) => {
  if (!template) {
    return undefined
  }

  const templateSegments = template.split('.')
  if (!templateSegments.every((s) => calverSegment.includes(s))) {
    return undefined
  }
  if (!templateSegments.some((s) => dateSegment.includes(s))) {
    return undefined
  }
  return templateSegments
}

const init = (template) => {
  const templateSegments = parseTemplate(template)

  if (!templateSegments) {
    return undefined
  }

  let version = {}
  let segments = []

  for (const segm of templateSegments) {
    if (dateSegment.includes(segm)) {
      version[segm] = moment.utc().format(segm.replace(/^\$/, ''))
    } else {
      version[segm] = 0
    }
    segments.push(version[segm])
  }

  return {
    ...version,
    template: template,
    specifier: '',
    version: segments.join('.'),
  }
}

const parse = (template, version) => {
  const templateSegments = parseTemplate(template)
  const specVersion = version.split('-', 1)
  const calendarVersion = specVersion[0]
  const specifier = specVersion.length > 1
  specVersion[1]
  ;('')
  const splitVersion = calendarVersion.split('.')

  if (!templateSegments || splitVersion.length != templateSegments.length) {
    return undefined
  }

  let ver = templateSegments.reduce(function (acc, cur, i) {
    if (dateSegment.includes(cur)) {
      acc[cur] = splitVersion[i]
    } else if (versionSegment.includes(cur)) {
      acc[cur] = isNaN(splitVersion[i]) ? 0 : Number(splitVersion[i])
    }
    return acc
  }, {})
  return {
    ...ver,
    specifier: specifier,
    version: version,
    template: template,
  }
}

const inc = (input, versionKey = 'version') => {
  if (!input[versionKey]) {
    return null
  }

  let version = { ...input[versionKey] }
  if (input.inc) {
    if (input.inc == 'major' && version['$MAJOR']) {
      version['$MAJOR'] = version['$MAJOR'] + 1
    } else if (input.inc == 'minor' && version['$MINOR']) {
      version['$MINOR'] = version['$MINOR'] + 1
    } else if (input.inc == 'patch' && version['$PATCH']) {
      version['$PATCH'] = version['$PATCH'] + 1
    }
  }
  version.version = template.template(version.template, version)

  return {
    ...input,
    ...version,
  }
}

const dateSpecEq = (v1, v2) => {
  dateSegment.every((s) => v1[s] && v2[s] && v1[s] == v2[s])
}

module.exports.inc = inc
module.exports.init = init
module.exports.parse = parse
module.exports.parseTemplate = parseTemplate
module.exports.dateSpecEq = dateSpecEq
