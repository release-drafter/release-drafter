import { readFileSync } from "fs";
import path from "path";
const getGqlQuery = (query) => {
  return readFileSync(path.resolve(import.meta.dirname, `${query}.gql`), {
    encoding: "utf-8"
  });
};
export {
  getGqlQuery
};
//# sourceMappingURL=get-query.js.map
