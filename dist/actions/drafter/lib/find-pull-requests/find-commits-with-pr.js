import "../../../../lodash.js";
import "../../../../lexer.js";
import "path";
import "fs";
import "../../../../core.js";
import { getOctokit } from "../../../../common/get-octokit.js";
import "../../../../index.js";
import { paginateGraphql } from "../../../../common/paginate-graphql.js";
import "../../../../common/shared-input.schema.js";
const findCommitsWithPrQuery = "query findCommitsWithAssociatedPullRequests(\n  $name: String!\n  $owner: String!\n  $targetCommitish: String!\n  $withPullRequestBody: Boolean!\n  $withPullRequestURL: Boolean!\n  $since: GitTimestamp\n  $after: String\n  $withBaseRefName: Boolean!\n  $withHeadRefName: Boolean!\n  $pullRequestLimit: Int!\n  $historyLimit: Int!\n) {\n  repository(name: $name, owner: $owner) {\n    object(expression: $targetCommitish) {\n      ... on Commit {\n        __typename\n        history(first: $historyLimit, since: $since, after: $after) {\n          __typename\n          totalCount\n          pageInfo {\n            __typename\n            hasNextPage\n            endCursor\n          }\n          nodes {\n            __typename\n            id\n            committedDate\n            message\n            author {\n              __typename\n              name\n              user {\n                __typename\n                login\n              }\n            }\n            associatedPullRequests(first: $pullRequestLimit) {\n              __typename\n              nodes {\n                __typename\n                title\n                number\n                url @include(if: $withPullRequestURL)\n                body @include(if: $withPullRequestBody)\n                author {\n                  __typename\n                  login\n                  url\n                }\n                baseRepository {\n                  __typename\n                  nameWithOwner\n                }\n                mergedAt\n                isCrossRepository\n                labels(first: 100) {\n                  __typename\n                  nodes {\n                    __typename\n                    name\n                  }\n                }\n                merged\n                baseRefName @include(if: $withBaseRefName)\n                headRefName @include(if: $withHeadRefName)\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}\n";
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
