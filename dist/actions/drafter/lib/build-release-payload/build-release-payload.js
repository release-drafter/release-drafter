import { sortPullRequests } from "./sort-pull-requests.js";
import { renderTemplate } from "./render-template.js";
import { generateChangeLog } from "./generate-changelog.js";
import { generateContributorsSentence } from "./generate-contributors-sentence.js";
import { c as context } from "../../../../github.js";
import { resolveVersionKeyIncrement } from "./resolve-version-increment.js";
import { c as coreExports } from "../../../../core.js";
import { getVersionInfo } from "./get-version-info.js";
const buildReleasePayload = (params) => {
  const { commits, config, input, lastRelease, pullRequests } = params;
  coreExports.info(`Building release payload and body...`);
  const sortedPullRequests = sortPullRequests({
    pullRequests,
    config
  });
  let body = (config["header"] || "") + config.template + (config["footer"] || "");
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
      $OWNER: context.repo.owner,
      $REPOSITORY: context.repo.repo
    },
    replacers: config.replacers
  });
  const versionKeyIncrement = resolveVersionKeyIncrement({
    pullRequests,
    config
  });
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
  const res = {
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
  coreExports.info(`Release payload built successfully`);
  coreExports.info(`  name:              ${res.name}`);
  coreExports.info(`  tag:               ${res.tag}`);
  coreExports.info(`  body:              ${res.body.length} characters long`);
  coreExports.info(`  targetCommitish:   ${res.targetCommitish}`);
  coreExports.info(`  prerelease:        ${res.prerelease}`);
  coreExports.info(`  make_latest:       ${res.make_latest}`);
  coreExports.info(
    `  draft:             ${res.draft}${!res.draft ? " (will be published !)" : ""}`
  );
  coreExports.info(`  resolvedVersion:   ${res.resolvedVersion}`);
  coreExports.info(`  majorVersion:      ${res.majorVersion}`);
  coreExports.info(`  minorVersion:      ${res.minorVersion}`);
  coreExports.info(`  patchVersion:      ${res.patchVersion}`);
  return res;
};
export {
  buildReleasePayload
};
