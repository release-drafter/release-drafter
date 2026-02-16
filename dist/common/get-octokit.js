import { g as getOctokit$1 } from "../github.js";
import { c as coreExports, a as core } from "../core.js";
const getOctokit = () => {
  return getOctokit$1(process.env.GITHUB_TOKEN || "", {
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
