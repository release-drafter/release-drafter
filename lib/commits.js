module.exports.findCommits = async ({ context, branch, lastRelease }) => {
  if (lastRelease) {
    // Only supports up to 250 commits
    return context.github.repos.compareCommits(context.repo({
      base: lastRelease.tag_name,
      head: branch
    })).then(res => res.data.commits)
  } else {
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
  const match = commit.message.match(/\(#(\d+)\)$|^Merge pull request #(\d+)/)
  return match && (match[1] || match[2])
}

const findPullRequest = ({ context, number }) => {
  return context.github.pullRequests.get(context.repo({ number: number }))
    .then(res => res.data)
    // We ignore any problems, in case the PR number pulled out of the commits
    // are bonkers
    .catch(() => false)
}

module.exports.findPullRequests = ({ context, commits }) => {
  if (!commits.length) {
    return Promise.resolve([])
  }

  Promise.all(commits
    .map(extractPullRequestNumber)
    .filter(number => number)
    .map(number => findPullRequest({ context, number }))
  )
    // Filter out PR lookups that failed
    .then(prs => prs.filter(pr => pr))
}
