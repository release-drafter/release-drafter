module.exports.encodeContent = (content) => {
  return Buffer.from(content).toString('base64')
}

module.exports.decodeContent = (content) => {
  return Buffer.from(content, 'base64').toString()
}
