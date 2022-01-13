function runnerIsActions() {
  return process.env['GITHUB_ACTIONS'] !== undefined
}

exports.runnerIsActions = runnerIsActions
