const core = require('@actions/core')
const app = require('./index')

const { run } = require('@probot/github-action')

run(app).catch((err) => {
  core.setFailed(`💥 Release drafter failed with error: ${err.message}`)
})
