const getConfig = require('probot-config')
const FAILURE_MARKER = 'THIS FAILED CI! Be sure to investigate before trying again.\n'
const FAILED_STATUSES = ['failure', 'error']

const undoRelease = async context => {
  // TODO there should be a way of not even reacting to non-failure events?
  if (!FAILED_STATUSES.includes(context.payload.state)) {
    return
  }
  const config = await getConfig(context, 'release-drafter.yml')
  if (!config || !config['rollback-releases']) {
    return
  }
  context.log('Something has set the commit status to `failed` -- determining whether there is a release we need to roll back')
  // TODO figure out if I can go straight to tags here
  const sha = context.payload.sha
  const tags = await context.github.repos.listTags({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
  })
  if (tags.data && tags.data.length) {
    const relevantTags = tags.data.filter(tag => tag.commit.sha === sha)
    relevantTags.forEach(async tag => {
      await rollbackRelease(context, tag.name)
    })
  } else {
    context.log('No action needed.')
  }
}

const rollbackRelease = async (context, tag) => {
  context.log(`Looking for release associated with tag ${tag}...`)
  const release = await context.github.repos.getReleaseByTag({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    tag: tag
  }).catch(() => {
    context.log(`Could not find release associated with tag ${tag}.`)
    return Promise.resolve()
  })

  context.log(`Reverting the release to a draft state...`)
  await context.github.repos.updateRelease({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    release_id: release.data.id,
    body: FAILURE_MARKER + release.data.body,
    draft: true,
    tag_name: tag
  })

  context.log(`Deleting tag ${tag}...`)
  // The endpoint below is not implemented in this version of Octokit (pulled in with probot dep)
  // await context.github.git.deleteRef({
  //   owner: context.payload.repository.owner.login,
  //   repo: context.payload.repository.name,
  //   ref: `tags/${tag}`
  // })
  // Instead, we will use the generic 'request' method
  await context.github.request({
    method: 'DELETE',
    url: `/repos/${context.payload.repository.owner.login}/${context.payload.repository.name}/git/refs/tags/${tag}`
  })

  context.log(`Release rollback complete.`)
}

module.exports = { undoRelease }
