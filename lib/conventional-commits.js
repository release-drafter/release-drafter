/**
 * Conventional Commits support for Release Drafter
 * https://www.conventionalcommits.org/
 */

/**
 * Parse a conventional commit message
 * Format: <type>[optional scope][!]: <description>
 *
 * @param {string} message - The commit message to parse
 * @returns {Object} Parsed commit with type, scope, breaking, subject, and body
 */
const parseCommitMessage = (message) => {
  const lines = message.split('\n')
  const firstLine = lines[0]
  const body = lines.slice(1).join('\n').trim()

  // Match: type(scope)!: subject or type!: subject or type(scope): subject or type: subject
  const conventionalCommitRegex = /^([a-z]+)(?:\(([^)]+)\))?(!)?: (.+)$/i

  const match = firstLine.match(conventionalCommitRegex)

  if (!match) {
    return {
      type: null,
      scope: null,
      breaking: false,
      subject: firstLine,
      body,
    }
  }

  const [, type, scope, breaking, subject] = match

  return {
    type: type.toLowerCase(),
    scope: scope || null,
    breaking: !!breaking,
    subject,
    body,
  }
}

/**
 * Filter out commits that have associated pull requests
 * to avoid duplication in release notes
 *
 * @param {Array} commits - Array of commit objects
 * @returns {Array} Commits without associated PRs
 */
const filterCommitsWithoutPullRequests = (commits) => {
  return commits.filter((commit) => {
    // Check if commit has associated pull requests
    const hasPRs =
      commit.associatedPullRequests &&
      commit.associatedPullRequests.nodes &&
      commit.associatedPullRequests.nodes.length > 0

    return !hasPRs
  })
}

/**
 * Categorize commits based on their conventional commit type
 *
 * @param {Array} commits - Array of commit objects
 * @param {Array} categories - Category configuration from config
 * @returns {Object} Object with categorizedCommits and uncategorizedCommits arrays
 */
const categorizeCommits = (commits, categories) => {
  const categorizedCommits = categories.map((category) => ({
    ...category,
    commits: [],
  }))

  const uncategorizedCommits = []

  for (const commit of commits) {
    const parsed = parseCommitMessage(commit.message)
    commit.parsed = parsed

    // Handle breaking changes (type!)
    const commitType = parsed.breaking ? `${parsed.type}!` : parsed.type

    let categorized = false

    for (const [i, category] of categories.entries()) {
      const commitTypes = category['commit-types'] || []

      if (commitTypes.includes(commitType)) {
        categorizedCommits[i].commits.push(commit)
        categorized = true
        break
      }
    }

    if (!categorized) {
      uncategorizedCommits.push(commit)
    }
  }

  return {
    categorizedCommits,
    uncategorizedCommits,
  }
}

/**
 * Resolve version bump from commit types
 *
 * @param {Array} commits - Array of commits
 * @param {Object} versionResolver - Version resolver configuration
 * @returns {string|null} Version bump type (major, minor, patch) or null
 */
const resolveVersionFromCommits = (commits, versionResolver) => {
  if (!versionResolver || !commits || commits.length === 0) {
    return null
  }

  const commitTypes = commits.map((commit) => {
    const parsed = commit.parsed || parseCommitMessage(commit.message)
    return parsed.breaking ? `${parsed.type}!` : parsed.type
  })

  if (versionResolver.major && versionResolver.major['commit-types']) {
    const majorTypes = versionResolver.major['commit-types']
    if (commitTypes.some((type) => majorTypes.includes(type))) {
      return 'major'
    }
  }

  if (versionResolver.minor && versionResolver.minor['commit-types']) {
    const minorTypes = versionResolver.minor['commit-types']
    if (commitTypes.some((type) => minorTypes.includes(type))) {
      return 'minor'
    }
  }

  if (versionResolver.patch && versionResolver.patch['commit-types']) {
    const patchTypes = versionResolver.patch['commit-types']
    if (commitTypes.some((type) => patchTypes.includes(type))) {
      return 'patch'
    }
  }

  return null
}

module.exports = {
  parseCommitMessage,
  filterCommitsWithoutPullRequests,
  categorizeCommits,
  resolveVersionFromCommits,
}
