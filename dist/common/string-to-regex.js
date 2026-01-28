import { e as escapeStringRegexp } from "../index.js";
import { g as getDefaultExportFromCjs } from "../_commonjsHelpers.js";
var lib = { exports: {} };
var hasRequiredLib;
function requireLib() {
  if (hasRequiredLib) return lib.exports;
  hasRequiredLib = 1;
  lib.exports = function(input) {
    if (typeof input !== "string") {
      throw new Error("Invalid input. Input must be a string");
    }
    var m = input.match(/(\/?)(.+)\1([a-z]*)/i);
    if (!m) {
      throw new Error("Invalid regular expression format.");
    }
    var validFlags = Array.from(new Set(m[3])).filter(function(flag) {
      return "gimsuy".includes(flag);
    }).join("");
    return new RegExp(m[2], validFlags);
  };
  return lib.exports;
}
var libExports = requireLib();
const regexParser = /* @__PURE__ */ getDefaultExportFromCjs(libExports);
const stringToRegex = (search) => {
  return /^\/.+\/[AJUXgimsux]*$/.test(search) ? regexParser(search) : new RegExp(escapeStringRegexp(search), "g");
};
export {
  stringToRegex
};
