import { e as escapeStringRegexp } from "../../../../index.js";
function compareVersions(v1, v2) {
  const n1 = validateAndParse(v1);
  const n2 = validateAndParse(v2);
  const p1 = n1.pop();
  const p2 = n2.pop();
  const r = compareSegments(n1, n2);
  if (r !== 0) return r;
  if (p1 && p2) {
    return compareSegments(p1.split("."), p2.split("."));
  } else if (p1 || p2) {
    return p1 ? -1 : 1;
  }
  return 0;
}
const validate = (v) => typeof v === "string" && /^[v\d]/.test(v) && semver.test(v);
const compare = (v1, v2, operator) => {
  assertValidOperator(operator);
  const res = compareVersions(v1, v2);
  return operatorResMap[operator].includes(res);
};
const satisfies = (v, r) => {
  const m = r.match(/^([<>=~^]+)/);
  const op = m ? m[1] : "=";
  if (op !== "^" && op !== "~") return compare(v, r, op);
  const [v1, v2, v3] = validateAndParse(v);
  const [r1, r2, r3] = validateAndParse(r);
  if (compareStrings(v1, r1) !== 0) return false;
  if (op === "^") {
    return compareSegments([v2, v3], [r2, r3]) >= 0;
  }
  if (compareStrings(v2, r2) !== 0) return false;
  return compareStrings(v3, r3) >= 0;
};
compareVersions.validate = validate;
compareVersions.compare = compare;
compareVersions.sastisfies = satisfies;
const semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
const validateAndParse = (v) => {
  if (typeof v !== "string") {
    throw new TypeError("Invalid argument expected string");
  }
  const match = v.match(semver);
  if (!match) {
    throw new Error(`Invalid argument not valid semver ('${v}' received)`);
  }
  match.shift();
  return match;
};
const isWildcard = (s) => s === "*" || s === "x" || s === "X";
const tryParse = (v) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? v : n;
};
const forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
const compareStrings = (a, b) => {
  if (isWildcard(a) || isWildcard(b)) return 0;
  const [ap, bp] = forceType(tryParse(a), tryParse(b));
  if (ap > bp) return 1;
  if (ap < bp) return -1;
  return 0;
};
const compareSegments = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const r = compareStrings(a[i] || 0, b[i] || 0);
    if (r !== 0) return r;
  }
  return 0;
};
const operatorResMap = {
  ">": [1],
  ">=": [0, 1],
  "=": [0],
  "<=": [-1, 0],
  "<": [-1]
};
const allowedOperators = Object.keys(operatorResMap);
const assertValidOperator = (op) => {
  if (typeof op !== "string") {
    throw new TypeError(
      `Invalid operator type, expected string but got ${typeof op}`
    );
  }
  if (allowedOperators.indexOf(op) === -1) {
    throw new Error(
      `Invalid operator, expected one of ${allowedOperators.join("|")}`
    );
  }
};
const sortReleases = (params) => {
  const tagPrefixRexExp = params.tagPrefix ? new RegExp(`^${escapeStringRegexp(params.tagPrefix)}`) : void 0;
  return params.releases.sort((r1, r2) => {
    const tag_name_1 = tagPrefixRexExp ? r1.tag_name.replace(tagPrefixRexExp, "") : r1.tag_name;
    const tag_name_2 = tagPrefixRexExp ? r2.tag_name.replace(tagPrefixRexExp, "") : r2.tag_name;
    try {
      return compareVersions(tag_name_1, tag_name_2);
    } catch {
      return new Date(r1.created_at).getTime() - new Date(r2.created_at).getTime();
    }
  });
};
export {
  sortReleases
};
