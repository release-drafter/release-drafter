function runnerIsActions() {
  return process.env['GITHUB_ACTION'] !== undefined
}

module.exports.isRunningInGitHubActions = runnerIsActions
