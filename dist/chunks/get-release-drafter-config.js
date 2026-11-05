import { C as stringbool, D as expand, E as Matcher, S as string, T as prettifyError, _ as boolean, b as number, g as array, h as _enum, j as info, m as ZodDefault, n as describeConfigTarget, p as escapeStringRegexp, r as ConfigError, t as composeConfigGet, v as literal$1, w as union, x as object, y as never } from "./config.js";
// node_modules/conventional-commits-parser/dist/regex.js
var nomatchRegex = /(?!.*)/;
function escape$1(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function joinOr(parts) {
	return parts.map((val) => typeof val === "string" ? escape$1(val.trim()) : val.source).filter(Boolean).join("|");
}
function getNotesRegex(noteKeywords, notesPattern) {
	if (!noteKeywords) return nomatchRegex;
	const noteKeywordsSelection = joinOr(noteKeywords);
	if (!notesPattern) return new RegExp(`^(?:\\*\\s+)?(${noteKeywordsSelection}):\\s*(.*)`, "i");
	return notesPattern(noteKeywordsSelection);
}
function getReferencePartsRegex(issuePrefixes, issuePrefixesCaseSensitive) {
	if (!issuePrefixes) return nomatchRegex;
	const flags = issuePrefixesCaseSensitive ? "g" : "gi";
	return new RegExp(`(?:.*?)??\\s*([\\w-\\.\\/]*?)??(${joinOr(issuePrefixes)})([\\w-]+)(?=\\s|$|[,;.)\\]])`, flags);
}
function getReferencesRegex(referenceActions, separator = "") {
	if (!referenceActions) return /()(.+)/gi;
	const joinedKeywords = joinOr(referenceActions);
	const nextKeyword = `(?<!\\w)(?:${joinedKeywords})(?!\\w)`;
	return new RegExp(`(?<!\\w)(${joinedKeywords})${separator}(?:\\s+(.*?))(?=${nextKeyword}|$)`, "gi");
}
function getFooterTokenRegex(issuePrefixes) {
	const issuePrefixSeparator = issuePrefixes ? `|\\s+(?:${joinOr(issuePrefixes)})` : "";
	return new RegExp(`^(?:BREAKING CHANGE|[\\w-]+)(?::\\s+${issuePrefixSeparator}).+`, "i");
}
/**
* Make the regexes used to parse a commit.
* @param options
* @returns Regexes.
*/
function getParserRegexes(options = {}) {
	return {
		notes: getNotesRegex(options.noteKeywords, options.notesPattern),
		referenceParts: getReferencePartsRegex(options.issuePrefixes, options.issuePrefixesCaseSensitive),
		references: getReferencesRegex(options.referenceActions),
		footerReferences: getReferencesRegex(options.referenceActions, ":?"),
		footerToken: getFooterTokenRegex(options.issuePrefixes),
		mentions: /@([\w-]+)/g,
		url: /\b(?:https?):\/\/(?:www\.)?([-a-zA-Z0-9@:%_+.~#?&//=])+\b/
	};
}
// node_modules/conventional-commits-parser/dist/utils.js
var SCISSOR = "------------------------ >8 ------------------------";
/**
* Remove leading and trailing newlines.
* @param input
* @returns String without leading and trailing newlines.
*/
function trimNewLines(input) {
	const matches = input.match(/[^\r\n]/);
	if (typeof matches?.index !== "number") return "";
	const firstIndex = matches.index;
	let lastIndex = input.length - 1;
	while (input[lastIndex] === "\r" || input[lastIndex] === "\n") lastIndex--;
	return input.substring(firstIndex, lastIndex + 1);
}
/**
* Append a newline to a string.
* @param src
* @param line
* @returns String with appended newline.
*/
function appendLine(src, line) {
	return src ? `${src}\n${line || ""}` : line || "";
}
/**
* Creates a function that filters out comments lines.
* @param char
* @returns Comment filter function.
*/
function getCommentFilter(char) {
	return char ? (line) => !line.startsWith(char) : () => true;
}
/**
* Select lines before the scissor.
* @param lines
* @param commentChar
* @returns Lines before the scissor.
*/
function truncateToScissor(lines, commentChar) {
	const scissorIndex = lines.indexOf(`${commentChar} ${SCISSOR}`);
	if (scissorIndex === -1) return lines;
	return lines.slice(0, scissorIndex);
}
/**
* Filter out GPG sign lines.
* @param line
* @returns True if the line is not a GPG sign line.
*/
function gpgFilter(line) {
	return !line.match(/^\s*gpg:/);
}
/**
* Assign matched correspondence to the target object.
* @param target - The target object to assign values to.
* @param matches - The RegExp match array containing the matched groups.
* @param correspondence - An array of keys that correspond to the matched groups.
* @returns The target object with assigned values.
*/
function assignMatchedCorrespondence(target, matches, correspondence) {
	const { groups } = matches;
	for (let i = 0, len = correspondence.length, key; i < len; i++) {
		key = correspondence[i];
		target[key] = (groups ? groups[key] : matches[i + 1]) || null;
	}
	return target;
}
// node_modules/conventional-commits-parser/dist/options.js
var defaultOptions = {
	noteKeywords: ["BREAKING CHANGE", "BREAKING-CHANGE"],
	issuePrefixes: ["#"],
	referenceActions: [
		"close",
		"closes",
		"closed",
		"fix",
		"fixes",
		"fixed",
		"resolve",
		"resolves",
		"resolved"
	],
	headerPattern: /^(\w*)(?:\(([\w$@.\-*/ ]*)\))?: (.*)$/,
	headerCorrespondence: [
		"type",
		"scope",
		"subject"
	],
	revertPattern: /^Revert\s"([\s\S]*)"\s*This reverts commit (\w*)\.?/,
	revertCorrespondence: ["header", "hash"],
	fieldPattern: /^-(?=.*\w)(.*?)-$/
};
// node_modules/conventional-commits-parser/dist/CommitParser.js
/**
* Helper to create commit object.
* @param initialData - Initial commit data.
* @returns Commit object with empty data.
*/
function createCommitObject(initialData = {}) {
	return {
		merge: null,
		revert: null,
		header: null,
		body: null,
		footer: null,
		notes: [],
		mentions: [],
		references: [],
		...initialData
	};
}
/**
* Commit message parser.
*/
var CommitParser = class {
	options;
	regexes;
	lines = [];
	lineIndex = 0;
	commit = createCommitObject();
	constructor(options = {}) {
		this.options = {
			...defaultOptions,
			...options
		};
		this.regexes = getParserRegexes(this.options);
	}
	currentLine() {
		return this.lines[this.lineIndex];
	}
	nextLine() {
		return this.lines[this.lineIndex++];
	}
	isLineAvailable() {
		return this.lineIndex < this.lines.length;
	}
	parseReference(input, action) {
		const { regexes } = this;
		if (regexes.url.test(input)) return null;
		const matches = regexes.referenceParts.exec(input);
		if (!matches) return null;
		let [raw, repository = null, prefix, issue] = matches;
		let owner = null;
		if (repository) {
			const slashIndex = repository.indexOf("/");
			if (slashIndex !== -1) {
				owner = repository.slice(0, slashIndex);
				repository = repository.slice(slashIndex + 1);
			}
		}
		return {
			raw,
			action,
			owner,
			repository,
			prefix,
			issue
		};
	}
	parseReferences(input, isFooterToken = false) {
		const { regexes } = this;
		const referencesRegex = isFooterToken ? regexes.footerReferences : regexes.references;
		const regex = input.match(referencesRegex) ? referencesRegex : /()(.+)/gi;
		const references = [];
		let matches;
		let action;
		let sentence;
		let reference;
		while (true) {
			matches = regex.exec(input);
			if (!matches) break;
			action = matches[1] || null;
			sentence = matches[2] || "";
			while (true) {
				reference = this.parseReference(sentence, action);
				if (!reference) break;
				references.push(reference);
			}
		}
		return references;
	}
	skipEmptyLines() {
		let line = this.currentLine();
		while (line !== void 0 && !line.trim()) {
			this.nextLine();
			line = this.currentLine();
		}
	}
	parseMerge() {
		const { commit, options } = this;
		const correspondence = options.mergeCorrespondence || [];
		const merge = this.currentLine();
		const matches = merge && options.mergePattern ? merge.match(options.mergePattern) : null;
		if (matches) {
			this.nextLine();
			commit.merge = matches[0] || null;
			assignMatchedCorrespondence(commit, matches, correspondence);
			return true;
		}
		return false;
	}
	parseHeader(isMergeCommit) {
		if (isMergeCommit) this.skipEmptyLines();
		const { commit, options } = this;
		const correspondence = options.headerCorrespondence || [];
		const header = commit.header ?? this.nextLine();
		let matches = null;
		if (header) {
			if (options.breakingHeaderPattern) matches = header.match(options.breakingHeaderPattern);
			if (!matches && options.headerPattern) matches = header.match(options.headerPattern);
		}
		if (header) commit.header = header;
		if (matches) assignMatchedCorrespondence(commit, matches, correspondence);
	}
	parseMeta() {
		const { options, commit } = this;
		if (!options.fieldPattern || !this.isLineAvailable()) return false;
		let matches;
		let field = null;
		let parsed = false;
		while (this.isLineAvailable()) {
			matches = this.currentLine().match(options.fieldPattern);
			if (matches) {
				field = matches[1] || null;
				this.nextLine();
				continue;
			}
			if (field) {
				parsed = true;
				commit[field] = appendLine(commit[field], this.currentLine());
				this.nextLine();
			} else break;
		}
		return parsed;
	}
	parseNotes() {
		const { regexes, commit } = this;
		if (!this.isLineAvailable()) return false;
		const matches = this.currentLine().match(regexes.notes);
		let isFooterToken;
		if (matches) {
			const note = {
				title: matches[1],
				text: matches[2]
			};
			commit.notes.push(note);
			commit.footer = appendLine(commit.footer, this.currentLine());
			this.nextLine();
			while (this.isLineAvailable()) {
				if (this.parseMeta()) return true;
				if (this.parseNotes()) return true;
				isFooterToken = regexes.footerToken.test(this.currentLine());
				commit.references.push(...this.parseReferences(this.currentLine(), isFooterToken));
				if (!isFooterToken) note.text = appendLine(note.text, this.currentLine());
				commit.footer = appendLine(commit.footer, this.currentLine());
				this.nextLine();
				if (isFooterToken) break;
			}
			return true;
		}
		return false;
	}
	parseBodyAndFooter(isBody) {
		const { commit, regexes } = this;
		if (!this.isLineAvailable()) return isBody;
		const isFooterToken = regexes.footerToken.test(this.currentLine());
		const isStillBody = !isFooterToken && isBody;
		commit.references.push(...this.parseReferences(this.currentLine(), isFooterToken));
		if (isStillBody) commit.body = appendLine(commit.body, this.currentLine());
		else commit.footer = appendLine(commit.footer, this.currentLine());
		this.nextLine();
		return isStillBody;
	}
	parseBreakingHeader() {
		const { commit, options } = this;
		if (!options.breakingHeaderPattern || commit.notes.length || !commit.header) return;
		const matches = commit.header.match(options.breakingHeaderPattern);
		if (matches) commit.notes.push({
			title: "BREAKING CHANGE",
			text: matches[3]
		});
	}
	parseMentions(input) {
		const { commit, regexes } = this;
		let matches;
		for (;;) {
			matches = regexes.mentions.exec(input);
			if (!matches) break;
			commit.mentions.push(matches[1]);
		}
	}
	parseRevert(input) {
		const { commit, options } = this;
		const correspondence = options.revertCorrespondence || [];
		const matches = options.revertPattern ? input.match(options.revertPattern) : null;
		if (matches) commit.revert = assignMatchedCorrespondence({}, matches, correspondence);
	}
	cleanupCommit() {
		const { commit } = this;
		commit.body &&= trimNewLines(commit.body);
		commit.footer &&= trimNewLines(commit.footer);
		commit.notes.forEach((note) => {
			note.text = trimNewLines(note.text);
		});
		const referencesSet = /* @__PURE__ */ new Set();
		commit.references = commit.references.filter((reference) => {
			const uid = `${reference.action} ${reference.raw}`.toLocaleLowerCase();
			const ok = !referencesSet.has(uid);
			if (ok) referencesSet.add(uid);
			return ok;
		});
	}
	/**
	* Parse commit message string into an object.
	* @param input - Commit message string.
	* @returns Commit object.
	*/
	parse(input) {
		if (!input.trim()) throw new TypeError("Expected a raw commit");
		const { commentChar } = this.options;
		const commentFilter = getCommentFilter(commentChar);
		const rawLines = trimNewLines(input).split(/\r?\n/);
		const lines = commentChar ? truncateToScissor(rawLines, commentChar).filter((line) => commentFilter(line) && gpgFilter(line)) : rawLines.filter((line) => gpgFilter(line));
		const commit = createCommitObject();
		this.lines = lines;
		this.lineIndex = 0;
		this.commit = commit;
		const isMergeCommit = this.parseMerge();
		this.parseHeader(isMergeCommit);
		if (commit.header) commit.references = this.parseReferences(commit.header);
		let isBody = true;
		while (this.isLineAvailable()) {
			this.parseMeta();
			if (this.parseNotes()) isBody = false;
			if (!this.parseBodyAndFooter(isBody)) isBody = false;
		}
		this.parseBreakingHeader();
		this.parseMentions(input);
		this.parseRevert(input);
		this.cleanupCommit();
		return commit;
	}
};
// packages/core/node_modules/minimatch/dist/esm/assert-valid-pattern.js
var MAX_PATTERN_LENGTH = 65536;
var assertValidPattern = (pattern) => {
	if (typeof pattern !== "string") throw new TypeError("invalid pattern");
	if (pattern.length > MAX_PATTERN_LENGTH) throw new TypeError("pattern is too long");
};
// packages/core/node_modules/minimatch/dist/esm/escape.js
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
// packages/core/node_modules/minimatch/dist/esm/unescape.js
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
// packages/core/node_modules/minimatch/dist/esm/index.js
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
// packages/core/src/path-matcher.ts
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
// packages/core/src/category-matching.ts
var conventionalParser = new CommitParser({
	headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
	breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/
});
var priority = {
	patch: 1,
	minor: 2,
	major: 3
};
var unique = (values) => [...new Set(values)];
var getPullRequestLabels = (pullRequest) => (pullRequest.labels ?? []).filter((label) => label.length > 0);
var matchesValues = (actualValues, expectedValues, mode) => {
	const actual = unique(actualValues);
	const expected = unique(expectedValues);
	if (expected.length === 0) return true;
	switch (mode) {
		case "all": return expected.every((value) => actual.includes(value));
		case "only": return actual.length > 0 && actual.every((value) => expected.includes(value));
		case "exactly": return actual.length === expected.length && actual.every((value) => expected.includes(value));
		default: return expected.some((value) => actual.includes(value));
	}
};
var matchesPullRequestPaths = (condition, pullRequest) => {
	if (condition.paths.length === 0) return true;
	const changedFiles = unique(pullRequest.changedFiles ?? []);
	if (changedFiles.length === 0) return false;
	const matchers = unique(condition.paths).map((path) => createPathMatcher([path]));
	const allPatternsMatch = matchers.every((matcher) => changedFiles.some(matcher));
	const onlyPatternsMatch = changedFiles.every((file) => matchers.some((matcher) => matcher(file)));
	switch (condition["paths-mode"]) {
		case "all": return allPatternsMatch;
		case "only": return onlyPatternsMatch;
		case "exactly": return allPatternsMatch && onlyPatternsMatch;
		default: return changedFiles.some((file) => matchers.some((matcher) => matcher(file)));
	}
};
var parseConventionalTitle = (title) => {
	if (!title) return void 0;
	const parsed = conventionalParser.parse(title);
	if (typeof parsed.type !== "string") return void 0;
	return {
		type: parsed.type,
		scope: typeof parsed.scope === "string" ? parsed.scope : void 0,
		breaking: parsed.notes.length > 0
	};
};
var matchesConventionalTitle = (condition, pullRequest) => {
	if (!condition.conventional) return true;
	const parsed = parseConventionalTitle(pullRequest.title);
	if (!parsed) return false;
	const { types, scopes, breaking } = condition.conventional;
	return (types.length === 0 || types.includes(parsed.type)) && (scopes.length === 0 || parsed.scope !== void 0 && scopes.includes(parsed.scope)) && (breaking === void 0 || breaking === parsed.breaking);
};
var matchesCategoryCondition = (condition, pullRequest) => matchesValues(getPullRequestLabels(pullRequest), condition.labels, condition["labels-mode"]) && matchesPullRequestPaths(condition, pullRequest) && matchesConventionalTitle(condition, pullRequest);
var matchesCategory = (category, pullRequest) => category.when.length === 0 || category.when.some((condition) => matchesCategoryCondition(condition, pullRequest));
var selectCategories = (categories, pullRequest) => {
	const matched = [];
	for (const category of categories) {
		if (category.when.length === 0) continue;
		if (!matchesCategory(category, pullRequest)) continue;
		matched.push(category);
		if (category.exclusive) break;
	}
	const fallback = categories.find((category) => category.when.length === 0);
	return {
		categories: matched.length > 0 ? matched : fallback ? [fallback] : [],
		usedFallback: matched.length === 0 && fallback !== void 0
	};
};
/**
* Evaluates every category concern for one change in one deterministic pass.
*/
var evaluateCategories = (pullRequest, categories) => {
	const preIncludes = categories.filter((category) => category.type === "pre-include");
	const preExcludes = categories.filter((category) => category.type === "pre-exclude");
	const includedByPrecondition = preIncludes.length === 0 || preIncludes.some((category) => matchesCategory(category, pullRequest));
	const excluded = includedByPrecondition && preExcludes.some((category) => matchesCategory(category, pullRequest));
	const included = includedByPrecondition && !excluded;
	const changelog = included ? selectCategories(getChangelogCategories(categories), pullRequest) : {
		categories: [],
		usedFallback: false
	};
	const version = included ? selectCategories(getVersionResolverCategories(categories), pullRequest) : {
		categories: [],
		usedFallback: false
	};
	const highest = [...changelog.categories, ...version.categories].map((category) => category["semver-increment"]).filter((increment) => increment in priority).reduce((current, increment) => !current || priority[increment] > priority[current] ? increment : current, void 0);
	const matchedCategories = [
		...preIncludes.filter((category) => matchesCategory(category, pullRequest)),
		...includedByPrecondition ? preExcludes.filter((category) => matchesCategory(category, pullRequest)) : [],
		...changelog.categories,
		...version.categories
	];
	const actualLabels = getPullRequestLabels(pullRequest);
	return {
		included,
		excluded,
		matchedLabels: unique(matchedCategories.flatMap((category) => category.when.filter((condition) => matchesCategoryCondition(condition, pullRequest)).flatMap((condition) => condition.labels.filter((label) => actualLabels.includes(label))))).sort(),
		changelogCategories: changelog.categories,
		versionResolverCategories: version.categories,
		usedChangelogFallback: changelog.usedFallback,
		usedVersionFallback: version.usedFallback,
		fallbackOnly: included && (changelog.categories.length > 0 || version.categories.length > 0) && changelog.categories.every((category) => category.when.length === 0) && version.categories.every((category) => category.when.length === 0),
		versionIncrement: highest
	};
};
var filterPullRequestsByPreCategories = (pullRequests, categories) => pullRequests.filter((pullRequest) => evaluateCategories(pullRequest, categories).included);
var needsPullRequestChangedFiles = (categories) => categories.some((category) => category.when.some((condition) => condition.paths.length > 0));
var getChangelogCategories = (categories) => categories.filter((category) => category.type === "changelog");
var getVersionResolverCategories = (categories) => categories.filter((category) => category.type === "version-resolver");
// packages/core/src/config/common-config.schema.ts
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
	/**
	* A boolean indicating whether the release being created or updated should be marked as latest.
	*/
	latest: stringbool().or(boolean()).optional(),
	/**
	* Whether to draft a prerelease, with changes since another prerelease (if applicable). Default `false`.
	*/
	prerelease: stringbool().or(boolean()).optional(),
	/**
	* A string indicating an identifier (alpha, beta, rc, etc), to increment the prerelease version. This automatically enables `prerelease` when both values come from the same config location; explicit action inputs still take precedence. Default `''`.
	*/
	"prerelease-identifier": string().optional(),
	/**
	* When looking for the last published release to scan changes up-to, include pre-releases. Has no effect if using `prerelease: true` (already enabled). Default `false`.
	*/
	"include-pre-releases": stringbool().or(boolean()).optional(),
	/**
	* The release target, i.e. branch, commit SHA, or fully qualified tag or pull request ref it should point to. Tag and pull request refs are resolved to commit SHAs. Defaults to the branch that release-drafter runs for, e.g. `main` when configured to run on pushes to `main`.
	*/
	commitish: string().optional(),
	/**
	* A string that would be added before the template body.
	*/
	header: string().optional(),
	/**
	* A string that would be added after the template body.
	*/
	footer: string().optional(),
	/**
	* Filter releases whose tag names satisfy this SemVer range.
	*/
	"filter-by-range": string().optional()
});
// packages/core/src/config/config.schema.ts
/**
* A single set of predicates that are combined with AND logic.
* All specified predicates must be satisfied for a change to match.
*/
var changeConditionSchema = object({
	/**
	* Conventional commit predicate: matches a change whose title or message
	* follows the conventional commit shape, e.g. `feat(api)!: add endpoint`.
	*/
	conventional: union([literal$1(true), object({
		/** Shorthand for one `types` entry. */
		type: string().min(1).optional(),
		/** Conventional commit types to match, e.g. `feat` or `fix`. */
		types: array(string().min(1)).optional().default([]),
		/** Shorthand for one `scopes` entry. */
		scope: string().min(1).optional(),
		/** Conventional commit scopes to match, e.g. `api` or `ui`. */
		scopes: array(string().min(1)).optional().default([]),
		/** Match titles with (`true`) or without (`false`) a breaking `!`. */
		breaking: boolean().optional()
	})]).optional(),
	/**
	* Label predicate: matches a change that carries this label.
	*
	* Shorthand for adding a single value to `labels`.
	* If `label` and `labels` are both specified, they are combined.
	*
	* Use `labels-mode` to configure how this label is compared to change labels.
	*/
	label: string().min(1).optional(),
	/**
	* Labels predicate: matches a change that carries these labels.
	*
	* `labels-mode` defaults to `any`, so the condition matches when the change
	* shares at least one configured label unless another mode is set.
	*
	* Use `labels-mode` to configure how these labels are compared to change labels.
	*/
	labels: array(string().min(1)).optional().default([]),
	/**
	* Matching mode for the `labels` predicate.
	*
	* Has no effect unless `label` or `labels` is configured in the same condition.
	*
	* The comparison is set-based (label order is ignored).
	*
	* - `any`: Change and configured labels overlap (current behavior).
	* - `all`: Change contains every configured label. Change can have more labels.
	* - `only`: Every change label is included in configured labels. Configured labels can specify more.
	* - `exactly`: Change labels and configured labels are the same set.
	*/
	"labels-mode": _enum([
		"any",
		"all",
		"only",
		"exactly"
	]).optional().default("any"),
	/**
	* Path predicate: matches a change that touched this path pattern. Supports glob patterns.
	*
	* Same as specifying a single `paths` value.
	* If `path` and `paths` are both specified, they are combined.
	*
	* Use `paths-mode` to configure how this path is matched against the pull
	* request's changed files.
	*/
	path: string().min(1).optional(),
	/**
	* Paths predicate: matches a change that touched any of these path patterns.
	* Values support glob patterns.
	*
	* If `path` and `paths` are both specified, they are combined before
	* `paths-mode` is applied.
	*
	* Use `paths-mode` to configure how these path patterns are compared to the
	* pull request's changed files.
	*/
	paths: array(string().min(1)).optional().default([]),
	/**
	* Matching mode for the `paths` predicate.
	*
	* Has no effect unless `path` or `paths` is configured in the same condition.
	*
	* The comparison is set-based (path order is ignored).
	*
	* - `any`: At least one changed file matched a configured path pattern.
	* - `all`: Every configured path pattern matched at least one changed file.
	* - `only`: Every changed file matched a configured path pattern.
	* - `exactly`: Every changed file matched a configured path pattern and every
	*   configured path pattern matched at least one changed file.
	*/
	"paths-mode": _enum([
		"any",
		"all",
		"only",
		"exactly"
	]).optional().default("any")
});
var changeConditionSchemaDefaults = changeConditionSchema.parse({});
var categorySchema = object({
	/**
	* Expanded in $TITLE in the category-template.
	*
	* Required when `type` is `changelog` (default).
	* This is enforced during merged-config validation rather than by this schema alone.
	*
	* May be omitted for non-changelog categories because
	* they are not rendered in the changelog output.
	*/
	title: string().min(1).optional(),
	/**
	* The type of the category.
	*
	* - `changelog`: Included in the generated changelog.
	* - `pre-include`: Keep only matching changes for later changelog categorization.
	* - `pre-exclude`: Exclude matching changes for later changelog categorization. Is run against changes that were included in category type `pre-include` if specified.
	* - `version-resolver`: Used solely to determine `$RESOLVED_VERSION` from the changes this category matches, without rendering a changelog section. Use `type: 'changelog'` (default) and `categories[*].semver-increment` instead if you mean this category to also be included in the changelog.
	*
	* `pre-include` always runs before `pre-exclude` in the pipeline.
	* Omitted values default to `changelog`.
	*
	* @default "changelog"
	*/
	type: _enum([
		"changelog",
		"pre-include",
		"pre-exclude",
		"version-resolver"
	]).optional().default("changelog"),
	/**
	* Whether changes included in this category should be excluded from other categories.
	*
	* Default behavior allows changes to appear in multiple categories if they match multiple category criteria.
	*
	* Only applicable to categories of `type: changelog` or `type: version-resolver`.
	* This only controls inclusion for a single category type at a time, so a change can still match
	* one exclusive changelog category and one exclusive version-resolver category.
	*
	* @default false
	*/
	exclusive: boolean().optional().default(false),
	/**
	* Collapses the category's change list into a `<details>`/`<summary>` block
	* when the number of changes is greater than this value.
	*
	* Only applicable to categories of `type: changelog`.
	*
	* Set to `0` to always collapse. Set to `-1` to disable collapsing.
	*
	* @default -1
	*/
	"collapse-after": number().int().min(-1).optional().default(-1),
	/**
	* Which version increment this category contributes to `$RESOLVED_VERSION`.
	*
	* For `type: changelog` categories, this applies to changes that end up assigned
	* to the category after changelog matching and `exclusive` handling.
	* For `type: version-resolver` categories, this applies to changes the category
	* matches directly, with a category that omits `when` acting as the fallback
	* when no other `type: version-resolver` category matches.
	*
	* If multiple categories contribute, the most severe increment wins.
	* For example, if one contributing category has `semver-increment: 'minor'`
	* and another has `semver-increment: 'patch'`, the resulting increment will
	* be `minor`.
	*
	* Applicable to categories of `type: changelog` and `type: version-resolver`.
	* Ignored for `type: pre-include` and `type: pre-exclude`.
	*
	* @default "patch"
	*/
	"semver-increment": _enum([
		"major",
		"minor",
		"patch"
	]).optional().default("patch"),
	/**
	* Compatibility shorthand for adding label matching to this category.
	*
	* Equivalent to adding the same `labels` predicate to every `when` condition.
	*
	* @deprecated Use `when.labels` instead.
	*/
	labels: array(string().min(1)).optional().default([]),
	/**
	* Compatibility shorthand for adding a single label match to this category.
	*
	* Equivalent to adding the same `label` predicate to every `when` condition.
	*
	* @deprecated Use `when.label` instead.
	*/
	label: string().min(1).optional(),
	/**
	* Conditions that determine whether a change belongs to this category.
	*
	* Can be specified as:
	* - A **single condition** (object): the change must satisfy all predicates in that condition.
	* - An **array of conditions**: the change must satisfy all predicates of **at least one**
	*   condition (OR logic across conditions, AND logic within each condition).
	*
	* An empty array (default) matches all changes.
	*
	* @example
	* # Shorthand: single condition (must have label "bug" AND touch "src/")
	* when:
	*   labels: [bug]
	*   paths: [src/**]
	*
	* @example
	* # Array: (label "bug" AND path "src/") OR (label "enhancement")
	* when:
	*   - labels: [bug]
	*     paths: [src/**]
	*   - labels: [enhancement]
	*/
	when: changeConditionSchema.or(array(changeConditionSchema)).optional().default([])
});
var categorySchemaDefaults = categorySchema.parse({});
var groupChangeSchema = object({
	/**
	* A regular expression literal, such as `/^Bump (?<group>.+) from (?<from>\S+) to (?<to>\S+)$/`, matched against the pull request title. A `group` capture group is required and holds the value changes are grouped by. Every further `group_<name>` capture group extends the value, so that changes are merged only when all of them match.
	*/
	pattern: string().min(1),
	/**
	* The template to use for `$TITLE` of a merged entry. Expands `$GROUP`, every `$GROUP_<NAME>` and, for every other capture group, `$FIRST_<NAME>` and `$LAST_<NAME>`.
	*/
	"title-template": string().min(1)
});
var exclusiveConfigSchema = object({
	/**
	* The template to use for each merged change.
	*/
	"change-template": string().optional().default("* $TITLE (#$NUMBER) $AUTHORS"),
	/**
	* The template to use for each author in `$AUTHORS`.
	*/
	"change-author-template": string().optional().default("$AUTHOR_MENTION"),
	/**
	* Exclude bot co-authors from `$AUTHORS`. Pull request authors are always retained.
	*/
	"change-authors-exclude-bots": boolean().optional().default(false),
	/**
	* The separator to use between authors in `$AUTHORS`.
	*/
	"change-authors-separator": string().optional().default(", "),
	/**
	* An optional separator to use before the final author in `$AUTHORS`.
	*/
	"change-authors-final-separator": string().optional(),
	/**
	* Characters to escape in `$TITLE` when inserting into `change-template` so that they are not interpreted as Markdown format characters.
	*/
	"change-title-escapes": string().optional(),
	/**
	* Characters to escape in `$BODY` when inserting into `change-template`. Uses title escaping rules with multiline backtick matches.
	*/
	"change-body-escapes": string().optional(),
	/**
	* The template to use for when there’s no changes.
	*/
	"no-changes-template": string().optional().default("* No changes"),
	/**
	* The template to use when calculating the next version number for the release. Useful for projects that don't use semantic versioning.
	*/
	"version-template": string().optional().default("$MAJOR.$MINOR.$PATCH$PRERELEASE"),
	/**
	* The template for the name of the draft release.
	*/
	"name-template": string().optional(),
	/**
	* A known prefix used to filter release tags. For matching tags, this prefix is stripped before attempting to parse the version.
	*/
	"tag-prefix": string().optional(),
	/**
	* The template for the tag of the draft release.
	*/
	"tag-template": string().optional(),
	/**
	* Exclude changes using labels.
	*
	* @deprecated Use a `type: pre-exclude` category with `when.labels` instead.
	*/
	"exclude-labels": array(string()).optional().default([]),
	/**
	* Include only the specified changes using labels.
	*
	* @deprecated Use a `type: pre-include` category with `when.labels` instead.
	*/
	"include-labels": array(string()).optional().default([]),
	/**
	* Restrict changes included in the release notes to only the changes that modified any of the paths in this array.
	* Supports files and directories.
	*
	* @deprecated Use a `type: pre-include` category with `when.paths` instead.
	*/
	"include-paths": array(string()).optional().default([]),
	/**
	* Exclude changes from the release notes if they modified any of the paths in this array.
	* Supports files and directories. If used with `include-paths`, the exclusion takes precedence.
	*
	* @deprecated Use a `type: pre-exclude` category with `when.paths` instead.
	*/
	"exclude-paths": array(string()).optional().default([]),
	/**
	* Exclude specific usernames from the generated `$CONTRIBUTORS` variable.
	*/
	"exclude-contributors": array(string()).optional().default([]),
	/**
	* The template to use for each new contributor in `$NEW_CONTRIBUTORS`.
	*/
	"new-contributor-template": string().optional().default("* $AUTHOR_MENTION made their first contribution in #$NUMBER"),
	/**
	* The template to use for `$NEW_CONTRIBUTORS` when there are no new contributors to list.
	*/
	"no-new-contributor-template": string().optional().default("* No new contributors"),
	/**
	* The template to use for `$CONTRIBUTORS` when there's no contributors to list.
	*/
	"no-contributors-template": string().optional().default("No contributors"),
	/**
	* Sort changelog by merged_at or title.
	*/
	"sort-by": _enum(["merged_at", "title"]).optional().default("merged_at"),
	/**
	* Sort changelog in ascending or descending order.
	*/
	"sort-direction": _enum(["ascending", "descending"]).optional().default("descending"),
	/**
	* Filter previous releases to consider only those with the target matching `commitish`.
	*/
	"filter-by-commitish": boolean().optional().default(false),
	"pull-request-limit": number().int().positive().optional().default(5),
	/**
	* Size of the pagination window when walking the repo. Can avoid erratic 502s from Github. Default: `15`
	*/
	"history-limit": number().int().positive().optional().default(15),
	/**
	* Search and replace content in the generated changelog body.
	*/
	replacers: array(union([object({
		search: string().min(1),
		replace: string().min(0),
		section: never().optional(),
		/**
		* Where to apply the replacer. Defaults to `global`, the generated release body. Change title/body targets run before escaping.
		*/
		target: _enum([
			"global",
			"change-body",
			"change-title"
		]).optional(),
		/**
		* When search does not match, retain the current input (`full`, the default) or replace it with an empty string.
		*/
		"not-found": _enum(["empty", "full"]).optional()
	}), object({
		/** Select the section under an ATX heading, such as `## Release information`. */
		section: string().regex(/^#{1,6}[ \t]+(?=[^\r\n]*[^# \t\r\n])\S[^\r\n]*$/, "Use a nonempty ATX heading, such as ## Release information"),
		target: literal$1("change-body"),
		search: never().optional(),
		replace: never().optional(),
		"not-found": _enum(["empty", "full"]).optional()
	})])).optional().default([]),
	/**
	* Group changes whose titles share the same `group` into a single changelog entry.
	*/
	"group-changes": array(groupChangeSchema).optional().default([]),
	/**
	* Categorize changes
	*/
	categories: array(categorySchema).optional().default([]),
	/**
	* Adjust the `$RESOLVED_VERSION` variable using labels.
	*
	* @deprecated Use a category with a `semver-increment` instead. Use category[ies] with `type: version-resolver` to separate version resolution from changelog inclusion concerns.
	*/
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
	/**
	* The template to use for each category.
	*/
	"category-template": string().optional().default("## $TITLE"),
	/**
	* The template for the body of the draft release.
	* Optional as it may be inherited via `_extends`.
	*/
	template: string().optional().default("")
}).meta({
	title: "JSON schema for Release Drafter yaml files",
	id: "https://github.com/release-drafter/release-drafter/blob/main/drafter/schema.json"
});
var configSchema = exclusiveConfigSchema.and(commonConfigSchema);
var configSchemaDefaults = Object.fromEntries(Object.entries({
	...exclusiveConfigSchema.shape,
	...commonConfigSchema.shape
}).map(([key, value]) => {
	if (value instanceof ZodDefault) return [key, value.def.defaultValue];
	return [key, void 0];
}));
// node_modules/verkit/dist/comparison-CmVirWIW.js
var LETTER_DASH_NUMBER = "[a-zA-Z0-9-]";
var NUMERIC_IDENTIFIER = String.raw`0|[1-9]\d*`;
var NUMERIC_IDENTIFIER_LOOSE = String.raw`\d+`;
var NON_NUMERIC_IDENTIFIER = String.raw`\d*[a-zA-Z-]${LETTER_DASH_NUMBER}*`;
var MAIN_VERSION = String.raw`(${NUMERIC_IDENTIFIER})\.(${NUMERIC_IDENTIFIER})\.(${NUMERIC_IDENTIFIER})`;
var MAIN_VERSION_LOOSE = String.raw`(${NUMERIC_IDENTIFIER_LOOSE})\.(${NUMERIC_IDENTIFIER_LOOSE})\.(${NUMERIC_IDENTIFIER_LOOSE})`;
var PRERELEASE_IDENTIFIER = `(?:${NON_NUMERIC_IDENTIFIER}|${NUMERIC_IDENTIFIER})`;
var PRERELEASE_IDENTIFIER_LOOSE = `(?:${NON_NUMERIC_IDENTIFIER}|${NUMERIC_IDENTIFIER_LOOSE})`;
var PRERELEASE = String.raw`(?:-(${PRERELEASE_IDENTIFIER}(?:\.${PRERELEASE_IDENTIFIER})*))`;
var PRERELEASE_LOOSE = String.raw`(?:-?(${PRERELEASE_IDENTIFIER_LOOSE}(?:\.${PRERELEASE_IDENTIFIER_LOOSE})*))`;
var BUILD_IDENTIFIER = `${LETTER_DASH_NUMBER}+`;
var BUILD = String.raw`(?:\+(${BUILD_IDENTIFIER}(?:\.${BUILD_IDENTIFIER})*))`;
var FULL_PLAIN = `v?${MAIN_VERSION}${PRERELEASE}?${BUILD}?`;
var LOOSE_PLAIN = String.raw`[v=\s]*${MAIN_VERSION_LOOSE}${PRERELEASE_LOOSE}?${BUILD}?`;
var GREATER_LESS_THAN = "((?:<|>)?=?)";
var XRANGE_IDENTIFIER = String.raw`${NUMERIC_IDENTIFIER}|x|X|\*`;
var XRANGE_IDENTIFIER_LOOSE = String.raw`${NUMERIC_IDENTIFIER_LOOSE}|x|X|\*`;
var XRANGE_PLAIN = String.raw`[v=\s]*(${XRANGE_IDENTIFIER})(?:\.(${XRANGE_IDENTIFIER})(?:\.(${XRANGE_IDENTIFIER})(?:${PRERELEASE})?${BUILD}?)?)?`;
var XRANGE_PLAIN_LOOSE = String.raw`[v=\s]*(${XRANGE_IDENTIFIER_LOOSE})(?:\.(${XRANGE_IDENTIFIER_LOOSE})(?:\.(${XRANGE_IDENTIFIER_LOOSE})(?:${PRERELEASE_LOOSE})?${BUILD}?)?)?`;
var LONE_TILDE = "(?:~>?)";
var LONE_CARET = String.raw`(?:\^)`;
var COERCE_PLAIN = String.raw`(^|[^\d])(\d{1,${16}})(?:\.(\d{1,${16}}))?(?:\.(\d{1,${16}}))?`;
var COERCE = String.raw`${COERCE_PLAIN}(?:$|[^\d])`;
var COERCE_FULL = String.raw`${COERCE_PLAIN}(?:${PRERELEASE})?(?:${BUILD})?(?:$|[^\d])`;
function makeSafeRegexSource(source) {
	const replacements = [
		[String.raw`\s`, 1],
		[String.raw`\d`, 256],
		[LETTER_DASH_NUMBER, 250]
	];
	for (const [token, maximum] of replacements) source = source.split(`${token}*`).join(`${token}{0,${maximum}}`).split(`${token}+`).join(`${token}{1,${maximum}}`);
	return source;
}
function safeRegex(source, flags) {
	return new RegExp(makeSafeRegexSource(source), flags);
}
var FULL = safeRegex(`^${FULL_PLAIN}$`);
var LOOSE = safeRegex(`^${LOOSE_PLAIN}$`);
var NUMERIC$1 = /^\d+$/;
function formatComparableVersion(version) {
	const base = `${version.major}.${version.minor}.${version.patch}`;
	return version.prerelease?.length ? `${base}-${version.prerelease.join(".")}` : base;
}
function formatFullVersion(version) {
	const comparable = formatComparableVersion(version);
	return version.build?.length ? `${comparable}+${version.build.join(".")}` : comparable;
}
function parse(version, options = {}) {
	if (typeof version !== "string") return version;
	if (version.length > 256) throw new TypeError(`Version exceeds the maximum length of 256 characters`);
	const match = version.trim().match(options.loose ? LOOSE : FULL);
	if (!match) throw new TypeError(`Invalid version syntax: ${version}`);
	const major = Number(match[1]);
	const minor = Number(match[2]);
	const patch = Number(match[3]);
	if (major > Number.MAX_SAFE_INTEGER || major < 0) throw new TypeError(`Invalid major version: ${match[1]}`);
	if (minor > Number.MAX_SAFE_INTEGER || minor < 0) throw new TypeError(`Invalid minor version: ${match[2]}`);
	if (patch > Number.MAX_SAFE_INTEGER || patch < 0) throw new TypeError(`Invalid patch version: ${match[3]}`);
	const prerelease = match[4] ? match[4].split(".").map((identifier) => {
		if (NUMERIC$1.test(identifier)) {
			const numeric = Number(identifier);
			if (numeric >= 0 && numeric < Number.MAX_SAFE_INTEGER) return numeric;
		}
		return identifier;
	}) : void 0;
	return {
		build: match[5]?.split("."),
		major,
		minor,
		patch,
		prerelease
	};
}
function tryParse(version, options = {}) {
	try {
		return parse(version, options);
	} catch {
		return null;
	}
}
var NUMERIC = /^\d+$/;
function compareIdentifiers(left, right) {
	if (typeof left === "number" && typeof right === "number") return left === right ? 0 : left < right ? -1 : 1;
	const leftNumeric = NUMERIC.test(String(left));
	const rightNumeric = NUMERIC.test(String(right));
	const normalizedLeft = leftNumeric ? Number(left) : left;
	const normalizedRight = rightNumeric ? Number(right) : right;
	return normalizedLeft === normalizedRight ? 0 : leftNumeric && !rightNumeric ? -1 : rightNumeric && !leftNumeric ? 1 : normalizedLeft < normalizedRight ? -1 : 1;
}
function compareMainParsed(left, right) {
	return left.major === right.major ? left.minor === right.minor ? left.patch === right.patch ? 0 : left.patch < right.patch ? -1 : 1 : left.minor < right.minor ? -1 : 1 : left.major < right.major ? -1 : 1;
}
function comparePrereleaseParsed(left, right) {
	const leftPrerelease = left.prerelease;
	const rightPrerelease = right.prerelease;
	if (leftPrerelease?.length && !rightPrerelease?.length) return -1;
	if (!leftPrerelease?.length && rightPrerelease?.length) return 1;
	if (!leftPrerelease?.length && !rightPrerelease?.length) return 0;
	for (let index = 0;; index++) {
		const leftIdentifier = leftPrerelease?.[index];
		const rightIdentifier = rightPrerelease?.[index];
		if (leftIdentifier === void 0 && rightIdentifier === void 0) return 0;
		if (rightIdentifier === void 0) return 1;
		if (leftIdentifier === void 0) return -1;
		if (leftIdentifier !== rightIdentifier) return compareIdentifiers(leftIdentifier, rightIdentifier);
	}
}
function compareParsed(left, right) {
	return compareMainParsed(left, right) || comparePrereleaseParsed(left, right);
}
// node_modules/verkit/dist/set-BGFWKKE8.js
var STRICT_COMPARATOR = safeRegex(String.raw`^${GREATER_LESS_THAN}\s*(${FULL_PLAIN})$|^$`);
var LOOSE_COMPARATOR$1 = safeRegex(String.raw`^${GREATER_LESS_THAN}\s*(${LOOSE_PLAIN})$|^$`);
function formatComparator(comparator) {
	return comparator.version ? `${comparator.operator}${formatComparableVersion(comparator.version)}` : "";
}
function parseComparator(comparator, options = {}) {
	if (typeof comparator !== "string") return comparator;
	const normalized = comparator.trim().replaceAll(/\s+/g, " ");
	const match = normalized.match(options.loose ? LOOSE_COMPARATOR$1 : STRICT_COMPARATOR);
	if (!match) throw new TypeError(`Invalid comparator: ${normalized}`);
	const operator = match[1] === "=" ? "" : match[1] || "";
	const version = match[2] ? parse(match[2], options) : null;
	return {
		operator,
		options,
		value: version ? `${operator}${formatComparableVersion(version)}` : "",
		version
	};
}
function testParsedComparator(comparator, version) {
	if (!comparator.version) return true;
	const comparison = compareParsed(version, comparator.version);
	switch (comparator.operator) {
		case "": return comparison === 0;
		case ">": return comparison > 0;
		case ">=": return comparison >= 0;
		case "<": return comparison < 0;
		case "<=": return comparison <= 0;
	}
}
function comparatorAllowsPrerelease(comparator, version) {
	const allowed = comparator.version;
	return allowed !== null && !!allowed.prerelease?.length && allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch;
}
function testComparatorSet(set, version, options) {
	if (set.some((comparator) => !testParsedComparator(comparator, version))) return false;
	return !version.prerelease?.length || !!options.includePrerelease || set.some((comparator) => comparatorAllowsPrerelease(comparator, version));
}
// node_modules/verkit/dist/range-C5wjdo9a.js
function formatRange(range) {
	return range.sets.map((set) => set.map(formatComparator).join(" ")).join("||");
}
var BUILD_STRIP = new RegExp(BUILD, "g");
var BUILD_SAFE = safeRegex(BUILD);
var STRICT_HYPHEN = safeRegex(String.raw`^\s*(${XRANGE_PLAIN})\s+-\s+(${XRANGE_PLAIN})\s*$`);
var LOOSE_HYPHEN = safeRegex(String.raw`^\s*(${XRANGE_PLAIN_LOOSE})\s+-\s+(${XRANGE_PLAIN_LOOSE})\s*$`);
var COMPARATOR_TRIM = safeRegex(String.raw`(\s*)${GREATER_LESS_THAN}\s*(${LOOSE_PLAIN}|${XRANGE_PLAIN})`, "g");
var TILDE_TRIM = safeRegex(String.raw`(\s*)${LONE_TILDE}\s+`, "g");
var CARET_TRIM = safeRegex(String.raw`(\s*)${LONE_CARET}\s+`, "g");
var STRICT_TILDE = safeRegex(`^${LONE_TILDE}${XRANGE_PLAIN}$`);
var LOOSE_TILDE = safeRegex(`^${LONE_TILDE}${XRANGE_PLAIN_LOOSE}$`);
var STRICT_CARET = safeRegex(`^${LONE_CARET}${XRANGE_PLAIN}$`);
var LOOSE_CARET = safeRegex(`^${LONE_CARET}${XRANGE_PLAIN_LOOSE}$`);
var STRICT_XRANGE = safeRegex(String.raw`^${GREATER_LESS_THAN}\s*${XRANGE_PLAIN}$`);
var LOOSE_XRANGE = safeRegex(String.raw`^${GREATER_LESS_THAN}\s*${XRANGE_PLAIN_LOOSE}$`);
var STAR = safeRegex(String.raw`(<|>)?=?\s*\*`);
var GTE_ZERO = /^\s*>=\s*0\.0\.0\s*$/;
var GTE_ZERO_PRERELEASE = /^\s*>=\s*0\.0\.0-0\s*$/;
var LOOSE_COMPARATOR = safeRegex(String.raw`^${GREATER_LESS_THAN}\s*(${LOOSE_PLAIN})$|^$`);
function isWildcard(value) {
	return !value || String(value).toLowerCase() === "x" || String(value) === "*";
}
function hasInvalidWildcardOrder(major, minor, patch) {
	return isWildcard(major) && !isWildcard(minor) || isWildcard(minor) && Boolean(patch) && !isWildcard(patch);
}
function replaceTilde(comparator, options) {
	const expression = options.loose ? LOOSE_TILDE : STRICT_TILDE;
	const lowerPrerelease = options.includePrerelease ? "-0" : "";
	return comparator.replace(expression, (_match, major, minor, patch, prerelease) => {
		if (isWildcard(major)) return "";
		if (isWildcard(minor)) return `>=${major}.0.0${lowerPrerelease} <${Number(major) + 1}.0.0-0`;
		if (isWildcard(patch)) return `>=${major}.${minor}.0${lowerPrerelease} <${major}.${Number(minor) + 1}.0-0`;
		return prerelease ? `>=${major}.${minor}.${patch}-${prerelease} <${major}.${Number(minor) + 1}.0-0` : `>=${major}.${minor}.${patch} <${major}.${Number(minor) + 1}.0-0`;
	});
}
function replaceTildes(comparator, options) {
	return comparator.trim().split(/\s+/).map((part) => replaceTilde(part, options)).join(" ");
}
function replaceCaret(comparator, options) {
	const expression = options.loose ? LOOSE_CARET : STRICT_CARET;
	const lowerPrerelease = options.includePrerelease ? "-0" : "";
	return comparator.replace(expression, (_match, major, minor, patch, prerelease) => {
		if (isWildcard(major)) return "";
		if (isWildcard(minor)) return `>=${major}.0.0${lowerPrerelease} <${Number(major) + 1}.0.0-0`;
		if (isWildcard(patch)) return major === "0" ? `>=${major}.${minor}.0${lowerPrerelease} <${major}.${Number(minor) + 1}.0-0` : `>=${major}.${minor}.0${lowerPrerelease} <${Number(major) + 1}.0.0-0`;
		if (prerelease) return major === "0" ? minor === "0" ? `>=${major}.${minor}.${patch}-${prerelease} <${major}.${minor}.${Number(patch) + 1}-0` : `>=${major}.${minor}.${patch}-${prerelease} <${major}.${Number(minor) + 1}.0-0` : `>=${major}.${minor}.${patch}-${prerelease} <${Number(major) + 1}.0.0-0`;
		return major === "0" ? minor === "0" ? `>=${major}.${minor}.${patch} <${major}.${minor}.${Number(patch) + 1}-0` : `>=${major}.${minor}.${patch} <${major}.${Number(minor) + 1}.0-0` : `>=${major}.${minor}.${patch} <${Number(major) + 1}.0.0-0`;
	});
}
function replaceCarets(comparator, options) {
	return comparator.trim().split(/\s+/).map((part) => replaceCaret(part, options)).join(" ");
}
function replaceXRange(comparator, options) {
	const expression = options.loose ? LOOSE_XRANGE : STRICT_XRANGE;
	return comparator.trim().replace(expression, (match, rawOperator, rawMajor, rawMinor, rawPatch) => {
		let operator = rawOperator;
		let major = rawMajor;
		let minor = rawMinor;
		let patch = rawPatch;
		if (hasInvalidWildcardOrder(String(major), minor === void 0 ? void 0 : String(minor), patch === void 0 ? void 0 : String(patch))) return comparator;
		const wildcardMajor = isWildcard(major);
		const wildcardMinor = wildcardMajor || isWildcard(minor);
		const wildcardPatch = wildcardMinor || isWildcard(patch);
		if (operator === "=" && wildcardPatch) operator = "";
		if (wildcardMajor) return operator === ">" || operator === "<" ? "<0.0.0-0" : "*";
		let prerelease = options.includePrerelease ? "-0" : "";
		if (operator && wildcardPatch) {
			if (wildcardMinor) minor = 0;
			patch = 0;
			if (operator === ">") {
				operator = ">=";
				if (wildcardMinor) {
					major = Number(major) + 1;
					minor = 0;
				} else minor = Number(minor) + 1;
			} else if (operator === "<=") {
				operator = "<";
				if (wildcardMinor) major = Number(major) + 1;
				else minor = Number(minor) + 1;
			}
			if (operator === "<") prerelease = "-0";
			return `${operator}${major}.${minor}.${patch}${prerelease}`;
		}
		if (wildcardMinor) return `>=${major}.0.0${prerelease} <${Number(major) + 1}.0.0-0`;
		if (wildcardPatch) return `>=${major}.${minor}.0${prerelease} <${major}.${Number(minor) + 1}.0-0`;
		return match;
	});
}
function replaceXRanges(comparator, options) {
	return comparator.split(/\s+/).map((part) => replaceXRange(part, options)).join(" ");
}
function replaceHyphenRange(range, options) {
	const expression = options.loose ? LOOSE_HYPHEN : STRICT_HYPHEN;
	return range.replace(expression, (_match, rawFrom, fromMajor, fromMinor, fromPatch, fromPrerelease, _fromBuild, rawTo, toMajor, toMinor, toPatch, toPrerelease) => {
		let from = rawFrom;
		let to = rawTo;
		if (isWildcard(fromMajor)) from = "";
		else if (isWildcard(fromMinor)) from = `>=${fromMajor}.0.0${options.includePrerelease ? "-0" : ""}`;
		else if (isWildcard(fromPatch)) from = `>=${fromMajor}.${fromMinor}.0${options.includePrerelease ? "-0" : ""}`;
		else if (fromPrerelease) from = `>=${from}`;
		else from = `>=${from}${options.includePrerelease ? "-0" : ""}`;
		if (isWildcard(toMajor)) to = "";
		else if (isWildcard(toMinor)) to = `<${Number(toMajor) + 1}.0.0-0`;
		else if (isWildcard(toPatch)) to = `<${toMajor}.${Number(toMinor) + 1}.0-0`;
		else if (toPrerelease) to = `<=${toMajor}.${toMinor}.${toPatch}-${toPrerelease}`;
		else if (options.includePrerelease) to = `<${toMajor}.${toMinor}.${Number(toPatch) + 1}-0`;
		else to = `<=${to}`;
		return `${from} ${to}`.trim();
	});
}
function expandComparator(comparator, options) {
	return replaceXRanges(replaceTildes(replaceCarets(comparator.replace(BUILD_SAFE, ""), options), options), options).trim().replace(STAR, "");
}
function parseSimpleRange(input, options) {
	let parts = replaceHyphenRange(input.replace(BUILD_STRIP, ""), options).replace(COMPARATOR_TRIM, "$1$2$3").replace(TILDE_TRIM, "$1~").replace(CARET_TRIM, "$1^").split(" ").map((part) => expandComparator(part, options)).join(" ").split(/\s+/).map((part) => part.trim().replace(options.includePrerelease ? GTE_ZERO_PRERELEASE : GTE_ZERO, ""));
	if (options.loose) parts = parts.filter((part) => LOOSE_COMPARATOR.test(part));
	const unique = /* @__PURE__ */ new Map();
	for (const comparator of parts.map((part) => parseComparator(part, options))) {
		if (comparator.value === "<0.0.0-0") return [comparator];
		unique.set(comparator.value, comparator);
	}
	if (unique.size > 1) unique.delete("");
	return [...unique.values()];
}
function parseRange(range, options = {}) {
	if (typeof range !== "string") return range;
	const parsedOptions = { ...options };
	const normalizedRange = range.trim().replaceAll(/\s+/g, " ");
	let sets = normalizedRange.split("||").map((part) => parseSimpleRange(part.trim(), parsedOptions)).filter((set) => set.length);
	if (!sets.length) throw new TypeError(`Range contains no valid comparator sets: ${normalizedRange}`);
	if (sets.length > 1) {
		const first = sets[0];
		sets = sets.filter((set) => set[0]?.value !== "<0.0.0-0");
		if (!sets.length) sets = [first];
		else if (sets.length > 1) {
			const any = sets.find((set) => set.length === 1 && set[0]?.value === "");
			if (any) sets = [any];
		}
	}
	return {
		options: parsedOptions,
		sets
	};
}
function tryParseRange(range, options = {}) {
	try {
		return parseRange(range, options);
	} catch {
		return null;
	}
}
function testParsedRange(range, version) {
	return range.sets.some((set) => testComparatorSet(set, version, range.options));
}
function testRangeVersion(range, version) {
	const parsed = tryParse(version, range.options);
	return parsed ? testParsedRange(range, parsed) : false;
}
function normalizeRange(range, options = {}) {
	const parsed = tryParseRange(range, options);
	return parsed ? formatRange(parsed) || "*" : null;
}
function satisfies(version, range, options = {}) {
	const parsed = tryParseRange(range, options);
	return parsed ? testRangeVersion(parsed, version) : false;
}
// packages/core/src/string-to-regex.ts
var regexLiteral = /^\/.+\/[AJUXgimsux]*$/;
var supportedFlags = /* @__PURE__ */ new Set("gimsuy");
/** Converts a regex literal or plain text matcher into a regular expression. */
var stringToRegex = (search) => {
	if (!regexLiteral.test(search)) return new RegExp(escapeStringRegexp(search), "g");
	const delimiter = search.lastIndexOf("/");
	const flags = [...new Set(search.slice(delimiter + 1))].filter((flag) => supportedFlags.has(flag)).join("");
	return new RegExp(search.slice(1, delimiter), flags);
};
// packages/core/src/config/parse-categories.ts
var categoryMigrationDocumentationUrl = "https://github.com/release-drafter/release-drafter/pull/1558";
var withMigrationDocumentationLink = (message) => `${message} Migration documentation: ${categoryMigrationDocumentationUrl}`;
var normalizeConventional = (conventional, logger) => {
	if (!conventional) return;
	if (conventional === true) return {
		types: [],
		scopes: [],
		breaking: void 0
	};
	if (Object.keys(conventional).length === 0) logger.warning("Use 'conventional: true' instead of 'conventional: {}' to match any conventional title.");
	return {
		types: [...conventional.types || [], ...conventional.type ? [conventional.type] : []],
		scopes: [...conventional.scopes || [], ...conventional.scope ? [conventional.scope] : []],
		breaking: conventional.breaking
	};
};
/**
* Parses all categories from the config, normalizing conditions and
* handling backward compatibility with deprecated fields.
*
* This function:
* - Normalizes a missing `type` to `changelog` to match schema defaults
* - Normalizes the `when` field to always be an array of conditions
* - Applies deprecated category-level `label`/`labels` shorthands to every
*   normalized `when` condition
* - Warns when deprecated compatibility fields are used
* - Preserves all other category fields as-is
*
* Accepts both fully-typed and partial category objects for flexibility.
*
* @param categories - Categories from the raw config
* @returns Array of fully parsed categories with normalized conditions
*/
function parseCategories(categories, deprecatedConfig, logger) {
	const parsedCategories = structuredClone(categories.categories).map((cat) => {
		const { labels, label, when: _when, "collapse-after": rawCollapseAfter, "semver-increment": rawSemverIncrement, exclusive: rawExclusive, title, ..._cat } = cat;
		const collapseAfter = rawCollapseAfter ?? categorySchemaDefaults["collapse-after"];
		const semverIncrement = rawSemverIncrement ?? categorySchemaDefaults["semver-increment"];
		const exclusive = rawExclusive ?? categorySchemaDefaults.exclusive;
		const deprecatedLabels = [...labels || [], ...label ? [label] : []];
		if (deprecatedLabels.length > 0) logger.warning(withMigrationDocumentationLink(`Use of deprecated 'categories[*].label' or 'categories[*].labels' field detected${title ? ` on category "${title}"` : ""}. Please migrate. This field will be removed in a future release. To migrate, move the labels into the category's 'when' condition.`));
		const parsedWhenConditions = (_when !== void 0 ? Array.isArray(_when) ? _when.length > 0 || deprecatedLabels.length === 0 ? _when : [{}] : [_when] : deprecatedLabels.length > 0 ? [{}] : []).map((condition) => {
			const { path, label, conventional, ..._cond } = condition;
			const normalizedConventional = normalizeConventional(conventional, logger);
			return {
				..._cond,
				"labels-mode": condition["labels-mode"] ?? changeConditionSchemaDefaults["labels-mode"],
				"paths-mode": condition["paths-mode"] ?? changeConditionSchemaDefaults["paths-mode"],
				paths: [...condition.paths || [], ...path ? [path] : []],
				labels: [
					...deprecatedLabels,
					...condition.labels || [],
					...label ? [label] : []
				],
				...normalizedConventional ? { conventional: normalizedConventional } : {}
			};
		}).filter((condition) => condition.paths.length > 0 || condition.labels.length > 0 || !!condition.conventional);
		const categoryType = _cat.type ?? categorySchemaDefaults.type;
		switch (categoryType) {
			case "changelog": return {
				type: "changelog",
				when: parsedWhenConditions,
				"collapse-after": collapseAfter,
				"semver-increment": semverIncrement,
				exclusive,
				title
			};
			case "version-resolver":
				if (title) logger.warning(`Title "${title}" ignored for category of type "${categoryType}"`);
				if (collapseAfter !== -1) logger.warning(`"collapse-after" "${collapseAfter}" ignored for category of type "${categoryType}"`);
				return {
					type: "version-resolver",
					when: parsedWhenConditions,
					"semver-increment": semverIncrement,
					exclusive
				};
			case "pre-exclude":
			case "pre-include":
				if (title) logger.warning(`Title "${title}" ignored for category of type "${categoryType}"`);
				if (collapseAfter !== -1) logger.warning(`"collapse-after" "${collapseAfter}" ignored for category of type "${categoryType}"`);
				if (exclusive) throw new Error(`"exclusive" can only be set on categories of type "changelog" or "version-resolver"; it cannot be used on category of type "${categoryType}".`);
				if (semverIncrement !== "patch") logger.warning(`"semver-increment" "${semverIncrement}" ignored for category of type "${categoryType}"`);
				return {
					type: categoryType,
					when: parsedWhenConditions
				};
			default: throw new Error(`Unsupported category type: ${categoryType}`);
		}
	});
	if (deprecatedConfig["exclude-labels"] && deprecatedConfig["exclude-labels"].length > 0 || deprecatedConfig["exclude-paths"] && deprecatedConfig["exclude-paths"].length > 0) logger.warning(withMigrationDocumentationLink(`Use of deprecated 'exclude-labels' or 'exclude-paths' field detected. Please migrate. This field will be removed in a future release. To migrate, add the correspoding labels or paths to a 'type: "pre-exclude"' category.`));
	if (deprecatedConfig["exclude-labels"] && deprecatedConfig["exclude-labels"].length > 0 || deprecatedConfig["exclude-paths"] && deprecatedConfig["exclude-paths"].length > 0) {
		if (parsedCategories.findIndex((cat) => cat.type === "pre-exclude") !== -1) throw new Error("A 'pre-exclude' category already exists. Cannot migrate deprecated exclude-labels field. Please either remove the deprecated field or remove the existing 'pre-exclude' category to resolve this conflict.");
		parsedCategories.push({
			type: "pre-exclude",
			when: [{
				labels: deprecatedConfig["exclude-labels"] || [],
				"labels-mode": "any",
				paths: deprecatedConfig["exclude-paths"] || [],
				"paths-mode": "any"
			}]
		});
	}
	if (deprecatedConfig["include-labels"] && deprecatedConfig["include-labels"].length > 0 || deprecatedConfig["include-paths"] && deprecatedConfig["include-paths"].length > 0) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'include-labels' or 'include-paths' field detected. Please migrate. This field will be removed in a future release. To migrate, add the correspoding labels or paths to a 'type: "pre-include"' category.`));
		if (parsedCategories.findIndex((cat) => cat.type === "pre-include") !== -1) throw new Error("A 'pre-include' category already exists. Cannot migrate deprecated include-labels or include-paths fields. Please either remove the deprecated fields or remove the existing 'pre-include' category to resolve this conflict.");
		parsedCategories.push({
			type: "pre-include",
			when: [{
				labels: deprecatedConfig["include-labels"] || [],
				"labels-mode": "any",
				paths: deprecatedConfig["include-paths"] || [],
				"paths-mode": "any"
			}]
		});
	}
	if (deprecatedConfig["version-resolver"].default !== configSchemaDefaults["version-resolver"].default) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'version-resolver.default' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "${deprecatedConfig["version-resolver"].default}"' to 'type: changelog' category with no 'when' condition (uncategorized changes), or move the default resolver to a new category with type 'version-resolver' and 'semver-increment' set to "${deprecatedConfig["version-resolver"].default}" - also without 'when' conditions.`));
		if (parsedCategories.findIndex((cat) => cat.type === "version-resolver" && cat.when.length === 0) !== -1) throw new Error("A 'version-resolver' category with no 'when' condition already exists. Cannot migrate deprecated 'version-resolver.default' field. Please either remove the deprecated field or remove the existing 'version-resolver' category to resolve this conflict.");
		parsedCategories.push({
			type: "version-resolver",
			"semver-increment": deprecatedConfig["version-resolver"].default,
			when: [],
			exclusive: false
		});
	}
	if (deprecatedConfig["version-resolver"].major.labels !== configSchemaDefaults["version-resolver"].major.labels && deprecatedConfig["version-resolver"].major.labels.length > 0) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'version-resolver.major.labels' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "major"' to a pre-existing 'type: changelog' category, or move the labels from 'version-resolver.major.labels' to a new category with type 'version-resolver' and 'semver-increment' set to 'major'.`));
		parsedCategories.push({
			type: "version-resolver",
			"semver-increment": "major",
			when: [{
				labels: deprecatedConfig["version-resolver"].major.labels || [],
				"labels-mode": "any",
				paths: [],
				"paths-mode": "any"
			}],
			exclusive: false
		});
	}
	if (deprecatedConfig["version-resolver"].minor.labels !== configSchemaDefaults["version-resolver"].minor.labels && deprecatedConfig["version-resolver"].minor.labels.length > 0) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'version-resolver.minor.labels' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "minor"' to a pre-existing 'type: changelog' category, or move the labels from 'version-resolver.minor.labels' to a new category with type 'version-resolver' and 'semver-increment' set to 'minor'.`));
		parsedCategories.push({
			type: "version-resolver",
			"semver-increment": "minor",
			when: [{
				labels: deprecatedConfig["version-resolver"].minor.labels || [],
				"labels-mode": "any",
				paths: [],
				"paths-mode": "any"
			}],
			exclusive: false
		});
	}
	if (deprecatedConfig["version-resolver"].patch.labels !== configSchemaDefaults["version-resolver"].patch.labels && deprecatedConfig["version-resolver"].patch.labels.length > 0) {
		logger.warning(withMigrationDocumentationLink(`Use of deprecated 'version-resolver.patch.labels' field detected. Please migrate. This field will be removed in a future release. To migrate, either add 'semver-increment: "patch"' to a pre-existing 'type: changelog' category, or move the labels from 'version-resolver.patch.labels' to a new category with type 'version-resolver' and 'semver-increment' set to 'patch'.`));
		parsedCategories.push({
			type: "version-resolver",
			"semver-increment": "patch",
			when: [{
				labels: deprecatedConfig["version-resolver"].patch.labels || [],
				"labels-mode": "any",
				paths: [],
				"paths-mode": "any"
			}],
			exclusive: false
		});
	}
	return parsedCategories;
}
// packages/core/src/config/parse-group-changes.ts
/** Capture group names that `renderTemplate` can expand as `$FIRST_<NAME>`/`$LAST_<NAME>`. */
var templatableName = /^[A-Za-z_]+$/;
/** Capture group names that build the grouping key: `group` and every `group_<name>`. */
var isGroupName = (name) => /^group(_|$)/i.test(name);
/**
* Converts the configured `group-changes` patterns into regular expressions and
* collects the capture group names their `title-template` can reference.
*
* Rules that cannot be used are dropped with a warning so that a single bad
* pattern never fails the whole release, matching how `replacers` are handled.
*/
var parseGroupChanges = (params) => {
	const { groupChanges, logger } = params;
	return groupChanges.flatMap((groupChange) => {
		let pattern;
		try {
			const converted = stringToRegex(groupChange.pattern);
			pattern = new RegExp(converted.source, converted.flags.replace(/[gy]/g, ""));
		} catch {
			logger.warning(`Bad group-changes pattern: '${groupChange.pattern}'`);
			return [];
		}
		const names = captureNamesOf(pattern);
		const groupNames = names.filter(isGroupName);
		if (groupNames.length === 0) {
			logger.warning(`The group-changes pattern '${groupChange.pattern}' must be a regular expression literal, such as '/\u2026/', with a 'group' capture group.`);
			return [];
		}
		const templatable = names.filter((name) => {
			if (templatableName.test(name)) return true;
			logger.warning(`The group-changes capture group '${name}' is not available in 'title-template'. Use letters and underscores only.`);
			return false;
		});
		return [{
			...groupChange,
			pattern,
			groupNames,
			captureNames: templatable.filter((name) => !isGroupName(name))
		}];
	});
};
/**
* Lists every named capture group of a pattern. Prefixing the source with an
* empty alternative makes the expression match an empty string, so the match
* reports all group names at once.
*/
var captureNamesOf = (pattern) => {
	try {
		const probe = new RegExp(`|${pattern.source}`, pattern.flags);
		return Object.keys(probe.exec("")?.groups ?? {});
	} catch {
		return [];
	}
};
// packages/core/src/config/merge-input-and-config.ts
var mergeInputAndConfig = (params) => {
	const { config: originalConfig, input, defaultCommitish, logger } = params;
	const { "exclude-labels": excludeLabels, "include-labels": includeLabels, "include-paths": includePaths, "exclude-paths": excludePaths, "version-resolver": versionResolver, ...config } = structuredClone(originalConfig);
	const deprecatedCategoryConfig = {
		"exclude-labels": excludeLabels,
		"include-labels": includeLabels,
		"include-paths": includePaths,
		"exclude-paths": excludePaths,
		"version-resolver": versionResolver
	};
	applyOverrides(config, input, logger);
	const commitish = config.commitish || defaultCommitish || "";
	const latest = typeof config.latest !== "boolean" ? true : config.latest;
	const prerelease = typeof config.prerelease !== "boolean" ? false : config.prerelease;
	const replacers = config.replacers.map((replacer) => {
		if (replacer.section !== void 0) return replacer;
		try {
			return {
				...replacer,
				search: stringToRegex(replacer.search)
			};
		} catch {
			logger.warning(`Bad replacer regex: '${replacer.search}'`);
			return false;
		}
	}).filter((replacer) => !!replacer);
	const categories = parseCategories(config, deprecatedCategoryConfig, logger);
	const groupChanges = parseGroupChanges({
		groupChanges: config["group-changes"],
		logger
	});
	const parsedConfig = {
		...config,
		commitish,
		latest,
		prerelease,
		replacers,
		categories,
		"group-changes": groupChanges
	};
	validateParsedConfig(parsedConfig);
	return parsedConfig;
};
var applyOverrides = (config, input, logger) => {
	applyStringOverride(config, input, "commitish", logger);
	applyStringOverride(config, input, "header", logger);
	applyStringOverride(config, input, "footer", logger);
	applyStringOverride(config, input, "prerelease-identifier", logger);
	applyBooleanOverride(config, input, "prerelease", logger);
	applyBooleanOverride(config, input, "include-pre-releases", logger);
	applyBooleanOverride(config, input, "latest", logger);
	applyStringOverride(config, input, "filter-by-range", logger);
	applyReleaseModeOverrides(config, input, logger);
};
var applyReleaseModeOverrides = (config, input, logger) => {
	const hasInputPrerelease = typeof input.prerelease === "boolean";
	const hasInputPrereleaseIdentifier = !!input["prerelease-identifier"];
	if (config["prerelease-identifier"] && !config.prerelease && (!hasInputPrerelease || hasInputPrereleaseIdentifier)) {
		logger.warning(`You specified a 'prerelease-identifier' (${config["prerelease-identifier"]}), but 'prerelease' is set to false. Switching to true.`);
		config.prerelease = true;
	}
	if (config.prerelease) {
		if (config.latest === true) logger.warning("'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release.");
		config.latest = false;
	}
};
var applyBooleanOverride = (config, input, key, logger) => {
	const inputValue = input[key];
	if (typeof inputValue !== "boolean") return;
	const configValue = config[key];
	if (typeof configValue === "boolean" && configValue !== inputValue) logger.info(`Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`);
	config[key] = inputValue;
};
var applyStringOverride = (config, input, key, logger) => {
	const inputValue = input[key];
	if (!inputValue) return;
	const configValue = config[key];
	if (configValue && configValue !== inputValue) logger.info(`Input's ${key} "${inputValue}" overrides config's ${key} "${configValue}"`);
	config[key] = inputValue;
};
var validateParsedConfig = (parsedConfig) => {
	if (!parsedConfig.commitish) throw new Error("'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)");
	if (parsedConfig.categories.some((category) => category.type === "changelog" && !category.title)) throw new Error("Every 'type: \"changelog\"' category must define a non-empty 'title'.");
	if (parsedConfig.categories.filter((category) => category.type === "changelog" && category.when.length === 0).length > 1) throw new Error("Multiple 'type: \"changelog\"' categories detected with no 'when' condition. Only one such category is supported for uncategorized changes.");
	if (parsedConfig["filter-by-range"] && !normalizeRange(parsedConfig["filter-by-range"])) throw new Error(`'filter-by-range' value "${parsedConfig["filter-by-range"]}" could not be parsed as a valid semver range.`);
};
// packages/gh-actions/src/common/config/get-release-drafter-config.ts
/** Load and validate the standard Release Drafter configuration. */
var getReleaseDrafterConfig = async (configName, currentContext, token) => {
	const { config, contexts } = await composeConfigGet(configName, currentContext, token);
	contexts.forEach(({ filepath, ref, repo, scheme }) => {
		const remotePath = `${repo.owner}/${repo.repo}/${filepath}${ref ? `@${ref}` : ""}`;
		const location = scheme === "file" ? `locally from "${filepath}"` : `from "${remotePath}"${ref ? "" : " on the default branch"}`;
		info(`Config fetched ${location}.`);
	});
	const result = configSchema.safeParse(config);
	if (!result.success) throw new ConfigError(`Invalid Release Drafter config composed from ${contexts.map(describeConfigTarget).join(", ")}:\n${prettifyError(result.error)}`, contexts, void 0, { cause: result.error });
	return result.data;
};
export { filterPullRequestsByPreCategories as _, COERCE as a, matchesCategoryCondition as b, PRERELEASE_LOOSE as c, formatFullVersion as d, parse as f, evaluateCategories as g, commonConfigSchema as h, satisfies as i, compareIdentifiers as l, tryParse as m, mergeInputAndConfig as n, COERCE_FULL as o, safeRegex as p, normalizeRange as r, PRERELEASE as s, getReleaseDrafterConfig as t, formatComparableVersion as u, getChangelogCategories as v, needsPullRequestChangedFiles as x, getVersionResolverCategories as y };
