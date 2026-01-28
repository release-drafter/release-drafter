import { writeFileSync } from "fs";
import { resolve } from "path";
import "../core.js";
import { replacersSchema, configSchema } from "../actions/drafter/config/config.schema.js";
import "../actions/drafter/config/action-input.schema.js";
import "../isBoolean.js";
import "../lexer.js";
import { autolabelerSchema as autolabelerSchema$1, configSchema as configSchema$1 } from "../actions/autolabeler/config/config.schema.js";
import "../actions/autolabeler/config/action-input.schema.js";
import { z } from "../external.js";
process.env.GITHUB_REF = "${{ github.ref }}";
const drafterSchema = z.toJSONSchema(
  z.object({
    ...configSchema.shape,
    replacers: replacersSchema
  }).meta({ ...z.globalRegistry.get(configSchema) })
);
const autolabelerSchema = z.toJSONSchema(
  z.object({
    ...configSchema$1.shape,
    autolabeler: autolabelerSchema$1
  }).meta({ ...z.globalRegistry.get(configSchema$1) })
);
const drafterFilePath = resolve(
  import.meta.dirname,
  "../..",
  "drafter",
  "schema.json"
);
const autolabelerFilePath = resolve(
  import.meta.dirname,
  "../..",
  "autolabeler",
  "schema.json"
);
writeFileSync(drafterFilePath, JSON.stringify(drafterSchema), {
  encoding: "utf-8",
  flag: "w"
});
writeFileSync(autolabelerFilePath, JSON.stringify(autolabelerSchema), {
  encoding: "utf-8",
  flag: "w"
});
