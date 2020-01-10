const compareVersions = require('compare-versions')

const { getVersionInfo } = require('./versions')
const { template } = require('./template')
const log = require('./log')
const _ = require('lodash')

const UNCATEGORIZED = 'UNCATEGORIZED'

const sortReleases = releases => {
  // For semver, we find the greatest release number
  // For non-semver, we use the most recently merged
  try {
    return releases.sort((r1, r2) => compareVersions(r1.tag_name, r2.tag_name))
  } catch (error) {
    return releases.sort(
      (r1, r2) => new Date(r1.published_at) - new Date(r2.published_at)
    )
  }
}

module.exports.findReleases = async ({ app, context }) => {
  let releases = await context.github.paginate(
    context.github.repos.listReleases.endpoint.merge(
      context.repo({
        per_page: 100
      })
    )
  )

  log({ app, context, message: `Found ${releases.length} releases` })

  const sortedPublishedReleases = sortReleases(releases.filter(r => !r.draft))
  const draftRelease = releases.find(r => r.draft)
  const lastRelease =
    sortedPublishedReleases[sortedPublishedReleases.length - 1]

  if (draftRelease) {
    log({ app, context, message: `Draft release: ${draftRelease.tag_name}` })
  } else {
    log({ app, context, message: `No draft release found` })
  }

  if (lastRelease) {
    log({ app, context, message: `Last release: ${lastRelease.tag_name}` })
  } else {
    log({ app, context, message: `No last release found` })
  }

  return { draftRelease, lastRelease }
}

const contributorsSentence = ({ commits, pullRequests }) => {
  const contributors = new Set()

  commits.forEach(commit => {
    if (commit.author.user) {
      contributors.add(`@${commit.author.user.login}`)
    } else {
      contributors.add(commit.author.name)
    }
  })

  pullRequests.forEach(pullRequest => {
    if (pullRequest.author) {
      contributors.add(`@${pullRequest.author.login}`)
    }
  })

  const sortedContributors = Array.from(contributors).sort()
  if (sortedContributors.length > 1) {
    return (
      sortedContributors.slice(0, sortedContributors.length - 1).join(', ') +
      ' and ' +
      sortedContributors.slice(-1)
    )
  } else {
    return sortedContributors[0]
  }
}

const getCategoriesConfig = ({ config }) => {
  const categoriesConfig = config.categories.reduce((acc, category) => {
    const labels = category.label ? [category.label] : category.labels
    labels.forEach(label => (acc[label] = category))
    return acc
  }, {})

  const orderedCategories = [
    UNCATEGORIZED,
    ..._.flatMap(config.categories, category =>
      category.label ? category.label : category.labels
    )
  ]

  return [categoriesConfig, orderedCategories]
}

const categorizePullRequests = (pullRequests, categories, excludeLabels) => {
  return pullRequests.reduce(
    (acc, pullRequest) => {
      const labels = pullRequest.labels.nodes
      if (labels.some(label => excludeLabels.includes(label.name))) {
        return acc
      } else if (
        labels.length === 0 ||
        !labels.some(label => categories.includes(label.name))
      ) {
        acc[UNCATEGORIZED].push(pullRequest)
      } else {
        labels.forEach(label => {
          if (!acc[label.name]) acc[label.name] = []

          acc[label.name].push(pullRequest)
        })
      }

      return acc
    },
    {
      [UNCATEGORIZED]: []
    }
  )
}

const generateChangeLog = (mergedPullRequests, config) => {
  if (mergedPullRequests.length === 0) {
    return config['no-changes-template']
  }

  const [categoriesConfig, orderedCategories] = getCategoriesConfig({ config })
  const categorizedPullRequests = categorizePullRequests(
    mergedPullRequests,
    orderedCategories,
    config['exclude-labels']
  )
  return orderedCategories
    .reduce((acc, category, index) => {
      if (
        !categorizedPullRequests[category] ||
        categorizedPullRequests[category].length === 0
      )
        return acc

      if (category !== UNCATEGORIZED) {
        acc.push(`## ${categoriesConfig[category].title}\n\n`)
      }

      acc.push(
        categorizedPullRequests[category]
          .map(pullRequest =>
            template(config['change-template'], {
              $TITLE: pullRequest.title,
              $NUMBER: pullRequest.number,
              $AUTHOR: pullRequest.author ? pullRequest.author.login : 'ghost'
            })
          )
          .join('\n')
      )

      if (index + 1 !== orderedCategories.length) acc.push('\n\n')

      return acc
    }, [])
    .join('')
    .trim()
}

module.exports.generateReleaseInfo = ({
  commits,
  config,
  lastRelease,
  mergedPullRequests,
  version = undefined,
  tag = undefined,
  name = undefined
}) => {
  let body = config.template

  body = template(
    body,
    {
      $PREVIOUS_TAG: lastRelease ? lastRelease.tag_name : '',
      $CHANGES: generateChangeLog(mergedPullRequests, config),
      $CONTRIBUTORS: contributorsSentence({
        commits,
        pullRequests: mergedPullRequests
      })
    },
    config.replacers
  )

  const versionInfo = getVersionInfo(
    lastRelease,
    config['version-template'],
    // Use the first override parameter to identify
    // a version, from the most accurate to the least
    version || tag || name
  )

  if (versionInfo) {
    body = template(body, versionInfo)
  }

  if (tag === undefined) {
    tag = versionInfo ? template(config['tag-template'] || '', versionInfo) : ''
  }

  if (name === undefined) {
    name = versionInfo
      ? template(config['name-template'] || '', versionInfo)
      : ''
  }

  return {
    name,
    tag,
    body
  }
}
