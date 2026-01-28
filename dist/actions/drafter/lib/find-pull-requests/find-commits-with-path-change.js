import "path";
import "fs";
import "../../../../index.js";
import { getOctokit } from "../../../../common/get-octokit.js";
import { paginateGraphql } from "../../../../common/paginate-graphql.js";
import "../../../../common/common-input.schema.js";
import { getGqlQuery } from "./get-query.js";
const findCommitsWithPathChange = async (paths, params) => {
  const octokit = getOctokit();
  const commitIdsMatchingPaths = {};
  let hasFoundCommits = false;
  for (const path of paths) {
    const data = await paginateGraphql(
      octokit.graphql,
      getGqlQuery("find-commits-with-path-changes"),
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
