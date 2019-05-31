#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const { findCommitsWithAssociatedPullRequestsQuery } = require('../lib/commits')

const REPO_OWNER = 'TimonVS'
const REPO_NAME = 'release-drafter-test-repo'
const GITHUB_GRAPHQL_API_ENDPOINT = 'https://api.github.com/graphql'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

if (!GITHUB_TOKEN) {
  throw new Error(
    "GitHub's GraphQL API requires a token. Please pass a valid token (GITHUB_TOKEN) as an env variable, no scopes are required."
  )
}

const branches = ['merge-commit', 'rebase-merging', 'squash-merging']

branches.forEach(branch => {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `bearer ${GITHUB_TOKEN}`
    },
    body: JSON.stringify({
      query: findCommitsWithAssociatedPullRequestsQuery,
      variables: {
        owner: REPO_OWNER,
        name: REPO_NAME,
        branch
      }
    })
  }

  fetch(GITHUB_GRAPHQL_API_ENDPOINT, options)
    .then(response => response.json())
    .then(data => {
      fs.writeFileSync(
        path.resolve(
          __dirname,
          '../test/fixtures/__generated__',
          `graphql-commits-${branch}.json`
        ),
        JSON.stringify(data, null, 2)
      )
    })
    .catch(console.error)
})
