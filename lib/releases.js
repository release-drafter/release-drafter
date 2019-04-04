const compareVersions = require('compare-versions')
const { major, minor, patch } = require('semver')

const { getVersionInfo } = require('./versions')
const { template } = require('./template')
const { get } = require('lodash')
const log = require('./log')

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
    if (commit.author) {
      contributors.add(`@${commit.author.login}`)
    } else {
      contributors.add(commit.commit.author.name)
    }
  })

  pullRequests.forEach(pullRequest => {
    contributors.add(`@${pullRequest.user.login}`)
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
    acc[category.label] = category
    return acc
  }, {})

  const orderedCategories = [
    UNCATEGORIZED,
    ...config.categories.map(category => category.label)
  ]

  return [categoriesConfig, orderedCategories]
}

const categorizePullRequests = (pullRequests, categories) => {
  return pullRequests.reduce(
    (acc, pullRequest) => {
      if (
        pullRequest.labels.length === 0 ||
        !pullRequest.labels.some(label => categories.includes(label.name))
      ) {
        acc[UNCATEGORIZED].push(pullRequest)
      } else {
        pullRequest.labels.forEach(label => {
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
    orderedCategories
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
              $AUTHOR: pullRequest.user.login
            })
          )
          .join('\n')
      )

      if (index + 1 !== orderedCategories.length) acc.push('\n\n')

      return acc
    }, [])
    .join('')
}

const templateVersion = (input, version) => {
  return template(input, {
    $MAJOR: major(version),
    $MINOR: minor(version),
    $PATCH: patch(version)
  })
}

const templateNextVersion = (input, nextVersions, versionTemplate) => {
  return template(input, {
    $NEXT_MAJOR_VERSION:
      templateVersion(versionTemplate, nextVersions.incrementedMajor) || '',
    $NEXT_MINOR_VERSION:
      templateVersion(versionTemplate, nextVersions.incrementedMinor) || '',
    $NEXT_PATCH_VERSION:
      templateVersion(versionTemplate, nextVersions.incrementedPatch) || ''
  })
}

module.exports.generateReleaseInfo = ({
  commits,
  config,
  lastRelease,
  mergedPullRequests
}) => {
  let body = config.template

  body = body.template({
    $PREVIOUS_TAG: get(lastRelease, 'tag_name') || '',
    $CHANGES: generateChangeLog(mergedPullRequests, config),
    $CONTRIBUTORS: contributorsSentence({
      commits,
      pullRequests: mergedPullRequests
    })
  })

  if (lastRelease) {
    let name = config['name-template'] || ''
    let tag = config['tag-template'] || ''

    const versionInfo = getVersionInfo(lastRelease)
    if (versionInfo) {
      body = templateNextVersion(body, versionInfo, config['version-template'])
      name = templateNextVersion(name, versionInfo, config['version-template'])
      tag = templateNextVersion(tag, versionInfo, config['version-template'])
    }

    return {
      name,
      tag,
      body
    }
  } else {
    // There is no previous version, so we cannot template the name/tag
    return {
      name: '',
      tag: '',
      body
    }
  }
}
