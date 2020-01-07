function runnerIsActions() {
  return process.env['GITHUB_ACTION'] !== undefined
}

module.exports.runnerIsActions = runnerIsActions
