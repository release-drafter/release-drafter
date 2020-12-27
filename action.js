const { createProbot } = require('probot')
const core = require('@actions/core')
const app = require('./index')

run().catch((err) => {
  core.setFailed(`💥 Release drafter failed with error: ${err.message}`)
})

async function run() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error(
      'env.GITHUB_TOKEN must be set, see https://github.com/probot/example-github-action#usage'
    )
  }

  const envVariablesMissing = [
    'GITHUB_RUN_ID',
    'GITHUB_EVENT_NAME',
    'GITHUB_EVENT_PATH',
  ].filter((name) => !process.env[name])

  if (envVariablesMissing.length) {
    const missingEnvs = envVariablesMissing.join(', ')
    throw new Error(
      `GitHub Action default environment variables missing: ${missingEnvs}. See https://docs.github.com/en/free-pro-team@latest/actions/reference/environment-variables#default-environment-variables`
    )
  }

  const probot = createProbot({
    overrides: {
      githubToken: process.env.GITHUB_TOKEN,
    },
  })

  await probot.load(app)

  return probot.receive({
    id: process.env.GITHUB_RUN_ID,
    name: process.env.GITHUB_EVENT_NAME,
    payload: require(process.env.GITHUB_EVENT_PATH),
  })
}
