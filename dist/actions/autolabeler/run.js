import { D as expand, E as Matcher, M as setFailed, O as context, S as string, _ as boolean, c as writeActionOutputs, g as array, i as sharedInputSchema, j as info, k as core_exports, o as defineActionInputNames, p as escapeStringRegexp, s as readActionInputs, t as composeConfigGet, u as getGitHubAdapter, x as object } from "../../chunks/config.js";
import process$1 from "node:process";
// packages/autolabeler/src/config/config.schema.ts
var labelSchema = string().min(1).describe("Backward-compatible single label. Prefer labels for new rules.");
var labelsSchema = array(string().min(1)).min(1).describe("Labels to add when this rule matches, in configuration order.");
var ruleSchema = object({
	labels: labelsSchema.optional(),
	label: labelSchema.optional(),
	/** Add these labels only when no ordinary rule matches. */
	fallback: boolean().optional().default(false),
	/** Stop evaluating later rules after this rule matches and adds its labels. */
	"stop-on-match": boolean().optional().default(false),
	files: array(string().min(1)).optional().default([]),
	branch: array(string().min(1)).optional().default([]),
	title: array(string().min(1)).optional().default([]),
	body: array(string().min(1)).optional().default([])
});
var configSchema = object({
	"sync-labels": boolean().optional().default(false).describe("Remove configured labels when they are not selected by this run."),
	/**
	* Defines pull request label rules.
	* `files` uses glob patterns. `branch`, `title`, and `body` use regular expressions.
	* A rule matches when at least one configured matcher succeeds.
	*/
	autolabeler: array(ruleSchema.extend({ labels: labelsSchema }).or(ruleSchema.extend({ label: labelSchema })))
}).meta({
	title: "JSON schema for Release Drafter's autolabeler action config.",
	id: "https://github.com/release-drafter/release-drafter/blob/main/autolabeler/schema.json"
});
// packages/autolabeler/src/util.ts
var regexLiteral = /^\/.+\/[AJUXgimsux]*$/;
var supportedFlags = /* @__PURE__ */ new Set("gimsuy");
/** Converts a regex literal or plain text matcher into a regular expression. */
var stringToRegex = (search) => {
	if (!regexLiteral.test(search)) return new RegExp(escapeStringRegexp(search), "g");
	const delimiter = search.lastIndexOf("/");
	const flags = [...new Set(search.slice(delimiter + 1))].filter((flag) => supportedFlags.has(flag)).join("");
	return new RegExp(search.slice(1, delimiter), flags);
};
// packages/autolabeler/src/config/validate-config.ts
/** Validates fallback rules after structural configuration parsing. */
var validateConfig = (config) => {
	const fallbacks = config.autolabeler.filter((rule) => rule.fallback);
	if (fallbacks.length > 1) throw new Error("Only one Autolabeler fallback rule is supported.");
	const fallback = fallbacks[0];
	if (fallback?.["stop-on-match"]) throw new Error("An Autolabeler rule cannot enable both 'fallback' and 'stop-on-match'.");
	if (fallback && [
		fallback.files,
		fallback.branch,
		fallback.title,
		fallback.body
	].some((matchers) => matchers.length > 0)) throw new Error("An Autolabeler fallback rule must not specify matchers.");
};
// packages/autolabeler/src/config/parse-config.ts
/** Normalizes label shorthand and compiles configured regex matchers. */
var parseConfig = (params) => {
	validateConfig(params.config);
	const config = structuredClone(params.config);
	const autolabeler = config.autolabeler.map((rule) => {
		try {
			return {
				...rule,
				labels: [...rule.labels ?? [], ...rule.label !== void 0 ? [rule.label] : []],
				branch: rule.branch.map(stringToRegex),
				title: rule.title.map(stringToRegex),
				body: rule.body.map(stringToRegex)
			};
		} catch {
			params.logger.warning(`Bad autolabeler regex: '${rule.branch}', '${rule.title}' or '${rule.body}'`);
			return false;
		}
	}).filter((rule) => !!rule);
	return {
		...config,
		autolabeler
	};
};
// packages/autolabeler/node_modules/minimatch/dist/esm/assert-valid-pattern.js
var MAX_PATTERN_LENGTH = 65536;
var assertValidPattern = (pattern) => {
	if (typeof pattern !== "string") throw new TypeError("invalid pattern");
	if (pattern.length > MAX_PATTERN_LENGTH) throw new TypeError("pattern is too long");
};
// packages/autolabeler/node_modules/minimatch/dist/esm/escape.js
/**
* Escape all magic characters in a glob pattern.
*
* If the {@link MinimatchOptions.windowsPathsNoEscape}
* option is used, then characters are escaped by wrapping in `[]`, because
* a magic character wrapped in a character class can only be satisfied by
* that exact character.  In this mode, `\` is _not_ escaped, because it is
* not interpreted as a magic character, but instead as a path separator.
*
* If the {@link MinimatchOptions.magicalBraces} option is used,
* then braces (`{` and `}`) will be escaped.
*/
var escape = (s, { windowsPathsNoEscape = false, magicalBraces = false } = {}) => {
	if (magicalBraces) return windowsPathsNoEscape ? s.replace(/[?*()[\]{}]/g, "[$&]") : s.replace(/[?*()[\]\\{}]/g, "\\$&");
	return windowsPathsNoEscape ? s.replace(/[?*()[\]]/g, "[$&]") : s.replace(/[?*()[\]\\]/g, "\\$&");
};
// packages/autolabeler/node_modules/minimatch/dist/esm/unescape.js
/**
* Un-escape a string that has been escaped with {@link escape}.
*
* If the {@link MinimatchOptions.windowsPathsNoEscape} option is used, then
* square-bracket escapes are removed, but not backslash escapes.
*
* For example, it will turn the string `'[*]'` into `*`, but it will not
* turn `'\\*'` into `'*'`, because `\` is a path separator in
* `windowsPathsNoEscape` mode.
*
* When `windowsPathsNoEscape` is not set, then both square-bracket escapes and
* backslash escapes are removed.
*
* Slashes (and backslashes in `windowsPathsNoEscape` mode) cannot be escaped
* or unescaped.
*
* When `magicalBraces` is not set, escapes of braces (`{` and `}`) will not be
* unescaped.
*/
var unescape = (s, { windowsPathsNoEscape = false, magicalBraces = true } = {}) => {
	if (magicalBraces) return windowsPathsNoEscape ? s.replace(/\[([^/\\])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^/\\])\]/g, "$1$2").replace(/\\([^/])/g, "$1");
	return windowsPathsNoEscape ? s.replace(/\[([^/\\{}])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^/\\{}])\]/g, "$1$2").replace(/\\([^/{}])/g, "$1");
};
// packages/autolabeler/node_modules/minimatch/dist/esm/index.js
var minimatch = (p, pattern, options = {}) => {
	assertValidPattern(pattern);
	if (!options.nocomment && pattern.charAt(0) === "#") return false;
	return cachedMinimatch(pattern, options).match(p);
};
var cache = /* @__PURE__ */ new Map();
var cacheMax = 256;
var cachedMinimatch = (pattern, options) => {
	const key = pattern + "\0" + JSON.stringify(options);
	let mm = cache.get(key);
	if (mm) cache.delete(key);
	else {
		mm = new Minimatch(pattern, { ...options });
		if (cache.size >= cacheMax) cache.delete(cache.keys().next().value);
	}
	cache.set(key, mm);
	return mm;
};
/* c8 ignore start */
var defaultPlatform = typeof process === "object" && process ? process.env?.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix";
var path = {
	win32: { sep: "\\" },
	posix: { sep: "/" }
};
/* c8 ignore stop */
var sep = defaultPlatform === "win32" ? path.win32.sep : path.posix.sep;
minimatch.sep = sep;
var GLOBSTAR = Symbol("globstar **");
minimatch.GLOBSTAR = GLOBSTAR;
var filter = (pattern, options = {}) => (p) => minimatch(p, pattern, options);
minimatch.filter = filter;
var ext = (a, b = {}) => Object.assign({}, a, b);
var defaults = (def) => {
	if (!def || typeof def !== "object" || !Object.keys(def).length) return minimatch;
	const orig = minimatch;
	const m = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
	return Object.assign(m, {
		Minimatch: class Minimatch extends orig.Minimatch {
			constructor(pattern, options = {}) {
				super(pattern, ext(def, options));
			}
			static defaults(options) {
				return orig.defaults(ext(def, options)).Minimatch;
			}
		},
		unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
		escape: (s, options = {}) => orig.escape(s, ext(def, options)),
		filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
		defaults: (options) => orig.defaults(ext(def, options)),
		braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
		match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
		sep: orig.sep,
		GLOBSTAR
	});
};
minimatch.defaults = defaults;
var braceExpand = (pattern, options = {}) => {
	assertValidPattern(pattern);
	if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) return [pattern];
	return expand(pattern, { max: options.braceExpandMax });
};
minimatch.braceExpand = braceExpand;
var match = (list, pattern, options = {}) => {
	const mm = new Minimatch(pattern, options);
	list = list.filter((f) => mm.match(f));
	if (mm.options.nonull && !list.length) list.push(pattern);
	return list;
};
minimatch.match = match;
var globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
var classEnd = (pattern, start) => {
	let i = start + 1;
	if (pattern.charAt(i) === "!" || pattern.charAt(i) === "^") i++;
	let sawStart = false;
	for (; i < pattern.length; i++) {
		const c = pattern.charAt(i);
		if (c === "]" && sawStart) return i;
		sawStart = true;
		if (c === "\\") i++;
	}
	return -1;
};
var literal = (pattern, noext) => {
	if (!noext && (pattern === "+()" || pattern === "@()")) return pattern;
	let lit = "";
	for (let i = 0; i < pattern.length; i++) {
		const c = pattern.charAt(i);
		if (c === "\\") lit += pattern.charAt(++i) || c;
		else if (c === "*" || c === "?") return;
		else if (c === "[") {
			const close = classEnd(pattern, i);
			if (close === -1) {
				lit += c;
				continue;
			}
			let body = pattern.slice(i + 1, close);
			if (body.startsWith("\\")) body = body.slice(1);
			if ([...body].length !== 1 || "!^".includes(pattern.charAt(i + 1))) return;
			lit += body;
			i = close;
		} else if (!noext && "+@!".includes(c) && pattern.charAt(i + 1) === "(" && pattern.includes(")", i + 2)) return;
		else lit += c;
	}
	return lit;
};
var extSafe = (pattern) => {
	if (/^[?*+@]\(\)$/.test(pattern) || pattern.includes("[:")) return false;
	let depth = 0;
	for (let i = 0; i < pattern.length; i++) {
		const c = pattern.charAt(i);
		if (c === "\\") {
			if (++i === pattern.length) return false;
		} else if (c === "[") {
			const close = classEnd(pattern, i);
			if (close !== -1) i = close;
		} else if ("+@!?*".includes(c) && pattern.charAt(i + 1) === "(") {
			depth++;
			i++;
		} else if (c === ")") {
			if (!depth--) return false;
		} else if (c === "|" && !depth) return false;
	}
	return !depth;
};
var lastSplit;
var lastChecked;
var portionMatch = (p, f) => typeof p === "string" ? f === p : f !== "" && p.testUnchecked(f);
var endIndex = (p, last, lastStart, prev, prevStart) => portionMatch(p, last) ? lastStart : prev !== void 0 && portionMatch(p, prev) ? prevStart : -1;
var isDots = (p) => p === "." || p === "..";
var isDrive = (p) => typeof p === "string" && /^[a-z]:$/i.test(p);
var isLongUNC = (p) => typeof p === "string" && /^unc$/i.test(p);
var uncHost = (p) => {
	if (p[0] !== "" || p[1] !== "") return -1;
	const h = p[2] !== "?" ? 2 : isLongUNC(p[3]) ? 4 : -1;
	const host = p[h];
	const share = p[h + 1];
	return h !== -1 && host !== void 0 && host !== "" && host !== GLOBSTAR && share !== void 0 && share !== "" && share !== GLOBSTAR ? h : -1;
};
var walkable = (p, dot) => !isDots(p) && (dot || !p.startsWith("."));
var dotPortion = (f, start, end, dot, sep) => {
	for (let k = start; k < end;) {
		if (f.charCodeAt(k) === 46) {
			if (!dot) return true;
			const n = f.charCodeAt(k + 1) === 46 ? k + 2 : k + 1;
			if (n >= end || isSep(f.charCodeAt(n), sep)) return true;
		}
		const s = nextSep(f, k, sep);
		if (s === -1) return false;
		k = s + 1;
		while (k < end && isSep(f.charCodeAt(k), sep)) k++;
	}
	return false;
};
var isSep = (c, sep) => sep === "/" ? c === 47 : sep === "\\" ? c === 92 : c === 47 || c === 92;
var nextSep = (f, from, sep) => {
	if (sep !== "both") return f.indexOf(sep, from);
	const s = f.indexOf("/", from);
	const b = f.indexOf("\\", from);
	return s === -1 ? b : b === -1 ? s : Math.min(s, b);
};
var lastSep = (f, from, sep) => sep !== "both" ? f.lastIndexOf(sep, from) : Math.max(f.lastIndexOf("/", from), f.lastIndexOf("\\", from));
var PENDING = {};
var Minimatch = class {
	options;
	set;
	pattern;
	windowsPathsNoEscape;
	nonegate;
	negate;
	comment;
	empty;
	preserveMultipleSlashes;
	partial;
	globSet;
	globParts;
	nocase;
	isWindows;
	platform;
	windowsNoMagicRoot;
	maxGlobstarRecursion;
	#endCheck;
	#literalCheck;
	#level2;
	#form;
	#literals = [];
	#shapes = [];
	#endRows = [];
	#matchers = /* @__PURE__ */ new Map();
	#pending = false;
	#globstarParts = /* @__PURE__ */ new WeakMap();
	constructor(pattern, options = {}) {
		assertValidPattern(pattern);
		options = options || {};
		this.options = options;
		this.maxGlobstarRecursion = options.maxGlobstarRecursion ?? 200;
		this.pattern = pattern;
		this.platform = options.platform || defaultPlatform;
		this.isWindows = this.platform === "win32";
		const awe = "allowWindowsEscape";
		this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options[awe] === false;
		if (this.windowsPathsNoEscape) this.pattern = this.pattern.replace(/\\/g, "/");
		this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
		this.negate = false;
		this.nonegate = !!options.nonegate;
		this.comment = false;
		this.empty = false;
		this.partial = !!options.partial;
		this.nocase = !!this.options.nocase;
		this.windowsNoMagicRoot = options.windowsNoMagicRoot !== void 0 ? options.windowsNoMagicRoot : !!(this.isWindows && this.nocase);
		this.globSet = [];
		this.globParts = [];
		this.set = [];
		this.#endCheck = !this.preserveMultipleSlashes;
		this.#level2 = (options.optimizationLevel ?? 1) >= 2;
		const n = options.normalize;
		this.#form = n === true ? "NFC" : n || void 0;
		this.make();
		const drives = this.set.map((row) => this.#rootIndex(row));
		this.#endRows = this.set.map((row, r) => this.#endCheck && row.length - 1 > drives[r]);
		this.#literals = this.set.map((row, r) => {
			const end = this.#endRows[r] ? row.length - 1 : row.length;
			const lits = row.slice(drives[r] + 1, end).filter((p) => typeof p === "string" && !!p);
			return [...new Set(lits)];
		});
		this.#literalCheck = this.#literals.some((l) => l.length);
		this.#shapes = this.set.map((row, r) => {
			const [p0, p1, p2] = row;
			if (this.#endRows[r] && row.length === 2) {
				if (p0 === GLOBSTAR && p1 !== GLOBSTAR) return "tail";
			}
			if (this.#endRows[r] && options.matchBase && row.length === 1 && p0 !== GLOBSTAR && p0 !== "") return "base";
			if (!this.#endCheck || drives[r] !== -1) return void 0;
			if (row.length === 3 && p0 === GLOBSTAR && p2 === GLOBSTAR && p1 !== GLOBSTAR && p1 !== "" && this.maxGlobstarRecursion > 0) return "mid";
			if (row.length === 2 && p1 === GLOBSTAR && p0 !== GLOBSTAR && p0 !== "") return "head";
		});
	}
	#norm(p) {
		return this.#form ? p.normalize(this.#form) : p;
	}
	#rootIndex(row) {
		if (!this.isWindows) return -1;
		if (isDrive(row[0])) return 0;
		if (row[0] === "" && row[1] === "" && row[2] === "?" && isDrive(row[3])) return 3;
		const h = uncHost(row);
		return h === -1 ? -1 : h + 1;
	}
	hasMagic() {
		if (this.options.magicalBraces && this.set.length > 1) return true;
		for (const pattern of this.set) for (const part of pattern) if (typeof part !== "string") return true;
		return false;
	}
	make() {
		const pattern = this.pattern;
		const options = this.options;
		if (!options.nocomment && pattern.charAt(0) === "#") {
			this.comment = true;
			return;
		}
		if (!pattern) {
			this.empty = true;
			return;
		}
		this.parseNegate();
		this.globSet = [...new Set(this.braceExpand())];
		const rawGlobParts = this.globSet.map((s) => this.#slashSplit(s));
		this.globParts = this.preprocess(rawGlobParts);
		this.#pending = true;
		let set = this.globParts.map((s, _, __) => {
			if (this.isWindows && this.windowsNoMagicRoot) {
				const n = s[2] === "?" && isLongUNC(s[3]) ? 6 : 4;
				const isUNC = s[0] === "" && s[1] === "" && (s[2] === "?" || !globMagic.test(s[2])) && s.slice(3, n).every((p) => !globMagic.test(p));
				const isDrive = /^[a-z]:/i.test(s[0]);
				if (isUNC) return [...s.slice(0, n).map((p) => this.#norm(p)), ...s.slice(n).map((ss) => this.parse(ss))];
				else if (isDrive) return [this.#norm(s[0]), ...s.slice(1).map((ss) => this.parse(ss))];
			}
			return s.map((ss) => this.parse(ss));
		});
		this.set = set.filter((s) => s.indexOf(false) === -1);
		if (this.isWindows) for (let i = 0; i < this.set.length; i++) {
			const p = this.set[i];
			if (p[0] === "" && p[1] === "" && this.globParts[i][2] === "?" && (isDrive(p[3]) || isLongUNC(this.globParts[i][3]))) {
				if (isLongUNC(this.globParts[i][3])) p[3] = "UNC";
				p[2] = "?";
			}
		}
		if (!options.noext) this.mergeRows();
		this.#pending = false;
		this.set.forEach((row, i) => {
			for (let k = 0; k < row.length; k++) if (row[k] === PENDING) row[k] = this.parse(this.globParts[i][k]);
		});
	}
	mergeRows() {
		let merged = true;
		while (merged) {
			merged = false;
			const len = Math.max(0, ...this.set.map((r) => r.length));
			for (let k = 0; k < len; k++) {
				const groups = /* @__PURE__ */ new Map();
				this.set.forEach((row, i) => {
					if (!(row[k] instanceof Matcher || row[k] === PENDING) || !extSafe(this.globParts[i][k])) return;
					const parts = [...this.globParts[i]];
					parts[k] = "";
					const key = `${row.length}/${parts.join("/")}`;
					const g = groups.get(key);
					if (g) g.push(i);
					else groups.set(key, [i]);
				});
				const drop = /* @__PURE__ */ new Set();
				for (const g of groups.values()) {
					if (g.length < 2) continue;
					const [first, ...rest] = g;
					const glob = `@(${g.map((i) => this.globParts[i][k]).join("|")})`;
					this.globParts[first][k] = glob;
					this.set[first][k] = this.parse(glob);
					for (const i of rest) drop.add(i);
				}
				if (drop.size) {
					merged = true;
					this.set = this.set.filter((_, i) => !drop.has(i));
					this.globParts = this.globParts.filter((_, i) => !drop.has(i));
				}
			}
		}
	}
	preprocess(globParts) {
		if (this.options.noglobstar) {
			for (const partset of globParts) for (let j = 0; j < partset.length; j++) if (partset[j] === "**") partset[j] = "*";
		}
		const { optimizationLevel = 1 } = this.options;
		if (optimizationLevel >= 2) {
			globParts = this.firstPhasePreProcess(globParts);
			globParts = this.secondPhasePreProcess(globParts);
		} else if (optimizationLevel >= 1) globParts = this.levelOneOptimize(globParts);
		else globParts = this.adjascentGlobstarOptimize(globParts);
		return globParts;
	}
	adjascentGlobstarOptimize(globParts) {
		return globParts.map((parts) => {
			let gs = -1;
			while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
				let i = gs;
				while (parts[i + 1] === "**") i++;
				if (i !== gs) parts.splice(gs, i - gs);
			}
			return parts;
		});
	}
	levelOneOptimize(globParts) {
		return globParts.map((parts) => {
			const root = this.#rootIndex(parts) + 1;
			parts = parts.reduce((set, part) => {
				const prev = set[set.length - 1];
				if (part === "**" && prev === "**") return set;
				if (part === "..") {
					if (set.length > root && prev && prev !== ".." && prev !== "." && prev !== "**") {
						set.pop();
						return set;
					}
				}
				set.push(part);
				return set;
			}, []);
			return parts.length === 0 ? [""] : parts;
		});
	}
	#canMatch(f) {
		const sep = !this.isWindows || !f.includes("\\") ? "/" : f.includes("/") ? "both" : "\\";
		let ends = this.#endCheck ? 0 : -1;
		let last = "";
		let lastStart = 0;
		let prev;
		let prevStart = 0;
		const dot = !!this.options.dot;
		ROWS: for (let r = 0; r < this.set.length; r++) {
			const row = this.set[r];
			const p = row[row.length - 1];
			let end = ends !== -1 && this.#endRows[r] && p !== GLOBSTAR;
			if (end && ends === 0) {
				const i = lastSep(f, f.length, sep);
				lastStart = i + 1;
				last = f.slice(lastStart);
				if (last === "" && i >= 0) {
					let j = i;
					while (j > 0 && isSep(f.charCodeAt(j - 1), sep)) j--;
					prevStart = j === 0 ? 0 : lastSep(f, j - 1, sep) + 1;
					prev = f.slice(prevStart, j);
				}
				const resolves = this.#level2 && (isDots(last) || last === "" && prev !== void 0 && isDots(prev));
				ends = resolves ? -1 : 1;
				end = !resolves;
			}
			let tailStart = -1;
			if (end && typeof p === "string") {
				tailStart = endIndex(p, last, lastStart, prev, prevStart);
				if (tailStart === -1) continue;
			}
			if (this.#literalCheck) {
				for (const l of this.#literals[r]) if (!f.includes(l)) continue ROWS;
			}
			if (end && typeof p === "object") {
				tailStart = endIndex(p, last, lastStart, prev, prevStart);
				if (tailStart === -1) continue;
			}
			const shape = this.#shapes[r];
			if (shape === "base" && end) return "yes";
			if (shape === "tail" && end) {
				if (this.#level2 && dotPortion(f, 0, tailStart, true, sep)) return "maybe";
				if (!dotPortion(f, 0, tailStart, dot, sep)) return "yes";
				continue;
			}
			if (shape === "mid" || shape === "head") {
				const m = this.#walk(f, row, shape === "head", dot, sep);
				if (m !== "no") return m;
				continue;
			}
			return "maybe";
		}
		return "no";
	}
	#matchShape(file, row, shape) {
		const dot = !!this.options.dot;
		const n = file.length;
		if (shape === "head") {
			if (n < 2 || !portionMatch(row[0], file[0])) return false;
			for (let i = 1; i < n; i++) if (!walkable(file[i], dot)) return false;
			return true;
		}
		const x = row[1];
		if (shape === "tail") {
			let t = n - 1;
			if (!portionMatch(x, file[t])) {
				if (file[t] !== "" || n === 1 || !portionMatch(x, file[--t])) return false;
			}
			for (let i = 0; i < t; i++) if (!walkable(file[i], dot)) return false;
			return true;
		}
		for (let k = 0; k < n; k++) {
			if (portionMatch(x, file[k]) && k + 1 < n) {
				let i = k + 1;
				while (i < n && walkable(file[i], dot)) i++;
				if (i === n) return true;
			}
			if (!walkable(file[k], dot)) return false;
		}
		return false;
	}
	#walk(f, row, head, dot, sep) {
		if (this.#level2 && dotPortion(f, 0, f.length, true, sep)) return "maybe";
		const x = row[head ? 0 : 1];
		let s = 0;
		for (let e = nextSep(f, s, sep); e !== -1; e = nextSep(f, s, sep)) {
			let next = e + 1;
			while (next < f.length && isSep(f.charCodeAt(next), sep)) next++;
			if ((typeof x === "string" ? e - s === x.length && f.startsWith(x, s) : e > s && x.testUnchecked(f.slice(s, e))) && !dotPortion(f, next, f.length, dot, sep)) return "yes";
			if (head || dotPortion(f, s, next, dot, sep)) return "no";
			s = next;
		}
		return "no";
	}
	#cachedSplit(f) {
		const last = lastSplit;
		return last?.f === f && last.isWindows === this.isWindows && last.preserveMultipleSlashes === this.preserveMultipleSlashes && last.normalize === this.#form ? last : void 0;
	}
	#split(f) {
		const { isWindows, preserveMultipleSlashes } = this;
		let parts = this.#slashSplit(isWindows ? f.split("\\").join("/") : f);
		const normalize = this.#form;
		if (normalize) parts = parts.map((p) => p.normalize(normalize));
		lastSplit = {
			f,
			isWindows,
			preserveMultipleSlashes,
			normalize,
			parts
		};
		return lastSplit;
	}
	#levelTwoFileOptimize(file) {
		const parts = [...file];
		let didSomething = false;
		do {
			didSomething = false;
			if (!this.preserveMultipleSlashes) {
				for (let i = 1; i < parts.length - 1; i++) {
					const p = parts[i];
					if (i === 1 && p === "" && parts[0] === "") continue;
					if (p === "." || p === "") {
						didSomething = true;
						parts.splice(i, 1);
						i--;
					}
				}
				if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
					didSomething = true;
					parts.pop();
				}
			}
			const root = this.#rootIndex(parts) + 1;
			let dd = root;
			while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
				const p = parts[dd - 1];
				if (p && p !== "." && p !== ".." && p !== "**") {
					didSomething = true;
					parts.splice(dd - 1, 2);
					dd = Math.max(dd - 2, root);
				}
			}
		} while (didSomething);
		return parts.length === 0 ? [""] : parts;
	}
	firstPhasePreProcess(globParts) {
		const { braceExpandMax = 1e5 } = this.options;
		let didSomething = false;
		do {
			didSomething = false;
			for (let parts of globParts) {
				let gs = -1;
				while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
					let gss = gs;
					while (parts[gss + 1] === "**") gss++;
					if (gss > gs) parts.splice(gs + 1, gss - gs);
					let next = parts[gs + 1];
					const p = parts[gs + 2];
					const p2 = parts[gs + 3];
					if (next !== "..") continue;
					if (!p || p === "." || p === ".." || !p2 || p2 === "." || p2 === ".." || globParts.length >= braceExpandMax) continue;
					didSomething = true;
					parts.splice(gs, 1);
					const other = parts.slice(0);
					other[gs] = "**";
					globParts.push(other);
					gs--;
				}
				if (!this.preserveMultipleSlashes) {
					for (let i = 1; i < parts.length - 1; i++) {
						const p = parts[i];
						if (i === 1 && p === "" && parts[0] === "") continue;
						if (p === "." || p === "") {
							didSomething = true;
							parts.splice(i, 1);
							i--;
						}
					}
					if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
						didSomething = true;
						parts.pop();
					}
				}
				const root = this.#rootIndex(parts) + 1;
				let dd = root;
				while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
					const p = parts[dd - 1];
					if (p && p !== "." && p !== ".." && p !== "**") {
						didSomething = true;
						const splin = dd === 1 && parts[dd + 1] === "**" ? ["."] : [];
						parts.splice(dd - 1, 2, ...splin);
						if (parts.length === 0) parts.push("");
						dd = Math.max(dd - 2, root);
					}
				}
			}
		} while (didSomething);
		return globParts;
	}
	secondPhasePreProcess(globParts) {
		if (globParts.length > 1e3) return globParts;
		for (let i = 0; i < globParts.length - 1; i++) for (let j = i + 1; j < globParts.length; j++) {
			const matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
			if (matched) {
				globParts[i] = [];
				globParts[j] = matched;
				break;
			}
		}
		return globParts.filter((gs) => gs.length);
	}
	partsMatch(a, b, emptyGSMatch = false) {
		let ai = 0;
		let bi = 0;
		let result = [];
		let which = "";
		while (ai < a.length && bi < b.length) if (a[ai] === b[bi]) {
			result.push(which === "b" ? b[bi] : a[ai]);
			ai++;
			bi++;
		} else if (emptyGSMatch && a[ai] === "**" && b[bi] === a[ai + 1]) {
			result.push(a[ai]);
			ai++;
		} else if (emptyGSMatch && b[bi] === "**" && a[ai] === b[bi + 1]) {
			result.push(b[bi]);
			bi++;
		} else if (a[ai] === "*" && b[bi] && (this.options.dot || !b[bi].startsWith(".")) && b[bi] !== "**") {
			if (which === "b") return false;
			which = "a";
			result.push(a[ai]);
			ai++;
			bi++;
		} else if (b[bi] === "*" && a[ai] && (this.options.dot || !a[ai].startsWith(".")) && a[ai] !== "**") {
			if (which === "a") return false;
			which = "b";
			result.push(b[bi]);
			ai++;
			bi++;
		} else return false;
		return a.length === b.length && result;
	}
	parseNegate() {
		if (this.nonegate) return;
		const pattern = this.pattern;
		let negate = false;
		let negateOffset = 0;
		for (let i = 0; i < pattern.length && pattern.charAt(i) === "!"; i++) {
			negate = !negate;
			negateOffset++;
		}
		if (negateOffset) this.pattern = pattern.slice(negateOffset);
		this.negate = negate;
	}
	#matchRow(file, resolved, pattern, partial) {
		let fileStartIndex = 0;
		let patternStartIndex = 0;
		const fh = this.isWindows ? uncHost(resolved) : -1;
		const ph = fh === -1 ? -1 : uncHost(pattern);
		if (ph !== -1) {
			const host = pattern[ph];
			const share = pattern[ph + 1];
			if (typeof host !== "string" || typeof share !== "string") {
				fileStartIndex = fh;
				patternStartIndex = ph;
			} else if (resolved[fh].toLowerCase() === host.toLowerCase() && resolved[fh + 1].toLowerCase() === share.toLowerCase()) {
				fileStartIndex = fh + 2;
				patternStartIndex = ph + 2;
			}
		} else if (this.isWindows) {
			const fileDrive = typeof file[0] === "string" && /^[a-z]:$/i.test(file[0]);
			const fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]);
			const patternDrive = typeof pattern[0] === "string" && /^[a-z]:$/i.test(pattern[0]);
			const patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] === "string" && /^[a-z]:$/i.test(pattern[3]);
			const fdi = fileUNC ? 3 : fileDrive ? 0 : void 0;
			const pdi = patternUNC ? 3 : patternDrive ? 0 : void 0;
			if (typeof fdi === "number" && typeof pdi === "number") {
				const [fd, pd] = [file[fdi], pattern[pdi]];
				if (fd.toLowerCase() === pd.toLowerCase()) {
					patternStartIndex = pdi + 1;
					fileStartIndex = fdi + 1;
				}
			}
		}
		file = resolved;
		if (pattern.includes(GLOBSTAR)) return this.#matchGlobstar(file, pattern, partial, fileStartIndex, patternStartIndex);
		return this.#matchOne(file, pattern, partial, fileStartIndex, patternStartIndex);
	}
	#matchGlobstar(file, pattern, partial, fileIndex, patternIndex) {
		const { head, body, tail, segments } = this.#getGlobstarParts(pattern, partial, patternIndex);
		if (head.length) {
			const headEnd = fileIndex + head.length;
			if (!this.#matchOne(file, head, partial, fileIndex, 0, headEnd)) return false;
			fileIndex += head.length;
			patternIndex += head.length;
		}
		let fileTailMatch = 0;
		if (tail.length) {
			if (tail.length + fileIndex > file.length) return false;
			let tailStart = file.length - tail.length;
			if (this.#matchOne(file, tail, partial, tailStart, 0)) fileTailMatch = tail.length;
			else {
				if (file[file.length - 1] !== "" || fileIndex + tail.length === file.length) return false;
				tailStart--;
				if (!this.#matchOne(file, tail, partial, tailStart, 0)) return false;
				fileTailMatch = tail.length + 1;
			}
		}
		if (!body.length) {
			let sawSome = !!fileTailMatch;
			for (let i = fileIndex; i < file.length - fileTailMatch; i++) {
				const f = String(file[i]);
				sawSome = true;
				if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) return false;
			}
			return partial || sawSome;
		}
		return !!this.#matchGlobStarBodySections(file, segments, file.length - fileTailMatch, fileIndex, 0, partial, 0, !!fileTailMatch, /* @__PURE__ */ new Set());
	}
	#getGlobstarParts(pattern, partial, patternIndex) {
		let byStart = this.#globstarParts.get(pattern);
		if (!byStart) {
			byStart = [];
			this.#globstarParts.set(pattern, byStart);
		}
		const key = patternIndex * 2 + (partial ? 1 : 0);
		const found = byStart[key];
		if (found) return found;
		const firstgs = pattern.indexOf(GLOBSTAR, patternIndex);
		const lastgs = pattern.lastIndexOf(GLOBSTAR);
		const head = pattern.slice(patternIndex, firstgs);
		const body = pattern.slice(firstgs + 1, partial ? void 0 : lastgs);
		const tail = partial ? [] : pattern.slice(lastgs + 1);
		const segments = [[[], 0]];
		let current = segments[0];
		let nonGsParts = 0;
		const nonGsPartsSums = [0];
		for (const b of body) if (b === GLOBSTAR) {
			nonGsPartsSums.push(nonGsParts);
			current = [[], 0];
			segments.push(current);
		} else {
			current[0].push(b);
			nonGsParts++;
		}
		segments.forEach((b, i) => {
			b[1] = nonGsParts - nonGsPartsSums[i];
		});
		const parts = {
			head,
			body,
			tail,
			segments
		};
		byStart[key] = parts;
		return parts;
	}
	#matchGlobStarBodySections(file, bodySegments, fileLength, fileIndex, bodyIndex, partial, globStarDepth, sawTail, tried) {
		const bs = bodySegments[bodyIndex];
		if (!bs) {
			if (partial) return fileIndex >= fileLength || fileIndex === fileLength - 1 && file[fileIndex] === "";
			for (let i = fileIndex; i < fileLength; i++) {
				sawTail = true;
				const f = file[i];
				if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) return false;
			}
			return sawTail;
		}
		const [body, need] = bs;
		const after = partial ? fileLength : fileLength - need;
		while (fileIndex <= after) {
			const key = bodyIndex * (file.length + 1) + fileIndex;
			if (tried.has(key)) return false;
			tried.add(key);
			if (this.#matchOne(file, body, partial, fileIndex, 0, fileIndex + body.length) && globStarDepth < this.maxGlobstarRecursion) {
				const sub = this.#matchGlobStarBodySections(file, bodySegments, fileLength, fileIndex + body.length, bodyIndex + 1, partial, globStarDepth + 1, sawTail, tried);
				if (sub !== false) return sub;
			}
			if (fileIndex === after) break;
			const f = file[fileIndex];
			if (f === "." || f === ".." || !this.options.dot && f.startsWith(".")) return false;
			fileIndex++;
		}
		return partial || null;
	}
	#matchOne(file, pattern, partial, fileIndex, patternIndex, fileEnd = file.length) {
		let fi;
		let pi;
		let pl;
		let fl;
		for (fi = fileIndex, pi = patternIndex, fl = Math.min(fileEnd, file.length), pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
			let p = pattern[pi];
			let f = file[fi];
			/* c8 ignore start */
			if (p === false || p === GLOBSTAR) return false;
			/* c8 ignore stop */
			if (!portionMatch(p, f)) return false;
		}
		if (fi === fl && pi === pl) return true;
		else if (fi === fl) return partial;
		else if (pi === pl) return fi === fl - 1 && file[fi] === "";
		else throw new Error("wtf?");
		/* c8 ignore stop */
	}
	braceExpand() {
		return braceExpand(this.pattern, this.options);
	}
	parse(pattern) {
		assertValidPattern(pattern);
		const options = this.options;
		if (pattern === "**") return GLOBSTAR;
		if (pattern === "") return "";
		const { nocase, nocaseMagicOnly, noext = false, dot, normalize } = options;
		const lit = literal(pattern, noext);
		if (lit !== void 0 && !(nocase && !nocaseMagicOnly && pattern.toUpperCase() !== pattern.toLowerCase())) return this.#norm(lit);
		if (this.#pending) return PENDING;
		let m = this.#matchers.get(pattern);
		if (!m) {
			m = new Matcher(pattern, {
				nocase,
				noext,
				dot,
				normalize
			});
			this.#matchers.set(pattern, m);
		}
		return m;
	}
	#slashSplit(p) {
		if (this.preserveMultipleSlashes) return p.split("/");
		else if (this.isWindows && /^\/\/[^/]+/.test(p)) return ["", ...p.split(/\/+/)];
		else return p.split(/\/+/);
	}
	match(f, partial = this.partial) {
		if (this.comment) return false;
		if (this.empty) return f === "";
		if (f === "/" && partial) return true;
		const options = this.options;
		let split = this.#cachedSplit(f);
		if (!split) {
			if (!partial && !this.#form && (this.#endCheck || this.#literalCheck) && lastChecked !== f) {
				lastChecked = f;
				const can = this.#canMatch(f);
				if (can === "no") return options.flipNegate ? false : this.negate;
				if (can === "yes") return options.flipNegate ? true : !this.negate;
			}
			split = this.#split(f);
		}
		const ff = split.parts;
		const resolved = this.#level2 ? split.resolved ??= this.#levelTwoFileOptimize(ff) : ff;
		const set = this.set;
		let filename = ff[ff.length - 1];
		if (!filename) for (let i = ff.length - 2; !filename && i >= 0; i--) filename = ff[i];
		for (let r = 0; r < set.length; r++) {
			const pattern = set[r];
			const shape = partial ? void 0 : this.#shapes[r];
			if (shape === "base" ? portionMatch(pattern[0], filename) : shape ? this.#matchShape(resolved, pattern, shape) : options.matchBase && pattern.length === 1 ? this.#matchRow([filename], [filename], pattern, partial) : this.#matchRow(ff, resolved, pattern, partial)) {
				if (options.flipNegate) return true;
				return !this.negate;
			}
		}
		if (options.flipNegate) return false;
		return this.negate;
	}
	static defaults(def) {
		return minimatch.defaults(def).Minimatch;
	}
};
/* c8 ignore stop */
minimatch.Minimatch = Minimatch;
minimatch.escape = escape;
minimatch.unescape = unescape;
// packages/autolabeler/src/path-matcher.ts
var trimTrailingUnescapedSpaces = (pattern) => {
	let end = pattern.length;
	while (end > 0 && pattern[end - 1] === " ") {
		let backslashes = 0;
		for (let index = end - 2; index >= 0 && pattern[index] === "\\"; index--) backslashes++;
		if (backslashes % 2 === 1) break;
		end--;
	}
	return pattern.slice(0, end);
};
var compileRule = (pattern) => {
	let source = trimTrailingUnescapedSpaces(pattern);
	if (!source || source.startsWith("#")) return void 0;
	const negated = source.startsWith("!");
	if (negated) source = source.slice(1);
	const directoryOnly = source.endsWith("/") && !source.endsWith("/**/");
	if (directoryOnly) source = source.slice(0, -1);
	else if (source.endsWith("/**/")) source = source.slice(0, -1);
	const anchored = source.startsWith("/");
	if (anchored) source = source.slice(1);
	if (!source) return void 0;
	return {
		directoryOnly,
		negated,
		matcher: new Minimatch(source, {
			dot: true,
			matchBase: !anchored && !source.includes("/"),
			nobrace: true,
			nocomment: true,
			noext: true,
			nonegate: true,
			platform: "linux"
		})
	};
};
/** Compiles ordered gitignore-style patterns into a path predicate. */
var createPathMatcher = (patterns) => {
	const rules = patterns.flatMap((pattern) => {
		const rule = compileRule(pattern);
		return rule ? [rule] : [];
	});
	return (path) => {
		const segments = path.split("/").filter(Boolean);
		for (const [index] of segments.entries()) {
			const candidate = segments.slice(0, index + 1).join("/");
			const directory = index < segments.length - 1;
			let ignored = false;
			for (const rule of rules) {
				if (rule.directoryOnly && !directory) continue;
				if (rule.matcher.match(candidate)) ignored = !rule.negated;
			}
			if (directory && ignored) return true;
			if (!directory) return ignored;
		}
		return false;
	};
};
// packages/autolabeler/src/match-labels.ts
var test = (matcher, value) => {
	matcher.lastIndex = 0;
	return matcher.test(value);
};
var matchesFiles = (patterns, files) => {
	if (patterns.length === 0) return false;
	const matches = createPathMatcher(patterns);
	return files.some(matches);
};
/** Evaluates rules in configuration order, stopping on request or adding a fallback. */
var matchLabels = (params) => {
	const { config, pullRequest } = params;
	const labels = /* @__PURE__ */ new Set();
	const matches = [];
	for (const rule of config.autolabeler) {
		if (rule.fallback) continue;
		const body = pullRequest.body;
		let matcher;
		if (matchesFiles(rule.files, pullRequest.files)) matcher = "files";
		else if (rule.branch.some((regex) => test(regex, pullRequest.branch))) matcher = "branch";
		else if (rule.title.some((regex) => test(regex, pullRequest.title))) matcher = "title";
		else if (body != null && rule.body.some((regex) => test(regex, body))) matcher = "body";
		if (matcher) {
			for (const label of rule.labels) {
				labels.add(label);
				matches.push({
					label,
					matcher
				});
			}
			if (rule["stop-on-match"]) break;
		}
	}
	const fallback = config.autolabeler.find((rule) => rule.fallback);
	if (labels.size === 0 && fallback) for (const label of fallback.labels) {
		labels.add(label);
		matches.push({
			label,
			matcher: "fallback"
		});
	}
	return {
		labels: [...labels],
		matches
	};
};
// packages/gh-actions/src/autolabeler/action-metadata.ts
var actionInputNames = defineActionInputNames()([
	"token",
	"config-name",
	"dry-run"
]);
var actionOutputNames = ["number", "labels"];
// packages/gh-actions/src/autolabeler/action-input.schema.ts
var actionInputSchema = object({ "config-name": string().optional().default("release-drafter.yml") }).and(sharedInputSchema);
// packages/gh-actions/src/autolabeler/get-action-inputs.ts
var getActionInput = () => actionInputSchema.parse(readActionInputs(actionInputNames));
// packages/gh-actions/src/autolabeler/get-config.ts
var getConfig = async (configName, token) => {
	const { config, contexts } = await composeConfigGet(configName, context, token);
	if (contexts.length > 1) info(`Config was fetched from ${contexts.length} different contexts.`);
	else if (contexts.length === 1) {
		const source = contexts[0];
		info(`Config fetched ${source.scheme === "file" ? "locally" : `on remote "${source.repo.owner}/${source.repo.repo}${source.ref ? `@${source.ref}` : ""}"${source.ref ? "" : " on the default branch"}`}.`);
	}
	return parseConfig({
		config: configSchema.parse(config),
		logger: core_exports
	});
};
// packages/gh-actions/src/autolabeler/runner.ts
/** Run the Autolabeler action using package-owned config and matching logic. */
async function run() {
	try {
		const input = getActionInput();
		const config = await getConfig(input["config-name"], input.token);
		info(`Running for event "${context.eventName || "[undefined]"}.${context.payload.action || "[undefined]"}"`);
		if (context.eventName !== "pull_request" && context.eventName !== "pull_request_target") throw new Error(`Event type is wrong. Expected 'pull_request' or 'pull_request_target', received '${context.eventName}'`);
		const adapter = getGitHubAdapter(input.token);
		const payload = context.payload;
		const files = await adapter.findPullRequestChangedFiles({
			repository: {
				owner: context.repo.owner,
				name: context.repo.repo,
				serverUrl: process$1.env.GITHUB_SERVER_URL ?? "https://github.com"
			},
			number: payload.number
		});
		const result = matchLabels({
			config,
			pullRequest: {
				files,
				branch: payload.pull_request.head.ref,
				title: payload.pull_request.title,
				body: payload.pull_request.body
			}
		});
		for (const match of result.matches) info(`Found label for ${match.matcher}: '${match.label}'`);
		const labelsToRemove = [];
		if (config["sync-labels"]) {
			const currentLabels = await adapter.octokit.paginate(adapter.octokit.rest.issues.listLabelsOnIssue, {
				...context.repo,
				issue_number: payload.number,
				per_page: 100
			});
			const managedLabels = new Set(config.autolabeler.flatMap((rule) => rule.labels.map((label) => label.toLowerCase())));
			const selectedLabels = new Set(result.labels.map((label) => label.toLowerCase()));
			for (const { name } of currentLabels) if (managedLabels.has(name.toLowerCase()) && !selectedLabels.has(name.toLowerCase())) labelsToRemove.push(name);
		}
		if (result.labels.length > 0) {
			if (input["dry-run"]) info(`[dry-run] Would add labels [${result.labels.join(", ")}] to PR #${payload.number}`);
			else await adapter.octokit.rest.issues.addLabels({
				...context.repo,
				issue_number: payload.number,
				labels: result.labels
			});
		}
		for (const name of labelsToRemove) if (input["dry-run"]) info(`[dry-run] Would remove label '${name}' from PR #${payload.number}`);
		else {
			await adapter.octokit.rest.issues.removeLabel({
				...context.repo,
				issue_number: payload.number,
				name
			});
			info(`Removed label '${name}' from PR #${payload.number}`);
		}
		writeActionOutputs(actionOutputNames, {
			number: payload.number.toString(),
			labels: result.labels.length > 0 ? result.labels.join(",") : void 0
		});
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
	}
}
// packages/gh-actions/src/autolabeler/run.ts
/*! release-drafter-action-entry:autolabeler */
/* node:coverage ignore file -- @preserve */
await run();
export {};
