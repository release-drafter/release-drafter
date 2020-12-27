const core = require('@actions/core')
const { runnerIsActions } = require('./utils')

module.exports = ({ context, message, error }) => {
  if (runnerIsActions()) {
    if (error) {
      core.error(`${message}\n${error}`)
    } else {
      core.info(message)
    }
  } else {
    const repo = context.payload.repository
    const prefix = repo ? `${repo.full_name}: ` : ''
    const logString = `${prefix}${message}`
    if (error) {
      context.log.warn(error, logString)
    } else {
      context.log.info(logString)
    }
  }
}
