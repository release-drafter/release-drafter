// Searches the commits for merged pull requests, and returns the pull requests
module.exports.findMergedPullRequests = async ({ app, context, branch, lastRelease }) => {
  let commits

  if (lastRelease) {
    console.log({ compareCommits: `${lastRelease.tag_name}..${branch}` })
    // Only supports up to 250 commits
    commits = await context.github.repos.compareCommits(context.repo({
      base: lastRelease.tag_name,
      head: branch
    })).then(res => res.data.commits)
  } else {
    console.log({ getCommits: `${branch}` })
    commits = await context.github.paginate(
      context.github.repos.getCommits(context.repo({
        sha: branch,
        per_page: 100
      })),
      res => res.data
    )
  }

  let mergedPrs = []

  commits.forEach((commit) => {
    console.log({ message: commit.commit.message })
    const match = commit.commit.message.match(/^Merge pull request #([^ ]+).*\\n\\n(.+)/m)
    if (match) {
      console.log({ match: `${match[1]} - ${match[2]} - ${commit.author.login}` })
      mergedPrs.push({
        number: match[1],
        title: match[2],
        login: commit.author.login
      })
    }
  })

  return mergedPrs
}
