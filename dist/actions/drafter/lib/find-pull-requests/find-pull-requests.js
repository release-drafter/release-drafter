import { c as context } from "../../../../github.js";
import { findCommitsWithPathChange } from "./find-commits-with-path-change.js";
import { c as coreExports } from "../../../../core.js";
import { findCommitsWithPr } from "./find-commits-with-pr.js";
import { _ } from "../../../../lodash.js";
const findPullRequests = async (params) => {
  const since = params.lastRelease?.created_at || params.config["initial-commits-since"];
  const shouldfilterByChangedPaths = params.config["include-paths"].length > 0;
  let commitIdsMatchingPaths = {};
  if (shouldfilterByChangedPaths) {
    coreExports.info("Finding commits with path changes...");
    const {
      commitIdsMatchingPaths: commitIdsMatchingPathsRes,
      hasFoundCommits
    } = await findCommitsWithPathChange(params.config["include-paths"], {
      since,
      name: context.repo.repo,
      owner: context.repo.owner,
      targetCommitish: params.config.commitish
    });
    if (!hasFoundCommits) {
      return { commits: [], pullRequests: [] };
    }
    commitIdsMatchingPaths = commitIdsMatchingPathsRes;
    Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
      coreExports.info(`Found ${ids.size} commits with changes to path "${path}"`);
    });
  }
  coreExports.info(
    `Fetching parent commits of ${params.config["commitish"]}${since ? ` since ${since}` : ""}...`
  );
  let commits = await findCommitsWithPr({
    since,
    name: context.repo.repo,
    owner: context.repo.owner,
    targetCommitish: params.config.commitish,
    withPullRequestBody: params.config["change-template"].includes("$BODY"),
    withPullRequestURL: params.config["change-template"].includes("$URL"),
    withBaseRefName: params.config["change-template"].includes("$BASE_REF_NAME"),
    withHeadRefName: params.config["change-template"].includes("$HEAD_REF_NAME"),
    pullRequestLimit: params.config["pull-request-limit"],
    historyLimit: params.config["history-limit"]
  });
  coreExports.info(`Found ${commits.length} commits.`);
  commits = shouldfilterByChangedPaths ? commits.filter(
    (commit) => params.config["include-paths"].some(
      (path) => commitIdsMatchingPaths[path].has(commit.id)
    )
  ) : commits;
  if (shouldfilterByChangedPaths) {
    coreExports.info(
      `After filtering by path changes, ${commits.length} commits remain.`
    );
  }
  let pullRequests = _.uniqBy(
    commits.flatMap((commit) => commit.associatedPullRequests?.nodes),
    "number"
  ).filter((pr) => !!pr);
  coreExports.info(
    `Found ${pullRequests.length} pull requests associated with those commits.`
  );
  pullRequests = pullRequests.filter(
    (pr) => (
      // Ensure PR is from the same repository
      pr.baseRepository?.nameWithOwner === `${context.repo.owner}/${context.repo.repo}` && // Ensure PR is merged
      pr.merged
    )
  );
  coreExports.info(
    `After filtering, ${pullRequests.length} pull requests remain : ${pullRequests.map((pr) => `#${pr.number}`).join(", ")}`
  );
  return { commits, pullRequests };
};
export {
  findPullRequests
};
