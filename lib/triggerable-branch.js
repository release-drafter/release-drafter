const log = require('./log')

module.exports.isTriggerableBranch = ({ app, context, branch, config }) => {
  const validBranches = config.branches
  const relevant = validBranches.indexOf(branch) !== -1
  if (!relevant) {
    log({
      app,
      context,
      message: `Ignoring push. ${branch} is not one of: ${validBranches.join(
        ', '
      )}`,
    })
  }
  return relevant
}
