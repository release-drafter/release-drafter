import path from "path";
import { existsSync, readFileSync } from "fs";
const loadConfigFile = (configFilename) => {
  const contextPath = path.resolve(
    process.env.GITHUB_WORKSPACE || "",
    ".github"
  );
  if (!existsSync(contextPath)) {
    throw new Error(
      `GITHUB_WORKSPACE is not set or the path does not exist: ${contextPath}`
    );
  }
  const configPath = path.join(contextPath, configFilename);
  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found: ${configPath}. Did you clone your sources ? (ex: using @actions/checkout)`
    );
  }
  return readFileSync(configPath, "utf8");
};
export {
  loadConfigFile
};
//# sourceMappingURL=load-config-file.js.map
