import require$$1, { isAbsolute } from "path";
import { existsSync, readFileSync } from "fs";
import { c as coreExports } from "../../core.js";
const getConfigFileFromFs = (normalizedFilepath) => {
  if (isAbsolute(normalizedFilepath)) {
    throw new Error(
      `Absolute paths are not supported for config file path: ${normalizedFilepath}`
    );
  }
  if (!process.env.GITHUB_WORKSPACE) {
    throw new Error(
      `env GITHUB_WORKSPACE is not set. Cannot resolve local repo path.`
    );
  }
  const repoRoot = process.env.GITHUB_WORKSPACE;
  const configPath = require$$1.join(repoRoot, normalizedFilepath);
  coreExports.info(`Looking for config locally at ${configPath}...`);
  if (!existsSync(repoRoot)) {
    throw new Error(`Root repo path does not exist: ${repoRoot}`);
  }
  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found: ${configPath}. Did you clone your sources ? (ex: using @actions/checkout)`
    );
  }
  coreExports.info(`Loading from file: ${configPath}`);
  return readFileSync(configPath, "utf8");
};
export {
  getConfigFileFromFs
};
