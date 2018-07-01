// Searches the commits for merged pull requests, and returns the pull requests
module.exports.findMergedPullRequests = async ({ app, context, branch, lastRelease }) => {
  let commits

  if (lastRelease) {
    // Only supports up to 250 commits
    commits = await context.github.repos.compareCommits(context.repo({
      base: lastRelease.tag_name,
      head: branch
    })).then(res => res.data.commits)
  } else {
    commits = await context.github.paginate(
      context.github.repos.getCommits(context.repo({
        per_page: 100
      })),
      res => res.data
    )
  }

  app.log({ commits: commits.map(c => c.commit.message) })

  let mergedPrs = []

  commits.forEach((commit) => {
    console.log({ message: commit.commit.message })
    const match = commit.commit.message.match(/^Merge pull request #([^ ]+).*\\n\\n(.+)/m)
    if (match) {
      mergedPrs.push({
        number: match[1],
        title: match[2],
        login: commit.author.login
      })
    }
  })

  return mergedPrs
}
