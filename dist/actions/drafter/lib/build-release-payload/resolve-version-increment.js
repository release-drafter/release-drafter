import { c as coreExports } from "../../../../core.js";
import { getFilterExcludedPullRequests, getFilterIncludedPullRequests } from "./categorize-pull-requests.js";
const resolveVersionKeyIncrement = (params) => {
  const { pullRequests, config } = params;
  const priorityMap = {
    patch: 1,
    minor: 2,
    major: 3
  };
  const labelToKeyMap = Object.fromEntries(
    Object.keys(priorityMap).flatMap((key) => [
      config["version-resolver"][key].labels.map((label) => [label, key])
    ]).flat()
  );
  coreExports.debug("labelToKeyMap: " + JSON.stringify(labelToKeyMap));
  const keys = pullRequests.filter(getFilterExcludedPullRequests(config["exclude-labels"])).filter(getFilterIncludedPullRequests(config["include-labels"])).flatMap(
    (pr) => pr.labels?.nodes?.filter((n) => !!n?.name).map((node) => labelToKeyMap[node.name])
  ).filter(Boolean);
  coreExports.debug("keys: " + JSON.stringify(keys));
  const keyPriorities = keys.map((key) => priorityMap[key]);
  const priority = Math.max(...keyPriorities);
  const versionKey = Object.keys(priorityMap).find(
    (key) => priorityMap[key] === priority
  );
  coreExports.debug("versionKey: " + versionKey);
  const versionKeyIncrement = versionKey || config["version-resolver"].default;
  const shouldIncrementAsPrerelease = config["prerelease"] && config["prerelease-identifier"];
  if (!shouldIncrementAsPrerelease) {
    return versionKeyIncrement;
  }
  return `pre${versionKeyIncrement}`;
};
export {
  resolveVersionKeyIncrement
};
//# sourceMappingURL=resolve-version-increment.js.map
