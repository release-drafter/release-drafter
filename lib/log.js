module.exports = ({ app, context, message, error }) => {
  const repo = context.payload.repository
  const prefix = repo ? `${repo.full_name}: ` : ''
  const logString = `${prefix}${message}`

  if (error) {
    app.log.warn(error, logString)
  } else {
    app.log.info(logString)
  }
}
