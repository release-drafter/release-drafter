const log = ({ context, message, error, debug }) => {
  const repo = context.payload.repository
  const prefix = repo ? `${repo.full_name}: ` : ''
  const logString = `${prefix}${message}`
  if (error) {
    context.log.warn(error, logString)
  } else if (debug) {
    typeof debug === 'object'
      ? context.log.debug({ ...debug }, logString)
      : context.log.debug({}, logString)
  } else {
    context.log.info(logString)
  }
}

exports.log = log
