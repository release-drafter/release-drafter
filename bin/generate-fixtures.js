#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const dotenv = require('dotenv')
const { findCommitsWithAssociatedPullRequestsQuery } = require('../lib/commits')
dotenv.config()

const REPO_NAME = 'release-drafter-test-repo'
const GITHUB_GRAPHQL_API_ENDPOINT = 'https://api.github.com/graphql'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

if (!GITHUB_TOKEN) {
  throw new Error(
    "GitHub's GraphQL API requires a token. Please pass a valid token (GITHUB_TOKEN) as an env variable, no scopes are required."
  )
}

const repos = [
  {
    owner: 'TimonVS',
    branch: 'merge-commit',
  },
  {
    owner: 'TimonVS',
    branch: 'rebase-merging',
  },
  {
    owner: 'TimonVS',
    branch: 'squash-merging',
  },
  {
    owner: 'TimonVS',
    branch: 'overlapping-label',
  },
  {
    owner: 'jetersen',
    branch: 'forking',
  },
]

for (const repo of repos) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `bearer ${GITHUB_TOKEN}`,
    },
    body: JSON.stringify({
      query: findCommitsWithAssociatedPullRequestsQuery,
      variables: {
        owner: repo.owner,
        name: REPO_NAME,
        ref: repo.branch,
        withPullRequestBody: true,
        withPullRequestURL: true,
        withBaseRefName: true,
        withHeadRefName: true,
      },
    }),
  }

  fetch(GITHUB_GRAPHQL_API_ENDPOINT, options)
    .then((response) => response.json())
    .then((data) => {
      // hack the generated to reduce massive rewrite inside the tests
      // basically duplicating the possible configs 🤯
      let string = JSON.stringify(data, null, 2).replace(
        /TimonVS\/release-drafter-test-repo/g,
        'toolmantim/release-drafter-test-project'
      )
      fs.writeFileSync(
        path.resolve(
          __dirname,
          '../test/fixtures/__generated__',
          `graphql-commits-${repo.branch}.json`
        ),
        string + '\n'
      )
    })
    .catch(console.error)
}
