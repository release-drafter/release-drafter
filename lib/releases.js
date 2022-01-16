const compareVersions = require('compare-versions')
const regexEscape = require('escape-string-regexp')

const { getVersionInfo } = require('./versions')
const { template } = require('./template')
const { log } = require('./log')

const sortReleases = (releases) => {
  // For semver, we find the greatest release number
  // For non-semver, we use the most recently merged
  try {
    return releases.sort((r1, r2) => compareVersions(r1.tag_name, r2.tag_name))
  } catch {
    return releases.sort(
      (r1, r2) => new Date(r1.created_at) - new Date(r2.created_at)
    )
  }
}

const findReleases = async ({ ref, context, config }) => {
  let releases = await context.octokit.paginate(
    context.octokit.repos.listReleases.endpoint.merge(
      context.repo({
        per_page: 100,
      })
    )
  )

  log({ context, message: `Found ${releases.length} releases` })

  const { 'filter-by-commitish': filterByCommitish } = config
  const filteredReleases = filterByCommitish
    ? releases.filter((r) => ref.match(`/${r.target_commitish}$`))
    : releases
  const sortedPublishedReleases = sortReleases(
    filteredReleases.filter((r) => !r.draft)
  )
  const draftRelease = filteredReleases.find((r) => r.draft)
  const lastRelease =
    sortedPublishedReleases[sortedPublishedReleases.length - 1]

  if (draftRelease) {
    log({ context, message: `Draft release: ${draftRelease.tag_name}` })
  } else {
    log({ context, message: `No draft release found` })
  }

  if (lastRelease) {
    log({ context, message: `Last release: ${lastRelease.tag_name}` })
  } else {
    log({ context, message: `No last release found` })
  }

  return { draftRelease, lastRelease }
}

const contributorsSentence = ({ commits, pullRequests, config }) => {
  const { 'exclude-contributors': excludeContributors } = config

  const contributors = new Set()

  for (const commit of commits) {
    if (commit.author.user) {
      if (!excludeContributors.includes(commit.author.user.login)) {
        contributors.add(`@${commit.author.user.login}`)
      }
    } else {
      contributors.add(commit.author.name)
    }
  }

  for (const pullRequest of pullRequests) {
    if (
      pullRequest.author &&
      !excludeContributors.includes(pullRequest.author.login)
    ) {
      contributors.add(`@${pullRequest.author.login}`)
    }
  }

  const sortedContributors = [...contributors].sort()
  if (sortedContributors.length > 1) {
    return (
      sortedContributors.slice(0, -1).join(', ') +
      ' and ' +
      sortedContributors.slice(-1)
    )
  } else if (sortedContributors.length === 1) {
    return sortedContributors[0]
  } else {
    return config['no-contributors-template']
  }
}

const getFilterExcludedPullRequests = (excludeLabels) => {
  return (pullRequest) => {
    const labels = pullRequest.labels.nodes
    if (labels.some((label) => excludeLabels.includes(label.name))) {
      return false
    }
    return true
  }
}

const getFilterIncludedPullRequests = (includeLabels) => {
  return (pullRequest) => {
    const labels = pullRequest.labels.nodes
    if (
      includeLabels.length === 0 ||
      labels.some((label) => includeLabels.includes(label.name))
    ) {
      return true
    }
    return false
  }
}

const categorizePullRequests = (pullRequests, config) => {
  const {
    'exclude-labels': excludeLabels,
    'include-labels': includeLabels,
    categories,
  } = config
  const allCategoryLabels = new Set(
    categories.flatMap((category) => category.labels)
  )
  const uncategorizedPullRequests = []
  const categorizedPullRequests = [...categories].map((category) => {
    return { ...category, pullRequests: [] }
  })

  const uncategorizedCategoryIndex = categories.findIndex(
    (category) => category.labels.length === 0
  )

  const filterUncategorizedPullRequests = (pullRequest) => {
    const labels = pullRequest.labels.nodes

    if (
      labels.length === 0 ||
      !labels.some((label) => allCategoryLabels.has(label.name))
    ) {
      if (uncategorizedCategoryIndex === -1) {
        uncategorizedPullRequests.push(pullRequest)
      } else {
        categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(
          pullRequest
        )
      }
      return false
    }
    return true
  }

  // we only want pull requests that have yet to be categorized
  const filteredPullRequests = pullRequests
    .filter(getFilterExcludedPullRequests(excludeLabels))
    .filter(getFilterIncludedPullRequests(includeLabels))
    .filter((pullRequest) => filterUncategorizedPullRequests(pullRequest))

  categorizedPullRequests.map((category) => {
    filteredPullRequests.map((pullRequest) => {
      // lets categorize some pull request based on labels
      // note that having the same label in multiple categories
      // then it is intended to "duplicate" the pull request into each category
      const labels = pullRequest.labels.nodes
      if (labels.some((label) => category.labels.includes(label.name))) {
        category.pullRequests.push(pullRequest)
      }
    })
  })

  return [uncategorizedPullRequests, categorizedPullRequests]
}

const generateChangeLog = (mergedPullRequests, config) => {
  if (mergedPullRequests.length === 0) {
    return config['no-changes-template']
  }

  const [uncategorizedPullRequests, categorizedPullRequests] =
    categorizePullRequests(mergedPullRequests, config)

  const escapeTitle = (title) =>
    // If config['change-title-escapes'] contains backticks, then they will be escaped along with content contained inside backticks
    // If not, the entire backtick block is matched so that it will become a markdown code block without escaping any of its content
    title.replace(
      new RegExp(
        `[${regexEscape(config['change-title-escapes'])}]|\`.*?\``,
        'g'
      ),
      (match) => {
        if (match.length > 1) return match
        if (match == '@' || match == '#') return `${match}<!---->`
        return `\\${match}`
      }
    )

  const pullRequestToString = (pullRequests) =>
    pullRequests
      .map((pullRequest) =>
        template(config['change-template'], {
          $TITLE: escapeTitle(pullRequest.title),
          $NUMBER: pullRequest.number,
          $AUTHOR: pullRequest.author ? pullRequest.author.login : 'ghost',
          $BODY: pullRequest.body,
          $URL: pullRequest.url,
          $BASE_REF_NAME: pullRequest.baseRefName,
          $HEAD_REF_NAME: pullRequest.headRefName,
        })
      )
      .join('\n')

  const changeLog = []

  if (uncategorizedPullRequests.length > 0) {
    changeLog.push(pullRequestToString(uncategorizedPullRequests), '\n\n')
  }

  categorizedPullRequests.map((category, index) => {
    if (category.pullRequests.length > 0) {
      changeLog.push(
        template(config['category-template'], { $TITLE: category.title }),
        '\n\n',
        pullRequestToString(category.pullRequests)
      )

      if (index + 1 !== categorizedPullRequests.length) changeLog.push('\n\n')
    }
  })

  return changeLog.join('').trim()
}

const resolveVersionKeyIncrement = (mergedPullRequests, config) => {
  const priorityMap = {
    patch: 1,
    minor: 2,
    major: 3,
  }
  const labelToKeyMap = Object.fromEntries(
    Object.keys(priorityMap)
      .flatMap((key) => [
        config['version-resolver'][key].labels.map((label) => [label, key]),
      ])
      .flat()
  )
  const keys = mergedPullRequests
    .filter(getFilterExcludedPullRequests(config['exclude-labels']))
    .filter(getFilterIncludedPullRequests(config['include-labels']))
    .flatMap((pr) => pr.labels.nodes.map((node) => labelToKeyMap[node.name]))
    .filter(Boolean)
  const keyPriorities = keys.map((key) => priorityMap[key])
  const priority = Math.max(...keyPriorities)
  const versionKey = Object.keys(priorityMap).find(
    (key) => priorityMap[key] === priority
  )
  return versionKey || config['version-resolver'].default
}

const generateReleaseInfo = ({
  commits,
  config,
  lastRelease,
  mergedPullRequests,
  version,
  tag,
  name,
  isPreRelease,
  shouldDraft,
  commitish,
}) => {
  let body = config.template

  body = template(
    body,
    {
      $PREVIOUS_TAG: lastRelease ? lastRelease.tag_name : '',
      $CHANGES: generateChangeLog(mergedPullRequests, config),
      $CONTRIBUTORS: contributorsSentence({
        commits,
        pullRequests: mergedPullRequests,
        config,
      }),
    },
    config.replacers
  )

  const versionInfo = getVersionInfo(
    lastRelease,
    config['version-template'],
    // Use the first override parameter to identify
    // a version, from the most accurate to the least
    version || tag || name,
    resolveVersionKeyIncrement(mergedPullRequests, config)
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

  if (commitish === undefined) {
    commitish = config['commitish'] || ''
  }

  return {
    name,
    tag,
    body,
    commitish,
    prerelease: isPreRelease,
    draft: shouldDraft,
  }
}

const createRelease = ({ context, releaseInfo }) => {
  return context.octokit.repos.createRelease(
    context.repo({
      target_commitish: releaseInfo.commitish,
      name: releaseInfo.name,
      tag_name: releaseInfo.tag,
      body: releaseInfo.body,
      draft: releaseInfo.draft,
      prerelease: releaseInfo.prerelease,
    })
  )
}

const updateRelease = ({ context, draftRelease, releaseInfo }) => {
  const updateReleaseParameters = updateDraftReleaseParameters({
    name: releaseInfo.name || draftRelease.name,
    tag_name: releaseInfo.tag || draftRelease.tag_name,
  })

  return context.octokit.repos.updateRelease(
    context.repo({
      release_id: draftRelease.id,
      body: releaseInfo.body,
      draft: releaseInfo.draft,
      prerelease: releaseInfo.prerelease,
      ...updateReleaseParameters,
    })
  )
}

function updateDraftReleaseParameters(parameters) {
  const updateReleaseParameters = { ...parameters }

  // Let GitHub figure out `name` and `tag_name` if undefined
  if (!updateReleaseParameters.name) {
    delete updateReleaseParameters.name
  }
  if (!updateReleaseParameters.tag_name) {
    delete updateReleaseParameters.tag_name
  }

  return updateReleaseParameters
}

exports.findReleases = findReleases
exports.generateChangeLog = generateChangeLog
exports.generateReleaseInfo = generateReleaseInfo
exports.createRelease = createRelease
exports.updateRelease = updateRelease
