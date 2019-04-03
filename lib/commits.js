const log = require('./log')
const paginate = require('./pagination')
const _ = require('lodash')

module.exports.findCommits = async ({ app, context, branch, lastRelease }) => {
  if (lastRelease) {
    log({
      app,
      context,
      message: `Comparing commits ${lastRelease.tag_name}..${branch}`
    })
    // Only supports up to 250 commits
    return context.github.repos
      .compareCommits(
        context.repo({
          base: lastRelease.tag_name,
          head: branch
        })
      )
      .then(res => res.data.commits)
  } else {
    log({ app, context, message: `Fetching all commits for branch ${branch}` })
    return context.github.paginate(
      context.github.repos.listCommits.endpoint.merge(
        context.repo({
          sha: branch,
          per_page: 100
        })
      )
    )
  }
}

module.exports.extractPullRequestNumber = commit => {
  // There are two types of GitHub pull request merges, normal and squashed.
  // Normal ones look like 'Merge pull request #123'
  // Squashed ones have multiple lines, first one looks like 'Some changes (#123)'
  const match = commit.commit.message
    .split('\n')[0]
    .match(/\(#(\d+)\)$|^Merge pull request #(\d+)/)
  return match && (match[1] || match[2])
}

const findPullRequest = ({ context, number }) => {
  return (
    context.github.pullRequests
      .get(context.repo({ number: number }))
      .then(res => res.data)
      // We ignore any problems, in case the PR number pulled out of the commits
      // are bonkers
      .catch(() => false)
  )
}

module.exports.findPullRequests = ({ app, context, commits }) => {
  if (commits.length === 0) {
    return Promise.resolve([])
  }

  const pullRequestNumbers = commits
    .map(module.exports.extractPullRequestNumber)
    .filter(number => number)

  log({
    app,
    context,
    message: `Found pull request numbers: ${pullRequestNumbers.join(', ')}`
  })

  const pullRequestPromises = pullRequestNumbers.map(number =>
    findPullRequest({ context, number })
  )

  return (
    Promise.all(pullRequestPromises)
      // Filter out PR lookups that failed
      .then(prs => prs.filter(pr => pr))
      .catch(() => [])
  )
}

const getCommitsWithAssociatedPullRequestsQuery = /* GraphQL */ `
  query getCommitsWithAssociatedPullRequests(
    $name: String!
    $owner: String!
    $since: String!
    $after: String
  ) {
    repository(name: $name, owner: $owner) {
      # TODO: change master to default branch of repo
      ref(qualifiedName: "master") {
        target {
          ... on Commit {
            history(first: 10, since: $since, after: $after) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                message
                author {
                  user {
                    login
                  }
                }
                associatedPullRequests(first: 5) {
                  nodes {
                    title
                    number
                    author {
                      login
                    }
                    labels(first: 10) {
                      nodes {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

module.exports.getMergedPullRequests = async ({
  app,
  context,
  lastRelease
}) => {
  const { owner, repo } = context.repo()
  const variables = {
    name: repo,
    owner,
    ...(lastRelease ? { since: lastRelease.published_at } : {})
  }
  const dataPath = ['repository', 'ref', 'target', 'history']
  const data = await paginate(
    context.github.graphql,
    getCommitsWithAssociatedPullRequestsQuery,
    variables,
    dataPath
  )
  const commits = _.get(data, [...dataPath, 'nodes'])
  const { pullRequests } = commits.reduce(
    (accumulator, currentCommit) => {
      const associatedPullRequests = currentCommit.associatedPullRequests.nodes
      associatedPullRequests.forEach(pullRequest => {
        if (accumulator.pullRequestNumbers.has(pullRequest.number)) return
        pullRequest.labels = pullRequest.labels.nodes
        accumulator.pullRequestNumbers.add(pullRequest.number)
        accumulator.pullRequests.push(pullRequest)
      })

      return accumulator
    },
    { pullRequestNumbers: new Set(), pullRequests: [] }
  )

  return { commits, pullRequests }
}
