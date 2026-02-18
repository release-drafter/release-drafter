import { l as lodashExports } from "../../lodash.js";
import { getConfigFiles } from "./get-config-files.js";
import { c as coreExports } from "../../core.js";
async function composeConfigGet(configFilename, currentContext) {
  coreExports.debug(
    `composeConfigGet: Starting config composition with filename: ${configFilename}`
  );
  coreExports.debug(
    `composeConfigGet: Current context - repo: ${currentContext.repo.owner}/${currentContext.repo.repo}, ref: ${currentContext.ref}`
  );
  const configResults = await getConfigFiles(configFilename, currentContext);
  coreExports.debug(
    `composeConfigGet: Retrieved ${configResults.length} config file(s)`
  );
  const configs = configResults.map((res) => lodashExports.omit(res.config, "_extends")).reverse().filter(Boolean);
  const contexts = configResults.map((c) => c.fetchedFrom).filter(Boolean);
  coreExports.debug(`composeConfigGet: Resolved ${contexts.length} context(s)`);
  contexts.forEach((ctx, idx) => {
    coreExports.debug(
      `composeConfigGet: Context[${idx}] - scheme: ${ctx.scheme}, filepath: ${ctx.filepath}${ctx.repo ? `, repo: ${ctx.repo.owner}/${ctx.repo.repo}` : ""}`
    );
  });
  const result = {
    contexts,
    config: Object.assign({}, ...configs)
  };
  coreExports.debug(
    `composeConfigGet: Config composition complete with ${Object.keys(result.config).length} keys`
  );
  return result;
}
export {
  composeConfigGet
};
