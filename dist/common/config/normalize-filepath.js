import { normalize, isAbsolute, join, dirname } from "path";
import { l as lodashExports } from "../../lodash.js";
const normalizeFilepath = (config, parentConfig) => {
  const _filepath = normalize(config.filepath);
  if (isAbsolute(_filepath)) {
    if (_filepath.startsWith("/")) {
      return _filepath.slice(1);
    } else {
      throw new Error(`Encountered malformed absolute path ${_filepath}`);
    }
  } else {
    if (parentConfig && // repo & refs are identical
    lodashExports.isEqual(parentConfig.repo, config.repo) && config.ref === parentConfig.ref) {
      return normalize(join(dirname(parentConfig.filepath), _filepath));
    } else {
      return join(".github", _filepath);
    }
  }
};
export {
  normalizeFilepath
};
