import { findPreviousReleases } from "./lib/find-previous-releases/find-previous-releases.js";
import { findPullRequests } from "./lib/find-pull-requests/find-pull-requests.js";
import { buildReleasePayload } from "./lib/build-release-payload/build-release-payload.js";
import { upsertRelease } from "./lib/upsert-release/upsert-release.js";
const main = async (params) => {
  const { config, input } = params;
  const { draftRelease, lastRelease } = await findPreviousReleases(config);
  const { commits, pullRequests } = await findPullRequests({
    lastRelease,
    config
  });
  const releasePayload = buildReleasePayload({
    commits,
    config,
    input,
    lastRelease,
    pullRequests
  });
  const upsertedRelease = await upsertRelease({ draftRelease, releasePayload });
  return {
    upsertedRelease,
    releasePayload
  };
};
export {
  main
};
