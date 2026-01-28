import { sortPullRequests } from "./sort-pull-requests.js";
import { renderTemplate } from "./render-template.js";
import { generateChangeLog } from "./generate-changelog.js";
import { generateContributorsSentence } from "./generate-contributors-sentence.js";
import { g as githubExports } from "../../../../github.js";
import { resolveVersionKeyIncrement } from "./resolve-version-increment.js";
import { c as coreExports } from "../../../../core.js";
import { getVersionInfo } from "./get-version-info.js";
const buildReleasePayload = (params) => {
  const { commits, config, input, lastRelease, pullRequests } = params;
  const sortedPullRequests = sortPullRequests({
    pullRequests,
    config
  });
  let body = config["header"] + config.template + config["footer"];
  body = renderTemplate({
    template: body,
    object: {
      $PREVIOUS_TAG: lastRelease ? lastRelease.tag_name : "",
      $CHANGES: generateChangeLog({ pullRequests: sortedPullRequests, config }),
      $CONTRIBUTORS: generateContributorsSentence({
        commits,
        pullRequests: sortedPullRequests,
        config
      }),
      $OWNER: githubExports.context.repo.owner,
      $REPOSITORY: githubExports.context.repo.repo
    },
    replacers: config.replacers
  });
  const versionKeyIncrement = resolveVersionKeyIncrement({
    pullRequests,
    config
  });
  coreExports.debug("versionKeyIncrement: " + versionKeyIncrement);
  const versionInfo = getVersionInfo({
    lastRelease,
    config,
    input,
    versionKeyIncrement
  });
  coreExports.debug("versionInfo: " + JSON.stringify(versionInfo, null, 2));
  if (versionInfo) {
    body = renderTemplate({ template: body, object: versionInfo });
  }
  let mutableInputTag = structuredClone(input["tag"]);
  let mutableInputName = structuredClone(input["name"]);
  let mutableCommitish = structuredClone(config["commitish"]);
  if (mutableInputTag === void 0) {
    mutableInputTag = versionInfo ? renderTemplate({
      template: config["tag-template"] || "",
      object: versionInfo
    }) : "";
  } else if (versionInfo) {
    mutableInputTag = renderTemplate({
      template: mutableInputTag,
      object: versionInfo
    });
  }
  coreExports.debug("tag: " + mutableInputTag);
  if (mutableInputName === void 0) {
    mutableInputName = versionInfo ? renderTemplate({
      template: config["name-template"] || "",
      object: versionInfo
    }) : "";
  } else if (versionInfo) {
    mutableInputName = renderTemplate({
      template: mutableInputName,
      object: versionInfo
    });
  }
  coreExports.debug("name: " + mutableInputName);
  if (mutableCommitish.startsWith("refs/tags/")) {
    coreExports.info(
      `${mutableCommitish} is not supported as release target, falling back to default branch`
    );
    mutableCommitish = "";
  }
  const resolvedVersion = versionInfo.$RESOLVED_VERSION?.version;
  const majorVersion = versionInfo.$RESOLVED_VERSION?.$MAJOR;
  const minorVersion = versionInfo.$RESOLVED_VERSION?.$MINOR;
  const patchVersion = versionInfo.$RESOLVED_VERSION?.$PATCH;
  return {
    name: mutableInputName,
    tag: mutableInputTag,
    body,
    targetCommitish: mutableCommitish,
    prerelease: config["prerelease"],
    make_latest: config["latest"],
    draft: !input["publish"],
    resolvedVersion,
    majorVersion,
    minorVersion,
    patchVersion
  };
};
export {
  buildReleasePayload
};
//# sourceMappingURL=build-release-payload.js.map
