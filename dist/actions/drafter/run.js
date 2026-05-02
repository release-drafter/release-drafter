import { C as setOutput, E as __toESM, S as setFailed, T as __commonJSMin, _ as context, a as _enum, b as getInput, c as number, d as stringbool, f as parseCommitishForRelease, g as getOctokit, h as composeConfigGet, i as ZodDefault, l as object, m as executeGraphql, n as escapeStringRegexp, o as array, p as paginateGraphql, r as sharedInputSchema, s as boolean, t as stringToRegex, u as string, v as debug, w as warning, x as info, y as error } from "../../chunks/common.js";
//#region src/actions/drafter/config/schemas/common-config.schema.ts
/**
* Configuration parameters that can be specified in both
* the config file or the action input.
*
* Default values cannot be defined here,
* as action inputs may override config file values.
*
* @see merge-input-and-config.ts for how the merging of config and input is handled, including default values.
*/
var commonConfigSchema = object({
	latest: stringbool().or(boolean()).optional(),
	prerelease: stringbool().or(boolean()).optional(),
	"prerelease-identifier": string().optional(),
	"include-pre-releases": stringbool().or(boolean()).optional(),
	commitish: string().optional(),
	header: string().optional(),
	footer: string().optional(),
	"filter-by-range": string().optional()
});
var actionInputSchema = object({
	"config-name": string().optional().default("release-drafter.yml"),
	name: string().optional(),
	tag: string().optional(),
	version: string().optional(),
	publish: stringbool().optional().default(false)
}).and(sharedInputSchema).and(commonConfigSchema);
//#endregion
//#region src/actions/drafter/config/get-action-inputs.ts
var getActionInput = () => {
	const getInput$1 = (name) => getInput(name) || void 0;
	const actionInput = {
		"config-name": getInput$1("config-name"),
		name: getInput$1("name"),
		tag: getInput$1("tag"),
		version: getInput$1("version"),
		publish: getInput$1("publish"),
		token: getInput$1("token"),
		latest: getInput$1("latest"),
		prerelease: getInput$1("prerelease"),
		"prerelease-identifier": getInput$1("prerelease-identifier"),
		"include-pre-releases": getInput$1("include-pre-releases"),
		commitish: getInput$1("commitish"),
		header: getInput$1("header"),
		footer: getInput$1("footer"),
		"dry-run": getInput$1("dry-run"),
		"filter-by-range": getInput$1("filter-by-range")
	};
	return actionInputSchema.parse(actionInput);
};
//#endregion
//#region src/actions/drafter/config/schemas/config.schema.ts
var exclusiveConfigSchema = object({
	"change-template": string().optional().default("* $TITLE (#$NUMBER) @$AUTHOR"),
	"change-title-escapes": string().optional(),
	"no-changes-template": string().optional().default("* No changes"),
	"version-template": string().optional().default("$MAJOR.$MINOR.$PATCH$PRERELEASE"),
	"name-template": string().optional(),
	"tag-prefix": string().optional(),
	"tag-template": string().optional(),
	"exclude-labels": array(string()).optional().default([]),
	"include-labels": array(string()).optional().default([]),
	"include-paths": array(string()).optional().default([]),
	"exclude-paths": array(string()).optional().default([]),
	"exclude-contributors": array(string()).optional().default([]),
	"no-contributors-template": string().optional().default("No contributors"),
	"sort-by": _enum(["merged_at", "title"]).optional().default("merged_at"),
	"sort-direction": _enum(["ascending", "descending"]).optional().default("descending"),
	"filter-by-commitish": boolean().optional().default(false),
	"pull-request-limit": number().int().positive().optional().default(5),
	"history-limit": number().int().positive().optional().default(15),
	replacers: array(object({
		search: string().min(1),
		replace: string().min(0)
	})).optional().default([]),
	categories: array(object({
		title: string().min(1),
		"collapse-after": number().int().min(-1).optional().default(-1),
		labels: array(string().min(1)).optional().default([]),
		label: string().min(1).optional()
	})).optional().default([]),
	"version-resolver": object({
		major: object({ labels: array(string().min(1)) }).optional().default({ labels: [] }),
		minor: object({ labels: array(string().min(1)) }).optional().default({ labels: [] }),
		patch: object({ labels: array(string().min(1)) }).optional().default({ labels: [] }),
		default: _enum([
			"major",
			"minor",
			"patch"
		]).optional().default("patch")
	}).optional().default({
		major: { labels: [] },
		minor: { labels: [] },
		patch: { labels: [] },
		default: "patch"
	}),
	"category-template": string().optional().default("## $TITLE"),
	template: string().optional().default("")
}).meta({
	title: "JSON schema for Release Drafter yaml files",
	id: "https://github.com/release-drafter/release-drafter/blob/master/drafter/schema.json"
});
var configSchema = exclusiveConfigSchema.and(commonConfigSchema);
Object.fromEntries(Object.entries({
	...exclusiveConfigSchema.shape,
	...commonConfigSchema.shape
}).map(([key, value]) => {
	if (value instanceof ZodDefault) return [key, value.def.defaultValue];
	return [key, void 0];
}));
//#endregion
//#region src/actions/drafter/config/get-config.ts
var getConfig = async (configName) => {
	const { config, contexts } = await composeConfigGet(configName, context);
	if (contexts.length > 1) info(`Config was fetched from ${contexts.length} different contexts.`);
	else if (contexts.length === 1) info(`Config fetched ${contexts[0].scheme === "file" ? "locally" : `on remote "${contexts[0].repo.owner}/${contexts[0].repo.repo}${contexts[0].ref ? `@${contexts[0].ref}` : ""}"${!contexts[0].ref ? " on the default branch" : ""}`}.`);
	return configSchema.parse(config);
};
//#endregion
//#region node_modules/semver/internal/lrucache.js
var require_lrucache = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var LRUCache = class {
		constructor() {
			this.max = 1e3;
			this.map = /* @__PURE__ */ new Map();
		}
		get(key) {
			const value = this.map.get(key);
			if (value === void 0) return;
			else {
				this.map.delete(key);
				this.map.set(key, value);
				return value;
			}
		}
		delete(key) {
			return this.map.delete(key);
		}
		set(key, value) {
			if (!this.delete(key) && value !== void 0) {
				if (this.map.size >= this.max) {
					const firstKey = this.map.keys().next().value;
					this.delete(firstKey);
				}
				this.map.set(key, value);
			}
			return this;
		}
	};
	module.exports = LRUCache;
}));
//#endregion
//#region node_modules/semver/internal/parse-options.js
var require_parse_options = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var looseOption = Object.freeze({ loose: true });
	var emptyOpts = Object.freeze({});
	var parseOptions = (options) => {
		if (!options) return emptyOpts;
		if (typeof options !== "object") return looseOption;
		return options;
	};
	module.exports = parseOptions;
}));
//#endregion
//#region node_modules/semver/internal/constants.js
var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SEMVER_SPEC_VERSION = "2.0.0";
	var MAX_LENGTH = 256;
	var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;
	module.exports = {
		MAX_LENGTH,
		MAX_SAFE_COMPONENT_LENGTH: 16,
		MAX_SAFE_BUILD_LENGTH: MAX_LENGTH - 6,
		MAX_SAFE_INTEGER,
		RELEASE_TYPES: [
			"major",
			"premajor",
			"minor",
			"preminor",
			"patch",
			"prepatch",
			"prerelease"
		],
		SEMVER_SPEC_VERSION,
		FLAG_INCLUDE_PRERELEASE: 1,
		FLAG_LOOSE: 2
	};
}));
//#endregion
//#region node_modules/semver/internal/debug.js
var require_debug = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {};
}));
//#endregion
//#region node_modules/semver/internal/re.js
var require_re = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH, MAX_LENGTH } = require_constants();
	var debug = require_debug();
	exports = module.exports = {};
	var re = exports.re = [];
	var safeRe = exports.safeRe = [];
	var src = exports.src = [];
	var safeSrc = exports.safeSrc = [];
	var t = exports.t = {};
	var R = 0;
	var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
	var safeRegexReplacements = [
		["\\s", 1],
		["\\d", MAX_LENGTH],
		[LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
	];
	var makeSafeRegex = (value) => {
		for (const [token, max] of safeRegexReplacements) value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
		return value;
	};
	var createToken = (name, value, isGlobal) => {
		const safe = makeSafeRegex(value);
		const index = R++;
		debug(name, index, value);
		t[name] = index;
		src[index] = value;
		safeSrc[index] = safe;
		re[index] = new RegExp(value, isGlobal ? "g" : void 0);
		safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
	};
	createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
	createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
	createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
	createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
	createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
	createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
	createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
	createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
	createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
	createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
	createToken("FULL", `^${src[t.FULLPLAIN]}$`);
	createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
	createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
	createToken("GTLT", "((?:<|>)?=?)");
	createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
	createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
	createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
	createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
	createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COERCEPLAIN", `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
	createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
	createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
	createToken("COERCERTL", src[t.COERCE], true);
	createToken("COERCERTLFULL", src[t.COERCEFULL], true);
	createToken("LONETILDE", "(?:~>?)");
	createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
	exports.tildeTrimReplace = "$1~";
	createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
	createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("LONECARET", "(?:\\^)");
	createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
	exports.caretTrimReplace = "$1^";
	createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
	createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
	createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
	createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
	createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
	exports.comparatorTrimReplace = "$1$2$3";
	createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
	createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
	createToken("STAR", "(<|>)?=?\\s*\\*");
	createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
	createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
}));
//#endregion
//#region node_modules/semver/internal/identifiers.js
var require_identifiers = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var numeric = /^[0-9]+$/;
	var compareIdentifiers = (a, b) => {
		if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
		const anum = numeric.test(a);
		const bnum = numeric.test(b);
		if (anum && bnum) {
			a = +a;
			b = +b;
		}
		return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
	};
	var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
	module.exports = {
		compareIdentifiers,
		rcompareIdentifiers
	};
}));
//#endregion
//#region node_modules/semver/classes/semver.js
var require_semver = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var debug = require_debug();
	var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
	var { safeRe: re, t } = require_re();
	var parseOptions = require_parse_options();
	var { compareIdentifiers } = require_identifiers();
	module.exports = class SemVer {
		constructor(version, options) {
			options = parseOptions(options);
			if (version instanceof SemVer) if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) return version;
			else version = version.version;
			else if (typeof version !== "string") throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
			if (version.length > MAX_LENGTH) throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
			debug("SemVer", version, options);
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
			if (!m) throw new TypeError(`Invalid Version: ${version}`);
			this.raw = version;
			this.major = +m[1];
			this.minor = +m[2];
			this.patch = +m[3];
			if (this.major > MAX_SAFE_INTEGER || this.major < 0) throw new TypeError("Invalid major version");
			if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) throw new TypeError("Invalid minor version");
			if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) throw new TypeError("Invalid patch version");
			if (!m[4]) this.prerelease = [];
			else this.prerelease = m[4].split(".").map((id) => {
				if (/^[0-9]+$/.test(id)) {
					const num = +id;
					if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
				}
				return id;
			});
			this.build = m[5] ? m[5].split(".") : [];
			this.format();
		}
		format() {
			this.version = `${this.major}.${this.minor}.${this.patch}`;
			if (this.prerelease.length) this.version += `-${this.prerelease.join(".")}`;
			return this.version;
		}
		toString() {
			return this.version;
		}
		compare(other) {
			debug("SemVer.compare", this.version, this.options, other);
			if (!(other instanceof SemVer)) {
				if (typeof other === "string" && other === this.version) return 0;
				other = new SemVer(other, this.options);
			}
			if (other.version === this.version) return 0;
			return this.compareMain(other) || this.comparePre(other);
		}
		compareMain(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.major < other.major) return -1;
			if (this.major > other.major) return 1;
			if (this.minor < other.minor) return -1;
			if (this.minor > other.minor) return 1;
			if (this.patch < other.patch) return -1;
			if (this.patch > other.patch) return 1;
			return 0;
		}
		comparePre(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			if (this.prerelease.length && !other.prerelease.length) return -1;
			else if (!this.prerelease.length && other.prerelease.length) return 1;
			else if (!this.prerelease.length && !other.prerelease.length) return 0;
			let i = 0;
			do {
				const a = this.prerelease[i];
				const b = other.prerelease[i];
				debug("prerelease compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		compareBuild(other) {
			if (!(other instanceof SemVer)) other = new SemVer(other, this.options);
			let i = 0;
			do {
				const a = this.build[i];
				const b = other.build[i];
				debug("build compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		inc(release, identifier, identifierBase) {
			if (release.startsWith("pre")) {
				if (!identifier && identifierBase === false) throw new Error("invalid increment argument: identifier is empty");
				if (identifier) {
					const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
					if (!match || match[1] !== identifier) throw new Error(`invalid identifier: ${identifier}`);
				}
			}
			switch (release) {
				case "premajor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor = 0;
					this.major++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "preminor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "prepatch":
					this.prerelease.length = 0;
					this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "prerelease":
					if (this.prerelease.length === 0) this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "release":
					if (this.prerelease.length === 0) throw new Error(`version ${this.raw} is not a prerelease`);
					this.prerelease.length = 0;
					break;
				case "major":
					if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
					this.minor = 0;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "minor":
					if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "patch":
					if (this.prerelease.length === 0) this.patch++;
					this.prerelease = [];
					break;
				case "pre": {
					const base = Number(identifierBase) ? 1 : 0;
					if (this.prerelease.length === 0) this.prerelease = [base];
					else {
						let i = this.prerelease.length;
						while (--i >= 0) if (typeof this.prerelease[i] === "number") {
							this.prerelease[i]++;
							i = -2;
						}
						if (i === -1) {
							if (identifier === this.prerelease.join(".") && identifierBase === false) throw new Error("invalid increment argument: identifier already exists");
							this.prerelease.push(base);
						}
					}
					if (identifier) {
						let prerelease = [identifier, base];
						if (identifierBase === false) prerelease = [identifier];
						if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
							if (isNaN(this.prerelease[1])) this.prerelease = prerelease;
						} else this.prerelease = prerelease;
					}
					break;
				}
				default: throw new Error(`invalid increment argument: ${release}`);
			}
			this.raw = this.format();
			if (this.build.length) this.raw += `+${this.build.join(".")}`;
			return this;
		}
	};
}));
//#endregion
//#region node_modules/semver/functions/compare.js
var require_compare = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
	module.exports = compare;
}));
//#endregion
//#region node_modules/semver/functions/eq.js
var require_eq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var eq = (a, b, loose) => compare(a, b, loose) === 0;
	module.exports = eq;
}));
//#endregion
//#region node_modules/semver/functions/neq.js
var require_neq = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var neq = (a, b, loose) => compare(a, b, loose) !== 0;
	module.exports = neq;
}));
//#endregion
//#region node_modules/semver/functions/gt.js
var require_gt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gt = (a, b, loose) => compare(a, b, loose) > 0;
	module.exports = gt;
}));
//#endregion
//#region node_modules/semver/functions/gte.js
var require_gte = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var gte = (a, b, loose) => compare(a, b, loose) >= 0;
	module.exports = gte;
}));
//#endregion
//#region node_modules/semver/functions/lt.js
var require_lt = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lt = (a, b, loose) => compare(a, b, loose) < 0;
	module.exports = lt;
}));
//#endregion
//#region node_modules/semver/functions/lte.js
var require_lte = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var compare = require_compare();
	var lte = (a, b, loose) => compare(a, b, loose) <= 0;
	module.exports = lte;
}));
//#endregion
//#region node_modules/semver/functions/cmp.js
var require_cmp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var eq = require_eq();
	var neq = require_neq();
	var gt = require_gt();
	var gte = require_gte();
	var lt = require_lt();
	var lte = require_lte();
	var cmp = (a, op, b, loose) => {
		switch (op) {
			case "===":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a === b;
			case "!==":
				if (typeof a === "object") a = a.version;
				if (typeof b === "object") b = b.version;
				return a !== b;
			case "":
			case "=":
			case "==": return eq(a, b, loose);
			case "!=": return neq(a, b, loose);
			case ">": return gt(a, b, loose);
			case ">=": return gte(a, b, loose);
			case "<": return lt(a, b, loose);
			case "<=": return lte(a, b, loose);
			default: throw new TypeError(`Invalid operator: ${op}`);
		}
	};
	module.exports = cmp;
}));
//#endregion
//#region node_modules/semver/classes/comparator.js
var require_comparator = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var ANY = Symbol("SemVer ANY");
	module.exports = class Comparator {
		static get ANY() {
			return ANY;
		}
		constructor(comp, options) {
			options = parseOptions(options);
			if (comp instanceof Comparator) if (comp.loose === !!options.loose) return comp;
			else comp = comp.value;
			comp = comp.trim().split(/\s+/).join(" ");
			debug("comparator", comp, options);
			this.options = options;
			this.loose = !!options.loose;
			this.parse(comp);
			if (this.semver === ANY) this.value = "";
			else this.value = this.operator + this.semver.version;
			debug("comp", this);
		}
		parse(comp) {
			const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
			const m = comp.match(r);
			if (!m) throw new TypeError(`Invalid comparator: ${comp}`);
			this.operator = m[1] !== void 0 ? m[1] : "";
			if (this.operator === "=") this.operator = "";
			if (!m[2]) this.semver = ANY;
			else this.semver = new SemVer(m[2], this.options.loose);
		}
		toString() {
			return this.value;
		}
		test(version) {
			debug("Comparator.test", version, this.options.loose);
			if (this.semver === ANY || version === ANY) return true;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			return cmp(version, this.operator, this.semver, this.options);
		}
		intersects(comp, options) {
			if (!(comp instanceof Comparator)) throw new TypeError("a Comparator is required");
			if (this.operator === "") {
				if (this.value === "") return true;
				return new Range(comp.value, options).test(this.value);
			} else if (comp.operator === "") {
				if (comp.value === "") return true;
				return new Range(this.value, options).test(comp.semver);
			}
			options = parseOptions(options);
			if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) return false;
			if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) return false;
			if (this.operator.startsWith(">") && comp.operator.startsWith(">")) return true;
			if (this.operator.startsWith("<") && comp.operator.startsWith("<")) return true;
			if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) return true;
			if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) return true;
			if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) return true;
			return false;
		}
	};
	var parseOptions = require_parse_options();
	var { safeRe: re, t } = require_re();
	var cmp = require_cmp();
	var debug = require_debug();
	var SemVer = require_semver();
	var Range = require_range();
}));
//#endregion
//#region node_modules/semver/classes/range.js
var require_range = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SPACE_CHARACTERS = /\s+/g;
	module.exports = class Range {
		constructor(range, options) {
			options = parseOptions(options);
			if (range instanceof Range) if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) return range;
			else return new Range(range.raw, options);
			if (range instanceof Comparator) {
				this.raw = range.value;
				this.set = [[range]];
				this.formatted = void 0;
				return this;
			}
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
			this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
			if (!this.set.length) throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
			if (this.set.length > 1) {
				const first = this.set[0];
				this.set = this.set.filter((c) => !isNullSet(c[0]));
				if (this.set.length === 0) this.set = [first];
				else if (this.set.length > 1) {
					for (const c of this.set) if (c.length === 1 && isAny(c[0])) {
						this.set = [c];
						break;
					}
				}
			}
			this.formatted = void 0;
		}
		get range() {
			if (this.formatted === void 0) {
				this.formatted = "";
				for (let i = 0; i < this.set.length; i++) {
					if (i > 0) this.formatted += "||";
					const comps = this.set[i];
					for (let k = 0; k < comps.length; k++) {
						if (k > 0) this.formatted += " ";
						this.formatted += comps[k].toString().trim();
					}
				}
			}
			return this.formatted;
		}
		format() {
			return this.range;
		}
		toString() {
			return this.range;
		}
		parseRange(range) {
			const memoKey = ((this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE)) + ":" + range;
			const cached = cache.get(memoKey);
			if (cached) return cached;
			const loose = this.options.loose;
			const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
			range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
			debug("hyphen replace", range);
			range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
			debug("comparator trim", range);
			range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
			debug("tilde trim", range);
			range = range.replace(re[t.CARETTRIM], caretTrimReplace);
			debug("caret trim", range);
			let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
			if (loose) rangeList = rangeList.filter((comp) => {
				debug("loose invalid filter", comp, this.options);
				return !!comp.match(re[t.COMPARATORLOOSE]);
			});
			debug("range list", rangeList);
			const rangeMap = /* @__PURE__ */ new Map();
			const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
			for (const comp of comparators) {
				if (isNullSet(comp)) return [comp];
				rangeMap.set(comp.value, comp);
			}
			if (rangeMap.size > 1 && rangeMap.has("")) rangeMap.delete("");
			const result = [...rangeMap.values()];
			cache.set(memoKey, result);
			return result;
		}
		intersects(range, options) {
			if (!(range instanceof Range)) throw new TypeError("a Range is required");
			return this.set.some((thisComparators) => {
				return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
					return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
						return rangeComparators.every((rangeComparator) => {
							return thisComparator.intersects(rangeComparator, options);
						});
					});
				});
			});
		}
		test(version) {
			if (!version) return false;
			if (typeof version === "string") try {
				version = new SemVer(version, this.options);
			} catch (er) {
				return false;
			}
			for (let i = 0; i < this.set.length; i++) if (testSet(this.set[i], version, this.options)) return true;
			return false;
		}
	};
	var cache = new (require_lrucache())();
	var parseOptions = require_parse_options();
	var Comparator = require_comparator();
	var debug = require_debug();
	var SemVer = require_semver();
	var { safeRe: re, t, comparatorTrimReplace, tildeTrimReplace, caretTrimReplace } = require_re();
	var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
	var isNullSet = (c) => c.value === "<0.0.0-0";
	var isAny = (c) => c.value === "";
	var isSatisfiable = (comparators, options) => {
		let result = true;
		const remainingComparators = comparators.slice();
		let testComparator = remainingComparators.pop();
		while (result && remainingComparators.length) {
			result = remainingComparators.every((otherComparator) => {
				return testComparator.intersects(otherComparator, options);
			});
			testComparator = remainingComparators.pop();
		}
		return result;
	};
	var parseComparator = (comp, options) => {
		comp = comp.replace(re[t.BUILD], "");
		debug("comp", comp, options);
		comp = replaceCarets(comp, options);
		debug("caret", comp);
		comp = replaceTildes(comp, options);
		debug("tildes", comp);
		comp = replaceXRanges(comp, options);
		debug("xrange", comp);
		comp = replaceStars(comp, options);
		debug("stars", comp);
		return comp;
	};
	var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
	var replaceTildes = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
	};
	var replaceTilde = (comp, options) => {
		const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("tilde", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
			else if (isX(p)) ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
			else if (pr) {
				debug("replaceTilde pr", pr);
				ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
			} else ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
			debug("tilde return", ret);
			return ret;
		});
	};
	var replaceCarets = (comp, options) => {
		return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
	};
	var replaceCaret = (comp, options) => {
		debug("caret", comp, options);
		const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
		const z = options.includePrerelease ? "-0" : "";
		return comp.replace(r, (_, M, m, p, pr) => {
			debug("caret", comp, _, M, m, p, pr);
			let ret;
			if (isX(M)) ret = "";
			else if (isX(m)) ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
			else if (isX(p)) if (M === "0") ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
			else ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
			else if (pr) {
				debug("replaceCaret pr", pr);
				if (M === "0") if (m === "0") ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
				else ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
				else ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
			} else {
				debug("no pr");
				if (M === "0") if (m === "0") ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
				else ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
				else ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
			}
			debug("caret return", ret);
			return ret;
		});
	};
	var replaceXRanges = (comp, options) => {
		debug("replaceXRanges", comp, options);
		return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
	};
	var replaceXRange = (comp, options) => {
		comp = comp.trim();
		const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
		return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
			debug("xRange", comp, ret, gtlt, M, m, p, pr);
			const xM = isX(M);
			const xm = xM || isX(m);
			const xp = xm || isX(p);
			const anyX = xp;
			if (gtlt === "=" && anyX) gtlt = "";
			pr = options.includePrerelease ? "-0" : "";
			if (xM) if (gtlt === ">" || gtlt === "<") ret = "<0.0.0-0";
			else ret = "*";
			else if (gtlt && anyX) {
				if (xm) m = 0;
				p = 0;
				if (gtlt === ">") {
					gtlt = ">=";
					if (xm) {
						M = +M + 1;
						m = 0;
						p = 0;
					} else {
						m = +m + 1;
						p = 0;
					}
				} else if (gtlt === "<=") {
					gtlt = "<";
					if (xm) M = +M + 1;
					else m = +m + 1;
				}
				if (gtlt === "<") pr = "-0";
				ret = `${gtlt + M}.${m}.${p}${pr}`;
			} else if (xm) ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
			else if (xp) ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
			debug("xRange return", ret);
			return ret;
		});
	};
	var replaceStars = (comp, options) => {
		debug("replaceStars", comp, options);
		return comp.trim().replace(re[t.STAR], "");
	};
	var replaceGTE0 = (comp, options) => {
		debug("replaceGTE0", comp, options);
		return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
	};
	var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
		if (isX(fM)) from = "";
		else if (isX(fm)) from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
		else if (isX(fp)) from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
		else if (fpr) from = `>=${from}`;
		else from = `>=${from}${incPr ? "-0" : ""}`;
		if (isX(tM)) to = "";
		else if (isX(tm)) to = `<${+tM + 1}.0.0-0`;
		else if (isX(tp)) to = `<${tM}.${+tm + 1}.0-0`;
		else if (tpr) to = `<=${tM}.${tm}.${tp}-${tpr}`;
		else if (incPr) to = `<${tM}.${tm}.${+tp + 1}-0`;
		else to = `<=${to}`;
		return `${from} ${to}`.trim();
	};
	var testSet = (set, version, options) => {
		for (let i = 0; i < set.length; i++) if (!set[i].test(version)) return false;
		if (version.prerelease.length && !options.includePrerelease) {
			for (let i = 0; i < set.length; i++) {
				debug(set[i].semver);
				if (set[i].semver === Comparator.ANY) continue;
				if (set[i].semver.prerelease.length > 0) {
					const allowed = set[i].semver;
					if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) return true;
				}
			}
			return false;
		}
		return true;
	};
}));
//#endregion
//#region src/actions/drafter/config/merge-input-and-config.ts
var import_valid = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var validRange = (range, options) => {
		try {
			return new Range(range, options).range || "*";
		} catch (er) {
			return null;
		}
	};
	module.exports = validRange;
})))(), 1);
/**
* Returns a copy of `config`, updated with values from `input`.
*
* Also performs some validation.
*
* Input takes precedence, because it's more easy to change at runtime
*/
var mergeInputAndConfig = (params) => {
	const { config: originalConfig, input } = params;
	const config = structuredClone(originalConfig);
	applyOverrides(config, input);
	const { commitish, latest, prerelease } = getParsedDefaults(config);
	const replacers = getTransformedReplacers(config);
	const categories = getTransformedCategories(config);
	const parsedConfig = {
		...config,
		commitish,
		latest,
		prerelease,
		replacers,
		categories
	};
	validateParsedConfig(parsedConfig);
	return parsedConfig;
};
var applyOverrides = (config, input) => {
	applyStringOverride(config, input, "commitish");
	applyStringOverride(config, input, "header");
	applyStringOverride(config, input, "footer");
	applyStringOverride(config, input, "prerelease-identifier");
	applyBooleanOverride(config, input, "prerelease");
	applyBooleanOverride(config, input, "include-pre-releases");
	applyBooleanOverride(config, input, "latest");
	applyStringOverride(config, input, "filter-by-range");
	applyReleaseModeOverrides(config, input);
};
var applyReleaseModeOverrides = (config, input) => {
	if (config.latest && config.prerelease) {
		warning("'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release.");
		config.latest = false;
	}
	const hasInputPrerelease = typeof input.prerelease === "boolean";
	const hasInputPrereleaseIdentifier = !!input["prerelease-identifier"];
	if (config["prerelease-identifier"] && !config.prerelease && (!hasInputPrerelease || hasInputPrereleaseIdentifier)) {
		warning(`You specified a 'prerelease-identifier' (${config["prerelease-identifier"]}), but 'prerelease' is set to false. Switching to true.`);
		config.prerelease = true;
	}
};
var applyBooleanOverride = (config, input, key) => {
	const inputValue = input[key];
	if (typeof inputValue !== "boolean") return;
	const configValue = config[key];
	if (typeof configValue === "boolean" && configValue !== inputValue) info(`Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`);
	config[key] = inputValue;
};
var applyStringOverride = (config, input, key) => {
	const inputValue = input[key];
	if (!inputValue) return;
	const configValue = config[key];
	if (configValue && configValue !== inputValue) info(`Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`);
	config[key] = inputValue;
};
var getParsedDefaults = (config) => ({
	commitish: config.commitish || context.ref || context.payload.ref,
	latest: typeof config.latest !== "boolean" ? true : config.latest,
	prerelease: typeof config.prerelease !== "boolean" ? false : config.prerelease
});
var getTransformedReplacers = (config) => config.replacers.map((r) => {
	try {
		return {
			...r,
			search: stringToRegex(r.search)
		};
	} catch {
		warning(`Bad replacer regex: '${r.search}'`);
		return false;
	}
}).filter((r) => !!r);
var getTransformedCategories = (config) => config.categories.map((cat) => {
	const { label, ..._cat } = cat;
	_cat.labels = [...cat.labels, label].filter(Boolean);
	return _cat;
});
var validateParsedConfig = (parsedConfig) => {
	if (!parsedConfig.commitish) throw new Error("'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)");
	if (parsedConfig.categories.filter((category) => category.labels.length === 0).length > 1) throw new Error("Multiple categories detected with no labels. Only one category with no labels is supported for uncategorized pull requests.");
	if (parsedConfig["filter-by-range"] && !(0, import_valid.default)(parsedConfig["filter-by-range"])) throw new Error(`'filter-by-range' value "${parsedConfig["filter-by-range"]}" could not be parsed as a valid semver range.`);
};
//#endregion
//#region src/actions/drafter/config/set-action-output.ts
var setActionOutput = (params) => {
	const { releasePayload, upsertedRelease } = params;
	info("Set action outputs...");
	const { resolvedVersion, majorVersion, minorVersion, patchVersion, body } = releasePayload;
	if (upsertedRelease) {
		const { data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl, tag_name: tagName, name } } = upsertedRelease;
		if (releaseId && Number.isInteger(releaseId)) setOutput("id", releaseId.toString());
		if (htmlUrl) setOutput("html_url", htmlUrl);
		if (uploadUrl) setOutput("upload_url", uploadUrl);
		if (tagName) setOutput("tag_name", tagName);
		if (name) setOutput("name", name);
	}
	if (resolvedVersion) setOutput("resolved_version", resolvedVersion);
	if (majorVersion) setOutput("major_version", majorVersion);
	if (minorVersion) setOutput("minor_version", minorVersion);
	if (patchVersion) setOutput("patch_version", patchVersion);
	setOutput("body", body);
	info("Outputs set!");
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/categorize-pull-requests.ts
var categorizePullRequests = (params) => {
	const { pullRequests, config } = params;
	const allCategoryLabels = new Set(config.categories.flatMap((category) => category.labels));
	const uncategorizedPullRequests = [];
	const categorizedPullRequests = [...config.categories].map((category) => {
		return {
			...category,
			pullRequests: []
		};
	});
	const uncategorizedCategoryIndex = config.categories.findIndex((category) => category.labels.length === 0);
	const filterUncategorizedPullRequests = (pullRequest) => {
		const labels = pullRequest.labels?.nodes || [];
		if (labels.length === 0 || !labels.some((label) => !!label?.name && allCategoryLabels.has(label?.name))) {
			if (uncategorizedCategoryIndex === -1) uncategorizedPullRequests.push(pullRequest);
			else categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(pullRequest);
			return false;
		}
		return true;
	};
	const filteredPullRequests = pullRequests.filter(getFilterExcludedPullRequests(config["exclude-labels"])).filter(getFilterIncludedPullRequests(config["include-labels"])).filter((pullRequest) => filterUncategorizedPullRequests(pullRequest));
	for (const category of categorizedPullRequests) for (const pullRequest of filteredPullRequests) if ((pullRequest.labels?.nodes || []).some((label) => !!label?.name && category.labels.includes(label.name))) category.pullRequests.push(pullRequest);
	return [uncategorizedPullRequests, categorizedPullRequests];
};
var getFilterExcludedPullRequests = (excludeLabels) => {
	return (pullRequest) => {
		if ((pullRequest.labels?.nodes || []).some((label) => !!label?.name && excludeLabels.includes(label.name))) return false;
		return true;
	};
};
var getFilterIncludedPullRequests = (includeLabels) => {
	return (pullRequest) => {
		const labels = pullRequest.labels?.nodes || [];
		if (includeLabels.length === 0 || labels.some((label) => !!label?.name && includeLabels.includes(label.name))) return true;
		return false;
	};
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-template/util/charCode.ts
var CharCode = /* @__PURE__ */ function(CharCode) {
	CharCode[CharCode["Backslash"] = 92] = "Backslash";
	CharCode[CharCode["Tab"] = 9] = "Tab";
	CharCode[CharCode["LineFeed"] = 10] = "LineFeed";
	CharCode[CharCode["CarriageReturn"] = 13] = "CarriageReturn";
	CharCode[CharCode["Space"] = 32] = "Space";
	CharCode[CharCode["Ampersand"] = 38] = "Ampersand";
	CharCode[CharCode["DollarSign"] = 36] = "DollarSign";
	CharCode[CharCode["Digit0"] = 48] = "Digit0";
	CharCode[CharCode["Digit1"] = 49] = "Digit1";
	CharCode[CharCode["Digit2"] = 50] = "Digit2";
	CharCode[CharCode["Digit3"] = 51] = "Digit3";
	CharCode[CharCode["Digit4"] = 52] = "Digit4";
	CharCode[CharCode["Digit5"] = 53] = "Digit5";
	CharCode[CharCode["Digit6"] = 54] = "Digit6";
	CharCode[CharCode["Digit7"] = 55] = "Digit7";
	CharCode[CharCode["Digit8"] = 56] = "Digit8";
	CharCode[CharCode["Digit9"] = 57] = "Digit9";
	CharCode[CharCode["A"] = 65] = "A";
	CharCode[CharCode["E"] = 69] = "E";
	CharCode[CharCode["L"] = 76] = "L";
	CharCode[CharCode["U"] = 85] = "U";
	CharCode[CharCode["a"] = 97] = "a";
	CharCode[CharCode["l"] = 108] = "l";
	CharCode[CharCode["n"] = 110] = "n";
	CharCode[CharCode["t"] = 116] = "t";
	CharCode[CharCode["u"] = 117] = "u";
	return CharCode;
}({});
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-template/util/search.ts
function containsUppercaseCharacter(target) {
	if (!target) return false;
	return target.toLowerCase() !== target;
}
function buildReplaceStringWithCasePreserved(matches, pattern) {
	if (matches && matches[0] !== "") {
		const containsHyphens = validateSpecificSpecialCharacter(matches, pattern, "-");
		const containsUnderscores = validateSpecificSpecialCharacter(matches, pattern, "_");
		if (containsHyphens && !containsUnderscores) return buildReplaceStringForSpecificSpecialCharacter(matches, pattern, "-");
		else if (!containsHyphens && containsUnderscores) return buildReplaceStringForSpecificSpecialCharacter(matches, pattern, "_");
		if (matches[0].toUpperCase() === matches[0]) return pattern.toUpperCase();
		else if (matches[0].toLowerCase() === matches[0]) return pattern.toLowerCase();
		else if (containsUppercaseCharacter(matches[0][0]) && pattern.length > 0) return pattern[0].toUpperCase() + pattern.substring(1);
		else if (matches[0][0].toUpperCase() !== matches[0][0] && pattern.length > 0) return pattern[0].toLowerCase() + pattern.substring(1);
		else return pattern;
	} else return pattern;
}
function validateSpecificSpecialCharacter(matches, pattern, specialCharacter) {
	return matches[0].indexOf(specialCharacter) !== -1 && pattern.indexOf(specialCharacter) !== -1 && matches[0].split(specialCharacter).length === pattern.split(specialCharacter).length;
}
function buildReplaceStringForSpecificSpecialCharacter(matches, pattern, specialCharacter) {
	const splitPatternAtSpecialCharacter = pattern.split(specialCharacter);
	const splitMatchAtSpecialCharacter = matches[0].split(specialCharacter);
	let replaceString = "";
	splitPatternAtSpecialCharacter.forEach((splitValue, index) => {
		replaceString += buildReplaceStringWithCasePreserved([splitMatchAtSpecialCharacter[index]], splitValue) + specialCharacter;
	});
	return replaceString.slice(0, -1);
}
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-template/util/replacePattern.ts
var ReplacePatternKind = /* @__PURE__ */ function(ReplacePatternKind) {
	ReplacePatternKind[ReplacePatternKind["StaticValue"] = 0] = "StaticValue";
	ReplacePatternKind[ReplacePatternKind["DynamicPieces"] = 1] = "DynamicPieces";
	return ReplacePatternKind;
}(ReplacePatternKind || {});
/**
* Assigned when the replace pattern is entirely static.
*/
var StaticValueReplacePattern = class {
	kind = ReplacePatternKind.StaticValue;
	constructor(staticValue) {
		this.staticValue = staticValue;
	}
};
/**
* Assigned when the replace pattern has replacement patterns.
*/
var DynamicPiecesReplacePattern = class {
	kind = ReplacePatternKind.DynamicPieces;
	constructor(pieces) {
		this.pieces = pieces;
	}
};
var ReplacePattern = class ReplacePattern {
	static fromStaticValue(value) {
		return new ReplacePattern([ReplacePiece.staticValue(value)]);
	}
	_state;
	get hasReplacementPatterns() {
		return this._state.kind === ReplacePatternKind.DynamicPieces;
	}
	constructor(pieces) {
		if (!pieces || pieces.length === 0) this._state = new StaticValueReplacePattern("");
		else if (pieces.length === 1 && pieces[0].staticValue !== null) this._state = new StaticValueReplacePattern(pieces[0].staticValue);
		else this._state = new DynamicPiecesReplacePattern(pieces);
	}
	buildReplaceString(matches, preserveCase) {
		if (this._state.kind === ReplacePatternKind.StaticValue) if (preserveCase) return buildReplaceStringWithCasePreserved(matches, this._state.staticValue);
		else return this._state.staticValue;
		let result = "";
		for (let i = 0, len = this._state.pieces.length; i < len; i++) {
			const piece = this._state.pieces[i];
			if (piece.staticValue !== null) {
				result += piece.staticValue;
				continue;
			}
			let match = ReplacePattern._substitute(piece.matchIndex, matches);
			if (piece.caseOps !== null && piece.caseOps.length > 0) {
				const repl = [];
				const lenOps = piece.caseOps.length;
				let opIdx = 0;
				for (let idx = 0, len = match.length; idx < len; idx++) {
					if (opIdx >= lenOps) {
						repl.push(match.slice(idx));
						break;
					}
					switch (piece.caseOps[opIdx]) {
						case "U":
							repl.push(match[idx].toUpperCase());
							break;
						case "u":
							repl.push(match[idx].toUpperCase());
							opIdx++;
							break;
						case "L":
							repl.push(match[idx].toLowerCase());
							break;
						case "l":
							repl.push(match[idx].toLowerCase());
							opIdx++;
							break;
						case "E":
							repl.push(match.slice(idx));
							idx = len;
							break;
						default: repl.push(match[idx]);
					}
				}
				match = repl.join("");
			}
			result += match;
		}
		return result;
	}
	static _substitute(matchIndex, matches) {
		if (matches === null) return "";
		if (matchIndex === 0) return matches[0];
		let remainder = "";
		while (matchIndex > 0) {
			if (matchIndex < matches.length) return (matches[matchIndex] || "") + remainder;
			remainder = String(matchIndex % 10) + remainder;
			matchIndex = Math.floor(matchIndex / 10);
		}
		return `$${remainder}`;
	}
};
/**
* A replace piece can either be a static string or an index to a specific match.
*/
var ReplacePiece = class ReplacePiece {
	static staticValue(value) {
		return new ReplacePiece(value, -1, null);
	}
	static matchIndex(index) {
		return new ReplacePiece(null, index, null);
	}
	static caseOps(index, caseOps) {
		return new ReplacePiece(null, index, caseOps);
	}
	staticValue;
	matchIndex;
	caseOps;
	constructor(staticValue, matchIndex, caseOps) {
		this.staticValue = staticValue;
		this.matchIndex = matchIndex;
		if (!caseOps || caseOps.length === 0) this.caseOps = null;
		else this.caseOps = caseOps.slice(0);
	}
};
var ReplacePieceBuilder = class {
	_source;
	_lastCharIndex;
	_result;
	_resultLen;
	_currentStaticPiece;
	constructor(source) {
		this._source = source;
		this._lastCharIndex = 0;
		this._result = [];
		this._resultLen = 0;
		this._currentStaticPiece = "";
	}
	emitUnchanged(toCharIndex) {
		this._emitStatic(this._source.substring(this._lastCharIndex, toCharIndex));
		this._lastCharIndex = toCharIndex;
	}
	emitStatic(value, toCharIndex) {
		this._emitStatic(value);
		this._lastCharIndex = toCharIndex;
	}
	_emitStatic(value) {
		if (value.length === 0) return;
		this._currentStaticPiece += value;
	}
	emitMatchIndex(index, toCharIndex, caseOps) {
		if (this._currentStaticPiece.length !== 0) {
			this._result[this._resultLen++] = ReplacePiece.staticValue(this._currentStaticPiece);
			this._currentStaticPiece = "";
		}
		this._result[this._resultLen++] = ReplacePiece.caseOps(index, caseOps);
		this._lastCharIndex = toCharIndex;
	}
	finalize() {
		this.emitUnchanged(this._source.length);
		if (this._currentStaticPiece.length !== 0) {
			this._result[this._resultLen++] = ReplacePiece.staticValue(this._currentStaticPiece);
			this._currentStaticPiece = "";
		}
		return new ReplacePattern(this._result);
	}
};
/**
* \n			=> inserts a LF
* \t		  => inserts a TAB
* \\			=> inserts a "\\".
* \u			=> upper-cases one character in a match.
* \U			=> upper-cases ALL remaining characters in a match.
* \l			=> lower-cases one character in a match.
* \L			=> lower-cases ALL remaining characters in a match.
* \E			=> ends a \U or \L case-change sequence.
* $$			=> inserts a "$".
* $& and $0	=> inserts the matched substring.
* $n			=> Where n is a non-negative integer lesser than 100, inserts the nth parenthesized submatch string
* everything else stays untouched
*
* Also see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
*/
function parseReplaceString(replaceString) {
	if (!replaceString || replaceString.length === 0) return new ReplacePattern(null);
	const caseOps = [];
	const result = new ReplacePieceBuilder(replaceString);
	for (let i = 0, len = replaceString.length; i < len; i++) {
		const chCode = replaceString.charCodeAt(i);
		if (chCode === CharCode.Backslash) {
			i++;
			if (i >= len) break;
			const nextChCode = replaceString.charCodeAt(i);
			switch (nextChCode) {
				case CharCode.Backslash:
					result.emitUnchanged(i - 1);
					result.emitStatic("\\", i + 1);
					break;
				case CharCode.n:
					result.emitUnchanged(i - 1);
					result.emitStatic("\n", i + 1);
					break;
				case CharCode.t:
					result.emitUnchanged(i - 1);
					result.emitStatic("	", i + 1);
					break;
				case CharCode.u:
				case CharCode.U:
				case CharCode.l:
				case CharCode.L:
				case CharCode.E:
					result.emitUnchanged(i - 1);
					result.emitStatic("", i + 1);
					caseOps.push(String.fromCharCode(nextChCode));
					break;
			}
			continue;
		}
		if (chCode === CharCode.DollarSign) {
			i++;
			if (i >= len) break;
			const nextChCode = replaceString.charCodeAt(i);
			if (nextChCode === CharCode.DollarSign) {
				result.emitUnchanged(i - 1);
				result.emitStatic("$", i + 1);
				continue;
			}
			if (nextChCode === CharCode.Digit0 || nextChCode === CharCode.Ampersand) {
				result.emitUnchanged(i - 1);
				result.emitMatchIndex(0, i + 1, caseOps);
				caseOps.length = 0;
				continue;
			}
			if (CharCode.Digit1 <= nextChCode && nextChCode <= CharCode.Digit9) {
				let matchIndex = nextChCode - CharCode.Digit0;
				if (i + 1 < len) {
					const nextNextChCode = replaceString.charCodeAt(i + 1);
					if (CharCode.Digit0 <= nextNextChCode && nextNextChCode <= CharCode.Digit9) {
						i++;
						matchIndex = matchIndex * 10 + (nextNextChCode - CharCode.Digit0);
						result.emitUnchanged(i - 2);
						result.emitMatchIndex(matchIndex, i + 1, caseOps);
						caseOps.length = 0;
						continue;
					}
				}
				result.emitUnchanged(i - 1);
				result.emitMatchIndex(matchIndex, i + 1, caseOps);
				caseOps.length = 0;
			}
		}
	}
	return result.finalize();
}
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-template/render-template.ts
var getReplaceMatches = (args) => {
	const lastArg = args[args.length - 1];
	const hasGroups = typeof lastArg === "object" && lastArg !== null;
	const matchCount = args.length - (hasGroups ? 3 : 2);
	return args.slice(0, matchCount);
};
var applyReplacer = (input, replacer) => {
	const replacePattern = parseReplaceString(replacer.replace);
	return input.replace(replacer.search, (...args) => {
		const matches = getReplaceMatches(args);
		return replacePattern.buildReplaceString(matches);
	});
};
/**
* replaces all uppercase dollar templates with their string representation from object
* if replacement is undefined in object the dollar template string is left untouched
*/
var renderTemplate = (params) => {
	const { template, object, replacers } = params;
	let input = template.replace(/(\$[A-Z_]+)/g, (_, k) => {
		let result;
		const isValidKey = (key) => key in object && object[key] !== void 0 && object[key] !== null;
		if (!isValidKey(k)) result = k;
		else if (typeof object[k] === "object") {
			const nested = object[k];
			result = renderTemplate({
				template: nested.template,
				object: nested
			});
		} else result = `${object[k]}`;
		return result;
	});
	if (replacers) for (const replacer of replacers) input = applyReplacer(input, replacer);
	return input;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/pull-request-to-string.ts
var pullRequestToString = (params) => params.pullRequests.map((pullRequest) => {
	let pullAuthor = "ghost";
	if (pullRequest.author) pullAuthor = pullRequest.author.__typename && pullRequest.author.__typename === "Bot" ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})` : pullRequest.author.login;
	return renderTemplate({
		template: params.config["change-template"],
		object: {
			$TITLE: escapeTitle({
				title: pullRequest.title,
				escapes: params.config["change-title-escapes"]
			}),
			$NUMBER: pullRequest.number.toString(),
			$AUTHOR: pullAuthor,
			$BODY: pullRequest.body,
			$URL: pullRequest.url,
			$BASE_REF_NAME: pullRequest.baseRefName,
			$HEAD_REF_NAME: pullRequest.headRefName
		}
	});
}).join("\n");
var escapeTitle = (params) => params.title.replace(new RegExp(`[${escapeStringRegexp(params.escapes || "")}]|\`.*?\``, "g"), (match) => {
	if (match.length > 1) return match;
	if (match === "@" || match === "#") return `${match}<!---->`;
	return `\\${match}`;
});
//#endregion
//#region src/actions/drafter/lib/build-release-payload/generate-changelog.ts
var generateChangeLog = (params) => {
	const { pullRequests, config } = params;
	const [uncategorizedPullRequests, categorizedPullRequests] = categorizePullRequests({
		pullRequests,
		config
	});
	if (categorizedPullRequests.reduce((sum, category) => sum + category.pullRequests.length, 0) + uncategorizedPullRequests.length === 0) return config["no-changes-template"];
	const changeLog = [];
	if (uncategorizedPullRequests.length > 0) changeLog.push(pullRequestToString({
		pullRequests: uncategorizedPullRequests,
		config
	}), "\n\n");
	for (const [index, category] of categorizedPullRequests.entries()) {
		if (category.pullRequests.length === 0) continue;
		changeLog.push(renderTemplate({
			template: config["category-template"],
			object: { $TITLE: category.title }
		}), "\n\n");
		const pullRequestString = pullRequestToString({
			pullRequests: category.pullRequests,
			config
		});
		if (category["collapse-after"] !== -1 && category.pullRequests.length > category["collapse-after"]) changeLog.push("<details>", "\n", `<summary>${category.pullRequests.length} change${category.pullRequests.length > 1 ? "s" : ""}</summary>`, "\n\n", pullRequestString, "\n", "</details>");
		else changeLog.push(pullRequestString);
		if (index + 1 !== categorizedPullRequests.length) changeLog.push("\n\n");
	}
	return changeLog.join("").trim();
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/generate-contributors-sentence.ts
var generateContributorsSentence = (params) => {
	const { commits, pullRequests, config } = params;
	const contributors = /* @__PURE__ */ new Set();
	for (const commit of commits) {
		if ((commit.associatedPullRequests?.nodes?.length ?? 0) === 0) continue;
		if (commit.author?.user) {
			if (!config["exclude-contributors"].includes(commit.author.user.login)) contributors.add(`@${commit.author.user.login}`);
		} else if (commit.author?.name) contributors.add(commit.author.name);
	}
	for (const pullRequest of pullRequests) if (pullRequest.author && !config["exclude-contributors"].includes(pullRequest.author.login)) if (pullRequest.author.__typename === "Bot") contributors.add(`[${pullRequest.author.login}[bot]](${pullRequest.author.url})`);
	else contributors.add(`@${pullRequest.author.login}`);
	const sortedContributors = [...contributors].sort();
	if (sortedContributors.length > 1) return sortedContributors.slice(0, -1).join(", ") + " and " + sortedContributors.slice(-1);
	else if (sortedContributors.length === 1) return sortedContributors[0];
	else return config["no-contributors-template"];
};
//#endregion
//#region node_modules/semver/functions/parse.js
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var parse = (version, options, throwErrors = false) => {
		if (version instanceof SemVer) return version;
		try {
			return new SemVer(version, options);
		} catch (er) {
			if (!throwErrors) return null;
			throw er;
		}
	};
	module.exports = parse;
}));
//#endregion
//#region node_modules/semver/functions/coerce.js
var require_coerce = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var parse = require_parse();
	var { safeRe: re, t } = require_re();
	var coerce = (version, options) => {
		if (version instanceof SemVer) return version;
		if (typeof version === "number") version = String(version);
		if (typeof version !== "string") return null;
		options = options || {};
		let match = null;
		if (!options.rtl) match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
		else {
			const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
			let next;
			while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
				if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
				coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
			}
			coerceRtlRegex.lastIndex = -1;
		}
		if (match === null) return null;
		const major = match[2];
		return parse(`${major}.${match[3] || "0"}.${match[4] || "0"}${options.includePrerelease && match[5] ? `-${match[5]}` : ""}${options.includePrerelease && match[6] ? `+${match[6]}` : ""}`, options);
	};
	module.exports = coerce;
}));
//#endregion
//#region node_modules/semver/functions/inc.js
var require_inc = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var inc = (version, release, options, identifier, identifierBase) => {
		if (typeof options === "string") {
			identifierBase = identifier;
			identifier = options;
			options = void 0;
		}
		try {
			return new SemVer(version instanceof SemVer ? version.version : version, options).inc(release, identifier, identifierBase).version;
		} catch (er) {
			return null;
		}
	};
	module.exports = inc;
}));
//#endregion
//#region node_modules/semver/functions/major.js
var require_major = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var major = (a, loose) => new SemVer(a, loose).major;
	module.exports = major;
}));
//#endregion
//#region node_modules/semver/functions/minor.js
var require_minor = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var minor = (a, loose) => new SemVer(a, loose).minor;
	module.exports = minor;
}));
//#endregion
//#region node_modules/semver/functions/patch.js
var require_patch = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var patch = (a, loose) => new SemVer(a, loose).patch;
	module.exports = patch;
}));
//#endregion
//#region node_modules/semver/functions/prerelease.js
var require_prerelease = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse = require_parse();
	var prerelease = (version, options) => {
		const parsed = parse(version, options);
		return parsed && parsed.prerelease.length ? parsed.prerelease : null;
	};
	module.exports = prerelease;
}));
//#endregion
//#region src/actions/drafter/lib/build-release-payload/version-descriptor.ts
var import_coerce = /* @__PURE__ */ __toESM(require_coerce(), 1);
var import_inc = /* @__PURE__ */ __toESM(require_inc(), 1);
var import_major = /* @__PURE__ */ __toESM(require_major(), 1);
var import_minor = /* @__PURE__ */ __toESM(require_minor(), 1);
var import_parse = /* @__PURE__ */ __toESM(require_parse(), 1);
var import_patch = /* @__PURE__ */ __toESM(require_patch(), 1);
var import_prerelease = /* @__PURE__ */ __toESM(require_prerelease(), 1);
var VersionDescriptor = class VersionDescriptor {
	version = null;
	major = null;
	minor = null;
	patch = null;
	prerelease = null;
	preReleaseIdentifier;
	tagPrefix;
	constructor(from, opt) {
		this.preReleaseIdentifier = opt?.preReleaseIdentifier;
		this.tagPrefix = opt?.tagPrefix;
		this.version = this._coerce(from);
		this.major = this.version ? (0, import_major.default)(this.version).toString() : null;
		this.minor = this.version ? (0, import_minor.default)(this.version).toString() : null;
		this.patch = this.version ? (0, import_patch.default)(this.version).toString() : null;
		this.prerelease = this.version === null ? null : (0, import_prerelease.default)(this.version) ? `-${(0, import_prerelease.default)(this.version)?.join(".")}` : "";
	}
	_coerce(from) {
		if (from) {
			const ver = typeof from === "object" ? this._isRelease(from) ? this._toSemver(this._stripTag(from.tag_name)) || this._toSemver(this._stripTag(from.name)) : this._toSemver(from) : this._toSemver(this._stripTag(from));
			if (!ver) {
				warning(`Failed to parse version from input ${from}. Defaulting coerced version to null.`);
				return null;
			}
			return ver;
		} else {
			debug(`Building version descriptor without version input. Defaulting coerced version to null.`);
			return null;
		}
	}
	_isRelease(input) {
		return typeof input === "object" && input !== null && (typeof input?.tag_name === "string" || typeof input?.name === "string");
	}
	_stripTag(input) {
		return !!this.tagPrefix && input?.startsWith(this.tagPrefix) ? input.slice(this.tagPrefix.length) : input;
	}
	_toSemver(version) {
		const result = (0, import_parse.default)(version);
		if (result) return result;
		return (0, import_coerce.default)(version);
	}
	/**
	* Alters version in-place by incrementing it according to the specified release type (major, minor, patch, prerelease).
	*/
	incremented(increment) {
		if (!this.version || increment === "no_increment") return this;
		const _incrementedVersion = (0, import_inc.default)(this.version, increment, true, this.preReleaseIdentifier);
		if (!_incrementedVersion) throw new Error(`Failed to increment version ${this.version} with increment ${increment}`);
		const _incrementedSemver = this._toSemver(_incrementedVersion);
		if (!_incrementedSemver) throw new Error(`Failed to parse version ${_incrementedVersion} after incrementing ${this.version} with increment ${increment}`);
		return new VersionDescriptor(_incrementedSemver, {
			tagPrefix: this.tagPrefix,
			preReleaseIdentifier: this.preReleaseIdentifier
		});
	}
	rendered(template) {
		return renderTemplate({
			template,
			object: {
				$MAJOR: this.major ?? void 0,
				$MINOR: this.minor ?? void 0,
				$PATCH: this.patch ?? void 0,
				$PRERELEASE: this.prerelease ?? void 0
			}
		});
	}
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/get-version-info.ts
var getVersionInfo = (params) => {
	const { lastRelease, config, input, versionKeyIncrement: _versionKeyIncrement } = params;
	info(`Resolving version info based on:`);
	info(`   - last release: ${lastRelease?.tag_name || "none"}`);
	info(`   - version input: ${input.version || input.tag || input.name || "none"}`);
	info(`   - version key increment: ${_versionKeyIncrement}`);
	let _localIncrement = structuredClone(_versionKeyIncrement);
	info(`Coerce and parse versions from last release...`);
	const versionFromLastRelease = new VersionDescriptor(lastRelease, {
		tagPrefix: config["tag-prefix"],
		preReleaseIdentifier: config["prerelease-identifier"]
	});
	info(`Parsed version from last release: ${versionFromLastRelease.version?.format() || "none"}.`);
	info(`Coerce and parse versions from input...`);
	const versionFromInput = new VersionDescriptor(input.version || input.tag || input.name, {
		tagPrefix: config["tag-prefix"],
		preReleaseIdentifier: config["prerelease-identifier"]
	});
	info(`Parsed version from input: ${versionFromInput.version?.format() || "none"}.`);
	let referenceVersion;
	if (versionFromInput.version) {
		_localIncrement = "no_increment";
		referenceVersion = versionFromInput;
	} else if (versionFromLastRelease.version) {
		_localIncrement = _localIncrement?.startsWith("pre") && versionFromLastRelease?.prerelease?.length ? "prerelease" : _localIncrement;
		referenceVersion = versionFromLastRelease;
	} else {
		_localIncrement = "no_increment";
		referenceVersion = new VersionDescriptor("0.1.0", {
			preReleaseIdentifier: config["prerelease-identifier"],
			tagPrefix: config["tag-prefix"]
		});
	}
	return {
		$NEXT_MAJOR_VERSION: referenceVersion.incremented("major").rendered(config["version-template"]),
		$NEXT_MAJOR_VERSION_MAJOR: referenceVersion.incremented("major").major,
		$NEXT_MAJOR_VERSION_MINOR: referenceVersion.incremented("major").minor,
		$NEXT_MAJOR_VERSION_PATCH: referenceVersion.incremented("major").patch,
		$NEXT_MINOR_VERSION: referenceVersion.incremented("minor").rendered(config["version-template"]),
		$NEXT_MINOR_VERSION_MAJOR: referenceVersion.incremented("minor").major,
		$NEXT_MINOR_VERSION_MINOR: referenceVersion.incremented("minor").minor,
		$NEXT_MINOR_VERSION_PATCH: referenceVersion.incremented("minor").patch,
		$NEXT_PATCH_VERSION: referenceVersion.incremented("patch").rendered(config["version-template"]),
		$NEXT_PATCH_VERSION_MAJOR: referenceVersion.incremented("patch").major,
		$NEXT_PATCH_VERSION_MINOR: referenceVersion.incremented("patch").minor,
		$NEXT_PATCH_VERSION_PATCH: referenceVersion.incremented("patch").patch,
		$NEXT_PRERELEASE_VERSION: referenceVersion.incremented("prerelease").rendered(config["version-template"]),
		$NEXT_PRERELEASE_VERSION_PRERELEASE: referenceVersion.incremented("prerelease").prerelease,
		$RESOLVED_VERSION: referenceVersion.incremented(_localIncrement).rendered(config["version-template"]),
		$RESOLVED_VERSION_MAJOR: referenceVersion.incremented(_localIncrement).major,
		$RESOLVED_VERSION_MINOR: referenceVersion.incremented(_localIncrement).minor,
		$RESOLVED_VERSION_PATCH: referenceVersion.incremented(_localIncrement).patch,
		$RESOLVED_VERSION_PRERELEASE: referenceVersion.incremented(_localIncrement).prerelease
	};
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-release-name.ts
/**
* Renders the release name,
* based on the input and config.
*/
var renderReleaseName = (params) => {
	let name = structuredClone(params.inputName);
	const { config, versionInfo } = params;
	if (name === void 0) name = versionInfo ? renderTemplate({
		template: config["name-template"] || "",
		object: versionInfo
	}) : "";
	else if (versionInfo) name = renderTemplate({
		template: name,
		object: versionInfo
	});
	debug(`name: ${name}`);
	return name;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/render-tag-name.ts
/**
* Renders the tag name for the release,
* based on the input and config.
*/
var renderTagName = (params) => {
	let tagName = structuredClone(params.inputTagName);
	const { config, versionInfo } = params;
	if (tagName === void 0) tagName = versionInfo ? renderTemplate({
		template: config["tag-template"] || "",
		object: versionInfo
	}) : "";
	else if (versionInfo) tagName = renderTemplate({
		template: tagName,
		object: versionInfo
	});
	debug(`tag: ${tagName}`);
	return tagName;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/resolve-version-increment.ts
var resolveVersionKeyIncrement = (params) => {
	const { pullRequests, config } = params;
	const priorityMap = {
		patch: 1,
		minor: 2,
		major: 3
	};
	const labelToKeyMap = Object.fromEntries(Object.keys(priorityMap).flatMap((key) => [config["version-resolver"][key].labels.map((label) => [label, key])]).flat());
	debug(`labelToKeyMap: ${JSON.stringify(labelToKeyMap)}`);
	const keys = pullRequests.filter(getFilterExcludedPullRequests(config["exclude-labels"])).filter(getFilterIncludedPullRequests(config["include-labels"])).flatMap((pr) => pr.labels?.nodes?.filter((n) => !!n?.name).map((node) => labelToKeyMap[node.name])).filter(Boolean);
	debug(`keys: ${JSON.stringify(keys)}`);
	const keyPriorities = keys.map((key) => priorityMap[key]);
	const priority = Math.max(...keyPriorities);
	const versionKey = Object.keys(priorityMap).find((key) => priorityMap[key] === priority);
	debug(`versionKey: ${versionKey}`);
	let versionKeyIncrement = versionKey || config["version-resolver"].default;
	if (config.prerelease && config["prerelease-identifier"]) versionKeyIncrement = `pre${versionKeyIncrement}`;
	info(`Version increment: ${versionKeyIncrement}${!versionKey ? " (default)" : ""}`);
	return versionKeyIncrement;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/sort-pull-requests.ts
var sortPullRequests = (params) => {
	const { pullRequests, config: { "sort-by": sortBy, "sort-direction": sortDirection } } = params;
	const getSortField = sortBy === "title" ? getTitle : getMergedAt;
	const sort = sortDirection === "ascending" ? sortAscending : sortDescending;
	return structuredClone(pullRequests).sort((a, b) => {
		try {
			return sort(getSortField(a), getSortField(b));
		} catch (error$1) {
			warning(`Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`);
			error(error$1);
			return 0;
		}
	});
};
var getTitle = (pr) => pr.title;
var getMergedAt = (pr) => pr.mergedAt;
var sortAscending = (a, b) => {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	if (a > b) return 1;
	if (a < b) return -1;
	return 0;
};
var sortDescending = (a, b) => {
	if (a == null && b == null) return 0;
	if (a == null) return -1;
	if (b == null) return 1;
	if (a > b) return -1;
	if (a < b) return 1;
	return 0;
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/static/last-not-found.md?raw
var last_not_found_default = "> [!WARNING]\n> Release Drafter could not find a previous **published release** for `$OWNER/$REPOSITORY`. This draft was created **without a comparison baseline**.\n\n> [!IMPORTANT]\n> Treat this draft as a manual starting point.\n> Review the proposed version, tag, and notes before publishing.\n\nIf you did not expect this to happen, [open an issue](https://github.com/release-drafter/release-drafter/issues/new?template=previous-published-release-not-found.yml).\n";
//#endregion
//#region src/actions/drafter/lib/build-release-payload/build-release-payload.ts
/**
* Outputs the payload for creating or updating a release.
*
* Previously known as `generateReleaseInfo`.
*/
var buildReleasePayload = (params) => {
	const { commits, config, input, lastRelease, pullRequests } = params;
	info(`Building release payload and body...`);
	const sortedPullRequests = sortPullRequests({
		pullRequests,
		config
	});
	let body = (config.header || "") + config.template + (!lastRelease ? `\n---\n${renderTemplate({
		template: last_not_found_default,
		object: {
			$OWNER: context.repo.owner,
			$REPOSITORY: context.repo.repo
		}
	})}\n---\n` : "") + (config.footer || "");
	body = renderTemplate({
		template: body,
		object: {
			$PREVIOUS_TAG: lastRelease ? lastRelease.tag_name : "",
			$CHANGES: generateChangeLog({
				pullRequests: sortedPullRequests,
				config
			}),
			$CONTRIBUTORS: generateContributorsSentence({
				commits,
				pullRequests: sortedPullRequests,
				config
			}),
			$OWNER: context.repo.owner,
			$REPOSITORY: context.repo.repo
		},
		replacers: config.replacers
	});
	const versionInfo = getVersionInfo({
		lastRelease,
		config,
		input,
		versionKeyIncrement: resolveVersionKeyIncrement({
			pullRequests,
			config
		})
	});
	debug(`versionInfo: ${JSON.stringify(versionInfo, null, 2)}`);
	if (versionInfo) body = renderTemplate({
		template: body,
		object: versionInfo
	});
	const res = {
		name: renderReleaseName({
			inputName: input.name,
			config,
			versionInfo
		}),
		tag: renderTagName({
			inputTagName: input.tag,
			config,
			versionInfo
		}),
		body,
		targetCommitish: parseCommitishForRelease(config.commitish),
		prerelease: config.prerelease,
		make_latest: config.latest,
		draft: !input.publish,
		resolvedVersion: versionInfo?.$RESOLVED_VERSION,
		majorVersion: versionInfo?.$RESOLVED_VERSION_MAJOR,
		minorVersion: versionInfo?.$RESOLVED_VERSION_MINOR,
		patchVersion: versionInfo?.$RESOLVED_VERSION_PATCH,
		prereleaseVersion: versionInfo?.$RESOLVED_VERSION_PRERELEASE
	};
	info(`Release payload built successfully`);
	info(`  name:                        ${res.name}`);
	info(`  tag:                         ${res.tag}`);
	info(`  body:                        ${res.body.length} characters long`);
	info(`  targetCommitish:             ${res.targetCommitish}`);
	info(`  prerelease:                  ${res.prerelease}`);
	info(`  make_latest:                 ${res.make_latest}`);
	info(`  draft:                       ${res.draft}${!res.draft ? " (will be published !)" : ""}`);
	info(`  RESOLVED_VERSION:            ${res.resolvedVersion}`);
	info(`  RESOLVED_VERSION_MAJOR:      ${res.majorVersion}`);
	info(`  RESOLVED_VERSION_MINOR:      ${res.minorVersion}`);
	info(`  RESOLVED_VERSION_PATCH:      ${res.patchVersion}`);
	info(`  RESOLVED_VERSION_PRERELEASE: ${res.prereleaseVersion}`);
	return res;
};
//#endregion
//#region node_modules/semver/functions/satisfies.js
var require_satisfies = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var Range = require_range();
	var satisfies = (version, range, options) => {
		try {
			range = new Range(range, options);
		} catch (er) {
			return false;
		}
		return range.test(version);
	};
	module.exports = satisfies;
}));
//#endregion
//#region node_modules/compare-versions/lib/esm/utils.js
var semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
var validateAndParse = (version) => {
	if (typeof version !== "string") throw new TypeError("Invalid argument expected string");
	const match = version.match(semver);
	if (!match) throw new Error(`Invalid argument not valid semver ('${version}' received)`);
	match.shift();
	return match;
};
var isWildcard = (s) => s === "*" || s === "x" || s === "X";
var tryParse = (v) => {
	const n = parseInt(v, 10);
	return isNaN(n) ? v : n;
};
var forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
var compareStrings = (a, b) => {
	if (isWildcard(a) || isWildcard(b)) return 0;
	const [ap, bp] = forceType(tryParse(a), tryParse(b));
	if (ap > bp) return 1;
	if (ap < bp) return -1;
	return 0;
};
var compareSegments = (a, b) => {
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const r = compareStrings(a[i] || "0", b[i] || "0");
		if (r !== 0) return r;
	}
	return 0;
};
//#endregion
//#region node_modules/compare-versions/lib/esm/compareVersions.js
/**
* Compare [semver](https://semver.org/) version strings to find greater, equal or lesser.
* This library supports the full semver specification, including comparing versions with different number of digits like `1.0.0`, `1.0`, `1`, and pre-release versions like `1.0.0-alpha`.
* @param v1 - First version to compare
* @param v2 - Second version to compare
* @returns Numeric value compatible with the [Array.sort(fn) interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
*/
var compareVersions = (v1, v2) => {
	const n1 = validateAndParse(v1);
	const n2 = validateAndParse(v2);
	const p1 = n1.pop();
	const p2 = n2.pop();
	const r = compareSegments(n1, n2);
	if (r !== 0) return r;
	if (p1 && p2) return compareSegments(p1.split("."), p2.split("."));
	else if (p1 || p2) return p1 ? -1 : 1;
	return 0;
};
//#endregion
//#region src/actions/drafter/lib/find-previous-releases/sort-releases.ts
var import_satisfies = /* @__PURE__ */ __toESM(require_satisfies(), 1);
var sortReleases = (params) => {
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
//#endregion
//#region src/actions/drafter/lib/find-previous-releases/find-previous-releases.ts
var RELEASE_COUNT_LIMIT = 1e3;
/**
* Lists every release and :
* - filters by commitish if specified
* - filters by tag-prefix if specified
* - filters out pre-releases unless specified
* - extracts the first draft releases (according to return-order of GitHub API)
* - get latest published release according to ./sort-releases.ts implementation
*
* Returns one of (or both) draft release and latest published release
* The last stable release is used to determine the range of commits to include in the changelog,
* and to resolve the next version number.
*
* The draft release is used to determine if we should create a new release or update the existing one.
*/
var findPreviousReleases = async (params) => {
	const { commitish, "filter-by-commitish": filterByCommitish, "tag-prefix": tagPrefix, prerelease: isPreRelease, "include-pre-releases": includePreReleases, "filter-by-range": filterByRange } = params;
	const octokit = getOctokit();
	info("Fetching releases from GitHub...");
	let releaseCount = 0;
	const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
		...context.repo,
		per_page: 100
	}, (response, done) => {
		releaseCount += response.data.length;
		if (releaseCount >= RELEASE_COUNT_LIMIT) done();
		return response.data;
	});
	info(`Found ${releases.length} releases`);
	const headRefRegex = /^refs\/heads\//;
	const targetCommitishName = commitish.replace(headRefRegex, "");
	const commitishFilteredReleases = filterByCommitish ? releases.filter((r) => targetCommitishName === r.target_commitish.replace(headRefRegex, "")) : releases;
	const semverRangeFilteredReleases = filterByRange && filterByRange !== "*" ? commitishFilteredReleases.filter((r) => {
		const parsedRange = (0, import_valid.default)(filterByRange);
		if (!parsedRange) return false;
		const parsedVersion = (0, import_coerce.default)(r.tag_name, { loose: true })?.version;
		if (!parsedVersion) {
			warning(`Failed to coerce semver version for "${r.tag_name}" : will be excluded from releases considered for drafting.`);
			return false;
		}
		const doesSatisfy = !!(0, import_satisfies.default)(parsedVersion, parsedRange, { loose: true });
		debug(`Range "${parsedRange}" ${doesSatisfy ? "satisfies" : "does not satisfy"} version "${parsedVersion}" `);
		return doesSatisfy;
	}) : commitishFilteredReleases;
	const filteredReleases = tagPrefix ? semverRangeFilteredReleases.filter((r) => r.tag_name.startsWith(tagPrefix)) : semverRangeFilteredReleases;
	let publishedReleases = filteredReleases.filter((r) => !r.draft);
	let draftReleases = filteredReleases.filter((r) => r.draft);
	publishedReleases = publishedReleases.filter((publishedRelease) => isPreRelease || includePreReleases ? publishedRelease.prerelease || !publishedRelease.prerelease : !publishedRelease.prerelease);
	draftReleases = draftReleases.filter((draftRelease) => isPreRelease ? draftRelease.prerelease : !draftRelease.prerelease);
	const draftRelease = draftReleases[0];
	const lastRelease = sortReleases({
		releases: publishedReleases,
		tagPrefix
	})?.at(-1);
	if (draftRelease) {
		if (draftReleases.length > 1) {
			warning(`Multiple draft releases found : ${draftReleases.map((r) => r.tag_name).join(", ")}`);
			warning(`Using the first one returned by GitHub API: ${draftRelease.tag_name}`);
		}
		info(`Draft release${isPreRelease ? " (which is a prerelease)" : ""}:`);
		info(`  tag_name:  ${draftRelease.tag_name}`);
		info(`  name:      ${draftRelease.name}`);
	} else info(`No draft release found${isPreRelease ? " (among prerelease drafts)" : ""}`);
	if (lastRelease) {
		info(`Last release${isPreRelease ? " (including prerelease)" : ""}:`);
		info(`  tag_name:  ${lastRelease.tag_name}`);
		info(`  name:      ${lastRelease.name}`);
	} else warning(`No published release found${isPreRelease ? " (including prerelease)" : ""}`);
	return {
		draftRelease,
		lastRelease
	};
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/graphql/find-commits-in-comparison.graphql.generated.ts
var FindCommitsInComparisonDocument = {
	"kind": "Document",
	"definitions": [{
		"kind": "OperationDefinition",
		"operation": "query",
		"name": {
			"kind": "Name",
			"value": "findCommitsInComparison"
		},
		"variableDefinitions": [
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "name"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "String"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "owner"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "String"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "baseRef"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "String"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "headRef"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "String"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "withPullRequestBody"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Boolean"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "withPullRequestURL"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Boolean"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "after"
					}
				},
				"type": {
					"kind": "NamedType",
					"name": {
						"kind": "Name",
						"value": "String"
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "withBaseRefName"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Boolean"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "withHeadRefName"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Boolean"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "pullRequestLimit"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Int"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "historyLimit"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Int"
						}
					}
				}
			}
		],
		"selectionSet": {
			"kind": "SelectionSet",
			"selections": [{
				"kind": "Field",
				"name": {
					"kind": "Name",
					"value": "repository"
				},
				"arguments": [{
					"kind": "Argument",
					"name": {
						"kind": "Name",
						"value": "name"
					},
					"value": {
						"kind": "Variable",
						"name": {
							"kind": "Name",
							"value": "name"
						}
					}
				}, {
					"kind": "Argument",
					"name": {
						"kind": "Name",
						"value": "owner"
					},
					"value": {
						"kind": "Variable",
						"name": {
							"kind": "Name",
							"value": "owner"
						}
					}
				}],
				"selectionSet": {
					"kind": "SelectionSet",
					"selections": [{
						"kind": "Field",
						"name": {
							"kind": "Name",
							"value": "ref"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "qualifiedName"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "baseRef"
								}
							}
						}],
						"selectionSet": {
							"kind": "SelectionSet",
							"selections": [{
								"kind": "Field",
								"name": {
									"kind": "Name",
									"value": "compare"
								},
								"arguments": [{
									"kind": "Argument",
									"name": {
										"kind": "Name",
										"value": "headRef"
									},
									"value": {
										"kind": "Variable",
										"name": {
											"kind": "Name",
											"value": "headRef"
										}
									}
								}],
								"selectionSet": {
									"kind": "SelectionSet",
									"selections": [{
										"kind": "Field",
										"name": {
											"kind": "Name",
											"value": "commits"
										},
										"arguments": [{
											"kind": "Argument",
											"name": {
												"kind": "Name",
												"value": "first"
											},
											"value": {
												"kind": "Variable",
												"name": {
													"kind": "Name",
													"value": "historyLimit"
												}
											}
										}, {
											"kind": "Argument",
											"name": {
												"kind": "Name",
												"value": "after"
											},
											"value": {
												"kind": "Variable",
												"name": {
													"kind": "Name",
													"value": "after"
												}
											}
										}],
										"selectionSet": {
											"kind": "SelectionSet",
											"selections": [
												{
													"kind": "Field",
													"name": {
														"kind": "Name",
														"value": "__typename"
													}
												},
												{
													"kind": "Field",
													"name": {
														"kind": "Name",
														"value": "pageInfo"
													},
													"selectionSet": {
														"kind": "SelectionSet",
														"selections": [
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "__typename"
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "hasNextPage"
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "endCursor"
																}
															}
														]
													}
												},
												{
													"kind": "Field",
													"name": {
														"kind": "Name",
														"value": "nodes"
													},
													"selectionSet": {
														"kind": "SelectionSet",
														"selections": [
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "__typename"
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "id"
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "oid"
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "committedDate"
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "message"
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "author"
																},
																"selectionSet": {
																	"kind": "SelectionSet",
																	"selections": [
																		{
																			"kind": "Field",
																			"name": {
																				"kind": "Name",
																				"value": "__typename"
																			}
																		},
																		{
																			"kind": "Field",
																			"name": {
																				"kind": "Name",
																				"value": "name"
																			}
																		},
																		{
																			"kind": "Field",
																			"name": {
																				"kind": "Name",
																				"value": "user"
																			},
																			"selectionSet": {
																				"kind": "SelectionSet",
																				"selections": [{
																					"kind": "Field",
																					"name": {
																						"kind": "Name",
																						"value": "__typename"
																					}
																				}, {
																					"kind": "Field",
																					"name": {
																						"kind": "Name",
																						"value": "login"
																					}
																				}]
																			}
																		}
																	]
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "associatedPullRequests"
																},
																"arguments": [{
																	"kind": "Argument",
																	"name": {
																		"kind": "Name",
																		"value": "first"
																	},
																	"value": {
																		"kind": "Variable",
																		"name": {
																			"kind": "Name",
																			"value": "pullRequestLimit"
																		}
																	}
																}],
																"selectionSet": {
																	"kind": "SelectionSet",
																	"selections": [{
																		"kind": "Field",
																		"name": {
																			"kind": "Name",
																			"value": "__typename"
																		}
																	}, {
																		"kind": "Field",
																		"name": {
																			"kind": "Name",
																			"value": "nodes"
																		},
																		"selectionSet": {
																			"kind": "SelectionSet",
																			"selections": [{
																				"kind": "FragmentSpread",
																				"name": {
																					"kind": "Name",
																					"value": "PullRequestFields"
																				}
																			}]
																		}
																	}]
																}
															}
														]
													}
												}
											]
										}
									}]
								}
							}]
						}
					}]
				}
			}]
		}
	}, {
		"kind": "FragmentDefinition",
		"name": {
			"kind": "Name",
			"value": "PullRequestFields"
		},
		"typeCondition": {
			"kind": "NamedType",
			"name": {
				"kind": "Name",
				"value": "PullRequest"
			}
		},
		"selectionSet": {
			"kind": "SelectionSet",
			"selections": [
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "__typename"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "title"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "number"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "url"
					},
					"directives": [{
						"kind": "Directive",
						"name": {
							"kind": "Name",
							"value": "include"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "if"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "withPullRequestURL"
								}
							}
						}]
					}]
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "body"
					},
					"directives": [{
						"kind": "Directive",
						"name": {
							"kind": "Name",
							"value": "include"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "if"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "withPullRequestBody"
								}
							}
						}]
					}]
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "author"
					},
					"selectionSet": {
						"kind": "SelectionSet",
						"selections": [
							{
								"kind": "Field",
								"name": {
									"kind": "Name",
									"value": "__typename"
								}
							},
							{
								"kind": "Field",
								"name": {
									"kind": "Name",
									"value": "login"
								}
							},
							{
								"kind": "Field",
								"name": {
									"kind": "Name",
									"value": "url"
								}
							}
						]
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "baseRepository"
					},
					"selectionSet": {
						"kind": "SelectionSet",
						"selections": [{
							"kind": "Field",
							"name": {
								"kind": "Name",
								"value": "__typename"
							}
						}, {
							"kind": "Field",
							"name": {
								"kind": "Name",
								"value": "nameWithOwner"
							}
						}]
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "mergedAt"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "isCrossRepository"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "labels"
					},
					"arguments": [{
						"kind": "Argument",
						"name": {
							"kind": "Name",
							"value": "first"
						},
						"value": {
							"kind": "IntValue",
							"value": "100"
						}
					}],
					"selectionSet": {
						"kind": "SelectionSet",
						"selections": [{
							"kind": "Field",
							"name": {
								"kind": "Name",
								"value": "__typename"
							}
						}, {
							"kind": "Field",
							"name": {
								"kind": "Name",
								"value": "nodes"
							},
							"selectionSet": {
								"kind": "SelectionSet",
								"selections": [{
									"kind": "Field",
									"name": {
										"kind": "Name",
										"value": "__typename"
									}
								}, {
									"kind": "Field",
									"name": {
										"kind": "Name",
										"value": "name"
									}
								}]
							}
						}]
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "merged"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "baseRefName"
					},
					"directives": [{
						"kind": "Directive",
						"name": {
							"kind": "Name",
							"value": "include"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "if"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "withBaseRefName"
								}
							}
						}]
					}]
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "headRefName"
					},
					"directives": [{
						"kind": "Directive",
						"name": {
							"kind": "Name",
							"value": "include"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "if"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "withHeadRefName"
								}
							}
						}]
					}]
				}
			]
		}
	}]
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/find-commits-in-comparison.ts
var findCommitsInComparison = async (params) => {
	const data = await paginateGraphql(getOctokit().graphql, FindCommitsInComparisonDocument, params, [
		"repository",
		"ref",
		"compare",
		"commits"
	]);
	if (!data.repository?.ref?.compare) throw new Error("Query returned an unexpected result: ref or comparison not found");
	return (data.repository.ref.compare.commits.nodes || []).filter((commit) => commit != null);
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/graphql/find-commits-with-path-changes.graphql.generated.ts
var FindCommitsWithPathChangesQueryDocument = {
	"kind": "Document",
	"definitions": [{
		"kind": "OperationDefinition",
		"operation": "query",
		"name": {
			"kind": "Name",
			"value": "findCommitsWithPathChangesQuery"
		},
		"variableDefinitions": [
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "name"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "String"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "owner"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "String"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "targetCommitish"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "String"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "after"
					}
				},
				"type": {
					"kind": "NamedType",
					"name": {
						"kind": "Name",
						"value": "String"
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "path"
					}
				},
				"type": {
					"kind": "NamedType",
					"name": {
						"kind": "Name",
						"value": "String"
					}
				}
			}
		],
		"selectionSet": {
			"kind": "SelectionSet",
			"selections": [{
				"kind": "Field",
				"name": {
					"kind": "Name",
					"value": "repository"
				},
				"arguments": [{
					"kind": "Argument",
					"name": {
						"kind": "Name",
						"value": "name"
					},
					"value": {
						"kind": "Variable",
						"name": {
							"kind": "Name",
							"value": "name"
						}
					}
				}, {
					"kind": "Argument",
					"name": {
						"kind": "Name",
						"value": "owner"
					},
					"value": {
						"kind": "Variable",
						"name": {
							"kind": "Name",
							"value": "owner"
						}
					}
				}],
				"selectionSet": {
					"kind": "SelectionSet",
					"selections": [{
						"kind": "Field",
						"name": {
							"kind": "Name",
							"value": "object"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "expression"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "targetCommitish"
								}
							}
						}],
						"selectionSet": {
							"kind": "SelectionSet",
							"selections": [{
								"kind": "InlineFragment",
								"typeCondition": {
									"kind": "NamedType",
									"name": {
										"kind": "Name",
										"value": "Commit"
									}
								},
								"selectionSet": {
									"kind": "SelectionSet",
									"selections": [{
										"kind": "Field",
										"name": {
											"kind": "Name",
											"value": "__typename"
										}
									}, {
										"kind": "Field",
										"name": {
											"kind": "Name",
											"value": "history"
										},
										"arguments": [{
											"kind": "Argument",
											"name": {
												"kind": "Name",
												"value": "path"
											},
											"value": {
												"kind": "Variable",
												"name": {
													"kind": "Name",
													"value": "path"
												}
											}
										}, {
											"kind": "Argument",
											"name": {
												"kind": "Name",
												"value": "after"
											},
											"value": {
												"kind": "Variable",
												"name": {
													"kind": "Name",
													"value": "after"
												}
											}
										}],
										"selectionSet": {
											"kind": "SelectionSet",
											"selections": [
												{
													"kind": "Field",
													"name": {
														"kind": "Name",
														"value": "__typename"
													}
												},
												{
													"kind": "Field",
													"name": {
														"kind": "Name",
														"value": "pageInfo"
													},
													"selectionSet": {
														"kind": "SelectionSet",
														"selections": [
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "__typename"
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "hasNextPage"
																}
															},
															{
																"kind": "Field",
																"name": {
																	"kind": "Name",
																	"value": "endCursor"
																}
															}
														]
													}
												},
												{
													"kind": "Field",
													"name": {
														"kind": "Name",
														"value": "nodes"
													},
													"selectionSet": {
														"kind": "SelectionSet",
														"selections": [{
															"kind": "Field",
															"name": {
																"kind": "Name",
																"value": "__typename"
															}
														}, {
															"kind": "Field",
															"name": {
																"kind": "Name",
																"value": "id"
															}
														}]
													}
												}
											]
										}
									}]
								}
							}]
						}
					}]
				}
			}]
		}
	}]
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/find-commits-with-path-change.ts
/**
* @see https://docs.github.com/en/graphql/reference/objects#commit
*/
var findCommitsWithPathChange = async (paths, params) => {
	const octokit = getOctokit();
	const commitIdsMatchingPaths = {};
	let hasFoundCommits = false;
	for (const path of paths) {
		commitIdsMatchingPaths[path] = /* @__PURE__ */ new Set();
		let after = null;
		while (true) {
			const variables = {
				name: params.name,
				owner: params.owner,
				targetCommitish: params.targetCommitish,
				path,
				after
			};
			const data = await executeGraphql(octokit.graphql, FindCommitsWithPathChangesQueryDocument, variables);
			if (data.repository?.object?.__typename !== "Commit") throw new Error("Query returned an unexpected result");
			const matchingNodes = (data.repository.object.history.nodes ?? []).filter((c) => c != null).filter((c) => params.comparisonCommitIds.has(c.id));
			for (const { id } of matchingNodes) {
				hasFoundCommits = true;
				commitIdsMatchingPaths[path].add(id);
			}
			const { hasNextPage, endCursor } = data.repository.object.history.pageInfo;
			if (!hasNextPage || matchingNodes.length === 0) break;
			after = endCursor ?? null;
		}
	}
	return {
		commitIdsMatchingPaths,
		hasFoundCommits
	};
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/graphql/find-recent-merged-pull-requests.graphql.generated.ts
var FindRecentMergedPullRequestsDocument = {
	"kind": "Document",
	"definitions": [{
		"kind": "OperationDefinition",
		"operation": "query",
		"name": {
			"kind": "Name",
			"value": "findRecentMergedPullRequests"
		},
		"variableDefinitions": [
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "name"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "String"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "owner"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "String"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "baseRefName"
					}
				},
				"type": {
					"kind": "NamedType",
					"name": {
						"kind": "Name",
						"value": "String"
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "limit"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Int"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "withPullRequestBody"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Boolean"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "withPullRequestURL"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Boolean"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "withBaseRefName"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Boolean"
						}
					}
				}
			},
			{
				"kind": "VariableDefinition",
				"variable": {
					"kind": "Variable",
					"name": {
						"kind": "Name",
						"value": "withHeadRefName"
					}
				},
				"type": {
					"kind": "NonNullType",
					"type": {
						"kind": "NamedType",
						"name": {
							"kind": "Name",
							"value": "Boolean"
						}
					}
				}
			}
		],
		"selectionSet": {
			"kind": "SelectionSet",
			"selections": [{
				"kind": "Field",
				"name": {
					"kind": "Name",
					"value": "repository"
				},
				"arguments": [{
					"kind": "Argument",
					"name": {
						"kind": "Name",
						"value": "name"
					},
					"value": {
						"kind": "Variable",
						"name": {
							"kind": "Name",
							"value": "name"
						}
					}
				}, {
					"kind": "Argument",
					"name": {
						"kind": "Name",
						"value": "owner"
					},
					"value": {
						"kind": "Variable",
						"name": {
							"kind": "Name",
							"value": "owner"
						}
					}
				}],
				"selectionSet": {
					"kind": "SelectionSet",
					"selections": [{
						"kind": "Field",
						"name": {
							"kind": "Name",
							"value": "pullRequests"
						},
						"arguments": [
							{
								"kind": "Argument",
								"name": {
									"kind": "Name",
									"value": "states"
								},
								"value": {
									"kind": "ListValue",
									"values": [{
										"kind": "EnumValue",
										"value": "MERGED"
									}]
								}
							},
							{
								"kind": "Argument",
								"name": {
									"kind": "Name",
									"value": "baseRefName"
								},
								"value": {
									"kind": "Variable",
									"name": {
										"kind": "Name",
										"value": "baseRefName"
									}
								}
							},
							{
								"kind": "Argument",
								"name": {
									"kind": "Name",
									"value": "orderBy"
								},
								"value": {
									"kind": "ObjectValue",
									"fields": [{
										"kind": "ObjectField",
										"name": {
											"kind": "Name",
											"value": "field"
										},
										"value": {
											"kind": "EnumValue",
											"value": "UPDATED_AT"
										}
									}, {
										"kind": "ObjectField",
										"name": {
											"kind": "Name",
											"value": "direction"
										},
										"value": {
											"kind": "EnumValue",
											"value": "DESC"
										}
									}]
								}
							},
							{
								"kind": "Argument",
								"name": {
									"kind": "Name",
									"value": "first"
								},
								"value": {
									"kind": "Variable",
									"name": {
										"kind": "Name",
										"value": "limit"
									}
								}
							}
						],
						"selectionSet": {
							"kind": "SelectionSet",
							"selections": [{
								"kind": "Field",
								"name": {
									"kind": "Name",
									"value": "__typename"
								}
							}, {
								"kind": "Field",
								"name": {
									"kind": "Name",
									"value": "nodes"
								},
								"selectionSet": {
									"kind": "SelectionSet",
									"selections": [{
										"kind": "FragmentSpread",
										"name": {
											"kind": "Name",
											"value": "PullRequestFields"
										}
									}, {
										"kind": "Field",
										"name": {
											"kind": "Name",
											"value": "mergeCommit"
										},
										"selectionSet": {
											"kind": "SelectionSet",
											"selections": [{
												"kind": "Field",
												"name": {
													"kind": "Name",
													"value": "__typename"
												}
											}, {
												"kind": "Field",
												"name": {
													"kind": "Name",
													"value": "oid"
												}
											}]
										}
									}]
								}
							}]
						}
					}]
				}
			}]
		}
	}, {
		"kind": "FragmentDefinition",
		"name": {
			"kind": "Name",
			"value": "PullRequestFields"
		},
		"typeCondition": {
			"kind": "NamedType",
			"name": {
				"kind": "Name",
				"value": "PullRequest"
			}
		},
		"selectionSet": {
			"kind": "SelectionSet",
			"selections": [
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "__typename"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "title"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "number"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "url"
					},
					"directives": [{
						"kind": "Directive",
						"name": {
							"kind": "Name",
							"value": "include"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "if"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "withPullRequestURL"
								}
							}
						}]
					}]
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "body"
					},
					"directives": [{
						"kind": "Directive",
						"name": {
							"kind": "Name",
							"value": "include"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "if"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "withPullRequestBody"
								}
							}
						}]
					}]
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "author"
					},
					"selectionSet": {
						"kind": "SelectionSet",
						"selections": [
							{
								"kind": "Field",
								"name": {
									"kind": "Name",
									"value": "__typename"
								}
							},
							{
								"kind": "Field",
								"name": {
									"kind": "Name",
									"value": "login"
								}
							},
							{
								"kind": "Field",
								"name": {
									"kind": "Name",
									"value": "url"
								}
							}
						]
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "baseRepository"
					},
					"selectionSet": {
						"kind": "SelectionSet",
						"selections": [{
							"kind": "Field",
							"name": {
								"kind": "Name",
								"value": "__typename"
							}
						}, {
							"kind": "Field",
							"name": {
								"kind": "Name",
								"value": "nameWithOwner"
							}
						}]
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "mergedAt"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "isCrossRepository"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "labels"
					},
					"arguments": [{
						"kind": "Argument",
						"name": {
							"kind": "Name",
							"value": "first"
						},
						"value": {
							"kind": "IntValue",
							"value": "100"
						}
					}],
					"selectionSet": {
						"kind": "SelectionSet",
						"selections": [{
							"kind": "Field",
							"name": {
								"kind": "Name",
								"value": "__typename"
							}
						}, {
							"kind": "Field",
							"name": {
								"kind": "Name",
								"value": "nodes"
							},
							"selectionSet": {
								"kind": "SelectionSet",
								"selections": [{
									"kind": "Field",
									"name": {
										"kind": "Name",
										"value": "__typename"
									}
								}, {
									"kind": "Field",
									"name": {
										"kind": "Name",
										"value": "name"
									}
								}]
							}
						}]
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "merged"
					}
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "baseRefName"
					},
					"directives": [{
						"kind": "Directive",
						"name": {
							"kind": "Name",
							"value": "include"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "if"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "withBaseRefName"
								}
							}
						}]
					}]
				},
				{
					"kind": "Field",
					"name": {
						"kind": "Name",
						"value": "headRefName"
					},
					"directives": [{
						"kind": "Directive",
						"name": {
							"kind": "Name",
							"value": "include"
						},
						"arguments": [{
							"kind": "Argument",
							"name": {
								"kind": "Name",
								"value": "if"
							},
							"value": {
								"kind": "Variable",
								"name": {
									"kind": "Name",
									"value": "withHeadRefName"
								}
							}
						}]
					}]
				}
			]
		}
	}]
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/find-recent-merged-pull-requests.ts
var RECENT_PR_LOOKBACK = 5;
var findRecentMergedPullRequests = async (params) => {
	const octokit = getOctokit();
	const nameWithOwner = `${context.repo.owner}/${context.repo.repo}`;
	const missingPRs = ((await executeGraphql(octokit.graphql, FindRecentMergedPullRequestsDocument, {
		name: context.repo.repo,
		owner: context.repo.owner,
		baseRefName: params.baseRefName,
		limit: RECENT_PR_LOOKBACK,
		...params.fieldFlags
	})).repository?.pullRequests.nodes ?? []).filter((pr) => {
		if (!pr?.mergeCommit?.oid) return false;
		const prKey = `${nameWithOwner}#${pr.number}`;
		return params.commitOids.has(pr.mergeCommit.oid) && !params.foundPrKeys.has(prKey);
	});
	if (missingPRs.length === 0) return [];
	info(`Found ${missingPRs.length} recently merged PR(s) missing from GraphQL index, recovering: ${missingPRs.map((pr) => `#${pr?.number}`).join(", ")}`);
	return missingPRs.filter((pr) => pr != null);
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/find-pull-requests.ts
var findPullRequests = async (params) => {
	const shouldFilterByIncludedPaths = params.config["include-paths"].length > 0;
	const shouldFilterByExcludedPaths = params.config["exclude-paths"].length > 0;
	const sharedComparisonParams = {
		name: context.repo.repo,
		owner: context.repo.owner,
		headRef: params.config.commitish,
		withPullRequestBody: params.config["change-template"].includes("$BODY"),
		withPullRequestURL: params.config["change-template"].includes("$URL"),
		withBaseRefName: params.config["change-template"].includes("$BASE_REF_NAME"),
		withHeadRefName: params.config["change-template"].includes("$HEAD_REF_NAME"),
		pullRequestLimit: params.config["pull-request-limit"],
		historyLimit: params.config["history-limit"]
	};
	let commits;
	if (!params.lastRelease?.tag_name) {
		warning("A previous (published) release is required to find changes");
		return {
			commits: [],
			pullRequests: []
		};
	}
	info(`Finding commits between refs/tags/${params.lastRelease.tag_name} and ${params.config.commitish}...`);
	commits = await findCommitsInComparison({
		baseRef: `refs/tags/${params.lastRelease.tag_name}`,
		...sharedComparisonParams
	});
	info(`Found ${commits.length} commits.`);
	const comparisonCommitIds = new Set(commits.map((c) => c.id));
	/**
	* If include-paths are specified,
	* find all commits that changed those paths to filter PRs later.
	*
	* If exclude-paths are specified,
	* find all commits that changed those paths and remove them from results.
	*
	* The underlying query does not bother fetching PRs along commits.
	*/
	const includedCommitIds = /* @__PURE__ */ new Set();
	if (shouldFilterByIncludedPaths) {
		info("Finding commits with included path changes...");
		const { commitIdsMatchingPaths, hasFoundCommits } = await findCommitsWithPathChange(params.config["include-paths"], {
			name: context.repo.repo,
			owner: context.repo.owner,
			targetCommitish: params.config.commitish,
			comparisonCommitIds
		});
		if (!hasFoundCommits) return {
			commits: [],
			pullRequests: []
		};
		Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
			info(`Found ${ids.size} commits with changes to included path "${path}"`);
			for (const id of ids) includedCommitIds.add(id);
		});
	}
	const excludedCommitIds = /* @__PURE__ */ new Set();
	if (shouldFilterByExcludedPaths) {
		info("Finding commits with excluded path changes...");
		const { commitIdsMatchingPaths } = await findCommitsWithPathChange(params.config["exclude-paths"], {
			name: context.repo.repo,
			owner: context.repo.owner,
			targetCommitish: params.config.commitish,
			comparisonCommitIds
		});
		Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
			info(`Found ${ids.size} commits with changes to excluded path "${path}"`);
			for (const id of ids) excludedCommitIds.add(id);
		});
	}
	commits = commits.filter((commit) => {
		if (excludedCommitIds.has(commit.id)) return false;
		if (shouldFilterByIncludedPaths) return includedCommitIds.has(commit.id);
		return true;
	});
	if (shouldFilterByIncludedPaths || shouldFilterByExcludedPaths) info(`After filtering by path changes, ${commits.length} commits remain.`);
	const pullRequestsByKey = new Map(commits.flatMap((commit) => commit.associatedPullRequests?.nodes ?? []).filter((pr) => pr != null).map((pr) => [`${pr.baseRepository?.nameWithOwner}#${pr.number}`, pr]));
	const pullRequestsRaw = [...pullRequestsByKey.values()];
	const comparisonCommitOids = new Set(commits.flatMap((c) => c.oid ? [c.oid] : []));
	const { commitish } = params.config;
	const isBranchRef = commitish.startsWith("refs/heads/");
	const isUnsupportedRef = commitish.startsWith("refs/tags/") || commitish.startsWith("refs/pull/");
	const recoveredPRs = comparisonCommitOids.size === 0 || isUnsupportedRef ? [] : await findRecentMergedPullRequests({
		baseRefName: isBranchRef ? commitish.replace(/^refs\/heads\//, "") : null,
		commitOids: comparisonCommitOids,
		foundPrKeys: new Set(pullRequestsByKey.keys()),
		fieldFlags: {
			withPullRequestBody: sharedComparisonParams.withPullRequestBody,
			withPullRequestURL: sharedComparisonParams.withPullRequestURL,
			withBaseRefName: sharedComparisonParams.withBaseRefName,
			withHeadRefName: sharedComparisonParams.withHeadRefName
		}
	});
	const pullRequests = [...pullRequestsRaw, ...recoveredPRs].filter((pr) => pr.baseRepository?.nameWithOwner === `${context.repo.owner}/${context.repo.repo}` && pr.merged);
	info(`Found ${pullRequests.length} merged pull requests targeting ${context.repo.owner}/${context.repo.repo}${pullRequests.length > 0 ? `: ${pullRequests.map((pr) => `#${pr.number}`).join(", ")}` : "."}`);
	return {
		commits,
		pullRequests
	};
};
//#endregion
//#region src/actions/drafter/lib/upsert-release/create-release.ts
var createRelease = async (params) => {
	const octokit = getOctokit();
	const { releasePayload } = params;
	return octokit.rest.repos.createRelease({
		owner: context.repo.owner,
		repo: context.repo.repo,
		target_commitish: releasePayload.targetCommitish,
		name: releasePayload.name,
		tag_name: releasePayload.tag,
		body: releasePayload.body,
		draft: releasePayload.draft,
		prerelease: releasePayload.prerelease,
		make_latest: releasePayload.prerelease ? "false" : releasePayload.make_latest.toString()
	});
};
//#endregion
//#region src/actions/drafter/lib/upsert-release/update-release.ts
var updateRelease = async (params) => {
	const octokit = getOctokit();
	const { draftRelease, releasePayload } = params;
	const updateReleaseParameters = {
		name: releasePayload.name || draftRelease.name || void 0,
		tag_name: releasePayload.tag || draftRelease.tag_name,
		target_commitish: releasePayload.targetCommitish
	};
	if (!updateReleaseParameters.name) delete updateReleaseParameters.name;
	if (!updateReleaseParameters.tag_name) delete updateReleaseParameters.tag_name;
	if (!updateReleaseParameters.target_commitish) delete updateReleaseParameters.target_commitish;
	return octokit.rest.repos.updateRelease({
		owner: context.repo.owner,
		repo: context.repo.repo,
		release_id: draftRelease.id,
		body: releasePayload.body,
		draft: releasePayload.draft,
		prerelease: releasePayload.prerelease,
		make_latest: releasePayload.prerelease ? "false" : releasePayload.make_latest.toString(),
		...updateReleaseParameters
	});
};
//#endregion
//#region src/actions/drafter/lib/upsert-release/upsert-release.ts
var upsertRelease = async (params) => {
	const { draftRelease, releasePayload, dryRun } = params;
	if (dryRun) {
		if (!draftRelease) info(`[dry-run] Would create a new release with payload: ${JSON.stringify(releasePayload, null, 2)}`);
		else info(`[dry-run] Would update existing release (id: ${draftRelease.id}) with payload: ${JSON.stringify(releasePayload, null, 2)}`);
		return;
	}
	if (!draftRelease) {
		info("Creating new release...");
		const res = await createRelease({ releasePayload });
		info("Release created!");
		return res;
	} else {
		info("Updating existing release...");
		const res = await updateRelease({
			draftRelease,
			releasePayload
		});
		info("Release updated!");
		return res;
	}
};
//#endregion
//#region src/actions/drafter/main.ts
var main = async (params) => {
	/**
	* 1. find previous releases - returns latest release
	* 2. find commits since latest release, with their associated pull-requests
	* 3. sort those pull-requests according to the desired config (for release-body)
	* 4. generate release info
	* 5. create a release (may be a draft) or update previous draft
	* 6. set action outputs
	*/
	const { config, input } = params;
	const { draftRelease, lastRelease } = await findPreviousReleases(config);
	const { commits, pullRequests } = await findPullRequests({
		lastRelease,
		config
	});
	const releasePayload = buildReleasePayload({
		commits,
		config,
		input,
		lastRelease,
		pullRequests
	});
	return {
		upsertedRelease: await upsertRelease({
			draftRelease,
			releasePayload,
			dryRun: input["dry-run"]
		}),
		releasePayload
	};
};
//#endregion
//#region src/actions/drafter/runner.ts
/**
* The main function for the action.
*
* @returns Resolves when the action is complete.
*/
async function run() {
	try {
		info("Parsing inputs and configuration...");
		const input = getActionInput();
		const { upsertedRelease, releasePayload } = await main({
			input,
			config: mergeInputAndConfig({
				config: await getConfig(input["config-name"]),
				input
			})
		});
		setActionOutput({
			upsertedRelease,
			releasePayload
		});
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
	}
}
//#endregion
//#region src/actions/drafter/run.ts
/* node:coverage ignore file -- @preserve */
/**
* The entrypoint for the action. This file simply imports and runs the action's
* main logic.
*
* Do not add any logic to this file; instead, add it to `runner.ts`.
*
* `runner.ts` is the entrypoint for tests and should contain all the action's
* main logic.
*/
await run();
//#endregion
export {};
