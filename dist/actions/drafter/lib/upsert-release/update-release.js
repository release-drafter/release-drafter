import "../../../../lodash.js";
import "../../../../lexer.js";
import "path";
import "fs";
import "../../../../core.js";
import { getOctokit } from "../../../../common/get-octokit.js";
import "../../../../index.js";
import "../../../../common/shared-input.schema.js";
import { c as context } from "../../../../github.js";
const updateRelease = async (params) => {
  const octokit = getOctokit();
  const { draftRelease, releasePayload } = params;
  const updateReleaseParameters = {
    name: releasePayload.name || draftRelease.name || void 0,
    tag_name: releasePayload.tag || draftRelease.tag_name,
    target_commitish: releasePayload.targetCommitish
  };
  if (!updateReleaseParameters.name) {
    delete updateReleaseParameters.name;
  }
  if (!updateReleaseParameters.tag_name) {
    delete updateReleaseParameters.tag_name;
  }
  if (!updateReleaseParameters.target_commitish) {
    delete updateReleaseParameters.target_commitish;
  }
  return octokit.rest.repos.updateRelease({
    owner: context.repo.owner,
    repo: context.repo.repo,
    release_id: draftRelease.id,
    body: releasePayload.body,
    draft: releasePayload.draft,
    prerelease: releasePayload.prerelease,
    make_latest: releasePayload.prerelease ? "false" : releasePayload.make_latest.toString(),
    ...updateReleaseParameters
  });
};
export {
  updateRelease
};
