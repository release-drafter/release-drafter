import { findPreviousReleases } from "./lib/find-previous-releases/find-previous-releases.js";
import { findPullRequests } from "./lib/find-pull-requests/find-pull-requests.js";
import { buildReleasePayload } from "./lib/build-release-payload/build-release-payload.js";
const main = async (params) => {
  const { config, input } = params;
  const { draftRelease, lastRelease } = await findPreviousReleases(config);
  const { commits, pullRequests } = await findPullRequests({
    lastRelease,
    config
  });
  buildReleasePayload({
    commits,
    config,
    input,
    lastRelease,
    pullRequests
  });
};
export {
  main
};
