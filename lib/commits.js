const _ = require('lodash')
const { log } = require('./log')
const { paginate } = require('./pagination')
const Joi = require('joi')
const core = require('@actions/core')

/**
 * @see https://docs.github.com/en/graphql/reference/objects#commit
 */
const findCommitsWithPathChangesQuery = /* GraphQL */ `
  query findCommitsWithPathChangesQuery(
    $name: String!
    $owner: String!
    $targetCommitish: String!
    $since: GitTimestamp
    $after: String
    $path: String
  ) {
    repository(name: $name, owner: $owner) {
      object(expression: $targetCommitish) {
        ... on Commit {
          history(path: $path, since: $since, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
            }
          }
        }
      }
    }
  }
`

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
    $pullRequestLimit: Int!
    $historyLimit: Int!
  ) {
    repository(name: $name, owner: $owner) {
      object(expression: $targetCommitish) {
        ... on Commit {
          history(first: $historyLimit, since: $since, after: $after) {
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
              associatedPullRequests(first: $pullRequestLimit) {
                nodes {
                  title
                  number
                  url @include(if: $withPullRequestURL)
                  body @include(if: $withPullRequestBody)
                  author {
                    login
                    __typename
                    url
                  }
                  baseRepository {
                    nameWithOwner
                  }
                  mergedAt
                  isCrossRepository
                  labels(first: 100) {
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
    withBaseRefName:
      config['change-template'].includes('$BASE_REF_NAME') ||
      config['exclude-base-ref-names']?.length > 0 ||
      config['include-base-ref-names']?.length > 0,
    withHeadRefName: config['change-template'].includes('$HEAD_REF_NAME'),
    pullRequestLimit: config['pull-request-limit'],
    historyLimit: config['history-limit'],
  }
  const includePaths = config['include-paths']
  const excludePaths = config['exclude-paths']
  const dataPath = ['repository', 'object', 'history']
  const repoNameWithOwner = `${owner}/${repo}`

  let data, allCommits

  const since = lastRelease
    ? lastRelease.created_at
    : config['initial-commits-since']
  const validationResult = Joi.date().iso().validate(since)

  log({
    context,
    message: `since value: ${since}`,
    debug: true,
  })
  log({
    context,
    message: `since value validation.value: ${JSON.stringify(
      validationResult,
      null,
      2
    )}`,
    debug: true,
  })
  log({
    context,
    message: `since value validation.error: ${JSON.stringify(
      validationResult.error,
      null,
      2
    )}`,
    debug: true,
  })

  // The validation result contains either an error or the validated value
  if (validationResult.error) {
    core.setFailed(validationResult.error.message)
    throw new Error(validationResult.error.message)
  }

  const includedIds = new Set()
  if (includePaths.length > 0) {
    var anyChanges = false
    for (const path of includePaths) {
      const pathData = await paginate(
        context.octokit.graphql,
        findCommitsWithPathChangesQuery,
        { ...variables, since: since, path },
        dataPath
      )
      const nodes = _.get(pathData, [...dataPath, 'nodes'], [])

      for (const { id } of nodes) {
        anyChanges = true
        includedIds.add(id)
      }
    }
    if (!anyChanges) {
      // Short circuit to avoid blowing GraphQL budget
      return { commits: [], pullRequests: [] }
    }
  }

  const excludedIds = new Set()
  if (excludePaths.length > 0) {
    for (const path of excludePaths) {
      const pathData = await paginate(
        context.octokit.graphql,
        findCommitsWithPathChangesQuery,
        { ...variables, since: since, path },
        dataPath
      )

      const nodes = _.get(pathData, [...dataPath, 'nodes'], [])

      for (const { id } of nodes) {
        excludedIds.add(id)
      }
    }
  }

  if (since) {
    log({
      context,
      message: `Fetching parent commits of ${targetCommitish} since ${since}`,
    })

    data = await paginate(
      context.octokit.graphql,
      findCommitsWithAssociatedPullRequestsQuery,
      { ...variables, since: since },
      dataPath
    )
    // GraphQL call is inclusive of commits from the specified dates.  This means the final
    // commit from the last tag is included, so we remove this here.
    allCommits = _.get(data, [...dataPath, 'nodes']).filter(
      (commit) => commit.committedDate != since
    )
  } else {
    log({ context, message: `Fetching parent commits of ${targetCommitish}` })

    data = await paginate(
      context.octokit.graphql,
      findCommitsWithAssociatedPullRequestsQuery,
      variables,
      dataPath
    )
    allCommits = _.get(data, [...dataPath, 'nodes'])
  }

  const commits = allCommits.filter((commit) => {
    if (excludedIds.has(commit.id)) {
      return false
    }
    if (includePaths.length > 0) {
      return includedIds.has(commit.id)
    }
    return true
  })

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

exports.findCommitsWithPathChangesQuery = findCommitsWithPathChangesQuery

exports.findCommitsWithAssociatedPullRequests =
  findCommitsWithAssociatedPullRequests
