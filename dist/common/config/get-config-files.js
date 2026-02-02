import { l as lodashExports } from "../../lodash.js";
import { getConfigFile } from "./get-config-file.js";
import { parseConfigTarget } from "./parse-config-target.js";
import { c as coreExports } from "../../core.js";
const getConfigFiles = async (configFilename, currentContext) => {
  let configTarget = parseConfigTarget(configFilename, currentContext);
  const requestedRepoConfig = await getConfigFile(configTarget);
  const files = [requestedRepoConfig];
  let lastFetchedFrom = requestedRepoConfig.fetchedFrom;
  let lastExtends = requestedRepoConfig.config._extends;
  if (!lastExtends) {
    return files;
  }
  const MAX_EXTENDS_DEPTH = 33;
  let extendsDepth = 0;
  do {
    extendsDepth++;
    if (extendsDepth > MAX_EXTENDS_DEPTH) {
      throw new Error(
        `Maximum extends depth (${MAX_EXTENDS_DEPTH}) exceeded. Check for circular dependencies or reduce the chain of extended configurations.`
      );
    }
    configTarget = parseConfigTarget(lastExtends, lastFetchedFrom);
    const extendRepoConfig = await getConfigFile(configTarget, lastFetchedFrom);
    const alreadyLoaded = files.find(
      (file) => lodashExports.isEqual(
        lodashExports.omit(file.config, "_extends"),
        lodashExports.omit(extendRepoConfig.config, "_extends")
      )
    );
    if (alreadyLoaded) {
      coreExports.warning(
        `Recursion detected. Configuration with identical content was already loaded. Ignoring "_extends: ${extendRepoConfig.config._extends}".`
      );
      return files;
    } else {
      lastFetchedFrom = extendRepoConfig.fetchedFrom;
      lastExtends = extendRepoConfig.config._extends;
      files.push(extendRepoConfig);
    }
  } while (lastExtends);
  return files;
};
export {
  getConfigFiles
};
