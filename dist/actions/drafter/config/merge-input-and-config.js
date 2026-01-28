import { c as coreExports } from "../../../core.js";
import { c as commonjsGlobal, g as getDefaultExportFromCjs } from "../../../_commonjsHelpers.js";
var _freeGlobal;
var hasRequired_freeGlobal;
function require_freeGlobal() {
  if (hasRequired_freeGlobal) return _freeGlobal;
  hasRequired_freeGlobal = 1;
  var freeGlobal = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
  _freeGlobal = freeGlobal;
  return _freeGlobal;
}
var _root;
var hasRequired_root;
function require_root() {
  if (hasRequired_root) return _root;
  hasRequired_root = 1;
  var freeGlobal = require_freeGlobal();
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;
  var root = freeGlobal || freeSelf || Function("return this")();
  _root = root;
  return _root;
}
var _Symbol;
var hasRequired_Symbol;
function require_Symbol() {
  if (hasRequired_Symbol) return _Symbol;
  hasRequired_Symbol = 1;
  var root = require_root();
  var Symbol = root.Symbol;
  _Symbol = Symbol;
  return _Symbol;
}
var _getRawTag;
var hasRequired_getRawTag;
function require_getRawTag() {
  if (hasRequired_getRawTag) return _getRawTag;
  hasRequired_getRawTag = 1;
  var Symbol = require_Symbol();
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var nativeObjectToString = objectProto.toString;
  var symToStringTag = Symbol ? Symbol.toStringTag : void 0;
  function getRawTag(value) {
    var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
    try {
      value[symToStringTag] = void 0;
      var unmasked = true;
    } catch (e) {
    }
    var result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  _getRawTag = getRawTag;
  return _getRawTag;
}
var _objectToString;
var hasRequired_objectToString;
function require_objectToString() {
  if (hasRequired_objectToString) return _objectToString;
  hasRequired_objectToString = 1;
  var objectProto = Object.prototype;
  var nativeObjectToString = objectProto.toString;
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }
  _objectToString = objectToString;
  return _objectToString;
}
var _baseGetTag;
var hasRequired_baseGetTag;
function require_baseGetTag() {
  if (hasRequired_baseGetTag) return _baseGetTag;
  hasRequired_baseGetTag = 1;
  var Symbol = require_Symbol(), getRawTag = require_getRawTag(), objectToString = require_objectToString();
  var nullTag = "[object Null]", undefinedTag = "[object Undefined]";
  var symToStringTag = Symbol ? Symbol.toStringTag : void 0;
  function baseGetTag(value) {
    if (value == null) {
      return value === void 0 ? undefinedTag : nullTag;
    }
    return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
  }
  _baseGetTag = baseGetTag;
  return _baseGetTag;
}
var isObjectLike_1;
var hasRequiredIsObjectLike;
function requireIsObjectLike() {
  if (hasRequiredIsObjectLike) return isObjectLike_1;
  hasRequiredIsObjectLike = 1;
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  isObjectLike_1 = isObjectLike;
  return isObjectLike_1;
}
var isBoolean_1;
var hasRequiredIsBoolean;
function requireIsBoolean() {
  if (hasRequiredIsBoolean) return isBoolean_1;
  hasRequiredIsBoolean = 1;
  var baseGetTag = require_baseGetTag(), isObjectLike = requireIsObjectLike();
  var boolTag = "[object Boolean]";
  function isBoolean2(value) {
    return value === true || value === false || isObjectLike(value) && baseGetTag(value) == boolTag;
  }
  isBoolean_1 = isBoolean2;
  return isBoolean_1;
}
var isBooleanExports = requireIsBoolean();
const isBoolean = /* @__PURE__ */ getDefaultExportFromCjs(isBooleanExports);
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
  return config;
};
export {
  mergeInputAndConfig
};
