const log = require('./log')

const flatten = arr => {
  return Array.prototype.concat(...arr)
}

module.exports.isTriggerableBranch = ({ app, context, branch, config }) => {
  const validBranches = flatten([config.branches])
  const relevant = validBranches.indexOf(branch) !== -1
  if (!relevant) {
    log({
      app,
      context,
      message: `Ignoring push. ${branch} is not one of: ${validBranches.join(
        ', '
      )}`
    })
  }
  return relevant
}
