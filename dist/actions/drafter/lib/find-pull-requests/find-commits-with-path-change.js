import "path";
import "fs";
import "../../../../index.js";
import { getOctokit } from "../../../../common/get-octokit.js";
import { paginateGraphql } from "../../../../common/paginate-graphql.js";
import "../../../../common/common-input.schema.js";
const findCommitsWithPathChangeQuery = "query findCommitsWithPathChangesQuery(\n  $name: String!\n  $owner: String!\n  $targetCommitish: String!\n  $since: GitTimestamp\n  $after: String\n  $path: String\n) {\n  repository(name: $name, owner: $owner) {\n    object(expression: $targetCommitish) {\n      ... on Commit {\n        history(path: $path, since: $since, after: $after) {\n          pageInfo {\n            hasNextPage\n            endCursor\n          }\n          nodes {\n            id\n          }\n        }\n      }\n    }\n  }\n}\n";
const findCommitsWithPathChange = async (paths, params) => {
  const octokit = getOctokit();
  const commitIdsMatchingPaths = {};
  let hasFoundCommits = false;
  for (const path of paths) {
    const data = await paginateGraphql(
      octokit.graphql,
      findCommitsWithPathChangeQuery,
      { ...params, path },
      ["repository", "object", "history"]
    );
    if (data.repository?.object?.__typename !== "Commit") {
      throw new Error("Query returned an unexpected result");
    }
    const commits = (data.repository?.object?.history.nodes || []).filter(
      (c) => !!c
    );
    commitIdsMatchingPaths[path] = commitIdsMatchingPaths[path] || /* @__PURE__ */ new Set([]);
    for (const { id } of commits) {
      hasFoundCommits = true;
      commitIdsMatchingPaths[path].add(id);
    }
  }
  return { commitIdsMatchingPaths, hasFoundCommits };
};
export {
  findCommitsWithPathChange
};
