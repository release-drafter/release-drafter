const getConfig = require('probot-config')
const compareVersions = require('compare-versions')
const { mergedPullRequests } = require('./pull-requests')

const changesList = ({ mergedPrs }) => {
  if (mergedPrs.length === 0) {
    return '* No changes'
  } else {
    return mergedPrs.map(pr => (
      `* ${pr.title} #${pr.number} (@${pr.user.login})`
    )).join('\n')
  }
}

const findLastVersion = ({ releases }) => {
  const publishedReleases = releases
    .filter(r => !r.draft)
    .sort((r1, r2) => compareVersions(r1.tag_name, r2.tag_name))

  return publishedReleases[publishedReleases.length - 1]
}

module.exports = async ({ robot, context, configName }) => {
  const config = await getConfig(context, configName) || {}
  const { tag, title, body: template } = config
  const branches = config.branches || [context.payload.repository.default_branch]

  const branch = context.payload.ref.replace(/^refs\/heads\//, '')
  if (branches.indexOf(branch) === -1) {
    robot.log(`Ignoring push. ${branch} is not one of: ${branches.join(', ')}`)
    return
  }

  let releases = await context.github.paginate(
    context.github.repos.getReleases(context.repo()),
    res => res.data
  )
  const draftRelease = releases.find((r) => r.draft)
  const lastVersion = findLastVersion({ releases })

  if (draftRelease && draftRelease.name !== title) {
    robot.log(`Ignoring existing draft release`)
    return
  }

  let body = template

  if (lastVersion) {
    body = body.replace('$PREVIOUS_TAG', lastVersion.tag_name)
    const mergedPrs = await mergedPullRequests({ robot, context, branch, previousTag: lastVersion.tag_name })
    body = body.replace('$CHANGES', changesList({ mergedPrs }))
  }

  if (!draftRelease) {
    robot.log(`Creating new draft release`)
    await context.github.repos.createRelease(context.repo({
      tag_name: tag,
      name: title,
      body: body,
      draft: true
    }))
  } else {
    robot.log(`Updating existing draft release`, { draftRelease })
    await context.github.repos.editRelease(context.repo({
      release_id: draftRelease.id,
      tag_name: tag,
      body: body
    }))
  }
}
