#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const {
  findCommitsWithAssociatedPullRequestsQuery,
  findCommitsWithPathChangesQuery,
} = require('../lib/commits')

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

const runQuery = (kind, repo, body) => {
  const options = {
    body,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `bearer ${GITHUB_TOKEN}`,
    },
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
          `graphql-${kind}-${repo.branch}.json`
        ),
        string + '\n'
      )
    })
    .catch(console.error)
}

for (const repo of repos) {
  runQuery(
    'commits',
    repo,
    JSON.stringify({
      query: findCommitsWithAssociatedPullRequestsQuery,
      variables: {
        owner: repo.owner,
        name: REPO_NAME,
        targetCommitish: repo.branch,
        withPullRequestBody: true,
        withPullRequestURL: true,
        withBaseRefName: true,
        withHeadRefName: true,
      },
    })
  )

  runQuery(
    'include-null-path',
    repo,
    JSON.stringify({
      query: findCommitsWithPathChangesQuery,
      variables: {
        owner: repo.owner,
        name: REPO_NAME,
        targetCommitish: repo.branch,
        withPullRequestBody: true,
        withPullRequestURL: true,
        withBaseRefName: true,
        withHeadRefName: true,
        path: null,
      },
    })
  )

  runQuery(
    'include-path-src-5.md',
    repo,
    JSON.stringify({
      query: findCommitsWithPathChangesQuery,
      variables: {
        owner: repo.owner,
        name: REPO_NAME,
        targetCommitish: repo.branch,
        withPullRequestBody: true,
        withPullRequestURL: true,
        withBaseRefName: true,
        withHeadRefName: true,
        path: 'src/5.md',
      },
    })
  )
}
