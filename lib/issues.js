const _ = require('lodash')
const issueParser = require('issue-parser')
const parse = issueParser('github')

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
