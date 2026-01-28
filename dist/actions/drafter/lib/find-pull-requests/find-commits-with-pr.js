import "../../../../core.js";
import "../../../../types/action-input.schema.js";
import "../../../../types/config.schema.js";
import "path";
import "fs";
import "../../../../isBoolean.js";
import "../../../../lexer.js";
import "../../../../common/string-to-regex.js";
import { getOctokit } from "../../../../common/get-octokit.js";
import { paginateGraphql } from "../../../../common/paginate-graphql.js";
import { getGqlQuery } from "./get-query.js";
const findCommitsWithPr = async (params) => {
  const octokit = getOctokit();
  const data = await paginateGraphql(
    octokit.graphql,
    getGqlQuery("find-commits-with-pr"),
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
//# sourceMappingURL=find-commits-with-pr.js.map
