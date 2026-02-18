import { l as lodashExports } from "../../lodash.js";
import { getConfigFile } from "./get-config-file.js";
import { parseConfigTarget } from "./parse-config-target.js";
import { c as coreExports } from "../../core.js";
const getConfigFiles = async (configFilename, currentContext) => {
  coreExports.debug(`getConfigFiles: Starting with filename: ${configFilename}`);
  let configTarget = parseConfigTarget(configFilename, currentContext);
  coreExports.debug(
    `getConfigFiles: Parsed config target - scheme: ${configTarget.scheme}, filepath: ${configTarget.filepath}`
  );
  const requestedRepoConfig = await getConfigFile(configTarget);
  coreExports.debug(
    `getConfigFiles: Fetched initial config from ${requestedRepoConfig.fetchedFrom.scheme}:${requestedRepoConfig.fetchedFrom.filepath}`
  );
  const files = [requestedRepoConfig];
  let lastFetchedFrom = requestedRepoConfig.fetchedFrom;
  let lastExtends = requestedRepoConfig.config._extends;
  if (!lastExtends) {
    coreExports.debug(
      `getConfigFiles: No _extends found in config, returning single file`
    );
    return files;
  }
  coreExports.debug(`getConfigFiles: Found _extends directive: ${lastExtends}`);
  const MAX_EXTENDS_DEPTH = 33;
  let extendsDepth = 0;
  do {
    extendsDepth++;
    coreExports.debug(
      `getConfigFiles: Processing _extends depth ${extendsDepth}: ${lastExtends}`
    );
    if (extendsDepth > MAX_EXTENDS_DEPTH) {
      const error = `Maximum extends depth (${MAX_EXTENDS_DEPTH}) exceeded. Check for circular dependencies or reduce the chain of extended configurations.`;
      coreExports.error(`getConfigFiles: ${error}`);
      throw new Error(error);
    }
    configTarget = parseConfigTarget(lastExtends, lastFetchedFrom);
    coreExports.debug(
      `getConfigFiles: Parsed _extends target - scheme: ${configTarget.scheme}, filepath: ${configTarget.filepath}`
    );
    const extendRepoConfig = await getConfigFile(configTarget, lastFetchedFrom);
    coreExports.debug(
      `getConfigFiles: Fetched extended config from ${extendRepoConfig.fetchedFrom.scheme}:${extendRepoConfig.fetchedFrom.filepath}`
    );
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
      coreExports.debug(`getConfigFiles: Recursion detected, stopping extends chain`);
      return files;
    } else {
      lastFetchedFrom = extendRepoConfig.fetchedFrom;
      lastExtends = extendRepoConfig.config._extends;
      files.push(extendRepoConfig);
      coreExports.debug(
        `getConfigFiles: Added extended config to chain. Total files: ${files.length}, next _extends: ${lastExtends || "none"}`
      );
    }
  } while (lastExtends);
  coreExports.debug(
    `getConfigFiles: Extends chain complete with ${files.length} file(s)`
  );
  return files;
};
export {
  getConfigFiles
};
