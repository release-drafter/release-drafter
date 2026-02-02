import { getOctokit } from "../get-octokit.js";
import { l as lodashExports } from "../../lodash.js";
const getConfigFileFromRepo = async (configTarget) => {
  const octokit = getOctokit();
  let res;
  try {
    res = await octokit.rest.repos.getContent({
      owner: configTarget.repo.owner,
      repo: configTarget.repo.repo,
      path: configTarget.filepath,
      ref: configTarget.ref,
      mediaType: { format: "raw" }
    });
  } catch (error) {
    if (error.status === 404) {
      throw new Error(
        `Config file not found with error 404. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ""}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ""})`
      );
    }
    throw new Error(
      `Failed to fetch config from repo: ${error.message}`
    );
  }
  if (lodashExports.isArray(res.data)) {
    throw new Error(
      `Fetched content is a directory (array), expected a file. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ""}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ""})`
    );
  }
  if (!res.headers["content-type"]?.startsWith("application/vnd.github.v3.raw")) {
    throw new Error(
      `Fetched content has wrong content-type (${res.headers["content-type"]}), expected a raw file. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ""}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ""})`
    );
  }
  if (typeof res.data !== "string") {
    throw new Error(
      `Fetched content is not a string. (target: ${configTarget.repo.owner ? `${configTarget.repo.owner}/` : ""}${configTarget.repo.repo}:${configTarget.filepath}${configTarget.ref ? `@${configTarget.ref}` : ""})`
    );
  }
  return res.data;
};
export {
  getConfigFileFromRepo
};
