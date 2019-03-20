const crypto = require('crypto')
const fs = require('fs')
const { encodeContent } = require('../../lib/base64')

const mockError = code => {
  const err = new Error('Not found')
  err.code = code
  throw err
}

const mockContent = content => {
  return Promise.resolve({
    data: {
      content: encodeContent(content),
      sha: crypto
        .createHash('sha1')
        .update(content)
        .digest('hex')
    }
  })
}

const mockConfig = yamlFilePath => {
  return mockContent(
    fs.readFileSync(`${__dirname}/../fixtures/config/${yamlFilePath}`)
  )
}

module.exports = {
  mockError,
  mockContent,
  mockConfig
}
