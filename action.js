import core from '@actions/core'
import { run } from '@probot/adapter-github-actions'
import { app } from './index'

run(app).catch((error) => {
  core.setFailed(`💥 Release drafter failed with error: ${error.message}`)
})
