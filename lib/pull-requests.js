// Searches the commits for merged pull requests, and returns the pull requests
module.exports.findMergedPullRequests = async ({ app, context, branch, lastRelease }) => {
  if (!lastRelease) {
    return []
  }

  app.log({ lastRelease })

  // Only supports up to 250 commits
  const commits = await context.github.repos.compareCommits(context.repo({
    base: lastRelease.tag_name,
    head: branch
  })).then(res => res.data.commits)

  app.log({ commits: commits.map(c => c.commit.message) })

  let mergedPrNumbers = []

  commits.forEach((commit) => {
    const match = commit.commit.message.match(/^Merge pull request #([^ ]+)/)
    if (match && match[1]) {
      mergedPrNumbers.push(match[1])
    }
  })

  const mergedPrs = await Promise.all(mergedPrNumbers.map(number => (
    context.github.pullRequests.get(context.repo({
      number: number
    })).then(response => response.data)
  )))

  return mergedPrs
}
