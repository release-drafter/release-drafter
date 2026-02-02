import { C as Composer, D as Document, L as LineCounter, P as Parser, S as Schema, p as parse, a as parseAllDocuments, b as parseDocument, s as stringify } from "../../public-api.js";
import { A as Alias, c as cst, L as Lexer, P as Pair, S as Scalar, Y as YAMLError, a as YAMLMap, b as YAMLParseError, d as YAMLSeq, e as YAMLWarning, i as isAlias, f as isCollection, g as isDocument, h as isMap, j as isNode, k as isPair, l as isScalar, m as isSeq, v as visit, n as visitAsync } from "../../lexer.js";
import { getConfigFileFromFs } from "./get-config-file-from-fs.js";
import { getConfigFileFromRepo } from "./get-config-file-from-repo.js";
import { normalizeFilepath } from "./normalize-filepath.js";
const YAML = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Alias,
  CST: cst,
  Composer,
  Document,
  Lexer,
  LineCounter,
  Pair,
  Parser,
  Scalar,
  Schema,
  YAMLError,
  YAMLMap,
  YAMLParseError,
  YAMLSeq,
  YAMLWarning,
  isAlias,
  isCollection,
  isDocument,
  isMap,
  isNode,
  isPair,
  isScalar,
  isSeq,
  parse,
  parseAllDocuments,
  parseDocument,
  stringify,
  visit,
  visitAsync
}, Symbol.toStringTag, { value: "Module" }));
const SUPPORTED_FILE_EXTENSIONS = ["json", "yml", "yaml"];
const getConfigFile = async (configTarget, parentTarget) => {
  const _configTarget = structuredClone(configTarget);
  const fileExtension = _configTarget.filepath.split(".").pop().toLowerCase();
  if (!SUPPORTED_FILE_EXTENSIONS.includes(fileExtension)) {
    throw new Error(
      `Unsupported file extension: .${fileExtension}. Supported extensions are: ${SUPPORTED_FILE_EXTENSIONS.join(", ")}`
    );
  }
  if (parentTarget?.scheme) {
    if (parentTarget?.scheme === "github" && _configTarget.scheme === "file") {
      throw new Error(
        `The '_extends' import-chain cannot contain github: to file: scheme transitions. Please change '_extends: ${configTarget.scheme}:${configTarget.filepath}' to use the github: scheme. ex: '_extends: ${parentTarget.repo.owner}/${parentTarget.repo.repo}:${configTarget.filepath}'`
      );
    }
  }
  const filepath = normalizeFilepath(_configTarget, parentTarget);
  _configTarget.filepath = filepath;
  const loadFromFs = _configTarget.scheme === "file";
  let configRaw;
  if (loadFromFs) {
    try {
      configRaw = getConfigFileFromFs(_configTarget.filepath);
    } catch (error) {
      throw new Error(`Local load failed. ${error.message}`);
    }
  } else {
    try {
      configRaw = await getConfigFileFromRepo(_configTarget);
    } catch (error) {
      throw new Error(`Repo load failed. ${error.message}`);
    }
  }
  const config = fileExtension === "json" ? JSON.parse(configRaw) : YAML.parse(configRaw);
  return { config, fetchedFrom: _configTarget };
};
export {
  getConfigFile
};
