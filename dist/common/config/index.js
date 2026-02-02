import { l as lodashExports } from "../../lodash.js";
import { getConfigFiles } from "./get-config-files.js";
async function composeConfigGet(configFilename, currentContext) {
  const configResults = await getConfigFiles(configFilename, currentContext);
  const configs = configResults.map((res) => lodashExports.omit(res.config, "_extends")).reverse().filter(Boolean);
  const contexts = configResults.map((c) => c.fetchedFrom).filter(Boolean);
  return {
    contexts,
    config: Object.assign({}, ...configs)
  };
}
export {
  composeConfigGet
};
