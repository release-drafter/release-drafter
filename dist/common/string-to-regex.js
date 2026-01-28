import { e as escapeStringRegexp } from "../index2.js";
import { r as regexParser } from "../index.js";
const stringToRegex = (search) => {
  return /^\/.+\/[AJUXgimsux]*$/.test(search) ? regexParser(search) : new RegExp(escapeStringRegexp(search), "g");
};
export {
  stringToRegex
};
