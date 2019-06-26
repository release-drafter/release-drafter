const log = require('./log')
const paginate = require('./pagination')
const _ = require('lodash')

module.exports.findCommitsWithAssociatedPullRequestsQuery = /* GraphQL */ `
  query findCommitsWithAssociatedPullRequests(
    $name: String!
    $owner: String!
    $branch: String!
    $since: GitTimestamp
    $after: String
  ) {
    repository(name: $name, owner: $owner) {
      ref(qualifiedName: $branch) {
        target {
          ... on Commit {
            history(first: 100, since: $since, after: $after) {
              totalCount
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                message
                author {
                  name
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
                    mergedAt
                    isCrossRepository
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

module.exports.findCommitsWithAssociatedPullRequests = async ({
  app,
  context,
  branch,
  lastRelease
}) => {
  const { owner, repo } = context.repo()
  const variables = { name: repo, owner, branch }
  const dataPath = ['repository', 'ref', 'target', 'history']

  let data
  if (lastRelease) {
    log({
      app,
      context,
      message: `Fetching all commits for branch ${branch} since ${lastRelease.published_at}`
    })

    data = await paginate(
      context.github.graphql,
      module.exports.findCommitsWithAssociatedPullRequestsQuery,
      { ...variables, since: lastRelease.published_at },
      dataPath
    )
  } else {
    log({ app, context, message: `Fetching all commits for branch ${branch}` })

    data = await paginate(
      context.github.graphql,
      module.exports.findCommitsWithAssociatedPullRequestsQuery,
      variables,
      dataPath
    )
  }

  const commits = _.get(data, [...dataPath, 'nodes'])
  const pullRequests = _.uniqBy(
    _.flatten(commits.map(commit => commit.associatedPullRequests.nodes)),
    'number'
  )

  return { commits, pullRequests }
}
