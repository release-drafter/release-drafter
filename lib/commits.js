const log = require('./log')

module.exports.findCommits = async ({ app, context, branch, lastRelease }) => {
  if (lastRelease) {
    log({ app, context, message: `Comparing commits ${lastRelease.tag_name}..${branch}` })
    // Only supports up to 250 commits
    return context.github.repos.compareCommits(context.repo({
      base: lastRelease.tag_name,
      head: branch
    })).then(res => res.data.commits)
  } else {
    log({ app, context, message: `Fetching all commits for branch ${branch}` })
    return context.github.paginate(
      context.github.repos.getCommits(context.repo({
        sha: branch,
        per_page: 100
      })),
      res => res.data
    )
  }
}

const extractPullRequestNumber = (commit) => {
  // There are two types of GitHub pull request merges, normal and squashed.
  // Normal ones look like 'Merge pull request #123'
  // Squashed ones look like 'Some changes (#123)'
  const match = commit.commit.message.match(/\(#(\d+)\)$|^Merge pull request #(\d+)/)
  return match && (match[1] || match[2])
}

const findPullRequest = ({ context, number }) => {
  return context.github.pullRequests.get(context.repo({ number: number }))
    .then(res => res.data)
    // We ignore any problems, in case the PR number pulled out of the commits
    // are bonkers
    .catch(() => false)
}

module.exports.findPullRequests = ({ app, context, commits }) => {
  if (commits.length === 0) {
    return Promise.resolve([])
  }

  const pullRequestNumbers = commits
    .map(extractPullRequestNumber)
    .filter(number => number)

  log({ app, context, message: `Found pull request numbers: ${pullRequestNumbers.join(', ')}` })

  const pullRequestPromises = pullRequestNumbers
    .map(number => findPullRequest({ context, number }))

  return Promise.all(pullRequestPromises)
    // Filter out PR lookups that failed
    .then(prs => prs.filter(pr => pr))
    .catch(() => [])
}
