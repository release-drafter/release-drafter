import "path";
import "fs";
import "../../../../index.js";
import { getOctokit } from "../../../../common/get-octokit.js";
import "../../../../lodash.js";
import "../../../../common/common-input.schema.js";
import { g as githubExports } from "../../../../github.js";
const createRelease = async (params) => {
  const octokit = getOctokit();
  const { releasePayload } = params;
  return octokit.rest.repos.createRelease({
    owner: githubExports.context.repo.owner,
    repo: githubExports.context.repo.repo,
    target_commitish: releasePayload.targetCommitish,
    name: releasePayload.name,
    tag_name: releasePayload.tag,
    body: releasePayload.body,
    draft: releasePayload.draft,
    prerelease: releasePayload.prerelease,
    make_latest: releasePayload.make_latest.toString()
  });
};
export {
  createRelease
};
