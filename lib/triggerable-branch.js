const log = require('./log')

module.exports.isTriggerableBranch = ({ app, context, branch, config }) => {
  const validBranches = config.branches
  const relevant = validBranches.indexOf(branch) !== -1
  const { GITHUB_ACTIONS } = process.env
  if (GITHUB_ACTIONS) {
    // Let GitHub Action determine when to run the action based on the workflow's on syntax
    // See https://help.github.com/en/actions/reference/workflow-syntax-for-github-actions#on
    return true
  } else if (!relevant) {
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
