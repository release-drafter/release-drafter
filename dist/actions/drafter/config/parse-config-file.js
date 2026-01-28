import { p as parse } from "../../../public-api.js";
import { configSchema } from "./config.schema.js";
const parseConfigFile = async (configFile) => {
  return configSchema.parse(parse(configFile));
};
export {
  parseConfigFile
};
