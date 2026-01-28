import { g as githubExports } from "../github.js";
import { c as coreExports, a as core } from "../core.js";
const getOctokit = () => {
  return githubExports.getOctokit(process.env.GITHUB_TOKEN || "", {
    log: { ...core, warn: coreExports.warning },
    request: {
      /**
       * Allows nock to intercept requests in tests
       */
      fetch: global.fetch
    }
  });
};
export {
  getOctokit
};
