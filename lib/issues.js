const _ = require('lodash')
const issueParser = require('issue-parser')
const parse = issueParser('github')

module.exports.getIssueDetailsQuery = /* GraphQL */ `
  query getIssueDetailsQuery(
    $name: String!
    $owner: String!
    $issueNumber: Int!
  ) {
    repository(name: $name, owner: $owner) {
      issue(number: $issueNumber) {
        title
        number
        author {
          login
        }
        timelineItems(last: 1, itemTypes: CLOSED_EVENT) {
          nodes {
            __typename
            ... on ClosedEvent {
              closer {
                __typename
                ... on PullRequest {
                  title
                  number
                  author {
                    login
                  }
                }
                ... on Commit {
                  oid
                  author {
                    name
                    user {
                      login
                    }
                  }
                  message
                }
              }
            }
          }
        }
      }
    }
  }
`

module.exports.getClosedIssuesFromPRBody = pullRequests => {
  if (!pullRequests.length) return []

  const parsedBodies = pullRequests
    .map(pr => parse(pr.bodyText))
    .filter(({ actions }) => actions && actions.close && actions.close.length)

  const issues = _.uniq(
    _.flatten(
      parsedBodies.map(({ actions }) =>
        actions.close.map(action => action.issue)
      )
    )
  )

  // Get issue author and message from API

  return issues
}
