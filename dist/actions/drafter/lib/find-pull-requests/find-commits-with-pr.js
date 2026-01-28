import "path";
import "fs";
import "../../../../index.js";
import { getOctokit } from "../../../../common/get-octokit.js";
import { paginateGraphql } from "../../../../common/paginate-graphql.js";
import "../../../../common/common-input.schema.js";
const findCommitsWithPrQuery = "query findCommitsWithAssociatedPullRequests(\n  $name: String!\n  $owner: String!\n  $targetCommitish: String!\n  $withPullRequestBody: Boolean!\n  $withPullRequestURL: Boolean!\n  $since: GitTimestamp\n  $after: String\n  $withBaseRefName: Boolean!\n  $withHeadRefName: Boolean!\n  $pullRequestLimit: Int!\n  $historyLimit: Int!\n) {\n  repository(name: $name, owner: $owner) {\n    object(expression: $targetCommitish) {\n      ... on Commit {\n        history(first: $historyLimit, since: $since, after: $after) {\n          totalCount\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n          nodes {\n            id\n            committedDate\n            message\n            author {\n              name\n              user {\n                login\n              }\n            }\n            associatedPullRequests(first: $pullRequestLimit) {\n              nodes {\n                title\n                number\n                url @include(if: $withPullRequestURL)\n                body @include(if: $withPullRequestBody)\n                author {\n                  login\n                  __typename\n                  url\n                }\n                baseRepository {\n                  nameWithOwner\n                }\n                mergedAt\n                isCrossRepository\n                labels(first: 100) {\n                  nodes {\n                    name\n                  }\n                }\n                merged\n                baseRefName @include(if: $withBaseRefName)\n                headRefName @include(if: $withHeadRefName)\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}\n";
const findCommitsWithPr = async (params) => {
  const octokit = getOctokit();
  const data = await paginateGraphql(
    octokit.graphql,
    findCommitsWithPrQuery,
    params,
    ["repository", "object", "history"]
  );
  if (data.repository?.object?.__typename !== "Commit") {
    throw new Error("Query returned an unexpected result");
  }
  const commits = (data.repository.object.history.nodes || []).filter(
    (commit) => commit != null
  );
  if (params.since) {
    return commits.filter(
      (commit) => !!commit?.committedDate && commit.committedDate != params.since
    );
  } else {
    return commits;
  }
};
export {
  findCommitsWithPr
};
