const compareVersions = require('compare-versions')

const log = require('./log')

const UNCATEGORIZED = 'UNCATEGORIZED'

const sortReleases = (releases) => {
  // For semver, we find the greatest release number
  // For non-semver, we use the most recently merged
  try {
    return releases.sort((r1, r2) => compareVersions(r1.tag_name, r2.tag_name))
  } catch (error) {
    return releases.sort((r1, r2) => new Date(r1.published_at) - new Date(r2.published_at))
  }
}

module.exports.findReleases = async ({ app, context }) => {
  let releases = await context.github.paginate(
    context.github.repos.getReleases(context.repo({
      per_page: 100
    })),
    res => res.data
  )

  log({ app, context, message: `Found ${releases.length} releases` })

  const sortedPublishedReleases = sortReleases(releases.filter(r => !r.draft))
  const draftRelease = releases.find((r) => r.draft)
  const lastRelease = sortedPublishedReleases[sortedPublishedReleases.length - 1]

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

  commits.forEach((commit) => {
    if (commit.author) {
      contributors.add(`@${commit.author.login}`)
    } else {
      contributors.add(commit.commit.author.name)
    }
  })

  pullRequests.forEach((pullRequest) => {
    contributors.add(`@${pullRequest.user.login}`)
  })

  const sortedContributors = Array.from(contributors).sort()
  return sortedContributors.slice(0, sortedContributors.length - 1).join(', ') + ' and ' + sortedContributors.slice(-1)
}

const getCategoriesConfig = ({ config }) => {
  let categoriesConfig = {
    [UNCATEGORIZED]: {
      order: 0
    }
  }

  config.categories.forEach(category => {
    categoriesConfig[category.label] = category
  })

  const orderedCategories = Object
    .keys(categoriesConfig)
    .slice()
    .sort((a, b) => a.order - b.order)
  
  return [categoriesConfig, orderedCategories]
}

const categorizePullRequests = (pullRequests, categoriesConfig) => {
  return pullRequests.reduce((acc, pullRequest) => {
    if (pullRequest.labels.length === 0 ||
        !pullRequest.labels.some(label => !!categoriesConfig[label])) {
      acc[UNCATEGORIZED].push(pullRequest)
    } else {
      pullRequest.labels.forEach(label => {
        if (!acc[label]) acc[label] = []

        acc[label].push(pullRequest)
      })
    }

    return acc
  }, {
    [UNCATEGORIZED]: []
  })
}

module.exports.generateReleaseBody = ({ commits, config, lastRelease, mergedPullRequests }) => {
  let body = config.template
  const [categoriesConfig, orderedCategories] = getCategoriesConfig({ config })

  if (!lastRelease) {
    body = body.replace('$PREVIOUS_TAG', '')
  } else {
    body = body.replace('$PREVIOUS_TAG', lastRelease.tag_name)
  }

  if (mergedPullRequests.length === 0) {
    body = body.replace('$CHANGES', config['no-changes-template'])
  } else {
    const categorizedPullRequests = categorizePullRequests(mergedPullRequests, categoriesConfig)

    body = body.replace('$CHANGES', orderedCategories.reduce((acc, category, index) => {
      if (categorizedPullRequests[category].length === 0) return acc

      if (category !== UNCATEGORIZED) {
        acc.push(`## ${categoriesConfig[category].title}\n\n`)
      }

      acc.push(categorizedPullRequests[category].map((pullRequest) => (
        config['change-template']
          .replace('$TITLE', pullRequest.title)
          .replace('$NUMBER', pullRequest.number)
          .replace('$AUTHOR', pullRequest.user.login)
      )).join('\n'))

      if ((index + 1) !== orderedCategories.length) acc.push('\n\n')

      return acc
    }, []).join(''))
  }

  body = body.replace('$CONTRIBUTORS', contributorsSentence({ commits, pullRequests: mergedPullRequests }))

  return body
}
