import { c as coreExports } from "../../../core.js";
import { i as isBoolean } from "../../../isBoolean.js";
import { g as githubExports } from "../../../github.js";
import "../../../lodash.js";
import "../../../lexer.js";
import "path";
import "fs";
import { stringToRegex } from "../../../common/string-to-regex.js";
import "../../../common/shared-input.schema.js";
const mergeInputAndConfig = (params) => {
  const { config: originalConfig, input } = params;
  const config = structuredClone(originalConfig);
  if (input.commitish) {
    if (config.commitish && config.commitish !== input.commitish) {
      coreExports.info(
        `Input's commitish "${input.commitish}" overrides config's commitish "${config.commitish}"`
      );
    }
    config.commitish = input.commitish;
  }
  if (input.header) {
    if (config.header && config.header !== input.header) {
      coreExports.info(
        `Input's header "${input.header}" overrides config's header "${config.header}"`
      );
    }
    config.header = input.header;
  }
  if (input.footer) {
    if (config.footer && config.footer !== input.footer) {
      coreExports.info(
        `Input's footer "${input.footer}" overrides config's footer "${config.footer}"`
      );
    }
    config.footer = input.footer;
  }
  if (input["prerelease-identifier"]) {
    if (config["prerelease-identifier"] && config["prerelease-identifier"] !== input["prerelease-identifier"]) {
      coreExports.info(
        `Input's prerelease-identifier "${input["prerelease-identifier"]}" overrides config's prerelease-identifier "${config["prerelease-identifier"]}"`
      );
    }
    config["prerelease-identifier"] = input["prerelease-identifier"];
  }
  if (isBoolean(input.prerelease)) {
    if (isBoolean(config.prerelease) && config.prerelease !== input.prerelease) {
      coreExports.info(
        `Input's prerelease "${input.prerelease}" overrides config's prerelease "${config.prerelease}"`
      );
    }
    config.prerelease = input.prerelease;
  }
  if (isBoolean(input.latest)) {
    if (isBoolean(config.latest) && config.latest !== input.latest) {
      coreExports.info(
        `Input's latest "${input.latest}" overrides config's latest "${config.latest}"`
      );
    }
    config.latest = input.latest;
  }
  if (config.latest && config.prerelease) {
    coreExports.warning(
      "'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release."
    );
    config.latest = false;
  }
  if (config["prerelease-identifier"] && !config["include-pre-releases"]) {
    coreExports.warning(
      `You have specified a 'prerelease-identifier' (${config["prerelease-identifier"]}), but 'include-pre-releases' is set to false. Switching to true.`
    );
    config["include-pre-releases"] = true;
  }
  const commitish = config.commitish || githubExports.context.ref || githubExports.context.payload.ref;
  const latest = !isBoolean(config.latest) ? true : config.latest;
  const prerelease = !isBoolean(config.prerelease) ? false : config.prerelease;
  const replacers = config.replacers.map((r) => {
    try {
      return { ...r, search: stringToRegex(r.search) };
    } catch {
      coreExports.warning(`Bad replacer regex: '${r.search}'`);
      return false;
    }
  }).filter((r) => !!r);
  const parsedConfig = {
    ...config,
    commitish,
    latest,
    prerelease,
    replacers
  };
  if (!parsedConfig.commitish) {
    throw new Error(
      "'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)"
    );
  }
  return parsedConfig;
};
export {
  mergeInputAndConfig
};
