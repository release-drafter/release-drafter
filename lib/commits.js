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

module.exports.extractPullRequests = ({ commits }) => {
  let mergedPrs = []

  commits.forEach((commit) => {
    const match = commit.commit.message.match(/^Merge pull request #([^ ]+).*\n\n(.+)/m)
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
