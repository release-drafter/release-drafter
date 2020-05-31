module.exports.encodeContent = (content) => {
  return Buffer.from(content).toString('base64')
}
