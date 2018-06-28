module.exports.mergedPullRequests = async ({ robot, context, branch, previousTag }) => {
  robot.log({ previousTag })

  const commits = await context.github.repos.compareCommits(context.repo({
    base: previousTag,
    head: branch
  })).then(res => res.data.commits)

  robot.log({ commits: commits.map(c => c.commit.message) })

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
