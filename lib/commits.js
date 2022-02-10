const _ = require('lodash')
const { log } = require('./log')
const { paginate } = require('./pagination')

const findCommitsWithAssociatedPullRequestsQuery = /* GraphQL */ `
  query findCommitsWithAssociatedPullRequests(
    $name: String!
    $owner: String!
    $targetCommitish: String!
    $withPullRequestBody: Boolean!
    $withPullRequestURL: Boolean!
    $since: GitTimestamp
    $after: String
    $withBaseRefName: Boolean!
    $withHeadRefName: Boolean!
  ) {
    repository(name: $name, owner: $owner) {
      object(expression: $targetCommitish) {
        ... on Commit {
          history(first: 100, since: $since, after: $after) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              committedDate
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
                  url @include(if: $withPullRequestURL)
                  body @include(if: $withPullRequestBody)
                  author {
                    login
                  }
                  baseRepository {
                    nameWithOwner
                  }
                  mergedAt
                  isCrossRepository
                  labels(first: 10) {
                    nodes {
                      name
                    }
                  }
                  merged
                  baseRefName @include(if: $withBaseRefName)
                  headRefName @include(if: $withHeadRefName)
                }
              }
            }
          }
        }
      }
    }
  }
`

const findCommitsWithAssociatedPullRequests = async ({
  context,
  targetCommitish,
  lastRelease,
  config,
}) => {
  const { owner, repo } = context.repo()
  const variables = {
    name: repo,
    owner,
    targetCommitish,
    withPullRequestBody: config['change-template'].includes('$BODY'),
    withPullRequestURL: config['change-template'].includes('$URL'),
    withBaseRefName: config['change-template'].includes('$BASE_REF_NAME'),
    withHeadRefName: config['change-template'].includes('$HEAD_REF_NAME'),
  }
  const dataPath = ['repository', 'object', 'history']
  const repoNameWithOwner = `${owner}/${repo}`

  let data, commits
  if (lastRelease) {
    log({
      context,
      message: `Fetching parent commits of ${targetCommitish} since ${lastRelease.created_at}`,
    })

    data = await paginate(
      context.octokit.graphql,
      findCommitsWithAssociatedPullRequestsQuery,
      { ...variables, since: lastRelease.created_at },
      dataPath
    )
    // GraphQL call is inclusive of commits from the specified dates.  This means the final
    // commit from the last tag is included, so we remove this here.
    commits = _.get(data, [...dataPath, 'nodes']).filter(
      (commit) => commit.committedDate != lastRelease.created_at
    )
  } else {
    log({ context, message: `Fetching parent commits of ${targetCommitish}` })

    data = await paginate(
      context.octokit.graphql,
      findCommitsWithAssociatedPullRequestsQuery,
      variables,
      dataPath
    )
    commits = _.get(data, [...dataPath, 'nodes'])
  }

  const pullRequests = _.uniqBy(
    commits.flatMap((commit) => commit.associatedPullRequests.nodes),
    'number'
  ).filter(
    (pr) => pr.baseRepository.nameWithOwner === repoNameWithOwner && pr.merged
  )

  return { commits, pullRequests }
}

exports.findCommitsWithAssociatedPullRequestsQuery =
  findCommitsWithAssociatedPullRequestsQuery

exports.findCommitsWithAssociatedPullRequests =
  findCommitsWithAssociatedPullRequests
