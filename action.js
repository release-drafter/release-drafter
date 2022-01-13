const core = require('@actions/core')
const { run } = require('@probot/adapter-github-actions')
const releaseDrafter = require('./index')

run(releaseDrafter).catch((error) => {
  core.setFailed(`💥 Release drafter failed with error: ${error.message}`)
})
