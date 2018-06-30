module.exports.isRelevantBranch = ({ app, context, branch, config }) => {
  const validBranches = config.branches || [context.payload.repository.default_branch]
  const relevant = validBranches.indexOf(branch) !== -1
  if (!relevant) {
    app.log(`Ignoring push. ${branch} is not one of: ${validBranches.join(', ')}`)
  }
  return relevant
}
