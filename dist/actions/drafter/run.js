import { C as context, D as __exportAll, E as setFailed, T as info, a as readActionInputs, b as stringbool, c as getGitHubAdapter, d as escapeStringRegexp, i as defineActionInputNames, l as getRepository, n as sharedInputSchema, o as writeActionOutputs, s as actionLogger, u as noopLogger, v as object, y as string$2 } from "../../chunks/config.js";
import { _ as filterPullRequestsByPreCategories, a as COERCE, b as needsPullRequestChangedFiles, c as PRERELEASE_LOOSE, d as formatFullVersion, f as parse$1, g as evaluateCategories, h as commonConfigSchema, i as satisfies, l as compareIdentifiers, m as tryParse$1, n as mergeInputAndConfig, o as COERCE_FULL, p as safeRegex, r as normalizeRange, s as PRERELEASE, t as getReleaseDrafterConfig, u as formatComparableVersion, v as getChangelogCategories, y as getVersionResolverCategories } from "../../chunks/get-release-drafter-config.js";
//#region node_modules/verkit/dist/version-Co1j9Tpq.js
var COERCE_EXACT = safeRegex(COERCE);
var COERCE_FULL_EXACT = safeRegex(COERCE_FULL);
var PRERELEASE_EXACT = safeRegex(`^${PRERELEASE}$`);
var PRERELEASE_LOOSE_EXACT = safeRegex(`^${PRERELEASE_LOOSE}$`);
function normalize(version, options = {}) {
	const parsed = tryParse$1(version, options);
	return parsed ? formatComparableVersion(parsed) : null;
}
function coerce(value, options = {}) {
	if (typeof value === "object") return value;
	const input = typeof value === "number" ? String(value) : value;
	let match = null;
	if (options.rtl) {
		const source = options.includePrerelease ? COERCE_FULL : COERCE;
		const expression = safeRegex(source, "g");
		let next;
		while ((next = expression.exec(input)) && (!match || match.index + match[0].length !== input.length)) {
			if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
			expression.lastIndex = next.index + next[1].length + next[2].length;
		}
	} else match = (options.includePrerelease ? COERCE_FULL_EXACT : COERCE_EXACT).exec(input);
	if (!match) return null;
	const major = match[2];
	const minor = match[3] || "0";
	const patch = match[4] || "0";
	const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
	const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
	return tryParse$1(`${major}.${minor}.${patch}${prerelease}${build}`, options);
}
function isPrereleasePrefix(prerelease, identifier) {
	const identifiers = identifier.split(".");
	return identifiers.length <= prerelease.length && identifiers.every((part, index) => compareIdentifiers(prerelease[index], part) === 0);
}
function incrementPrerelease(version, identifier, identifierBase) {
	const base = Number(identifierBase) ? 1 : 0;
	let prerelease = version.prerelease;
	if (prerelease?.length) {
		let foundNumeric = false;
		for (let index = prerelease.length - 1; index >= 0; index--) if (typeof prerelease[index] === "number") {
			prerelease[index] = Number(prerelease[index]) + 1;
			foundNumeric = true;
			break;
		}
		if (!foundNumeric) {
			if (identifier === prerelease.join(".") && identifierBase === false) throw new Error("invalid increment argument: identifier already exists");
			prerelease.push(base);
		}
	} else {
		prerelease = [base];
		version.prerelease = prerelease;
	}
	if (!identifier) return;
	const reset = identifierBase === false ? [identifier] : [identifier, base];
	if (isPrereleasePrefix(prerelease, identifier)) {
		const next = prerelease[identifier.split(".").length];
		if (Number.isNaN(Number(next))) version.prerelease = reset;
	} else version.prerelease = reset;
}
function incrementMutable(version, release, identifier, identifierBase) {
	switch (release) {
		case "premajor":
			version.prerelease = void 0;
			version.patch = 0;
			version.minor = 0;
			version.major++;
			incrementPrerelease(version, identifier, identifierBase);
			break;
		case "preminor":
			version.prerelease = void 0;
			version.patch = 0;
			version.minor++;
			incrementPrerelease(version, identifier, identifierBase);
			break;
		case "prepatch":
			version.prerelease = void 0;
			incrementMutable(version, "patch", identifier, identifierBase);
			incrementPrerelease(version, identifier, identifierBase);
			break;
		case "prerelease":
			if (!version.prerelease?.length) incrementMutable(version, "patch", identifier, identifierBase);
			incrementPrerelease(version, identifier, identifierBase);
			break;
		case "release":
			if (!version.prerelease?.length) throw new Error(`version ${formatFullVersion(version)} is not a prerelease`);
			version.prerelease = void 0;
			break;
		case "major":
			if (version.minor !== 0 || version.patch !== 0 || !version.prerelease?.length) version.major++;
			version.minor = 0;
			version.patch = 0;
			version.prerelease = void 0;
			break;
		case "minor":
			if (version.patch !== 0 || !version.prerelease?.length) version.minor++;
			version.patch = 0;
			version.prerelease = void 0;
			break;
		case "patch":
			if (!version.prerelease?.length) version.patch++;
			version.prerelease = void 0;
			break;
		/* v8 ignore next */
		case "pre":
			incrementPrerelease(version, identifier, identifierBase);
			break;
		default: throw new Error(`invalid increment argument: ${release}`);
	}
}
function incrementParsedVersion(parsed, release, identifier, identifierBase, loose = false) {
	if (release.startsWith("pre")) {
		if (!identifier && identifierBase === false) throw new Error("invalid increment argument: identifier is empty");
		if (identifier) {
			const expression = loose ? PRERELEASE_LOOSE_EXACT : PRERELEASE_EXACT;
			const match = `-${identifier}`.match(expression);
			if (!match || match[1] !== identifier) throw new Error(`invalid identifier: ${identifier}`);
		}
	}
	const mutable = {
		build: parsed.build ? [...parsed.build] : void 0,
		major: parsed.major,
		minor: parsed.minor,
		patch: parsed.patch,
		prerelease: parsed.prerelease ? [...parsed.prerelease] : void 0
	};
	incrementMutable(mutable, release, identifier, identifierBase);
	return formatComparableVersion(mutable);
}
function increment(version, release, options = {}) {
	try {
		return incrementParsedVersion(parse$1(version, options), release, options.identifier, options.identifierBase, options.loose);
	} catch {
		return null;
	}
}
function getMajor(version, options = {}) {
	return parse$1(version, options).major;
}
function getMinor(version, options = {}) {
	return parse$1(version, options).minor;
}
function getPatch(version, options = {}) {
	return parse$1(version, options).patch;
}
function getPrerelease(version, options = {}) {
	const parsed = tryParse$1(version, options);
	return parsed ? [...parsed.prerelease || []] : null;
}
//#endregion
//#region packages/core/src/release/categorize-pull-requests.ts
var categorizePullRequests = (params) => {
	const { pullRequests, config } = params;
	const changelogCategories = getChangelogCategories(config.categories);
	const categorizedPullRequests = changelogCategories.map((category) => ({
		...category,
		pullRequests: []
	}));
	const uncategorizedPullRequests = [];
	for (const pullRequest of pullRequests) {
		const evaluation = evaluateCategories(pullRequest, config.categories);
		if (!evaluation.included) continue;
		if (evaluation.changelogCategories.length === 0) {
			uncategorizedPullRequests.push(pullRequest);
			continue;
		}
		for (const matchedCategory of evaluation.changelogCategories) {
			const index = changelogCategories.indexOf(matchedCategory);
			if (index !== -1) categorizedPullRequests[index].pullRequests.push(pullRequest);
		}
	}
	return [uncategorizedPullRequests, categorizedPullRequests];
};
//#endregion
//#region packages/core/src/release/render-template/util/charCode.ts
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
//#region packages/core/src/release/render-template/util/search.ts
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
//#region packages/core/src/release/render-template/util/replacePattern.ts
/**
* Assigned when the replace pattern is entirely static.
*/
var StaticValueReplacePattern = class {
	staticValue;
	kind = 0;
	constructor(staticValue) {
		this.staticValue = staticValue;
	}
};
/**
* Assigned when the replace pattern has replacement patterns.
*/
var DynamicPiecesReplacePattern = class {
	pieces;
	kind = 1;
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
		return this._state.kind === 1;
	}
	constructor(pieces) {
		if (!pieces || pieces.length === 0) this._state = new StaticValueReplacePattern("");
		else if (pieces.length === 1 && pieces[0].staticValue !== null) this._state = new StaticValueReplacePattern(pieces[0].staticValue);
		else this._state = new DynamicPiecesReplacePattern(pieces);
	}
	buildReplaceString(matches, preserveCase) {
		if (this._state.kind === 0) {
			if (preserveCase) return buildReplaceStringWithCasePreserved(matches, this._state.staticValue);
			else return this._state.staticValue;
		}
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
//#region packages/core/src/release/render-template/render-template.ts
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
//#region packages/core/src/release/group-changes.ts
/**
* Groups pull requests whose titles match the same `group` of a `group-changes`
* rule into a single changelog entry. Pull requests are neither mutated nor
* reordered: a grouped entry takes the place of its newest member.
*/
var groupChanges = (params) => {
	const { pullRequests, rules = [], logger } = params;
	if (rules.length === 0) return pullRequests.map((pullRequest) => ({
		pullRequests: [pullRequest],
		representative: pullRequest,
		title: pullRequest.title
	}));
	const members = /* @__PURE__ */ new Map();
	const ruleOf = /* @__PURE__ */ new Map();
	const keys = [];
	for (const [index, pullRequest] of pullRequests.entries()) {
		const match = matchRule(pullRequest, rules);
		if (!match) {
			const key = `ungrouped ${index}`;
			keys.push(key);
			members.set(key, [pullRequest]);
			continue;
		}
		const key = `rule ${match.index} ${JSON.stringify(match.values)}`;
		const existing = members.get(key);
		if (existing) {
			existing.push(pullRequest);
			continue;
		}
		keys.push(key);
		members.set(key, [pullRequest]);
		ruleOf.set(key, match.rule);
	}
	const positions = new Map(pullRequests.map((pullRequest, index) => [pullRequest, index]));
	return keys.map((key) => {
		const grouped = [...members.get(key) ?? []].sort(byMergeOrder);
		const representative = grouped[grouped.length - 1];
		const rule = ruleOf.get(key);
		return {
			pullRequests: grouped,
			representative,
			title: grouped.length > 1 && rule ? groupTitle({
				pullRequests: grouped,
				rule,
				logger
			}) : representative.title
		};
	}).sort((a, b) => (positions.get(a.representative) ?? 0) - (positions.get(b.representative) ?? 0));
};
/**
* Finds the first rule that matches and reads its grouping values. Changes are
* grouped only when every grouping capture holds the same value, so a bump of
* the same dependency in another submodule stays a change of its own.
*/
var matchRule = (pullRequest, rules) => {
	for (const [index, rule] of rules.entries()) {
		const groups = rule.pattern.exec(pullRequest.title)?.groups;
		if (!groups) continue;
		const values = rule.groupNames.map((name) => groups[name] ?? "");
		if (values.some((value) => value.trim())) return {
			values,
			index,
			rule
		};
	}
};
/** Orders members the way they were merged, oldest first. */
var byMergeOrder = (a, b) => {
	if (a.mergedAt && b.mergedAt && a.mergedAt !== b.mergedAt) return a.mergedAt < b.mergedAt ? -1 : 1;
	return a.number - b.number;
};
var groupTitle = (params) => {
	const { pullRequests, rule, logger } = params;
	const oldest = rule.pattern.exec(pullRequests[0].title)?.groups ?? {};
	const newest = rule.pattern.exec(pullRequests[pullRequests.length - 1].title)?.groups ?? {};
	const object = {};
	for (const name of rule.groupNames) object[`$${name.toUpperCase()}`] = newest[name] ?? "";
	for (const name of rule.captureNames) {
		object[`$FIRST_${name.toUpperCase()}`] = oldest[name] ?? "";
		object[`$LAST_${name.toUpperCase()}`] = newest[name] ?? "";
	}
	const title = renderTemplate({
		template: rule["title-template"],
		object
	});
	logger?.debug(`Grouped ${pullRequests.map(({ number }) => `#${number}`).join(", ")} into '${title}'`);
	return title;
};
//#endregion
//#region node_modules/mdast-util-to-string/lib/index.js
/**
* @typedef {import('mdast').Nodes} Nodes
*
* @typedef Options
*   Configuration (optional).
* @property {boolean | null | undefined} [includeImageAlt=true]
*   Whether to use `alt` for `image`s (default: `true`).
* @property {boolean | null | undefined} [includeHtml=true]
*   Whether to use `value` of HTML (default: `true`).
*/
/** @type {Options} */
var emptyOptions = {};
/**
* Get the text content of a node or list of nodes.
*
* Prefers the node’s plain-text fields, otherwise serializes its children,
* and if the given value is an array, serialize the nodes in it.
*
* @param {unknown} [value]
*   Thing to serialize, typically `Node`.
* @param {Options | null | undefined} [options]
*   Configuration (optional).
* @returns {string}
*   Serialized `value`.
*/
function toString(value, options) {
	const settings = options || emptyOptions;
	return one(value, typeof settings.includeImageAlt === "boolean" ? settings.includeImageAlt : true, typeof settings.includeHtml === "boolean" ? settings.includeHtml : true);
}
/**
* One node or several nodes.
*
* @param {unknown} value
*   Thing to serialize.
* @param {boolean} includeImageAlt
*   Include image `alt`s.
* @param {boolean} includeHtml
*   Include HTML.
* @returns {string}
*   Serialized node.
*/
function one(value, includeImageAlt, includeHtml) {
	if (node(value)) {
		if ("value" in value) return value.type === "html" && !includeHtml ? "" : value.value;
		if (includeImageAlt && "alt" in value && value.alt) return value.alt;
		if ("children" in value) return all(value.children, includeImageAlt, includeHtml);
	}
	if (Array.isArray(value)) return all(value, includeImageAlt, includeHtml);
	return "";
}
/**
* Serialize a list of nodes.
*
* @param {Array<unknown>} values
*   Thing to serialize.
* @param {boolean} includeImageAlt
*   Include image `alt`s.
* @param {boolean} includeHtml
*   Include HTML.
* @returns {string}
*   Serialized nodes.
*/
function all(values, includeImageAlt, includeHtml) {
	/** @type {Array<string>} */
	const result = [];
	let index = -1;
	while (++index < values.length) result[index] = one(values[index], includeImageAlt, includeHtml);
	return result.join("");
}
/**
* Check if `value` looks like a node.
*
* @param {unknown} value
*   Thing.
* @returns {value is Nodes}
*   Whether `value` is a node.
*/
function node(value) {
	return Boolean(value && typeof value === "object");
}
//#endregion
//#region node_modules/character-entities/index.js
/**
* Map of named character references.
*
* @type {Record<string, string>}
*/
var characterEntities = {
	AElig: "\u00C6",
	AMP: "&",
	Aacute: "\u00C1",
	Abreve: "\u0102",
	Acirc: "\u00C2",
	Acy: "\u0410",
	Afr: "\u{1D504}",
	Agrave: "\u00C0",
	Alpha: "\u0391",
	Amacr: "\u0100",
	And: "\u2A53",
	Aogon: "\u0104",
	Aopf: "\u{1D538}",
	ApplyFunction: "\u2061",
	Aring: "\u00C5",
	Ascr: "\u{1D49C}",
	Assign: "\u2254",
	Atilde: "\u00C3",
	Auml: "\u00C4",
	Backslash: "\u2216",
	Barv: "\u2AE7",
	Barwed: "\u2306",
	Bcy: "\u0411",
	Because: "\u2235",
	Bernoullis: "\u212C",
	Beta: "\u0392",
	Bfr: "\u{1D505}",
	Bopf: "\u{1D539}",
	Breve: "\u02D8",
	Bscr: "\u212C",
	Bumpeq: "\u224E",
	CHcy: "\u0427",
	COPY: "\u00A9",
	Cacute: "\u0106",
	Cap: "\u22D2",
	CapitalDifferentialD: "\u2145",
	Cayleys: "\u212D",
	Ccaron: "\u010C",
	Ccedil: "\u00C7",
	Ccirc: "\u0108",
	Cconint: "\u2230",
	Cdot: "\u010A",
	Cedilla: "\u00B8",
	CenterDot: "\u00B7",
	Cfr: "\u212D",
	Chi: "\u03A7",
	CircleDot: "\u2299",
	CircleMinus: "\u2296",
	CirclePlus: "\u2295",
	CircleTimes: "\u2297",
	ClockwiseContourIntegral: "\u2232",
	CloseCurlyDoubleQuote: "\u201D",
	CloseCurlyQuote: "\u2019",
	Colon: "\u2237",
	Colone: "\u2A74",
	Congruent: "\u2261",
	Conint: "\u222F",
	ContourIntegral: "\u222E",
	Copf: "\u2102",
	Coproduct: "\u2210",
	CounterClockwiseContourIntegral: "\u2233",
	Cross: "\u2A2F",
	Cscr: "\u{1D49E}",
	Cup: "\u22D3",
	CupCap: "\u224D",
	DD: "\u2145",
	DDotrahd: "\u2911",
	DJcy: "\u0402",
	DScy: "\u0405",
	DZcy: "\u040F",
	Dagger: "\u2021",
	Darr: "\u21A1",
	Dashv: "\u2AE4",
	Dcaron: "\u010E",
	Dcy: "\u0414",
	Del: "\u2207",
	Delta: "\u0394",
	Dfr: "\u{1D507}",
	DiacriticalAcute: "\u00B4",
	DiacriticalDot: "\u02D9",
	DiacriticalDoubleAcute: "\u02DD",
	DiacriticalGrave: "`",
	DiacriticalTilde: "\u02DC",
	Diamond: "\u22C4",
	DifferentialD: "\u2146",
	Dopf: "\u{1D53B}",
	Dot: "\u00A8",
	DotDot: "\u20DC",
	DotEqual: "\u2250",
	DoubleContourIntegral: "\u222F",
	DoubleDot: "\u00A8",
	DoubleDownArrow: "\u21D3",
	DoubleLeftArrow: "\u21D0",
	DoubleLeftRightArrow: "\u21D4",
	DoubleLeftTee: "\u2AE4",
	DoubleLongLeftArrow: "\u27F8",
	DoubleLongLeftRightArrow: "\u27FA",
	DoubleLongRightArrow: "\u27F9",
	DoubleRightArrow: "\u21D2",
	DoubleRightTee: "\u22A8",
	DoubleUpArrow: "\u21D1",
	DoubleUpDownArrow: "\u21D5",
	DoubleVerticalBar: "\u2225",
	DownArrow: "\u2193",
	DownArrowBar: "\u2913",
	DownArrowUpArrow: "\u21F5",
	DownBreve: "\u0311",
	DownLeftRightVector: "\u2950",
	DownLeftTeeVector: "\u295E",
	DownLeftVector: "\u21BD",
	DownLeftVectorBar: "\u2956",
	DownRightTeeVector: "\u295F",
	DownRightVector: "\u21C1",
	DownRightVectorBar: "\u2957",
	DownTee: "\u22A4",
	DownTeeArrow: "\u21A7",
	Downarrow: "\u21D3",
	Dscr: "\u{1D49F}",
	Dstrok: "\u0110",
	ENG: "\u014A",
	ETH: "\u00D0",
	Eacute: "\u00C9",
	Ecaron: "\u011A",
	Ecirc: "\u00CA",
	Ecy: "\u042D",
	Edot: "\u0116",
	Efr: "\u{1D508}",
	Egrave: "\u00C8",
	Element: "\u2208",
	Emacr: "\u0112",
	EmptySmallSquare: "\u25FB",
	EmptyVerySmallSquare: "\u25AB",
	Eogon: "\u0118",
	Eopf: "\u{1D53C}",
	Epsilon: "\u0395",
	Equal: "\u2A75",
	EqualTilde: "\u2242",
	Equilibrium: "\u21CC",
	Escr: "\u2130",
	Esim: "\u2A73",
	Eta: "\u0397",
	Euml: "\u00CB",
	Exists: "\u2203",
	ExponentialE: "\u2147",
	Fcy: "\u0424",
	Ffr: "\u{1D509}",
	FilledSmallSquare: "\u25FC",
	FilledVerySmallSquare: "\u25AA",
	Fopf: "\u{1D53D}",
	ForAll: "\u2200",
	Fouriertrf: "\u2131",
	Fscr: "\u2131",
	GJcy: "\u0403",
	GT: ">",
	Gamma: "\u0393",
	Gammad: "\u03DC",
	Gbreve: "\u011E",
	Gcedil: "\u0122",
	Gcirc: "\u011C",
	Gcy: "\u0413",
	Gdot: "\u0120",
	Gfr: "\u{1D50A}",
	Gg: "\u22D9",
	Gopf: "\u{1D53E}",
	GreaterEqual: "\u2265",
	GreaterEqualLess: "\u22DB",
	GreaterFullEqual: "\u2267",
	GreaterGreater: "\u2AA2",
	GreaterLess: "\u2277",
	GreaterSlantEqual: "\u2A7E",
	GreaterTilde: "\u2273",
	Gscr: "\u{1D4A2}",
	Gt: "\u226B",
	HARDcy: "\u042A",
	Hacek: "\u02C7",
	Hat: "^",
	Hcirc: "\u0124",
	Hfr: "\u210C",
	HilbertSpace: "\u210B",
	Hopf: "\u210D",
	HorizontalLine: "\u2500",
	Hscr: "\u210B",
	Hstrok: "\u0126",
	HumpDownHump: "\u224E",
	HumpEqual: "\u224F",
	IEcy: "\u0415",
	IJlig: "\u0132",
	IOcy: "\u0401",
	Iacute: "\u00CD",
	Icirc: "\u00CE",
	Icy: "\u0418",
	Idot: "\u0130",
	Ifr: "\u2111",
	Igrave: "\u00CC",
	Im: "\u2111",
	Imacr: "\u012A",
	ImaginaryI: "\u2148",
	Implies: "\u21D2",
	Int: "\u222C",
	Integral: "\u222B",
	Intersection: "\u22C2",
	InvisibleComma: "\u2063",
	InvisibleTimes: "\u2062",
	Iogon: "\u012E",
	Iopf: "\u{1D540}",
	Iota: "\u0399",
	Iscr: "\u2110",
	Itilde: "\u0128",
	Iukcy: "\u0406",
	Iuml: "\u00CF",
	Jcirc: "\u0134",
	Jcy: "\u0419",
	Jfr: "\u{1D50D}",
	Jopf: "\u{1D541}",
	Jscr: "\u{1D4A5}",
	Jsercy: "\u0408",
	Jukcy: "\u0404",
	KHcy: "\u0425",
	KJcy: "\u040C",
	Kappa: "\u039A",
	Kcedil: "\u0136",
	Kcy: "\u041A",
	Kfr: "\u{1D50E}",
	Kopf: "\u{1D542}",
	Kscr: "\u{1D4A6}",
	LJcy: "\u0409",
	LT: "<",
	Lacute: "\u0139",
	Lambda: "\u039B",
	Lang: "\u27EA",
	Laplacetrf: "\u2112",
	Larr: "\u219E",
	Lcaron: "\u013D",
	Lcedil: "\u013B",
	Lcy: "\u041B",
	LeftAngleBracket: "\u27E8",
	LeftArrow: "\u2190",
	LeftArrowBar: "\u21E4",
	LeftArrowRightArrow: "\u21C6",
	LeftCeiling: "\u2308",
	LeftDoubleBracket: "\u27E6",
	LeftDownTeeVector: "\u2961",
	LeftDownVector: "\u21C3",
	LeftDownVectorBar: "\u2959",
	LeftFloor: "\u230A",
	LeftRightArrow: "\u2194",
	LeftRightVector: "\u294E",
	LeftTee: "\u22A3",
	LeftTeeArrow: "\u21A4",
	LeftTeeVector: "\u295A",
	LeftTriangle: "\u22B2",
	LeftTriangleBar: "\u29CF",
	LeftTriangleEqual: "\u22B4",
	LeftUpDownVector: "\u2951",
	LeftUpTeeVector: "\u2960",
	LeftUpVector: "\u21BF",
	LeftUpVectorBar: "\u2958",
	LeftVector: "\u21BC",
	LeftVectorBar: "\u2952",
	Leftarrow: "\u21D0",
	Leftrightarrow: "\u21D4",
	LessEqualGreater: "\u22DA",
	LessFullEqual: "\u2266",
	LessGreater: "\u2276",
	LessLess: "\u2AA1",
	LessSlantEqual: "\u2A7D",
	LessTilde: "\u2272",
	Lfr: "\u{1D50F}",
	Ll: "\u22D8",
	Lleftarrow: "\u21DA",
	Lmidot: "\u013F",
	LongLeftArrow: "\u27F5",
	LongLeftRightArrow: "\u27F7",
	LongRightArrow: "\u27F6",
	Longleftarrow: "\u27F8",
	Longleftrightarrow: "\u27FA",
	Longrightarrow: "\u27F9",
	Lopf: "\u{1D543}",
	LowerLeftArrow: "\u2199",
	LowerRightArrow: "\u2198",
	Lscr: "\u2112",
	Lsh: "\u21B0",
	Lstrok: "\u0141",
	Lt: "\u226A",
	Map: "\u2905",
	Mcy: "\u041C",
	MediumSpace: "\u205F",
	Mellintrf: "\u2133",
	Mfr: "\u{1D510}",
	MinusPlus: "\u2213",
	Mopf: "\u{1D544}",
	Mscr: "\u2133",
	Mu: "\u039C",
	NJcy: "\u040A",
	Nacute: "\u0143",
	Ncaron: "\u0147",
	Ncedil: "\u0145",
	Ncy: "\u041D",
	NegativeMediumSpace: "\u200B",
	NegativeThickSpace: "\u200B",
	NegativeThinSpace: "\u200B",
	NegativeVeryThinSpace: "\u200B",
	NestedGreaterGreater: "\u226B",
	NestedLessLess: "\u226A",
	NewLine: "\n",
	Nfr: "\u{1D511}",
	NoBreak: "\u2060",
	NonBreakingSpace: "\u00A0",
	Nopf: "\u2115",
	Not: "\u2AEC",
	NotCongruent: "\u2262",
	NotCupCap: "\u226D",
	NotDoubleVerticalBar: "\u2226",
	NotElement: "\u2209",
	NotEqual: "\u2260",
	NotEqualTilde: "\u2242\u0338",
	NotExists: "\u2204",
	NotGreater: "\u226F",
	NotGreaterEqual: "\u2271",
	NotGreaterFullEqual: "\u2267\u0338",
	NotGreaterGreater: "\u226B\u0338",
	NotGreaterLess: "\u2279",
	NotGreaterSlantEqual: "\u2A7E\u0338",
	NotGreaterTilde: "\u2275",
	NotHumpDownHump: "\u224E\u0338",
	NotHumpEqual: "\u224F\u0338",
	NotLeftTriangle: "\u22EA",
	NotLeftTriangleBar: "\u29CF\u0338",
	NotLeftTriangleEqual: "\u22EC",
	NotLess: "\u226E",
	NotLessEqual: "\u2270",
	NotLessGreater: "\u2278",
	NotLessLess: "\u226A\u0338",
	NotLessSlantEqual: "\u2A7D\u0338",
	NotLessTilde: "\u2274",
	NotNestedGreaterGreater: "\u2AA2\u0338",
	NotNestedLessLess: "\u2AA1\u0338",
	NotPrecedes: "\u2280",
	NotPrecedesEqual: "\u2AAF\u0338",
	NotPrecedesSlantEqual: "\u22E0",
	NotReverseElement: "\u220C",
	NotRightTriangle: "\u22EB",
	NotRightTriangleBar: "\u29D0\u0338",
	NotRightTriangleEqual: "\u22ED",
	NotSquareSubset: "\u228F\u0338",
	NotSquareSubsetEqual: "\u22E2",
	NotSquareSuperset: "\u2290\u0338",
	NotSquareSupersetEqual: "\u22E3",
	NotSubset: "\u2282\u20D2",
	NotSubsetEqual: "\u2288",
	NotSucceeds: "\u2281",
	NotSucceedsEqual: "\u2AB0\u0338",
	NotSucceedsSlantEqual: "\u22E1",
	NotSucceedsTilde: "\u227F\u0338",
	NotSuperset: "\u2283\u20D2",
	NotSupersetEqual: "\u2289",
	NotTilde: "\u2241",
	NotTildeEqual: "\u2244",
	NotTildeFullEqual: "\u2247",
	NotTildeTilde: "\u2249",
	NotVerticalBar: "\u2224",
	Nscr: "\u{1D4A9}",
	Ntilde: "\u00D1",
	Nu: "\u039D",
	OElig: "\u0152",
	Oacute: "\u00D3",
	Ocirc: "\u00D4",
	Ocy: "\u041E",
	Odblac: "\u0150",
	Ofr: "\u{1D512}",
	Ograve: "\u00D2",
	Omacr: "\u014C",
	Omega: "\u03A9",
	Omicron: "\u039F",
	Oopf: "\u{1D546}",
	OpenCurlyDoubleQuote: "\u201C",
	OpenCurlyQuote: "\u2018",
	Or: "\u2A54",
	Oscr: "\u{1D4AA}",
	Oslash: "\u00D8",
	Otilde: "\u00D5",
	Otimes: "\u2A37",
	Ouml: "\u00D6",
	OverBar: "\u203E",
	OverBrace: "\u23DE",
	OverBracket: "\u23B4",
	OverParenthesis: "\u23DC",
	PartialD: "\u2202",
	Pcy: "\u041F",
	Pfr: "\u{1D513}",
	Phi: "\u03A6",
	Pi: "\u03A0",
	PlusMinus: "\u00B1",
	Poincareplane: "\u210C",
	Popf: "\u2119",
	Pr: "\u2ABB",
	Precedes: "\u227A",
	PrecedesEqual: "\u2AAF",
	PrecedesSlantEqual: "\u227C",
	PrecedesTilde: "\u227E",
	Prime: "\u2033",
	Product: "\u220F",
	Proportion: "\u2237",
	Proportional: "\u221D",
	Pscr: "\u{1D4AB}",
	Psi: "\u03A8",
	QUOT: "\"",
	Qfr: "\u{1D514}",
	Qopf: "\u211A",
	Qscr: "\u{1D4AC}",
	RBarr: "\u2910",
	REG: "\u00AE",
	Racute: "\u0154",
	Rang: "\u27EB",
	Rarr: "\u21A0",
	Rarrtl: "\u2916",
	Rcaron: "\u0158",
	Rcedil: "\u0156",
	Rcy: "\u0420",
	Re: "\u211C",
	ReverseElement: "\u220B",
	ReverseEquilibrium: "\u21CB",
	ReverseUpEquilibrium: "\u296F",
	Rfr: "\u211C",
	Rho: "\u03A1",
	RightAngleBracket: "\u27E9",
	RightArrow: "\u2192",
	RightArrowBar: "\u21E5",
	RightArrowLeftArrow: "\u21C4",
	RightCeiling: "\u2309",
	RightDoubleBracket: "\u27E7",
	RightDownTeeVector: "\u295D",
	RightDownVector: "\u21C2",
	RightDownVectorBar: "\u2955",
	RightFloor: "\u230B",
	RightTee: "\u22A2",
	RightTeeArrow: "\u21A6",
	RightTeeVector: "\u295B",
	RightTriangle: "\u22B3",
	RightTriangleBar: "\u29D0",
	RightTriangleEqual: "\u22B5",
	RightUpDownVector: "\u294F",
	RightUpTeeVector: "\u295C",
	RightUpVector: "\u21BE",
	RightUpVectorBar: "\u2954",
	RightVector: "\u21C0",
	RightVectorBar: "\u2953",
	Rightarrow: "\u21D2",
	Ropf: "\u211D",
	RoundImplies: "\u2970",
	Rrightarrow: "\u21DB",
	Rscr: "\u211B",
	Rsh: "\u21B1",
	RuleDelayed: "\u29F4",
	SHCHcy: "\u0429",
	SHcy: "\u0428",
	SOFTcy: "\u042C",
	Sacute: "\u015A",
	Sc: "\u2ABC",
	Scaron: "\u0160",
	Scedil: "\u015E",
	Scirc: "\u015C",
	Scy: "\u0421",
	Sfr: "\u{1D516}",
	ShortDownArrow: "\u2193",
	ShortLeftArrow: "\u2190",
	ShortRightArrow: "\u2192",
	ShortUpArrow: "\u2191",
	Sigma: "\u03A3",
	SmallCircle: "\u2218",
	Sopf: "\u{1D54A}",
	Sqrt: "\u221A",
	Square: "\u25A1",
	SquareIntersection: "\u2293",
	SquareSubset: "\u228F",
	SquareSubsetEqual: "\u2291",
	SquareSuperset: "\u2290",
	SquareSupersetEqual: "\u2292",
	SquareUnion: "\u2294",
	Sscr: "\u{1D4AE}",
	Star: "\u22C6",
	Sub: "\u22D0",
	Subset: "\u22D0",
	SubsetEqual: "\u2286",
	Succeeds: "\u227B",
	SucceedsEqual: "\u2AB0",
	SucceedsSlantEqual: "\u227D",
	SucceedsTilde: "\u227F",
	SuchThat: "\u220B",
	Sum: "\u2211",
	Sup: "\u22D1",
	Superset: "\u2283",
	SupersetEqual: "\u2287",
	Supset: "\u22D1",
	THORN: "\u00DE",
	TRADE: "\u2122",
	TSHcy: "\u040B",
	TScy: "\u0426",
	Tab: "	",
	Tau: "\u03A4",
	Tcaron: "\u0164",
	Tcedil: "\u0162",
	Tcy: "\u0422",
	Tfr: "\u{1D517}",
	Therefore: "\u2234",
	Theta: "\u0398",
	ThickSpace: "\u205F\u200A",
	ThinSpace: "\u2009",
	Tilde: "\u223C",
	TildeEqual: "\u2243",
	TildeFullEqual: "\u2245",
	TildeTilde: "\u2248",
	Topf: "\u{1D54B}",
	TripleDot: "\u20DB",
	Tscr: "\u{1D4AF}",
	Tstrok: "\u0166",
	Uacute: "\u00DA",
	Uarr: "\u219F",
	Uarrocir: "\u2949",
	Ubrcy: "\u040E",
	Ubreve: "\u016C",
	Ucirc: "\u00DB",
	Ucy: "\u0423",
	Udblac: "\u0170",
	Ufr: "\u{1D518}",
	Ugrave: "\u00D9",
	Umacr: "\u016A",
	UnderBar: "_",
	UnderBrace: "\u23DF",
	UnderBracket: "\u23B5",
	UnderParenthesis: "\u23DD",
	Union: "\u22C3",
	UnionPlus: "\u228E",
	Uogon: "\u0172",
	Uopf: "\u{1D54C}",
	UpArrow: "\u2191",
	UpArrowBar: "\u2912",
	UpArrowDownArrow: "\u21C5",
	UpDownArrow: "\u2195",
	UpEquilibrium: "\u296E",
	UpTee: "\u22A5",
	UpTeeArrow: "\u21A5",
	Uparrow: "\u21D1",
	Updownarrow: "\u21D5",
	UpperLeftArrow: "\u2196",
	UpperRightArrow: "\u2197",
	Upsi: "\u03D2",
	Upsilon: "\u03A5",
	Uring: "\u016E",
	Uscr: "\u{1D4B0}",
	Utilde: "\u0168",
	Uuml: "\u00DC",
	VDash: "\u22AB",
	Vbar: "\u2AEB",
	Vcy: "\u0412",
	Vdash: "\u22A9",
	Vdashl: "\u2AE6",
	Vee: "\u22C1",
	Verbar: "\u2016",
	Vert: "\u2016",
	VerticalBar: "\u2223",
	VerticalLine: "|",
	VerticalSeparator: "\u2758",
	VerticalTilde: "\u2240",
	VeryThinSpace: "\u200A",
	Vfr: "\u{1D519}",
	Vopf: "\u{1D54D}",
	Vscr: "\u{1D4B1}",
	Vvdash: "\u22AA",
	Wcirc: "\u0174",
	Wedge: "\u22C0",
	Wfr: "\u{1D51A}",
	Wopf: "\u{1D54E}",
	Wscr: "\u{1D4B2}",
	Xfr: "\u{1D51B}",
	Xi: "\u039E",
	Xopf: "\u{1D54F}",
	Xscr: "\u{1D4B3}",
	YAcy: "\u042F",
	YIcy: "\u0407",
	YUcy: "\u042E",
	Yacute: "\u00DD",
	Ycirc: "\u0176",
	Ycy: "\u042B",
	Yfr: "\u{1D51C}",
	Yopf: "\u{1D550}",
	Yscr: "\u{1D4B4}",
	Yuml: "\u0178",
	ZHcy: "\u0416",
	Zacute: "\u0179",
	Zcaron: "\u017D",
	Zcy: "\u0417",
	Zdot: "\u017B",
	ZeroWidthSpace: "\u200B",
	Zeta: "\u0396",
	Zfr: "\u2128",
	Zopf: "\u2124",
	Zscr: "\u{1D4B5}",
	aacute: "\u00E1",
	abreve: "\u0103",
	ac: "\u223E",
	acE: "\u223E\u0333",
	acd: "\u223F",
	acirc: "\u00E2",
	acute: "\u00B4",
	acy: "\u0430",
	aelig: "\u00E6",
	af: "\u2061",
	afr: "\u{1D51E}",
	agrave: "\u00E0",
	alefsym: "\u2135",
	aleph: "\u2135",
	alpha: "\u03B1",
	amacr: "\u0101",
	amalg: "\u2A3F",
	amp: "&",
	and: "\u2227",
	andand: "\u2A55",
	andd: "\u2A5C",
	andslope: "\u2A58",
	andv: "\u2A5A",
	ang: "\u2220",
	ange: "\u29A4",
	angle: "\u2220",
	angmsd: "\u2221",
	angmsdaa: "\u29A8",
	angmsdab: "\u29A9",
	angmsdac: "\u29AA",
	angmsdad: "\u29AB",
	angmsdae: "\u29AC",
	angmsdaf: "\u29AD",
	angmsdag: "\u29AE",
	angmsdah: "\u29AF",
	angrt: "\u221F",
	angrtvb: "\u22BE",
	angrtvbd: "\u299D",
	angsph: "\u2222",
	angst: "\u00C5",
	angzarr: "\u237C",
	aogon: "\u0105",
	aopf: "\u{1D552}",
	ap: "\u2248",
	apE: "\u2A70",
	apacir: "\u2A6F",
	ape: "\u224A",
	apid: "\u224B",
	apos: "'",
	approx: "\u2248",
	approxeq: "\u224A",
	aring: "\u00E5",
	ascr: "\u{1D4B6}",
	ast: "*",
	asymp: "\u2248",
	asympeq: "\u224D",
	atilde: "\u00E3",
	auml: "\u00E4",
	awconint: "\u2233",
	awint: "\u2A11",
	bNot: "\u2AED",
	backcong: "\u224C",
	backepsilon: "\u03F6",
	backprime: "\u2035",
	backsim: "\u223D",
	backsimeq: "\u22CD",
	barvee: "\u22BD",
	barwed: "\u2305",
	barwedge: "\u2305",
	bbrk: "\u23B5",
	bbrktbrk: "\u23B6",
	bcong: "\u224C",
	bcy: "\u0431",
	bdquo: "\u201E",
	becaus: "\u2235",
	because: "\u2235",
	bemptyv: "\u29B0",
	bepsi: "\u03F6",
	bernou: "\u212C",
	beta: "\u03B2",
	beth: "\u2136",
	between: "\u226C",
	bfr: "\u{1D51F}",
	bigcap: "\u22C2",
	bigcirc: "\u25EF",
	bigcup: "\u22C3",
	bigodot: "\u2A00",
	bigoplus: "\u2A01",
	bigotimes: "\u2A02",
	bigsqcup: "\u2A06",
	bigstar: "\u2605",
	bigtriangledown: "\u25BD",
	bigtriangleup: "\u25B3",
	biguplus: "\u2A04",
	bigvee: "\u22C1",
	bigwedge: "\u22C0",
	bkarow: "\u290D",
	blacklozenge: "\u29EB",
	blacksquare: "\u25AA",
	blacktriangle: "\u25B4",
	blacktriangledown: "\u25BE",
	blacktriangleleft: "\u25C2",
	blacktriangleright: "\u25B8",
	blank: "\u2423",
	blk12: "\u2592",
	blk14: "\u2591",
	blk34: "\u2593",
	block: "\u2588",
	bne: "=\u20E5",
	bnequiv: "\u2261\u20E5",
	bnot: "\u2310",
	bopf: "\u{1D553}",
	bot: "\u22A5",
	bottom: "\u22A5",
	bowtie: "\u22C8",
	boxDL: "\u2557",
	boxDR: "\u2554",
	boxDl: "\u2556",
	boxDr: "\u2553",
	boxH: "\u2550",
	boxHD: "\u2566",
	boxHU: "\u2569",
	boxHd: "\u2564",
	boxHu: "\u2567",
	boxUL: "\u255D",
	boxUR: "\u255A",
	boxUl: "\u255C",
	boxUr: "\u2559",
	boxV: "\u2551",
	boxVH: "\u256C",
	boxVL: "\u2563",
	boxVR: "\u2560",
	boxVh: "\u256B",
	boxVl: "\u2562",
	boxVr: "\u255F",
	boxbox: "\u29C9",
	boxdL: "\u2555",
	boxdR: "\u2552",
	boxdl: "\u2510",
	boxdr: "\u250C",
	boxh: "\u2500",
	boxhD: "\u2565",
	boxhU: "\u2568",
	boxhd: "\u252C",
	boxhu: "\u2534",
	boxminus: "\u229F",
	boxplus: "\u229E",
	boxtimes: "\u22A0",
	boxuL: "\u255B",
	boxuR: "\u2558",
	boxul: "\u2518",
	boxur: "\u2514",
	boxv: "\u2502",
	boxvH: "\u256A",
	boxvL: "\u2561",
	boxvR: "\u255E",
	boxvh: "\u253C",
	boxvl: "\u2524",
	boxvr: "\u251C",
	bprime: "\u2035",
	breve: "\u02D8",
	brvbar: "\u00A6",
	bscr: "\u{1D4B7}",
	bsemi: "\u204F",
	bsim: "\u223D",
	bsime: "\u22CD",
	bsol: "\\",
	bsolb: "\u29C5",
	bsolhsub: "\u27C8",
	bull: "\u2022",
	bullet: "\u2022",
	bump: "\u224E",
	bumpE: "\u2AAE",
	bumpe: "\u224F",
	bumpeq: "\u224F",
	cacute: "\u0107",
	cap: "\u2229",
	capand: "\u2A44",
	capbrcup: "\u2A49",
	capcap: "\u2A4B",
	capcup: "\u2A47",
	capdot: "\u2A40",
	caps: "\u2229\uFE00",
	caret: "\u2041",
	caron: "\u02C7",
	ccaps: "\u2A4D",
	ccaron: "\u010D",
	ccedil: "\u00E7",
	ccirc: "\u0109",
	ccups: "\u2A4C",
	ccupssm: "\u2A50",
	cdot: "\u010B",
	cedil: "\u00B8",
	cemptyv: "\u29B2",
	cent: "\u00A2",
	centerdot: "\u00B7",
	cfr: "\u{1D520}",
	chcy: "\u0447",
	check: "\u2713",
	checkmark: "\u2713",
	chi: "\u03C7",
	cir: "\u25CB",
	cirE: "\u29C3",
	circ: "\u02C6",
	circeq: "\u2257",
	circlearrowleft: "\u21BA",
	circlearrowright: "\u21BB",
	circledR: "\u00AE",
	circledS: "\u24C8",
	circledast: "\u229B",
	circledcirc: "\u229A",
	circleddash: "\u229D",
	cire: "\u2257",
	cirfnint: "\u2A10",
	cirmid: "\u2AEF",
	cirscir: "\u29C2",
	clubs: "\u2663",
	clubsuit: "\u2663",
	colon: ":",
	colone: "\u2254",
	coloneq: "\u2254",
	comma: ",",
	commat: "@",
	comp: "\u2201",
	compfn: "\u2218",
	complement: "\u2201",
	complexes: "\u2102",
	cong: "\u2245",
	congdot: "\u2A6D",
	conint: "\u222E",
	copf: "\u{1D554}",
	coprod: "\u2210",
	copy: "\u00A9",
	copysr: "\u2117",
	crarr: "\u21B5",
	cross: "\u2717",
	cscr: "\u{1D4B8}",
	csub: "\u2ACF",
	csube: "\u2AD1",
	csup: "\u2AD0",
	csupe: "\u2AD2",
	ctdot: "\u22EF",
	cudarrl: "\u2938",
	cudarrr: "\u2935",
	cuepr: "\u22DE",
	cuesc: "\u22DF",
	cularr: "\u21B6",
	cularrp: "\u293D",
	cup: "\u222A",
	cupbrcap: "\u2A48",
	cupcap: "\u2A46",
	cupcup: "\u2A4A",
	cupdot: "\u228D",
	cupor: "\u2A45",
	cups: "\u222A\uFE00",
	curarr: "\u21B7",
	curarrm: "\u293C",
	curlyeqprec: "\u22DE",
	curlyeqsucc: "\u22DF",
	curlyvee: "\u22CE",
	curlywedge: "\u22CF",
	curren: "\u00A4",
	curvearrowleft: "\u21B6",
	curvearrowright: "\u21B7",
	cuvee: "\u22CE",
	cuwed: "\u22CF",
	cwconint: "\u2232",
	cwint: "\u2231",
	cylcty: "\u232D",
	dArr: "\u21D3",
	dHar: "\u2965",
	dagger: "\u2020",
	daleth: "\u2138",
	darr: "\u2193",
	dash: "\u2010",
	dashv: "\u22A3",
	dbkarow: "\u290F",
	dblac: "\u02DD",
	dcaron: "\u010F",
	dcy: "\u0434",
	dd: "\u2146",
	ddagger: "\u2021",
	ddarr: "\u21CA",
	ddotseq: "\u2A77",
	deg: "\u00B0",
	delta: "\u03B4",
	demptyv: "\u29B1",
	dfisht: "\u297F",
	dfr: "\u{1D521}",
	dharl: "\u21C3",
	dharr: "\u21C2",
	diam: "\u22C4",
	diamond: "\u22C4",
	diamondsuit: "\u2666",
	diams: "\u2666",
	die: "\u00A8",
	digamma: "\u03DD",
	disin: "\u22F2",
	div: "\u00F7",
	divide: "\u00F7",
	divideontimes: "\u22C7",
	divonx: "\u22C7",
	djcy: "\u0452",
	dlcorn: "\u231E",
	dlcrop: "\u230D",
	dollar: "$",
	dopf: "\u{1D555}",
	dot: "\u02D9",
	doteq: "\u2250",
	doteqdot: "\u2251",
	dotminus: "\u2238",
	dotplus: "\u2214",
	dotsquare: "\u22A1",
	doublebarwedge: "\u2306",
	downarrow: "\u2193",
	downdownarrows: "\u21CA",
	downharpoonleft: "\u21C3",
	downharpoonright: "\u21C2",
	drbkarow: "\u2910",
	drcorn: "\u231F",
	drcrop: "\u230C",
	dscr: "\u{1D4B9}",
	dscy: "\u0455",
	dsol: "\u29F6",
	dstrok: "\u0111",
	dtdot: "\u22F1",
	dtri: "\u25BF",
	dtrif: "\u25BE",
	duarr: "\u21F5",
	duhar: "\u296F",
	dwangle: "\u29A6",
	dzcy: "\u045F",
	dzigrarr: "\u27FF",
	eDDot: "\u2A77",
	eDot: "\u2251",
	eacute: "\u00E9",
	easter: "\u2A6E",
	ecaron: "\u011B",
	ecir: "\u2256",
	ecirc: "\u00EA",
	ecolon: "\u2255",
	ecy: "\u044D",
	edot: "\u0117",
	ee: "\u2147",
	efDot: "\u2252",
	efr: "\u{1D522}",
	eg: "\u2A9A",
	egrave: "\u00E8",
	egs: "\u2A96",
	egsdot: "\u2A98",
	el: "\u2A99",
	elinters: "\u23E7",
	ell: "\u2113",
	els: "\u2A95",
	elsdot: "\u2A97",
	emacr: "\u0113",
	empty: "\u2205",
	emptyset: "\u2205",
	emptyv: "\u2205",
	emsp13: "\u2004",
	emsp14: "\u2005",
	emsp: "\u2003",
	eng: "\u014B",
	ensp: "\u2002",
	eogon: "\u0119",
	eopf: "\u{1D556}",
	epar: "\u22D5",
	eparsl: "\u29E3",
	eplus: "\u2A71",
	epsi: "\u03B5",
	epsilon: "\u03B5",
	epsiv: "\u03F5",
	eqcirc: "\u2256",
	eqcolon: "\u2255",
	eqsim: "\u2242",
	eqslantgtr: "\u2A96",
	eqslantless: "\u2A95",
	equals: "=",
	equest: "\u225F",
	equiv: "\u2261",
	equivDD: "\u2A78",
	eqvparsl: "\u29E5",
	erDot: "\u2253",
	erarr: "\u2971",
	escr: "\u212F",
	esdot: "\u2250",
	esim: "\u2242",
	eta: "\u03B7",
	eth: "\u00F0",
	euml: "\u00EB",
	euro: "\u20AC",
	excl: "!",
	exist: "\u2203",
	expectation: "\u2130",
	exponentiale: "\u2147",
	fallingdotseq: "\u2252",
	fcy: "\u0444",
	female: "\u2640",
	ffilig: "\uFB03",
	fflig: "\uFB00",
	ffllig: "\uFB04",
	ffr: "\u{1D523}",
	filig: "\uFB01",
	fjlig: "fj",
	flat: "\u266D",
	fllig: "\uFB02",
	fltns: "\u25B1",
	fnof: "\u0192",
	fopf: "\u{1D557}",
	forall: "\u2200",
	fork: "\u22D4",
	forkv: "\u2AD9",
	fpartint: "\u2A0D",
	frac12: "\u00BD",
	frac13: "\u2153",
	frac14: "\u00BC",
	frac15: "\u2155",
	frac16: "\u2159",
	frac18: "\u215B",
	frac23: "\u2154",
	frac25: "\u2156",
	frac34: "\u00BE",
	frac35: "\u2157",
	frac38: "\u215C",
	frac45: "\u2158",
	frac56: "\u215A",
	frac58: "\u215D",
	frac78: "\u215E",
	frasl: "\u2044",
	frown: "\u2322",
	fscr: "\u{1D4BB}",
	gE: "\u2267",
	gEl: "\u2A8C",
	gacute: "\u01F5",
	gamma: "\u03B3",
	gammad: "\u03DD",
	gap: "\u2A86",
	gbreve: "\u011F",
	gcirc: "\u011D",
	gcy: "\u0433",
	gdot: "\u0121",
	ge: "\u2265",
	gel: "\u22DB",
	geq: "\u2265",
	geqq: "\u2267",
	geqslant: "\u2A7E",
	ges: "\u2A7E",
	gescc: "\u2AA9",
	gesdot: "\u2A80",
	gesdoto: "\u2A82",
	gesdotol: "\u2A84",
	gesl: "\u22DB\uFE00",
	gesles: "\u2A94",
	gfr: "\u{1D524}",
	gg: "\u226B",
	ggg: "\u22D9",
	gimel: "\u2137",
	gjcy: "\u0453",
	gl: "\u2277",
	glE: "\u2A92",
	gla: "\u2AA5",
	glj: "\u2AA4",
	gnE: "\u2269",
	gnap: "\u2A8A",
	gnapprox: "\u2A8A",
	gne: "\u2A88",
	gneq: "\u2A88",
	gneqq: "\u2269",
	gnsim: "\u22E7",
	gopf: "\u{1D558}",
	grave: "`",
	gscr: "\u210A",
	gsim: "\u2273",
	gsime: "\u2A8E",
	gsiml: "\u2A90",
	gt: ">",
	gtcc: "\u2AA7",
	gtcir: "\u2A7A",
	gtdot: "\u22D7",
	gtlPar: "\u2995",
	gtquest: "\u2A7C",
	gtrapprox: "\u2A86",
	gtrarr: "\u2978",
	gtrdot: "\u22D7",
	gtreqless: "\u22DB",
	gtreqqless: "\u2A8C",
	gtrless: "\u2277",
	gtrsim: "\u2273",
	gvertneqq: "\u2269\uFE00",
	gvnE: "\u2269\uFE00",
	hArr: "\u21D4",
	hairsp: "\u200A",
	half: "\u00BD",
	hamilt: "\u210B",
	hardcy: "\u044A",
	harr: "\u2194",
	harrcir: "\u2948",
	harrw: "\u21AD",
	hbar: "\u210F",
	hcirc: "\u0125",
	hearts: "\u2665",
	heartsuit: "\u2665",
	hellip: "\u2026",
	hercon: "\u22B9",
	hfr: "\u{1D525}",
	hksearow: "\u2925",
	hkswarow: "\u2926",
	hoarr: "\u21FF",
	homtht: "\u223B",
	hookleftarrow: "\u21A9",
	hookrightarrow: "\u21AA",
	hopf: "\u{1D559}",
	horbar: "\u2015",
	hscr: "\u{1D4BD}",
	hslash: "\u210F",
	hstrok: "\u0127",
	hybull: "\u2043",
	hyphen: "\u2010",
	iacute: "\u00ED",
	ic: "\u2063",
	icirc: "\u00EE",
	icy: "\u0438",
	iecy: "\u0435",
	iexcl: "\u00A1",
	iff: "\u21D4",
	ifr: "\u{1D526}",
	igrave: "\u00EC",
	ii: "\u2148",
	iiiint: "\u2A0C",
	iiint: "\u222D",
	iinfin: "\u29DC",
	iiota: "\u2129",
	ijlig: "\u0133",
	imacr: "\u012B",
	image: "\u2111",
	imagline: "\u2110",
	imagpart: "\u2111",
	imath: "\u0131",
	imof: "\u22B7",
	imped: "\u01B5",
	in: "\u2208",
	incare: "\u2105",
	infin: "\u221E",
	infintie: "\u29DD",
	inodot: "\u0131",
	int: "\u222B",
	intcal: "\u22BA",
	integers: "\u2124",
	intercal: "\u22BA",
	intlarhk: "\u2A17",
	intprod: "\u2A3C",
	iocy: "\u0451",
	iogon: "\u012F",
	iopf: "\u{1D55A}",
	iota: "\u03B9",
	iprod: "\u2A3C",
	iquest: "\u00BF",
	iscr: "\u{1D4BE}",
	isin: "\u2208",
	isinE: "\u22F9",
	isindot: "\u22F5",
	isins: "\u22F4",
	isinsv: "\u22F3",
	isinv: "\u2208",
	it: "\u2062",
	itilde: "\u0129",
	iukcy: "\u0456",
	iuml: "\u00EF",
	jcirc: "\u0135",
	jcy: "\u0439",
	jfr: "\u{1D527}",
	jmath: "\u0237",
	jopf: "\u{1D55B}",
	jscr: "\u{1D4BF}",
	jsercy: "\u0458",
	jukcy: "\u0454",
	kappa: "\u03BA",
	kappav: "\u03F0",
	kcedil: "\u0137",
	kcy: "\u043A",
	kfr: "\u{1D528}",
	kgreen: "\u0138",
	khcy: "\u0445",
	kjcy: "\u045C",
	kopf: "\u{1D55C}",
	kscr: "\u{1D4C0}",
	lAarr: "\u21DA",
	lArr: "\u21D0",
	lAtail: "\u291B",
	lBarr: "\u290E",
	lE: "\u2266",
	lEg: "\u2A8B",
	lHar: "\u2962",
	lacute: "\u013A",
	laemptyv: "\u29B4",
	lagran: "\u2112",
	lambda: "\u03BB",
	lang: "\u27E8",
	langd: "\u2991",
	langle: "\u27E8",
	lap: "\u2A85",
	laquo: "\u00AB",
	larr: "\u2190",
	larrb: "\u21E4",
	larrbfs: "\u291F",
	larrfs: "\u291D",
	larrhk: "\u21A9",
	larrlp: "\u21AB",
	larrpl: "\u2939",
	larrsim: "\u2973",
	larrtl: "\u21A2",
	lat: "\u2AAB",
	latail: "\u2919",
	late: "\u2AAD",
	lates: "\u2AAD\uFE00",
	lbarr: "\u290C",
	lbbrk: "\u2772",
	lbrace: "{",
	lbrack: "[",
	lbrke: "\u298B",
	lbrksld: "\u298F",
	lbrkslu: "\u298D",
	lcaron: "\u013E",
	lcedil: "\u013C",
	lceil: "\u2308",
	lcub: "{",
	lcy: "\u043B",
	ldca: "\u2936",
	ldquo: "\u201C",
	ldquor: "\u201E",
	ldrdhar: "\u2967",
	ldrushar: "\u294B",
	ldsh: "\u21B2",
	le: "\u2264",
	leftarrow: "\u2190",
	leftarrowtail: "\u21A2",
	leftharpoondown: "\u21BD",
	leftharpoonup: "\u21BC",
	leftleftarrows: "\u21C7",
	leftrightarrow: "\u2194",
	leftrightarrows: "\u21C6",
	leftrightharpoons: "\u21CB",
	leftrightsquigarrow: "\u21AD",
	leftthreetimes: "\u22CB",
	leg: "\u22DA",
	leq: "\u2264",
	leqq: "\u2266",
	leqslant: "\u2A7D",
	les: "\u2A7D",
	lescc: "\u2AA8",
	lesdot: "\u2A7F",
	lesdoto: "\u2A81",
	lesdotor: "\u2A83",
	lesg: "\u22DA\uFE00",
	lesges: "\u2A93",
	lessapprox: "\u2A85",
	lessdot: "\u22D6",
	lesseqgtr: "\u22DA",
	lesseqqgtr: "\u2A8B",
	lessgtr: "\u2276",
	lesssim: "\u2272",
	lfisht: "\u297C",
	lfloor: "\u230A",
	lfr: "\u{1D529}",
	lg: "\u2276",
	lgE: "\u2A91",
	lhard: "\u21BD",
	lharu: "\u21BC",
	lharul: "\u296A",
	lhblk: "\u2584",
	ljcy: "\u0459",
	ll: "\u226A",
	llarr: "\u21C7",
	llcorner: "\u231E",
	llhard: "\u296B",
	lltri: "\u25FA",
	lmidot: "\u0140",
	lmoust: "\u23B0",
	lmoustache: "\u23B0",
	lnE: "\u2268",
	lnap: "\u2A89",
	lnapprox: "\u2A89",
	lne: "\u2A87",
	lneq: "\u2A87",
	lneqq: "\u2268",
	lnsim: "\u22E6",
	loang: "\u27EC",
	loarr: "\u21FD",
	lobrk: "\u27E6",
	longleftarrow: "\u27F5",
	longleftrightarrow: "\u27F7",
	longmapsto: "\u27FC",
	longrightarrow: "\u27F6",
	looparrowleft: "\u21AB",
	looparrowright: "\u21AC",
	lopar: "\u2985",
	lopf: "\u{1D55D}",
	loplus: "\u2A2D",
	lotimes: "\u2A34",
	lowast: "\u2217",
	lowbar: "_",
	loz: "\u25CA",
	lozenge: "\u25CA",
	lozf: "\u29EB",
	lpar: "(",
	lparlt: "\u2993",
	lrarr: "\u21C6",
	lrcorner: "\u231F",
	lrhar: "\u21CB",
	lrhard: "\u296D",
	lrm: "\u200E",
	lrtri: "\u22BF",
	lsaquo: "\u2039",
	lscr: "\u{1D4C1}",
	lsh: "\u21B0",
	lsim: "\u2272",
	lsime: "\u2A8D",
	lsimg: "\u2A8F",
	lsqb: "[",
	lsquo: "\u2018",
	lsquor: "\u201A",
	lstrok: "\u0142",
	lt: "<",
	ltcc: "\u2AA6",
	ltcir: "\u2A79",
	ltdot: "\u22D6",
	lthree: "\u22CB",
	ltimes: "\u22C9",
	ltlarr: "\u2976",
	ltquest: "\u2A7B",
	ltrPar: "\u2996",
	ltri: "\u25C3",
	ltrie: "\u22B4",
	ltrif: "\u25C2",
	lurdshar: "\u294A",
	luruhar: "\u2966",
	lvertneqq: "\u2268\uFE00",
	lvnE: "\u2268\uFE00",
	mDDot: "\u223A",
	macr: "\u00AF",
	male: "\u2642",
	malt: "\u2720",
	maltese: "\u2720",
	map: "\u21A6",
	mapsto: "\u21A6",
	mapstodown: "\u21A7",
	mapstoleft: "\u21A4",
	mapstoup: "\u21A5",
	marker: "\u25AE",
	mcomma: "\u2A29",
	mcy: "\u043C",
	mdash: "\u2014",
	measuredangle: "\u2221",
	mfr: "\u{1D52A}",
	mho: "\u2127",
	micro: "\u00B5",
	mid: "\u2223",
	midast: "*",
	midcir: "\u2AF0",
	middot: "\u00B7",
	minus: "\u2212",
	minusb: "\u229F",
	minusd: "\u2238",
	minusdu: "\u2A2A",
	mlcp: "\u2ADB",
	mldr: "\u2026",
	mnplus: "\u2213",
	models: "\u22A7",
	mopf: "\u{1D55E}",
	mp: "\u2213",
	mscr: "\u{1D4C2}",
	mstpos: "\u223E",
	mu: "\u03BC",
	multimap: "\u22B8",
	mumap: "\u22B8",
	nGg: "\u22D9\u0338",
	nGt: "\u226B\u20D2",
	nGtv: "\u226B\u0338",
	nLeftarrow: "\u21CD",
	nLeftrightarrow: "\u21CE",
	nLl: "\u22D8\u0338",
	nLt: "\u226A\u20D2",
	nLtv: "\u226A\u0338",
	nRightarrow: "\u21CF",
	nVDash: "\u22AF",
	nVdash: "\u22AE",
	nabla: "\u2207",
	nacute: "\u0144",
	nang: "\u2220\u20D2",
	nap: "\u2249",
	napE: "\u2A70\u0338",
	napid: "\u224B\u0338",
	napos: "\u0149",
	napprox: "\u2249",
	natur: "\u266E",
	natural: "\u266E",
	naturals: "\u2115",
	nbsp: "\u00A0",
	nbump: "\u224E\u0338",
	nbumpe: "\u224F\u0338",
	ncap: "\u2A43",
	ncaron: "\u0148",
	ncedil: "\u0146",
	ncong: "\u2247",
	ncongdot: "\u2A6D\u0338",
	ncup: "\u2A42",
	ncy: "\u043D",
	ndash: "\u2013",
	ne: "\u2260",
	neArr: "\u21D7",
	nearhk: "\u2924",
	nearr: "\u2197",
	nearrow: "\u2197",
	nedot: "\u2250\u0338",
	nequiv: "\u2262",
	nesear: "\u2928",
	nesim: "\u2242\u0338",
	nexist: "\u2204",
	nexists: "\u2204",
	nfr: "\u{1D52B}",
	ngE: "\u2267\u0338",
	nge: "\u2271",
	ngeq: "\u2271",
	ngeqq: "\u2267\u0338",
	ngeqslant: "\u2A7E\u0338",
	nges: "\u2A7E\u0338",
	ngsim: "\u2275",
	ngt: "\u226F",
	ngtr: "\u226F",
	nhArr: "\u21CE",
	nharr: "\u21AE",
	nhpar: "\u2AF2",
	ni: "\u220B",
	nis: "\u22FC",
	nisd: "\u22FA",
	niv: "\u220B",
	njcy: "\u045A",
	nlArr: "\u21CD",
	nlE: "\u2266\u0338",
	nlarr: "\u219A",
	nldr: "\u2025",
	nle: "\u2270",
	nleftarrow: "\u219A",
	nleftrightarrow: "\u21AE",
	nleq: "\u2270",
	nleqq: "\u2266\u0338",
	nleqslant: "\u2A7D\u0338",
	nles: "\u2A7D\u0338",
	nless: "\u226E",
	nlsim: "\u2274",
	nlt: "\u226E",
	nltri: "\u22EA",
	nltrie: "\u22EC",
	nmid: "\u2224",
	nopf: "\u{1D55F}",
	not: "\u00AC",
	notin: "\u2209",
	notinE: "\u22F9\u0338",
	notindot: "\u22F5\u0338",
	notinva: "\u2209",
	notinvb: "\u22F7",
	notinvc: "\u22F6",
	notni: "\u220C",
	notniva: "\u220C",
	notnivb: "\u22FE",
	notnivc: "\u22FD",
	npar: "\u2226",
	nparallel: "\u2226",
	nparsl: "\u2AFD\u20E5",
	npart: "\u2202\u0338",
	npolint: "\u2A14",
	npr: "\u2280",
	nprcue: "\u22E0",
	npre: "\u2AAF\u0338",
	nprec: "\u2280",
	npreceq: "\u2AAF\u0338",
	nrArr: "\u21CF",
	nrarr: "\u219B",
	nrarrc: "\u2933\u0338",
	nrarrw: "\u219D\u0338",
	nrightarrow: "\u219B",
	nrtri: "\u22EB",
	nrtrie: "\u22ED",
	nsc: "\u2281",
	nsccue: "\u22E1",
	nsce: "\u2AB0\u0338",
	nscr: "\u{1D4C3}",
	nshortmid: "\u2224",
	nshortparallel: "\u2226",
	nsim: "\u2241",
	nsime: "\u2244",
	nsimeq: "\u2244",
	nsmid: "\u2224",
	nspar: "\u2226",
	nsqsube: "\u22E2",
	nsqsupe: "\u22E3",
	nsub: "\u2284",
	nsubE: "\u2AC5\u0338",
	nsube: "\u2288",
	nsubset: "\u2282\u20D2",
	nsubseteq: "\u2288",
	nsubseteqq: "\u2AC5\u0338",
	nsucc: "\u2281",
	nsucceq: "\u2AB0\u0338",
	nsup: "\u2285",
	nsupE: "\u2AC6\u0338",
	nsupe: "\u2289",
	nsupset: "\u2283\u20D2",
	nsupseteq: "\u2289",
	nsupseteqq: "\u2AC6\u0338",
	ntgl: "\u2279",
	ntilde: "\u00F1",
	ntlg: "\u2278",
	ntriangleleft: "\u22EA",
	ntrianglelefteq: "\u22EC",
	ntriangleright: "\u22EB",
	ntrianglerighteq: "\u22ED",
	nu: "\u03BD",
	num: "#",
	numero: "\u2116",
	numsp: "\u2007",
	nvDash: "\u22AD",
	nvHarr: "\u2904",
	nvap: "\u224D\u20D2",
	nvdash: "\u22AC",
	nvge: "\u2265\u20D2",
	nvgt: ">\u20D2",
	nvinfin: "\u29DE",
	nvlArr: "\u2902",
	nvle: "\u2264\u20D2",
	nvlt: "<\u20D2",
	nvltrie: "\u22B4\u20D2",
	nvrArr: "\u2903",
	nvrtrie: "\u22B5\u20D2",
	nvsim: "\u223C\u20D2",
	nwArr: "\u21D6",
	nwarhk: "\u2923",
	nwarr: "\u2196",
	nwarrow: "\u2196",
	nwnear: "\u2927",
	oS: "\u24C8",
	oacute: "\u00F3",
	oast: "\u229B",
	ocir: "\u229A",
	ocirc: "\u00F4",
	ocy: "\u043E",
	odash: "\u229D",
	odblac: "\u0151",
	odiv: "\u2A38",
	odot: "\u2299",
	odsold: "\u29BC",
	oelig: "\u0153",
	ofcir: "\u29BF",
	ofr: "\u{1D52C}",
	ogon: "\u02DB",
	ograve: "\u00F2",
	ogt: "\u29C1",
	ohbar: "\u29B5",
	ohm: "\u03A9",
	oint: "\u222E",
	olarr: "\u21BA",
	olcir: "\u29BE",
	olcross: "\u29BB",
	oline: "\u203E",
	olt: "\u29C0",
	omacr: "\u014D",
	omega: "\u03C9",
	omicron: "\u03BF",
	omid: "\u29B6",
	ominus: "\u2296",
	oopf: "\u{1D560}",
	opar: "\u29B7",
	operp: "\u29B9",
	oplus: "\u2295",
	or: "\u2228",
	orarr: "\u21BB",
	ord: "\u2A5D",
	order: "\u2134",
	orderof: "\u2134",
	ordf: "\u00AA",
	ordm: "\u00BA",
	origof: "\u22B6",
	oror: "\u2A56",
	orslope: "\u2A57",
	orv: "\u2A5B",
	oscr: "\u2134",
	oslash: "\u00F8",
	osol: "\u2298",
	otilde: "\u00F5",
	otimes: "\u2297",
	otimesas: "\u2A36",
	ouml: "\u00F6",
	ovbar: "\u233D",
	par: "\u2225",
	para: "\u00B6",
	parallel: "\u2225",
	parsim: "\u2AF3",
	parsl: "\u2AFD",
	part: "\u2202",
	pcy: "\u043F",
	percnt: "%",
	period: ".",
	permil: "\u2030",
	perp: "\u22A5",
	pertenk: "\u2031",
	pfr: "\u{1D52D}",
	phi: "\u03C6",
	phiv: "\u03D5",
	phmmat: "\u2133",
	phone: "\u260E",
	pi: "\u03C0",
	pitchfork: "\u22D4",
	piv: "\u03D6",
	planck: "\u210F",
	planckh: "\u210E",
	plankv: "\u210F",
	plus: "+",
	plusacir: "\u2A23",
	plusb: "\u229E",
	pluscir: "\u2A22",
	plusdo: "\u2214",
	plusdu: "\u2A25",
	pluse: "\u2A72",
	plusmn: "\u00B1",
	plussim: "\u2A26",
	plustwo: "\u2A27",
	pm: "\u00B1",
	pointint: "\u2A15",
	popf: "\u{1D561}",
	pound: "\u00A3",
	pr: "\u227A",
	prE: "\u2AB3",
	prap: "\u2AB7",
	prcue: "\u227C",
	pre: "\u2AAF",
	prec: "\u227A",
	precapprox: "\u2AB7",
	preccurlyeq: "\u227C",
	preceq: "\u2AAF",
	precnapprox: "\u2AB9",
	precneqq: "\u2AB5",
	precnsim: "\u22E8",
	precsim: "\u227E",
	prime: "\u2032",
	primes: "\u2119",
	prnE: "\u2AB5",
	prnap: "\u2AB9",
	prnsim: "\u22E8",
	prod: "\u220F",
	profalar: "\u232E",
	profline: "\u2312",
	profsurf: "\u2313",
	prop: "\u221D",
	propto: "\u221D",
	prsim: "\u227E",
	prurel: "\u22B0",
	pscr: "\u{1D4C5}",
	psi: "\u03C8",
	puncsp: "\u2008",
	qfr: "\u{1D52E}",
	qint: "\u2A0C",
	qopf: "\u{1D562}",
	qprime: "\u2057",
	qscr: "\u{1D4C6}",
	quaternions: "\u210D",
	quatint: "\u2A16",
	quest: "?",
	questeq: "\u225F",
	quot: "\"",
	rAarr: "\u21DB",
	rArr: "\u21D2",
	rAtail: "\u291C",
	rBarr: "\u290F",
	rHar: "\u2964",
	race: "\u223D\u0331",
	racute: "\u0155",
	radic: "\u221A",
	raemptyv: "\u29B3",
	rang: "\u27E9",
	rangd: "\u2992",
	range: "\u29A5",
	rangle: "\u27E9",
	raquo: "\u00BB",
	rarr: "\u2192",
	rarrap: "\u2975",
	rarrb: "\u21E5",
	rarrbfs: "\u2920",
	rarrc: "\u2933",
	rarrfs: "\u291E",
	rarrhk: "\u21AA",
	rarrlp: "\u21AC",
	rarrpl: "\u2945",
	rarrsim: "\u2974",
	rarrtl: "\u21A3",
	rarrw: "\u219D",
	ratail: "\u291A",
	ratio: "\u2236",
	rationals: "\u211A",
	rbarr: "\u290D",
	rbbrk: "\u2773",
	rbrace: "}",
	rbrack: "]",
	rbrke: "\u298C",
	rbrksld: "\u298E",
	rbrkslu: "\u2990",
	rcaron: "\u0159",
	rcedil: "\u0157",
	rceil: "\u2309",
	rcub: "}",
	rcy: "\u0440",
	rdca: "\u2937",
	rdldhar: "\u2969",
	rdquo: "\u201D",
	rdquor: "\u201D",
	rdsh: "\u21B3",
	real: "\u211C",
	realine: "\u211B",
	realpart: "\u211C",
	reals: "\u211D",
	rect: "\u25AD",
	reg: "\u00AE",
	rfisht: "\u297D",
	rfloor: "\u230B",
	rfr: "\u{1D52F}",
	rhard: "\u21C1",
	rharu: "\u21C0",
	rharul: "\u296C",
	rho: "\u03C1",
	rhov: "\u03F1",
	rightarrow: "\u2192",
	rightarrowtail: "\u21A3",
	rightharpoondown: "\u21C1",
	rightharpoonup: "\u21C0",
	rightleftarrows: "\u21C4",
	rightleftharpoons: "\u21CC",
	rightrightarrows: "\u21C9",
	rightsquigarrow: "\u219D",
	rightthreetimes: "\u22CC",
	ring: "\u02DA",
	risingdotseq: "\u2253",
	rlarr: "\u21C4",
	rlhar: "\u21CC",
	rlm: "\u200F",
	rmoust: "\u23B1",
	rmoustache: "\u23B1",
	rnmid: "\u2AEE",
	roang: "\u27ED",
	roarr: "\u21FE",
	robrk: "\u27E7",
	ropar: "\u2986",
	ropf: "\u{1D563}",
	roplus: "\u2A2E",
	rotimes: "\u2A35",
	rpar: ")",
	rpargt: "\u2994",
	rppolint: "\u2A12",
	rrarr: "\u21C9",
	rsaquo: "\u203A",
	rscr: "\u{1D4C7}",
	rsh: "\u21B1",
	rsqb: "]",
	rsquo: "\u2019",
	rsquor: "\u2019",
	rthree: "\u22CC",
	rtimes: "\u22CA",
	rtri: "\u25B9",
	rtrie: "\u22B5",
	rtrif: "\u25B8",
	rtriltri: "\u29CE",
	ruluhar: "\u2968",
	rx: "\u211E",
	sacute: "\u015B",
	sbquo: "\u201A",
	sc: "\u227B",
	scE: "\u2AB4",
	scap: "\u2AB8",
	scaron: "\u0161",
	sccue: "\u227D",
	sce: "\u2AB0",
	scedil: "\u015F",
	scirc: "\u015D",
	scnE: "\u2AB6",
	scnap: "\u2ABA",
	scnsim: "\u22E9",
	scpolint: "\u2A13",
	scsim: "\u227F",
	scy: "\u0441",
	sdot: "\u22C5",
	sdotb: "\u22A1",
	sdote: "\u2A66",
	seArr: "\u21D8",
	searhk: "\u2925",
	searr: "\u2198",
	searrow: "\u2198",
	sect: "\u00A7",
	semi: ";",
	seswar: "\u2929",
	setminus: "\u2216",
	setmn: "\u2216",
	sext: "\u2736",
	sfr: "\u{1D530}",
	sfrown: "\u2322",
	sharp: "\u266F",
	shchcy: "\u0449",
	shcy: "\u0448",
	shortmid: "\u2223",
	shortparallel: "\u2225",
	shy: "\u00AD",
	sigma: "\u03C3",
	sigmaf: "\u03C2",
	sigmav: "\u03C2",
	sim: "\u223C",
	simdot: "\u2A6A",
	sime: "\u2243",
	simeq: "\u2243",
	simg: "\u2A9E",
	simgE: "\u2AA0",
	siml: "\u2A9D",
	simlE: "\u2A9F",
	simne: "\u2246",
	simplus: "\u2A24",
	simrarr: "\u2972",
	slarr: "\u2190",
	smallsetminus: "\u2216",
	smashp: "\u2A33",
	smeparsl: "\u29E4",
	smid: "\u2223",
	smile: "\u2323",
	smt: "\u2AAA",
	smte: "\u2AAC",
	smtes: "\u2AAC\uFE00",
	softcy: "\u044C",
	sol: "/",
	solb: "\u29C4",
	solbar: "\u233F",
	sopf: "\u{1D564}",
	spades: "\u2660",
	spadesuit: "\u2660",
	spar: "\u2225",
	sqcap: "\u2293",
	sqcaps: "\u2293\uFE00",
	sqcup: "\u2294",
	sqcups: "\u2294\uFE00",
	sqsub: "\u228F",
	sqsube: "\u2291",
	sqsubset: "\u228F",
	sqsubseteq: "\u2291",
	sqsup: "\u2290",
	sqsupe: "\u2292",
	sqsupset: "\u2290",
	sqsupseteq: "\u2292",
	squ: "\u25A1",
	square: "\u25A1",
	squarf: "\u25AA",
	squf: "\u25AA",
	srarr: "\u2192",
	sscr: "\u{1D4C8}",
	ssetmn: "\u2216",
	ssmile: "\u2323",
	sstarf: "\u22C6",
	star: "\u2606",
	starf: "\u2605",
	straightepsilon: "\u03F5",
	straightphi: "\u03D5",
	strns: "\u00AF",
	sub: "\u2282",
	subE: "\u2AC5",
	subdot: "\u2ABD",
	sube: "\u2286",
	subedot: "\u2AC3",
	submult: "\u2AC1",
	subnE: "\u2ACB",
	subne: "\u228A",
	subplus: "\u2ABF",
	subrarr: "\u2979",
	subset: "\u2282",
	subseteq: "\u2286",
	subseteqq: "\u2AC5",
	subsetneq: "\u228A",
	subsetneqq: "\u2ACB",
	subsim: "\u2AC7",
	subsub: "\u2AD5",
	subsup: "\u2AD3",
	succ: "\u227B",
	succapprox: "\u2AB8",
	succcurlyeq: "\u227D",
	succeq: "\u2AB0",
	succnapprox: "\u2ABA",
	succneqq: "\u2AB6",
	succnsim: "\u22E9",
	succsim: "\u227F",
	sum: "\u2211",
	sung: "\u266A",
	sup1: "\u00B9",
	sup2: "\u00B2",
	sup3: "\u00B3",
	sup: "\u2283",
	supE: "\u2AC6",
	supdot: "\u2ABE",
	supdsub: "\u2AD8",
	supe: "\u2287",
	supedot: "\u2AC4",
	suphsol: "\u27C9",
	suphsub: "\u2AD7",
	suplarr: "\u297B",
	supmult: "\u2AC2",
	supnE: "\u2ACC",
	supne: "\u228B",
	supplus: "\u2AC0",
	supset: "\u2283",
	supseteq: "\u2287",
	supseteqq: "\u2AC6",
	supsetneq: "\u228B",
	supsetneqq: "\u2ACC",
	supsim: "\u2AC8",
	supsub: "\u2AD4",
	supsup: "\u2AD6",
	swArr: "\u21D9",
	swarhk: "\u2926",
	swarr: "\u2199",
	swarrow: "\u2199",
	swnwar: "\u292A",
	szlig: "\u00DF",
	target: "\u2316",
	tau: "\u03C4",
	tbrk: "\u23B4",
	tcaron: "\u0165",
	tcedil: "\u0163",
	tcy: "\u0442",
	tdot: "\u20DB",
	telrec: "\u2315",
	tfr: "\u{1D531}",
	there4: "\u2234",
	therefore: "\u2234",
	theta: "\u03B8",
	thetasym: "\u03D1",
	thetav: "\u03D1",
	thickapprox: "\u2248",
	thicksim: "\u223C",
	thinsp: "\u2009",
	thkap: "\u2248",
	thksim: "\u223C",
	thorn: "\u00FE",
	tilde: "\u02DC",
	times: "\u00D7",
	timesb: "\u22A0",
	timesbar: "\u2A31",
	timesd: "\u2A30",
	tint: "\u222D",
	toea: "\u2928",
	top: "\u22A4",
	topbot: "\u2336",
	topcir: "\u2AF1",
	topf: "\u{1D565}",
	topfork: "\u2ADA",
	tosa: "\u2929",
	tprime: "\u2034",
	trade: "\u2122",
	triangle: "\u25B5",
	triangledown: "\u25BF",
	triangleleft: "\u25C3",
	trianglelefteq: "\u22B4",
	triangleq: "\u225C",
	triangleright: "\u25B9",
	trianglerighteq: "\u22B5",
	tridot: "\u25EC",
	trie: "\u225C",
	triminus: "\u2A3A",
	triplus: "\u2A39",
	trisb: "\u29CD",
	tritime: "\u2A3B",
	trpezium: "\u23E2",
	tscr: "\u{1D4C9}",
	tscy: "\u0446",
	tshcy: "\u045B",
	tstrok: "\u0167",
	twixt: "\u226C",
	twoheadleftarrow: "\u219E",
	twoheadrightarrow: "\u21A0",
	uArr: "\u21D1",
	uHar: "\u2963",
	uacute: "\u00FA",
	uarr: "\u2191",
	ubrcy: "\u045E",
	ubreve: "\u016D",
	ucirc: "\u00FB",
	ucy: "\u0443",
	udarr: "\u21C5",
	udblac: "\u0171",
	udhar: "\u296E",
	ufisht: "\u297E",
	ufr: "\u{1D532}",
	ugrave: "\u00F9",
	uharl: "\u21BF",
	uharr: "\u21BE",
	uhblk: "\u2580",
	ulcorn: "\u231C",
	ulcorner: "\u231C",
	ulcrop: "\u230F",
	ultri: "\u25F8",
	umacr: "\u016B",
	uml: "\u00A8",
	uogon: "\u0173",
	uopf: "\u{1D566}",
	uparrow: "\u2191",
	updownarrow: "\u2195",
	upharpoonleft: "\u21BF",
	upharpoonright: "\u21BE",
	uplus: "\u228E",
	upsi: "\u03C5",
	upsih: "\u03D2",
	upsilon: "\u03C5",
	upuparrows: "\u21C8",
	urcorn: "\u231D",
	urcorner: "\u231D",
	urcrop: "\u230E",
	uring: "\u016F",
	urtri: "\u25F9",
	uscr: "\u{1D4CA}",
	utdot: "\u22F0",
	utilde: "\u0169",
	utri: "\u25B5",
	utrif: "\u25B4",
	uuarr: "\u21C8",
	uuml: "\u00FC",
	uwangle: "\u29A7",
	vArr: "\u21D5",
	vBar: "\u2AE8",
	vBarv: "\u2AE9",
	vDash: "\u22A8",
	vangrt: "\u299C",
	varepsilon: "\u03F5",
	varkappa: "\u03F0",
	varnothing: "\u2205",
	varphi: "\u03D5",
	varpi: "\u03D6",
	varpropto: "\u221D",
	varr: "\u2195",
	varrho: "\u03F1",
	varsigma: "\u03C2",
	varsubsetneq: "\u228A\uFE00",
	varsubsetneqq: "\u2ACB\uFE00",
	varsupsetneq: "\u228B\uFE00",
	varsupsetneqq: "\u2ACC\uFE00",
	vartheta: "\u03D1",
	vartriangleleft: "\u22B2",
	vartriangleright: "\u22B3",
	vcy: "\u0432",
	vdash: "\u22A2",
	vee: "\u2228",
	veebar: "\u22BB",
	veeeq: "\u225A",
	vellip: "\u22EE",
	verbar: "|",
	vert: "|",
	vfr: "\u{1D533}",
	vltri: "\u22B2",
	vnsub: "\u2282\u20D2",
	vnsup: "\u2283\u20D2",
	vopf: "\u{1D567}",
	vprop: "\u221D",
	vrtri: "\u22B3",
	vscr: "\u{1D4CB}",
	vsubnE: "\u2ACB\uFE00",
	vsubne: "\u228A\uFE00",
	vsupnE: "\u2ACC\uFE00",
	vsupne: "\u228B\uFE00",
	vzigzag: "\u299A",
	wcirc: "\u0175",
	wedbar: "\u2A5F",
	wedge: "\u2227",
	wedgeq: "\u2259",
	weierp: "\u2118",
	wfr: "\u{1D534}",
	wopf: "\u{1D568}",
	wp: "\u2118",
	wr: "\u2240",
	wreath: "\u2240",
	wscr: "\u{1D4CC}",
	xcap: "\u22C2",
	xcirc: "\u25EF",
	xcup: "\u22C3",
	xdtri: "\u25BD",
	xfr: "\u{1D535}",
	xhArr: "\u27FA",
	xharr: "\u27F7",
	xi: "\u03BE",
	xlArr: "\u27F8",
	xlarr: "\u27F5",
	xmap: "\u27FC",
	xnis: "\u22FB",
	xodot: "\u2A00",
	xopf: "\u{1D569}",
	xoplus: "\u2A01",
	xotime: "\u2A02",
	xrArr: "\u27F9",
	xrarr: "\u27F6",
	xscr: "\u{1D4CD}",
	xsqcup: "\u2A06",
	xuplus: "\u2A04",
	xutri: "\u25B3",
	xvee: "\u22C1",
	xwedge: "\u22C0",
	yacute: "\u00FD",
	yacy: "\u044F",
	ycirc: "\u0177",
	ycy: "\u044B",
	yen: "\u00A5",
	yfr: "\u{1D536}",
	yicy: "\u0457",
	yopf: "\u{1D56A}",
	yscr: "\u{1D4CE}",
	yucy: "\u044E",
	yuml: "\u00FF",
	zacute: "\u017A",
	zcaron: "\u017E",
	zcy: "\u0437",
	zdot: "\u017C",
	zeetrf: "\u2128",
	zeta: "\u03B6",
	zfr: "\u{1D537}",
	zhcy: "\u0436",
	zigrarr: "\u21DD",
	zopf: "\u{1D56B}",
	zscr: "\u{1D4CF}",
	zwj: "\u200D",
	zwnj: "\u200C"
};
//#endregion
//#region node_modules/decode-named-character-reference/index.js
var own$1 = {}.hasOwnProperty;
/**
* Decode a single character reference (without the `&` or `;`).
* You probably only need this when you’re building parsers yourself that follow
* different rules compared to HTML.
* This is optimized to be tiny in browsers.
*
* @param {string} value
*   `notin` (named), `#123` (deci), `#x123` (hexa).
* @returns {string|false}
*   Decoded reference.
*/
function decodeNamedCharacterReference(value) {
	return own$1.call(characterEntities, value) ? characterEntities[value] : false;
}
//#endregion
//#region node_modules/micromark-util-chunked/index.js
/**
* Like `Array#splice`, but smarter for giant arrays.
*
* `Array#splice` takes all items to be inserted as individual argument which
* causes a stack overflow in V8 when trying to insert 100k items for instance.
*
* Otherwise, this does not return the removed items, and takes `items` as an
* array instead of rest parameters.
*
* @template {unknown} T
*   Item type.
* @param {Array<T>} list
*   List to operate on.
* @param {number} start
*   Index to remove/insert at (can be negative).
* @param {number} remove
*   Number of items to remove.
* @param {Array<T>} items
*   Items to inject into `list`.
* @returns {undefined}
*   Nothing.
*/
function splice(list, start, remove, items) {
	const end = list.length;
	let chunkStart = 0;
	/** @type {Array<unknown>} */
	let parameters;
	if (start < 0) start = -start > end ? 0 : end + start;
	else start = start > end ? end : start;
	remove = remove > 0 ? remove : 0;
	if (items.length < 1e4) {
		parameters = Array.from(items);
		parameters.unshift(start, remove);
		list.splice(...parameters);
	} else {
		if (remove) list.splice(start, remove);
		while (chunkStart < items.length) {
			parameters = items.slice(chunkStart, chunkStart + 1e4);
			parameters.unshift(start, 0);
			list.splice(...parameters);
			chunkStart += 1e4;
			start += 1e4;
		}
	}
}
/**
* Append `items` (an array) at the end of `list` (another array).
* When `list` was empty, returns `items` instead.
*
* This prevents a potentially expensive operation when `list` is empty,
* and adds items in batches to prevent V8 from hanging.
*
* @template {unknown} T
*   Item type.
* @param {Array<T>} list
*   List to operate on.
* @param {Array<T>} items
*   Items to add to `list`.
* @returns {Array<T>}
*   Either `list` or `items`.
*/
function push(list, items) {
	if (list.length > 0) {
		splice(list, list.length, 0, items);
		return list;
	}
	return items;
}
//#endregion
//#region node_modules/micromark-util-combine-extensions/index.js
/**
* @import {
*   Extension,
*   Handles,
*   HtmlExtension,
*   NormalizedExtension
* } from 'micromark-util-types'
*/
var hasOwnProperty = {}.hasOwnProperty;
/**
* Combine multiple syntax extensions into one.
*
* @param {ReadonlyArray<Extension>} extensions
*   List of syntax extensions.
* @returns {NormalizedExtension}
*   A single combined extension.
*/
function combineExtensions(extensions) {
	/** @type {NormalizedExtension} */
	const all = {};
	let index = -1;
	while (++index < extensions.length) syntaxExtension(all, extensions[index]);
	return all;
}
/**
* Merge `extension` into `all`.
*
* @param {NormalizedExtension} all
*   Extension to merge into.
* @param {Extension} extension
*   Extension to merge.
* @returns {undefined}
*   Nothing.
*/
function syntaxExtension(all, extension) {
	/** @type {keyof Extension} */
	let hook;
	for (hook in extension) {
		/** @type {Record<string, unknown>} */
		const left = (hasOwnProperty.call(all, hook) ? all[hook] : void 0) || (all[hook] = {});
		/** @type {Record<string, unknown> | undefined} */
		const right = extension[hook];
		/** @type {string} */
		let code;
		if (right) for (code in right) {
			if (!hasOwnProperty.call(left, code)) left[code] = [];
			const value = right[code];
			constructs(left[code], Array.isArray(value) ? value : value ? [value] : []);
		}
	}
}
/**
* Merge `list` into `existing` (both lists of constructs).
* Mutates `existing`.
*
* @param {Array<unknown>} existing
*   List of constructs to merge into.
* @param {Array<unknown>} list
*   List of constructs to merge.
* @returns {undefined}
*   Nothing.
*/
function constructs(existing, list) {
	let index = -1;
	/** @type {Array<unknown>} */
	const before = [];
	while (++index < list.length) (list[index].add === "after" ? existing : before).push(list[index]);
	splice(existing, 0, 0, before);
}
//#endregion
//#region node_modules/micromark-util-decode-numeric-character-reference/index.js
/**
* Turn the number (in string form as either hexa- or plain decimal) coming from
* a numeric character reference into a character.
*
* Sort of like `String.fromCodePoint(Number.parseInt(value, base))`, but makes
* non-characters and control characters safe.
*
* @param {string} value
*   Value to decode.
* @param {number} base
*   Numeric base.
* @returns {string}
*   Character.
*/
function decodeNumericCharacterReference(value, base) {
	const code = Number.parseInt(value, base);
	if (code < 9 || code === 11 || code > 13 && code < 32 || code > 126 && code < 160 || code > 55295 && code < 57344 || code > 64975 && code < 65008 || (code & 65535) === 65535 || (code & 65535) === 65534 || code > 1114111) return "\uFFFD";
	return String.fromCodePoint(code);
}
//#endregion
//#region node_modules/micromark-util-normalize-identifier/index.js
/**
* Normalize an identifier (as found in references, definitions).
*
* Collapses markdown whitespace, trim, and then lower- and uppercase.
*
* Some characters are considered “uppercase”, such as U+03F4 (`ϴ`), but if their
* lowercase counterpart (U+03B8 (`θ`)) is uppercased will result in a different
* uppercase character (U+0398 (`Θ`)).
* So, to get a canonical form, we perform both lower- and uppercase.
*
* Using uppercase last makes sure keys will never interact with default
* prototypal values (such as `constructor`): nothing in the prototype of
* `Object` is uppercase.
*
* @param {string} value
*   Identifier to normalize.
* @returns {string}
*   Normalized identifier.
*/
function normalizeIdentifier(value) {
	return value.replace(/[\t\n\r ]+/g, " ").replace(/^ | $/g, "").toLowerCase().toUpperCase();
}
//#endregion
//#region node_modules/micromark-util-character/index.js
/**
* @import {Code} from 'micromark-util-types'
*/
/**
* Check whether the character code represents an ASCII alpha (`a` through `z`,
* case insensitive).
*
* An **ASCII alpha** is an ASCII upper alpha or ASCII lower alpha.
*
* An **ASCII upper alpha** is a character in the inclusive range U+0041 (`A`)
* to U+005A (`Z`).
*
* An **ASCII lower alpha** is a character in the inclusive range U+0061 (`a`)
* to U+007A (`z`).
*
* @param code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
var asciiAlpha = regexCheck(/[A-Za-z]/);
/**
* Check whether the character code represents an ASCII alphanumeric (`a`
* through `z`, case insensitive, or `0` through `9`).
*
* An **ASCII alphanumeric** is an ASCII digit (see `asciiDigit`) or ASCII alpha
* (see `asciiAlpha`).
*
* @param code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
var asciiAlphanumeric = regexCheck(/[\dA-Za-z]/);
/**
* Check whether the character code represents an ASCII atext.
*
* atext is an ASCII alphanumeric (see `asciiAlphanumeric`), or a character in
* the inclusive ranges U+0023 NUMBER SIGN (`#`) to U+0027 APOSTROPHE (`'`),
* U+002A ASTERISK (`*`), U+002B PLUS SIGN (`+`), U+002D DASH (`-`), U+002F
* SLASH (`/`), U+003D EQUALS TO (`=`), U+003F QUESTION MARK (`?`), U+005E
* CARET (`^`) to U+0060 GRAVE ACCENT (`` ` ``), or U+007B LEFT CURLY BRACE
* (`{`) to U+007E TILDE (`~`).
*
* See:
* **\[RFC5322]**:
* [Internet Message Format](https://tools.ietf.org/html/rfc5322).
* P. Resnick.
* IETF.
*
* @param code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
var asciiAtext = regexCheck(/[#-'*+\--9=?A-Z^-~]/);
/**
* Check whether a character code is an ASCII control character.
*
* An **ASCII control** is a character in the inclusive range U+0000 NULL (NUL)
* to U+001F (US), or U+007F (DEL).
*
* @param {Code} code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
function asciiControl(code) {
	return code !== null && (code < 32 || code === 127);
}
/**
* Check whether the character code represents an ASCII digit (`0` through `9`).
*
* An **ASCII digit** is a character in the inclusive range U+0030 (`0`) to
* U+0039 (`9`).
*
* @param code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
var asciiDigit = regexCheck(/\d/);
/**
* Check whether the character code represents an ASCII hex digit (`a` through
* `f`, case insensitive, or `0` through `9`).
*
* An **ASCII hex digit** is an ASCII digit (see `asciiDigit`), ASCII upper hex
* digit, or an ASCII lower hex digit.
*
* An **ASCII upper hex digit** is a character in the inclusive range U+0041
* (`A`) to U+0046 (`F`).
*
* An **ASCII lower hex digit** is a character in the inclusive range U+0061
* (`a`) to U+0066 (`f`).
*
* @param code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
var asciiHexDigit = regexCheck(/[\dA-Fa-f]/);
/**
* Check whether the character code represents ASCII punctuation.
*
* An **ASCII punctuation** is a character in the inclusive ranges U+0021
* EXCLAMATION MARK (`!`) to U+002F SLASH (`/`), U+003A COLON (`:`) to U+0040 AT
* SIGN (`@`), U+005B LEFT SQUARE BRACKET (`[`) to U+0060 GRAVE ACCENT
* (`` ` ``), or U+007B LEFT CURLY BRACE (`{`) to U+007E TILDE (`~`).
*
* @param code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
var asciiPunctuation = regexCheck(/[!-/:-@[-`{-~]/);
/**
* Check whether a character code is a markdown line ending.
*
* A **markdown line ending** is the virtual characters M-0003 CARRIAGE RETURN
* LINE FEED (CRLF), M-0004 LINE FEED (LF) and M-0005 CARRIAGE RETURN (CR).
*
* In micromark, the actual character U+000A LINE FEED (LF) and U+000D CARRIAGE
* RETURN (CR) are replaced by these virtual characters depending on whether
* they occurred together.
*
* @param {Code} code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
function markdownLineEnding(code) {
	return code !== null && code < -2;
}
/**
* Check whether a character code is a markdown line ending (see
* `markdownLineEnding`) or markdown space (see `markdownSpace`).
*
* @param {Code} code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
function markdownLineEndingOrSpace(code) {
	return code !== null && (code < 0 || code === 32);
}
/**
* Check whether a character code is a markdown space.
*
* A **markdown space** is the concrete character U+0020 SPACE (SP) and the
* virtual characters M-0001 VIRTUAL SPACE (VS) and M-0002 HORIZONTAL TAB (HT).
*
* In micromark, the actual character U+0009 CHARACTER TABULATION (HT) is
* replaced by one M-0002 HORIZONTAL TAB (HT) and between 0 and 3 M-0001 VIRTUAL
* SPACE (VS) characters, depending on the column at which the tab occurred.
*
* @param {Code} code
*   Code.
* @returns {boolean}
*   Whether it matches.
*/
function markdownSpace(code) {
	return code === -2 || code === -1 || code === 32;
}
/**
* Check whether the character code represents Unicode punctuation.
*
* A **Unicode punctuation** is a character in the Unicode `Pc` (Punctuation,
* Connector), `Pd` (Punctuation, Dash), `Pe` (Punctuation, Close), `Pf`
* (Punctuation, Final quote), `Pi` (Punctuation, Initial quote), `Po`
* (Punctuation, Other), or `Ps` (Punctuation, Open) categories, or an ASCII
* punctuation (see `asciiPunctuation`).
*
* See:
* **\[UNICODE]**:
* [The Unicode Standard](https://www.unicode.org/versions/).
* Unicode Consortium.
*
* @param code
*   Code.
* @returns
*   Whether it matches.
*/
var unicodePunctuation = regexCheck(/\p{P}|\p{S}/u);
/**
* Check whether the character code represents Unicode whitespace.
*
* Note that this does handle micromark specific markdown whitespace characters.
* See `markdownLineEndingOrSpace` to check that.
*
* A **Unicode whitespace** is a character in the Unicode `Zs` (Separator,
* Space) category, or U+0009 CHARACTER TABULATION (HT), U+000A LINE FEED (LF),
* U+000C (FF), or U+000D CARRIAGE RETURN (CR) (**\[UNICODE]**).
*
* See:
* **\[UNICODE]**:
* [The Unicode Standard](https://www.unicode.org/versions/).
* Unicode Consortium.
*
* @param code
*   Code.
* @returns
*   Whether it matches.
*/
var unicodeWhitespace = regexCheck(/\s/);
/**
* Create a code check from a regex.
*
* @param {RegExp} regex
*   Expression.
* @returns {(code: Code) => boolean}
*   Check.
*/
function regexCheck(regex) {
	return check;
	/**
	* Check whether a code matches the bound regex.
	*
	* @param {Code} code
	*   Character code.
	* @returns {boolean}
	*   Whether the character code matches the bound regex.
	*/
	function check(code) {
		return code !== null && code > -1 && regex.test(String.fromCharCode(code));
	}
}
//#endregion
//#region node_modules/micromark-factory-space/index.js
/**
* @import {Effects, State, TokenType} from 'micromark-util-types'
*/
/**
* Parse spaces and tabs.
*
* There is no `nok` parameter:
*
* *   spaces in markdown are often optional, in which case this factory can be
*     used and `ok` will be switched to whether spaces were found or not
* *   one line ending or space can be detected with `markdownSpace(code)` right
*     before using `factorySpace`
*
* ###### Examples
*
* Where `␉` represents a tab (plus how much it expands) and `␠` represents a
* single space.
*
* ```markdown
* ␉
* ␠␠␠␠
* ␉␠
* ```
*
* @param {Effects} effects
*   Context.
* @param {State} ok
*   State switched to when successful.
* @param {TokenType} type
*   Type (`' \t'`).
* @param {number | undefined} [max=Infinity]
*   Max (exclusive).
* @returns {State}
*   Start state.
*/
function factorySpace(effects, ok, type, max) {
	const limit = max ? max - 1 : Number.POSITIVE_INFINITY;
	let size = 0;
	return start;
	/** @type {State} */
	function start(code) {
		if (markdownSpace(code)) {
			effects.enter(type);
			return prefix(code);
		}
		return ok(code);
	}
	/** @type {State} */
	function prefix(code) {
		if (markdownSpace(code) && size++ < limit) {
			effects.consume(code);
			return prefix;
		}
		effects.exit(type);
		return ok(code);
	}
}
//#endregion
//#region node_modules/micromark/lib/initialize/content.js
/**
* @import {
*   InitialConstruct,
*   Initializer,
*   State,
*   TokenizeContext,
*   Token
* } from 'micromark-util-types'
*/
/** @type {InitialConstruct} */
var content$1 = { tokenize: initializeContent };
/**
* @this {TokenizeContext}
*   Context.
* @type {Initializer}
*   Content.
*/
function initializeContent(effects) {
	const contentStart = effects.attempt(this.parser.constructs.contentInitial, afterContentStartConstruct, paragraphInitial);
	/** @type {Token} */
	let previous;
	return contentStart;
	/** @type {State} */
	function afterContentStartConstruct(code) {
		if (code === null) {
			effects.consume(code);
			return;
		}
		effects.enter("lineEnding");
		effects.consume(code);
		effects.exit("lineEnding");
		return factorySpace(effects, contentStart, "linePrefix");
	}
	/** @type {State} */
	function paragraphInitial(code) {
		effects.enter("paragraph");
		return lineStart(code);
	}
	/** @type {State} */
	function lineStart(code) {
		const token = effects.enter("chunkText", {
			contentType: "text",
			previous
		});
		if (previous) previous.next = token;
		previous = token;
		return data(code);
	}
	/** @type {State} */
	function data(code) {
		if (code === null) {
			effects.exit("chunkText");
			effects.exit("paragraph");
			effects.consume(code);
			return;
		}
		if (markdownLineEnding(code)) {
			effects.consume(code);
			effects.exit("chunkText");
			return lineStart;
		}
		effects.consume(code);
		return data;
	}
}
//#endregion
//#region node_modules/micromark/lib/initialize/document.js
/**
* @import {
*   Construct,
*   ContainerState,
*   InitialConstruct,
*   Initializer,
*   Point,
*   State,
*   TokenizeContext,
*   Tokenizer,
*   Token
* } from 'micromark-util-types'
*/
/**
* @typedef {[Construct, ContainerState]} StackItem
*   Construct and its state.
*/
/** @type {InitialConstruct} */
var document$1 = { tokenize: initializeDocument };
/** @type {Construct} */
var containerConstruct = { tokenize: tokenizeContainer };
/**
* @this {TokenizeContext}
*   Self.
* @type {Initializer}
*   Initializer.
*/
function initializeDocument(effects) {
	const self = this;
	/** @type {Array<StackItem>} */
	const stack = [];
	let continued = 0;
	/** @type {TokenizeContext | undefined} */
	let childFlow;
	/** @type {Token | undefined} */
	let childToken;
	/** @type {number} */
	let lineStartOffset;
	return start;
	/** @type {State} */
	function start(code) {
		if (continued < stack.length) {
			const item = stack[continued];
			self.containerState = item[1];
			return effects.attempt(item[0].continuation, documentContinue, checkNewContainers)(code);
		}
		return checkNewContainers(code);
	}
	/** @type {State} */
	function documentContinue(code) {
		continued++;
		if (self.containerState._closeFlow) {
			self.containerState._closeFlow = void 0;
			if (childFlow) closeFlow();
			const indexBeforeExits = self.events.length;
			let indexBeforeFlow = indexBeforeExits;
			/** @type {Point | undefined} */
			let point;
			while (indexBeforeFlow--) if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
				point = self.events[indexBeforeFlow][1].end;
				break;
			}
			exitContainers(continued);
			let index = indexBeforeExits;
			while (index < self.events.length) {
				self.events[index][1].end = { ...point };
				index++;
			}
			splice(self.events, indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
			self.events.length = index;
			return checkNewContainers(code);
		}
		return start(code);
	}
	/** @type {State} */
	function checkNewContainers(code) {
		if (continued === stack.length) {
			if (!childFlow) return documentContinued(code);
			if (childFlow.currentConstruct && childFlow.currentConstruct.concrete) return flowStart(code);
			self.interrupt = Boolean(childFlow.currentConstruct && !childFlow._gfmTableDynamicInterruptHack);
		}
		self.containerState = {};
		return effects.check(containerConstruct, thereIsANewContainer, thereIsNoNewContainer)(code);
	}
	/** @type {State} */
	function thereIsANewContainer(code) {
		if (childFlow) closeFlow();
		exitContainers(continued);
		return documentContinued(code);
	}
	/** @type {State} */
	function thereIsNoNewContainer(code) {
		self.parser.lazy[self.now().line] = continued !== stack.length;
		lineStartOffset = self.now().offset;
		return flowStart(code);
	}
	/** @type {State} */
	function documentContinued(code) {
		self.containerState = {};
		return effects.attempt(containerConstruct, containerContinue, flowStart)(code);
	}
	/** @type {State} */
	function containerContinue(code) {
		continued++;
		stack.push([self.currentConstruct, self.containerState]);
		return documentContinued(code);
	}
	/** @type {State} */
	function flowStart(code) {
		if (code === null) {
			if (childFlow) closeFlow();
			exitContainers(0);
			effects.consume(code);
			return;
		}
		childFlow = childFlow || self.parser.flow(self.now());
		effects.enter("chunkFlow", {
			_tokenizer: childFlow,
			contentType: "flow",
			previous: childToken
		});
		return flowContinue(code);
	}
	/** @type {State} */
	function flowContinue(code) {
		if (code === null) {
			writeToChild(effects.exit("chunkFlow"), true);
			exitContainers(0);
			effects.consume(code);
			return;
		}
		if (markdownLineEnding(code)) {
			effects.consume(code);
			writeToChild(effects.exit("chunkFlow"));
			continued = 0;
			self.interrupt = void 0;
			return start;
		}
		effects.consume(code);
		return flowContinue;
	}
	/**
	* @param {Token} token
	*   Token.
	* @param {boolean | undefined} [endOfFile]
	*   Whether the token is at the end of the file (default: `false`).
	* @returns {undefined}
	*   Nothing.
	*/
	function writeToChild(token, endOfFile) {
		const stream = self.sliceStream(token);
		if (endOfFile) stream.push(null);
		token.previous = childToken;
		if (childToken) childToken.next = token;
		childToken = token;
		childFlow.defineSkip(token.start);
		childFlow.write(stream);
		if (self.parser.lazy[token.start.line]) {
			let index = childFlow.events.length;
			while (index--) if (childFlow.events[index][1].start.offset < lineStartOffset && (!childFlow.events[index][1].end || childFlow.events[index][1].end.offset > lineStartOffset)) return;
			const indexBeforeExits = self.events.length;
			let indexBeforeFlow = indexBeforeExits;
			/** @type {boolean | undefined} */
			let seen;
			/** @type {Point | undefined} */
			let point;
			while (indexBeforeFlow--) if (self.events[indexBeforeFlow][0] === "exit" && self.events[indexBeforeFlow][1].type === "chunkFlow") {
				if (seen) {
					point = self.events[indexBeforeFlow][1].end;
					break;
				}
				seen = true;
			}
			exitContainers(continued);
			index = indexBeforeExits;
			while (index < self.events.length) {
				self.events[index][1].end = { ...point };
				index++;
			}
			splice(self.events, indexBeforeFlow + 1, 0, self.events.slice(indexBeforeExits));
			self.events.length = index;
		}
	}
	/**
	* @param {number} size
	*   Size.
	* @returns {undefined}
	*   Nothing.
	*/
	function exitContainers(size) {
		let index = stack.length;
		while (index-- > size) {
			const entry = stack[index];
			self.containerState = entry[1];
			entry[0].exit.call(self, effects);
		}
		stack.length = size;
	}
	function closeFlow() {
		childFlow.write([null]);
		childToken = void 0;
		childFlow = void 0;
		self.containerState._closeFlow = void 0;
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*   Tokenizer.
*/
function tokenizeContainer(effects, ok, nok) {
	return factorySpace(effects, effects.attempt(this.parser.constructs.document, ok, nok), "linePrefix", this.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4);
}
//#endregion
//#region node_modules/micromark-util-classify-character/index.js
/**
* @import {Code} from 'micromark-util-types'
*/
/**
* Classify whether a code represents whitespace, punctuation, or something
* else.
*
* Used for attention (emphasis, strong), whose sequences can open or close
* based on the class of surrounding characters.
*
* > 👉 **Note**: eof (`null`) is seen as whitespace.
*
* @param {Code} code
*   Code.
* @returns {typeof constants.characterGroupWhitespace | typeof constants.characterGroupPunctuation | undefined}
*   Group.
*/
function classifyCharacter(code) {
	if (code === null || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) return 1;
	if (unicodePunctuation(code)) return 2;
}
//#endregion
//#region node_modules/micromark-util-resolve-all/index.js
/**
* @import {Event, Resolver, TokenizeContext} from 'micromark-util-types'
*/
/**
* Call all `resolveAll`s.
*
* @param {ReadonlyArray<{resolveAll?: Resolver | undefined}>} constructs
*   List of constructs, optionally with `resolveAll`s.
* @param {Array<Event>} events
*   List of events.
* @param {TokenizeContext} context
*   Context used by `tokenize`.
* @returns {Array<Event>}
*   Changed events.
*/
function resolveAll(constructs, events, context) {
	/** @type {Array<Resolver>} */
	const called = [];
	let index = -1;
	while (++index < constructs.length) {
		const resolve = constructs[index].resolveAll;
		if (resolve && !called.includes(resolve)) {
			events = resolve(events, context);
			called.push(resolve);
		}
	}
	return events;
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/attention.js
/**
* @import {
*   Code,
*   Construct,
*   Event,
*   Point,
*   Resolver,
*   State,
*   TokenizeContext,
*   Tokenizer,
*   Token
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var attention = {
	name: "attention",
	resolveAll: resolveAllAttention,
	tokenize: tokenizeAttention
};
/**
* Take all events and resolve attention to emphasis or strong.
*
* @type {Resolver}
*/
function resolveAllAttention(events, context) {
	let index = -1;
	/** @type {number} */
	let open;
	/** @type {Token} */
	let group;
	/** @type {Token} */
	let text;
	/** @type {Token} */
	let openingSequence;
	/** @type {Token} */
	let closingSequence;
	/** @type {number} */
	let use;
	/** @type {Array<Event>} */
	let nextEvents;
	/** @type {number} */
	let offset;
	while (++index < events.length) if (events[index][0] === "enter" && events[index][1].type === "attentionSequence" && events[index][1]._close) {
		open = index;
		while (open--) if (events[open][0] === "exit" && events[open][1].type === "attentionSequence" && events[open][1]._open && context.sliceSerialize(events[open][1]).charCodeAt(0) === context.sliceSerialize(events[index][1]).charCodeAt(0)) {
			if ((events[open][1]._close || events[index][1]._open) && (events[index][1].end.offset - events[index][1].start.offset) % 3 && !((events[open][1].end.offset - events[open][1].start.offset + events[index][1].end.offset - events[index][1].start.offset) % 3)) continue;
			use = events[open][1].end.offset - events[open][1].start.offset > 1 && events[index][1].end.offset - events[index][1].start.offset > 1 ? 2 : 1;
			const start = { ...events[open][1].end };
			const end = { ...events[index][1].start };
			movePoint(start, -use);
			movePoint(end, use);
			openingSequence = {
				type: use > 1 ? "strongSequence" : "emphasisSequence",
				start,
				end: { ...events[open][1].end }
			};
			closingSequence = {
				type: use > 1 ? "strongSequence" : "emphasisSequence",
				start: { ...events[index][1].start },
				end
			};
			text = {
				type: use > 1 ? "strongText" : "emphasisText",
				start: { ...events[open][1].end },
				end: { ...events[index][1].start }
			};
			group = {
				type: use > 1 ? "strong" : "emphasis",
				start: { ...openingSequence.start },
				end: { ...closingSequence.end }
			};
			events[open][1].end = { ...openingSequence.start };
			events[index][1].start = { ...closingSequence.end };
			nextEvents = [];
			if (events[open][1].end.offset - events[open][1].start.offset) nextEvents = push(nextEvents, [[
				"enter",
				events[open][1],
				context
			], [
				"exit",
				events[open][1],
				context
			]]);
			nextEvents = push(nextEvents, [
				[
					"enter",
					group,
					context
				],
				[
					"enter",
					openingSequence,
					context
				],
				[
					"exit",
					openingSequence,
					context
				],
				[
					"enter",
					text,
					context
				]
			]);
			nextEvents = push(nextEvents, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + 1, index), context));
			nextEvents = push(nextEvents, [
				[
					"exit",
					text,
					context
				],
				[
					"enter",
					closingSequence,
					context
				],
				[
					"exit",
					closingSequence,
					context
				],
				[
					"exit",
					group,
					context
				]
			]);
			if (events[index][1].end.offset - events[index][1].start.offset) {
				offset = 2;
				nextEvents = push(nextEvents, [[
					"enter",
					events[index][1],
					context
				], [
					"exit",
					events[index][1],
					context
				]]);
			} else offset = 0;
			splice(events, open - 1, index - open + 3, nextEvents);
			index = open + nextEvents.length - offset - 2;
			break;
		}
	}
	index = -1;
	while (++index < events.length) if (events[index][1].type === "attentionSequence") events[index][1].type = "data";
	return events;
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeAttention(effects, ok) {
	const attentionMarkers = this.parser.constructs.attentionMarkers.null;
	const previous = this.previous;
	const before = classifyCharacter(previous);
	/** @type {NonNullable<Code>} */
	let marker;
	return start;
	/**
	* Before a sequence.
	*
	* ```markdown
	* > | **
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		marker = code;
		effects.enter("attentionSequence");
		return inside(code);
	}
	/**
	* In a sequence.
	*
	* ```markdown
	* > | **
	*     ^^
	* ```
	*
	* @type {State}
	*/
	function inside(code) {
		if (code === marker) {
			effects.consume(code);
			return inside;
		}
		const token = effects.exit("attentionSequence");
		const after = classifyCharacter(code);
		const open = !after || after === 2 && before || attentionMarkers.includes(code);
		const close = !before || before === 2 && after || attentionMarkers.includes(previous);
		token._open = Boolean(marker === 42 ? open : open && (before || !close));
		token._close = Boolean(marker === 42 ? close : close && (after || !open));
		return ok(code);
	}
}
/**
* Move a point a bit.
*
* Note: `move` only works inside lines! It’s not possible to move past other
* chunks (replacement characters, tabs, or line endings).
*
* @param {Point} point
*   Point.
* @param {number} offset
*   Amount to move.
* @returns {undefined}
*   Nothing.
*/
function movePoint(point, offset) {
	point.column += offset;
	point.offset += offset;
	point._bufferIndex += offset;
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/autolink.js
/**
* @import {
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var autolink = {
	name: "autolink",
	tokenize: tokenizeAutolink
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeAutolink(effects, ok, nok) {
	let size = 0;
	return start;
	/**
	* Start of an autolink.
	*
	* ```markdown
	* > | a<https://example.com>b
	*      ^
	* > | a<user@example.com>b
	*      ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("autolink");
		effects.enter("autolinkMarker");
		effects.consume(code);
		effects.exit("autolinkMarker");
		effects.enter("autolinkProtocol");
		return open;
	}
	/**
	* After `<`, at protocol or atext.
	*
	* ```markdown
	* > | a<https://example.com>b
	*       ^
	* > | a<user@example.com>b
	*       ^
	* ```
	*
	* @type {State}
	*/
	function open(code) {
		if (asciiAlpha(code)) {
			effects.consume(code);
			return schemeOrEmailAtext;
		}
		if (code === 64) return nok(code);
		return emailAtext(code);
	}
	/**
	* At second byte of protocol or atext.
	*
	* ```markdown
	* > | a<https://example.com>b
	*        ^
	* > | a<user@example.com>b
	*        ^
	* ```
	*
	* @type {State}
	*/
	function schemeOrEmailAtext(code) {
		if (code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)) {
			size = 1;
			return schemeInsideOrEmailAtext(code);
		}
		return emailAtext(code);
	}
	/**
	* In ambiguous protocol or atext.
	*
	* ```markdown
	* > | a<https://example.com>b
	*        ^
	* > | a<user@example.com>b
	*        ^
	* ```
	*
	* @type {State}
	*/
	function schemeInsideOrEmailAtext(code) {
		if (code === 58) {
			effects.consume(code);
			size = 0;
			return urlInside;
		}
		if ((code === 43 || code === 45 || code === 46 || asciiAlphanumeric(code)) && size++ < 32) {
			effects.consume(code);
			return schemeInsideOrEmailAtext;
		}
		size = 0;
		return emailAtext(code);
	}
	/**
	* After protocol, in URL.
	*
	* ```markdown
	* > | a<https://example.com>b
	*             ^
	* ```
	*
	* @type {State}
	*/
	function urlInside(code) {
		if (code === 62) {
			effects.exit("autolinkProtocol");
			effects.enter("autolinkMarker");
			effects.consume(code);
			effects.exit("autolinkMarker");
			effects.exit("autolink");
			return ok;
		}
		if (code === null || code === 32 || code === 60 || asciiControl(code)) return nok(code);
		effects.consume(code);
		return urlInside;
	}
	/**
	* In email atext.
	*
	* ```markdown
	* > | a<user.name@example.com>b
	*              ^
	* ```
	*
	* @type {State}
	*/
	function emailAtext(code) {
		if (code === 64) {
			effects.consume(code);
			return emailAtSignOrDot;
		}
		if (asciiAtext(code)) {
			effects.consume(code);
			return emailAtext;
		}
		return nok(code);
	}
	/**
	* In label, after at-sign or dot.
	*
	* ```markdown
	* > | a<user.name@example.com>b
	*                 ^       ^
	* ```
	*
	* @type {State}
	*/
	function emailAtSignOrDot(code) {
		return asciiAlphanumeric(code) ? emailLabel(code) : nok(code);
	}
	/**
	* In label, where `.` and `>` are allowed.
	*
	* ```markdown
	* > | a<user.name@example.com>b
	*                   ^
	* ```
	*
	* @type {State}
	*/
	function emailLabel(code) {
		if (code === 46) {
			effects.consume(code);
			size = 0;
			return emailAtSignOrDot;
		}
		if (code === 62) {
			effects.exit("autolinkProtocol").type = "autolinkEmail";
			effects.enter("autolinkMarker");
			effects.consume(code);
			effects.exit("autolinkMarker");
			effects.exit("autolink");
			return ok;
		}
		return emailValue(code);
	}
	/**
	* In label, where `.` and `>` are *not* allowed.
	*
	* Though, this is also used in `emailLabel` to parse other values.
	*
	* ```markdown
	* > | a<user.name@ex-ample.com>b
	*                    ^
	* ```
	*
	* @type {State}
	*/
	function emailValue(code) {
		if ((code === 45 || asciiAlphanumeric(code)) && size++ < 63) {
			const next = code === 45 ? emailValue : emailLabel;
			effects.consume(code);
			return next;
		}
		return nok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/blank-line.js
/**
* @import {
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var blankLine = {
	partial: true,
	tokenize: tokenizeBlankLine
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeBlankLine(effects, ok, nok) {
	return start;
	/**
	* Start of blank line.
	*
	* > 👉 **Note**: `␠` represents a space character.
	*
	* ```markdown
	* > | ␠␠␊
	*     ^
	* > | ␊
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		return markdownSpace(code) ? factorySpace(effects, after, "linePrefix")(code) : after(code);
	}
	/**
	* At eof/eol, after optional whitespace.
	*
	* > 👉 **Note**: `␠` represents a space character.
	*
	* ```markdown
	* > | ␠␠␊
	*       ^
	* > | ␊
	*     ^
	* ```
	*
	* @type {State}
	*/
	function after(code) {
		return code === null || markdownLineEnding(code) ? ok(code) : nok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/block-quote.js
/**
* @import {
*   Construct,
*   Exiter,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var blockQuote = {
	continuation: { tokenize: tokenizeBlockQuoteContinuation },
	exit,
	name: "blockQuote",
	tokenize: tokenizeBlockQuoteStart
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeBlockQuoteStart(effects, ok, nok) {
	const self = this;
	return start;
	/**
	* Start of block quote.
	*
	* ```markdown
	* > | > a
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		if (code === 62) {
			const state = self.containerState;
			if (!state.open) {
				effects.enter("blockQuote", { _container: true });
				state.open = true;
			}
			effects.enter("blockQuotePrefix");
			effects.enter("blockQuoteMarker");
			effects.consume(code);
			effects.exit("blockQuoteMarker");
			return after;
		}
		return nok(code);
	}
	/**
	* After `>`, before optional whitespace.
	*
	* ```markdown
	* > | > a
	*      ^
	* ```
	*
	* @type {State}
	*/
	function after(code) {
		if (markdownSpace(code)) {
			effects.enter("blockQuotePrefixWhitespace");
			effects.consume(code);
			effects.exit("blockQuotePrefixWhitespace");
			effects.exit("blockQuotePrefix");
			return ok;
		}
		effects.exit("blockQuotePrefix");
		return ok(code);
	}
}
/**
* Start of block quote continuation.
*
* ```markdown
*   | > a
* > | > b
*     ^
* ```
*
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeBlockQuoteContinuation(effects, ok, nok) {
	const self = this;
	return contStart;
	/**
	* Start of block quote continuation.
	*
	* Also used to parse the first block quote opening.
	*
	* ```markdown
	*   | > a
	* > | > b
	*     ^
	* ```
	*
	* @type {State}
	*/
	function contStart(code) {
		if (markdownSpace(code)) return factorySpace(effects, contBefore, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code);
		return contBefore(code);
	}
	/**
	* At `>`, after optional whitespace.
	*
	* Also used to parse the first block quote opening.
	*
	* ```markdown
	*   | > a
	* > | > b
	*     ^
	* ```
	*
	* @type {State}
	*/
	function contBefore(code) {
		return effects.attempt(blockQuote, ok, nok)(code);
	}
}
/** @type {Exiter} */
function exit(effects) {
	effects.exit("blockQuote");
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/character-escape.js
/**
* @import {
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var characterEscape = {
	name: "characterEscape",
	tokenize: tokenizeCharacterEscape
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeCharacterEscape(effects, ok, nok) {
	return start;
	/**
	* Start of character escape.
	*
	* ```markdown
	* > | a\*b
	*      ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("characterEscape");
		effects.enter("escapeMarker");
		effects.consume(code);
		effects.exit("escapeMarker");
		return inside;
	}
	/**
	* After `\`, at punctuation.
	*
	* ```markdown
	* > | a\*b
	*       ^
	* ```
	*
	* @type {State}
	*/
	function inside(code) {
		if (asciiPunctuation(code)) {
			effects.enter("characterEscapeValue");
			effects.consume(code);
			effects.exit("characterEscapeValue");
			effects.exit("characterEscape");
			return ok;
		}
		return nok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/character-reference.js
/**
* @import {
*   Code,
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var characterReference = {
	name: "characterReference",
	tokenize: tokenizeCharacterReference
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeCharacterReference(effects, ok, nok) {
	const self = this;
	let size = 0;
	/** @type {number} */
	let max;
	/** @type {(code: Code) => boolean} */
	let test;
	return start;
	/**
	* Start of character reference.
	*
	* ```markdown
	* > | a&amp;b
	*      ^
	* > | a&#123;b
	*      ^
	* > | a&#x9;b
	*      ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("characterReference");
		effects.enter("characterReferenceMarker");
		effects.consume(code);
		effects.exit("characterReferenceMarker");
		return open;
	}
	/**
	* After `&`, at `#` for numeric references or alphanumeric for named
	* references.
	*
	* ```markdown
	* > | a&amp;b
	*       ^
	* > | a&#123;b
	*       ^
	* > | a&#x9;b
	*       ^
	* ```
	*
	* @type {State}
	*/
	function open(code) {
		if (code === 35) {
			effects.enter("characterReferenceMarkerNumeric");
			effects.consume(code);
			effects.exit("characterReferenceMarkerNumeric");
			return numeric;
		}
		effects.enter("characterReferenceValue");
		max = 31;
		test = asciiAlphanumeric;
		return value(code);
	}
	/**
	* After `#`, at `x` for hexadecimals or digit for decimals.
	*
	* ```markdown
	* > | a&#123;b
	*        ^
	* > | a&#x9;b
	*        ^
	* ```
	*
	* @type {State}
	*/
	function numeric(code) {
		if (code === 88 || code === 120) {
			effects.enter("characterReferenceMarkerHexadecimal");
			effects.consume(code);
			effects.exit("characterReferenceMarkerHexadecimal");
			effects.enter("characterReferenceValue");
			max = 6;
			test = asciiHexDigit;
			return value;
		}
		effects.enter("characterReferenceValue");
		max = 7;
		test = asciiDigit;
		return value(code);
	}
	/**
	* After markers (`&#x`, `&#`, or `&`), in value, before `;`.
	*
	* The character reference kind defines what and how many characters are
	* allowed.
	*
	* ```markdown
	* > | a&amp;b
	*       ^^^
	* > | a&#123;b
	*        ^^^
	* > | a&#x9;b
	*         ^
	* ```
	*
	* @type {State}
	*/
	function value(code) {
		if (code === 59 && size) {
			const token = effects.exit("characterReferenceValue");
			if (test === asciiAlphanumeric && !decodeNamedCharacterReference(self.sliceSerialize(token))) return nok(code);
			effects.enter("characterReferenceMarker");
			effects.consume(code);
			effects.exit("characterReferenceMarker");
			effects.exit("characterReference");
			return ok;
		}
		if (test(code) && size++ < max) {
			effects.consume(code);
			return value;
		}
		return nok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/code-fenced.js
/**
* @import {
*   Code,
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var nonLazyContinuation = {
	partial: true,
	tokenize: tokenizeNonLazyContinuation
};
/** @type {Construct} */
var codeFenced = {
	concrete: true,
	name: "codeFenced",
	tokenize: tokenizeCodeFenced
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeCodeFenced(effects, ok, nok) {
	const self = this;
	/** @type {Construct} */
	const closeStart = {
		partial: true,
		tokenize: tokenizeCloseStart
	};
	let initialPrefix = 0;
	let sizeOpen = 0;
	/** @type {NonNullable<Code>} */
	let marker;
	return start;
	/**
	* Start of code.
	*
	* ```markdown
	* > | ~~~js
	*     ^
	*   | alert(1)
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		return beforeSequenceOpen(code);
	}
	/**
	* In opening fence, after prefix, at sequence.
	*
	* ```markdown
	* > | ~~~js
	*     ^
	*   | alert(1)
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function beforeSequenceOpen(code) {
		const tail = self.events[self.events.length - 1];
		initialPrefix = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
		marker = code;
		effects.enter("codeFenced");
		effects.enter("codeFencedFence");
		effects.enter("codeFencedFenceSequence");
		return sequenceOpen(code);
	}
	/**
	* In opening fence sequence.
	*
	* ```markdown
	* > | ~~~js
	*      ^
	*   | alert(1)
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function sequenceOpen(code) {
		if (code === marker) {
			sizeOpen++;
			effects.consume(code);
			return sequenceOpen;
		}
		if (sizeOpen < 3) return nok(code);
		effects.exit("codeFencedFenceSequence");
		return markdownSpace(code) ? factorySpace(effects, infoBefore, "whitespace")(code) : infoBefore(code);
	}
	/**
	* In opening fence, after the sequence (and optional whitespace), before info.
	*
	* ```markdown
	* > | ~~~js
	*        ^
	*   | alert(1)
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function infoBefore(code) {
		if (code === null || markdownLineEnding(code)) {
			effects.exit("codeFencedFence");
			return self.interrupt ? ok(code) : effects.check(nonLazyContinuation, atNonLazyBreak, after)(code);
		}
		effects.enter("codeFencedFenceInfo");
		effects.enter("chunkString", { contentType: "string" });
		return info(code);
	}
	/**
	* In info.
	*
	* ```markdown
	* > | ~~~js
	*        ^
	*   | alert(1)
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function info(code) {
		if (code === null || markdownLineEnding(code)) {
			effects.exit("chunkString");
			effects.exit("codeFencedFenceInfo");
			return infoBefore(code);
		}
		if (markdownSpace(code)) {
			effects.exit("chunkString");
			effects.exit("codeFencedFenceInfo");
			return factorySpace(effects, metaBefore, "whitespace")(code);
		}
		if (code === 96 && code === marker) return nok(code);
		effects.consume(code);
		return info;
	}
	/**
	* In opening fence, after info and whitespace, before meta.
	*
	* ```markdown
	* > | ~~~js eval
	*           ^
	*   | alert(1)
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function metaBefore(code) {
		if (code === null || markdownLineEnding(code)) return infoBefore(code);
		effects.enter("codeFencedFenceMeta");
		effects.enter("chunkString", { contentType: "string" });
		return meta(code);
	}
	/**
	* In meta.
	*
	* ```markdown
	* > | ~~~js eval
	*           ^
	*   | alert(1)
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function meta(code) {
		if (code === null || markdownLineEnding(code)) {
			effects.exit("chunkString");
			effects.exit("codeFencedFenceMeta");
			return infoBefore(code);
		}
		if (code === 96 && code === marker) return nok(code);
		effects.consume(code);
		return meta;
	}
	/**
	* At eol/eof in code, before a non-lazy closing fence or content.
	*
	* ```markdown
	* > | ~~~js
	*          ^
	* > | alert(1)
	*             ^
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function atNonLazyBreak(code) {
		return effects.attempt(closeStart, after, contentBefore)(code);
	}
	/**
	* Before code content, not a closing fence, at eol.
	*
	* ```markdown
	*   | ~~~js
	* > | alert(1)
	*             ^
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function contentBefore(code) {
		effects.enter("lineEnding");
		effects.consume(code);
		effects.exit("lineEnding");
		return contentStart;
	}
	/**
	* Before code content, not a closing fence.
	*
	* ```markdown
	*   | ~~~js
	* > | alert(1)
	*     ^
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function contentStart(code) {
		return initialPrefix > 0 && markdownSpace(code) ? factorySpace(effects, beforeContentChunk, "linePrefix", initialPrefix + 1)(code) : beforeContentChunk(code);
	}
	/**
	* Before code content, after optional prefix.
	*
	* ```markdown
	*   | ~~~js
	* > | alert(1)
	*     ^
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function beforeContentChunk(code) {
		if (code === null || markdownLineEnding(code)) return effects.check(nonLazyContinuation, atNonLazyBreak, after)(code);
		effects.enter("codeFlowValue");
		return contentChunk(code);
	}
	/**
	* In code content.
	*
	* ```markdown
	*   | ~~~js
	* > | alert(1)
	*     ^^^^^^^^
	*   | ~~~
	* ```
	*
	* @type {State}
	*/
	function contentChunk(code) {
		if (code === null || markdownLineEnding(code)) {
			effects.exit("codeFlowValue");
			return beforeContentChunk(code);
		}
		effects.consume(code);
		return contentChunk;
	}
	/**
	* After code.
	*
	* ```markdown
	*   | ~~~js
	*   | alert(1)
	* > | ~~~
	*        ^
	* ```
	*
	* @type {State}
	*/
	function after(code) {
		effects.exit("codeFenced");
		return ok(code);
	}
	/**
	* @this {TokenizeContext}
	*   Context.
	* @type {Tokenizer}
	*/
	function tokenizeCloseStart(effects, ok, nok) {
		let size = 0;
		return startBefore;
		/**
		*
		*
		* @type {State}
		*/
		function startBefore(code) {
			effects.enter("lineEnding");
			effects.consume(code);
			effects.exit("lineEnding");
			return start;
		}
		/**
		* Before closing fence, at optional whitespace.
		*
		* ```markdown
		*   | ~~~js
		*   | alert(1)
		* > | ~~~
		*     ^
		* ```
		*
		* @type {State}
		*/
		function start(code) {
			effects.enter("codeFencedFence");
			return markdownSpace(code) ? factorySpace(effects, beforeSequenceClose, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code) : beforeSequenceClose(code);
		}
		/**
		* In closing fence, after optional whitespace, at sequence.
		*
		* ```markdown
		*   | ~~~js
		*   | alert(1)
		* > | ~~~
		*     ^
		* ```
		*
		* @type {State}
		*/
		function beforeSequenceClose(code) {
			if (code === marker) {
				effects.enter("codeFencedFenceSequence");
				return sequenceClose(code);
			}
			return nok(code);
		}
		/**
		* In closing fence sequence.
		*
		* ```markdown
		*   | ~~~js
		*   | alert(1)
		* > | ~~~
		*     ^
		* ```
		*
		* @type {State}
		*/
		function sequenceClose(code) {
			if (code === marker) {
				size++;
				effects.consume(code);
				return sequenceClose;
			}
			if (size >= sizeOpen) {
				effects.exit("codeFencedFenceSequence");
				return markdownSpace(code) ? factorySpace(effects, sequenceCloseAfter, "whitespace")(code) : sequenceCloseAfter(code);
			}
			return nok(code);
		}
		/**
		* After closing fence sequence, after optional whitespace.
		*
		* ```markdown
		*   | ~~~js
		*   | alert(1)
		* > | ~~~
		*        ^
		* ```
		*
		* @type {State}
		*/
		function sequenceCloseAfter(code) {
			if (code === null || markdownLineEnding(code)) {
				effects.exit("codeFencedFence");
				return ok(code);
			}
			return nok(code);
		}
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeNonLazyContinuation(effects, ok, nok) {
	const self = this;
	return start;
	/**
	*
	*
	* @type {State}
	*/
	function start(code) {
		if (code === null) return nok(code);
		effects.enter("lineEnding");
		effects.consume(code);
		effects.exit("lineEnding");
		return lineStart;
	}
	/**
	*
	*
	* @type {State}
	*/
	function lineStart(code) {
		return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/code-indented.js
/**
* @import {
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var codeIndented = {
	name: "codeIndented",
	tokenize: tokenizeCodeIndented
};
/** @type {Construct} */
var furtherStart = {
	partial: true,
	tokenize: tokenizeFurtherStart
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeCodeIndented(effects, ok, nok) {
	const self = this;
	return start;
	/**
	* Start of code (indented).
	*
	* > **Parsing note**: it is not needed to check if this first line is a
	* > filled line (that it has a non-whitespace character), because blank lines
	* > are parsed already, so we never run into that.
	*
	* ```markdown
	* > |     aaa
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("codeIndented");
		return factorySpace(effects, afterPrefix, "linePrefix", 5)(code);
	}
	/**
	* At start, after 1 or 4 spaces.
	*
	* ```markdown
	* > |     aaa
	*         ^
	* ```
	*
	* @type {State}
	*/
	function afterPrefix(code) {
		const tail = self.events[self.events.length - 1];
		return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? atBreak(code) : nok(code);
	}
	/**
	* At a break.
	*
	* ```markdown
	* > |     aaa
	*         ^  ^
	* ```
	*
	* @type {State}
	*/
	function atBreak(code) {
		if (code === null) return after(code);
		if (markdownLineEnding(code)) return effects.attempt(furtherStart, atBreak, after)(code);
		effects.enter("codeFlowValue");
		return inside(code);
	}
	/**
	* In code content.
	*
	* ```markdown
	* > |     aaa
	*         ^^^^
	* ```
	*
	* @type {State}
	*/
	function inside(code) {
		if (code === null || markdownLineEnding(code)) {
			effects.exit("codeFlowValue");
			return atBreak(code);
		}
		effects.consume(code);
		return inside;
	}
	/** @type {State} */
	function after(code) {
		effects.exit("codeIndented");
		return ok(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeFurtherStart(effects, ok, nok) {
	const self = this;
	return furtherStart;
	/**
	* At eol, trying to parse another indent.
	*
	* ```markdown
	* > |     aaa
	*            ^
	*   |     bbb
	* ```
	*
	* @type {State}
	*/
	function furtherStart(code) {
		if (self.parser.lazy[self.now().line]) return nok(code);
		if (markdownLineEnding(code)) {
			effects.enter("lineEnding");
			effects.consume(code);
			effects.exit("lineEnding");
			return furtherStart;
		}
		return factorySpace(effects, afterPrefix, "linePrefix", 5)(code);
	}
	/**
	* At start, after 1 or 4 spaces.
	*
	* ```markdown
	* > |     aaa
	*         ^
	* ```
	*
	* @type {State}
	*/
	function afterPrefix(code) {
		const tail = self.events[self.events.length - 1];
		return tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4 ? ok(code) : markdownLineEnding(code) ? furtherStart(code) : nok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/code-text.js
/**
* @import {
*   Construct,
*   Previous,
*   Resolver,
*   State,
*   TokenizeContext,
*   Tokenizer,
*   Token
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var codeText = {
	name: "codeText",
	previous,
	resolve: resolveCodeText,
	tokenize: tokenizeCodeText
};
/** @type {Resolver} */
function resolveCodeText(events) {
	let tailExitIndex = events.length - 4;
	let headEnterIndex = 3;
	/** @type {number} */
	let index;
	/** @type {number | undefined} */
	let enter;
	if ((events[headEnterIndex][1].type === "lineEnding" || events[headEnterIndex][1].type === "space") && (events[tailExitIndex][1].type === "lineEnding" || events[tailExitIndex][1].type === "space")) {
		index = headEnterIndex;
		while (++index < tailExitIndex) if (events[index][1].type === "codeTextData") {
			events[headEnterIndex][1].type = "codeTextPadding";
			events[tailExitIndex][1].type = "codeTextPadding";
			headEnterIndex += 2;
			tailExitIndex -= 2;
			break;
		}
	}
	index = headEnterIndex - 1;
	tailExitIndex++;
	while (++index <= tailExitIndex) if (enter === void 0) {
		if (index !== tailExitIndex && events[index][1].type !== "lineEnding") enter = index;
	} else if (index === tailExitIndex || events[index][1].type === "lineEnding") {
		events[enter][1].type = "codeTextData";
		if (index !== enter + 2) {
			events[enter][1].end = events[index - 1][1].end;
			events.splice(enter + 2, index - enter - 2);
			tailExitIndex -= index - enter - 2;
			index = enter + 2;
		}
		enter = void 0;
	}
	return events;
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Previous}
*/
function previous(code) {
	return code !== 96 || this.events[this.events.length - 1][1].type === "characterEscape";
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeCodeText(effects, ok, nok) {
	let sizeOpen = 0;
	/** @type {number} */
	let size;
	/** @type {Token} */
	let token;
	return start;
	/**
	* Start of code (text).
	*
	* ```markdown
	* > | `a`
	*     ^
	* > | \`a`
	*      ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("codeText");
		effects.enter("codeTextSequence");
		return sequenceOpen(code);
	}
	/**
	* In opening sequence.
	*
	* ```markdown
	* > | `a`
	*     ^
	* ```
	*
	* @type {State}
	*/
	function sequenceOpen(code) {
		if (code === 96) {
			effects.consume(code);
			sizeOpen++;
			return sequenceOpen;
		}
		effects.exit("codeTextSequence");
		return between(code);
	}
	/**
	* Between something and something else.
	*
	* ```markdown
	* > | `a`
	*      ^^
	* ```
	*
	* @type {State}
	*/
	function between(code) {
		if (code === null) return nok(code);
		if (code === 32) {
			effects.enter("space");
			effects.consume(code);
			effects.exit("space");
			return between;
		}
		if (code === 96) {
			token = effects.enter("codeTextSequence");
			size = 0;
			return sequenceClose(code);
		}
		if (markdownLineEnding(code)) {
			effects.enter("lineEnding");
			effects.consume(code);
			effects.exit("lineEnding");
			return between;
		}
		effects.enter("codeTextData");
		return data(code);
	}
	/**
	* In data.
	*
	* ```markdown
	* > | `a`
	*      ^
	* ```
	*
	* @type {State}
	*/
	function data(code) {
		if (code === null || code === 32 || code === 96 || markdownLineEnding(code)) {
			effects.exit("codeTextData");
			return between(code);
		}
		effects.consume(code);
		return data;
	}
	/**
	* In closing sequence.
	*
	* ```markdown
	* > | `a`
	*       ^
	* ```
	*
	* @type {State}
	*/
	function sequenceClose(code) {
		if (code === 96) {
			effects.consume(code);
			size++;
			return sequenceClose;
		}
		if (size === sizeOpen) {
			effects.exit("codeTextSequence");
			effects.exit("codeText");
			return ok(code);
		}
		token.type = "codeTextData";
		return data(code);
	}
}
//#endregion
//#region node_modules/micromark-util-subtokenize/lib/splice-buffer.js
/**
* Some of the internal operations of micromark do lots of editing
* operations on very large arrays. This runs into problems with two
* properties of most circa-2020 JavaScript interpreters:
*
*  - Array-length modifications at the high end of an array (push/pop) are
*    expected to be common and are implemented in (amortized) time
*    proportional to the number of elements added or removed, whereas
*    other operations (shift/unshift and splice) are much less efficient.
*  - Function arguments are passed on the stack, so adding tens of thousands
*    of elements to an array with `arr.push(...newElements)` will frequently
*    cause stack overflows. (see <https://stackoverflow.com/questions/22123769/rangeerror-maximum-call-stack-size-exceeded-why>)
*
* SpliceBuffers are an implementation of gap buffers, which are a
* generalization of the "queue made of two stacks" idea. The splice buffer
* maintains a cursor, and moving the cursor has cost proportional to the
* distance the cursor moves, but inserting, deleting, or splicing in
* new information at the cursor is as efficient as the push/pop operation.
* This allows for an efficient sequence of splices (or pushes, pops, shifts,
* or unshifts) as long such edits happen at the same part of the array or
* generally sweep through the array from the beginning to the end.
*
* The interface for splice buffers also supports large numbers of inputs by
* passing a single array argument rather passing multiple arguments on the
* function call stack.
*
* @template T
*   Item type.
*/
var SpliceBuffer = class {
	/**
	* @param {ReadonlyArray<T> | null | undefined} [initial]
	*   Initial items (optional).
	* @returns
	*   Splice buffer.
	*/
	constructor(initial) {
		/** @type {Array<T>} */
		this.left = initial ? [...initial] : [];
		/** @type {Array<T>} */
		this.right = [];
	}
	/**
	* Array access;
	* does not move the cursor.
	*
	* @param {number} index
	*   Index.
	* @return {T}
	*   Item.
	*/
	get(index) {
		if (index < 0 || index >= this.left.length + this.right.length) throw new RangeError("Cannot access index `" + index + "` in a splice buffer of size `" + (this.left.length + this.right.length) + "`");
		if (index < this.left.length) return this.left[index];
		return this.right[this.right.length - index + this.left.length - 1];
	}
	/**
	* The length of the splice buffer, one greater than the largest index in the
	* array.
	*/
	get length() {
		return this.left.length + this.right.length;
	}
	/**
	* Remove and return `list[0]`;
	* moves the cursor to `0`.
	*
	* @returns {T | undefined}
	*   Item, optional.
	*/
	shift() {
		this.setCursor(0);
		return this.right.pop();
	}
	/**
	* Slice the buffer to get an array;
	* does not move the cursor.
	*
	* @param {number} start
	*   Start.
	* @param {number | null | undefined} [end]
	*   End (optional).
	* @returns {Array<T>}
	*   Array of items.
	*/
	slice(start, end) {
		/** @type {number} */
		const stop = end === null || end === void 0 ? Number.POSITIVE_INFINITY : end;
		if (stop < this.left.length) return this.left.slice(start, stop);
		if (start > this.left.length) return this.right.slice(this.right.length - stop + this.left.length, this.right.length - start + this.left.length).reverse();
		return this.left.slice(start).concat(this.right.slice(this.right.length - stop + this.left.length).reverse());
	}
	/**
	* Mimics the behavior of Array.prototype.splice() except for the change of
	* interface necessary to avoid segfaults when patching in very large arrays.
	*
	* This operation moves cursor is moved to `start` and results in the cursor
	* placed after any inserted items.
	*
	* @param {number} start
	*   Start;
	*   zero-based index at which to start changing the array;
	*   negative numbers count backwards from the end of the array and values
	*   that are out-of bounds are clamped to the appropriate end of the array.
	* @param {number | null | undefined} [deleteCount=0]
	*   Delete count (default: `0`);
	*   maximum number of elements to delete, starting from start.
	* @param {Array<T> | null | undefined} [items=[]]
	*   Items to include in place of the deleted items (default: `[]`).
	* @return {Array<T>}
	*   Any removed items.
	*/
	splice(start, deleteCount, items) {
		/** @type {number} */
		const count = deleteCount || 0;
		this.setCursor(Math.trunc(start));
		const removed = this.right.splice(this.right.length - count, Number.POSITIVE_INFINITY);
		if (items) chunkedPush(this.left, items);
		return removed.reverse();
	}
	/**
	* Remove and return the highest-numbered item in the array, so
	* `list[list.length - 1]`;
	* Moves the cursor to `length`.
	*
	* @returns {T | undefined}
	*   Item, optional.
	*/
	pop() {
		this.setCursor(Number.POSITIVE_INFINITY);
		return this.left.pop();
	}
	/**
	* Inserts a single item to the high-numbered side of the array;
	* moves the cursor to `length`.
	*
	* @param {T} item
	*   Item.
	* @returns {undefined}
	*   Nothing.
	*/
	push(item) {
		this.setCursor(Number.POSITIVE_INFINITY);
		this.left.push(item);
	}
	/**
	* Inserts many items to the high-numbered side of the array.
	* Moves the cursor to `length`.
	*
	* @param {Array<T>} items
	*   Items.
	* @returns {undefined}
	*   Nothing.
	*/
	pushMany(items) {
		this.setCursor(Number.POSITIVE_INFINITY);
		chunkedPush(this.left, items);
	}
	/**
	* Inserts a single item to the low-numbered side of the array;
	* Moves the cursor to `0`.
	*
	* @param {T} item
	*   Item.
	* @returns {undefined}
	*   Nothing.
	*/
	unshift(item) {
		this.setCursor(0);
		this.right.push(item);
	}
	/**
	* Inserts many items to the low-numbered side of the array;
	* moves the cursor to `0`.
	*
	* @param {Array<T>} items
	*   Items.
	* @returns {undefined}
	*   Nothing.
	*/
	unshiftMany(items) {
		this.setCursor(0);
		chunkedPush(this.right, items.reverse());
	}
	/**
	* Move the cursor to a specific position in the array. Requires
	* time proportional to the distance moved.
	*
	* If `n < 0`, the cursor will end up at the beginning.
	* If `n > length`, the cursor will end up at the end.
	*
	* @param {number} n
	*   Position.
	* @return {undefined}
	*   Nothing.
	*/
	setCursor(n) {
		if (n === this.left.length || n > this.left.length && this.right.length === 0 || n < 0 && this.left.length === 0) return;
		if (n < this.left.length) {
			const removed = this.left.splice(n, Number.POSITIVE_INFINITY);
			chunkedPush(this.right, removed.reverse());
		} else {
			const removed = this.right.splice(this.left.length + this.right.length - n, Number.POSITIVE_INFINITY);
			chunkedPush(this.left, removed.reverse());
		}
	}
};
/**
* Avoid stack overflow by pushing items onto the stack in segments
*
* @template T
*   Item type.
* @param {Array<T>} list
*   List to inject into.
* @param {ReadonlyArray<T>} right
*   Items to inject.
* @return {undefined}
*   Nothing.
*/
function chunkedPush(list, right) {
	/** @type {number} */
	let chunkStart = 0;
	if (right.length < 1e4) list.push(...right);
	else while (chunkStart < right.length) {
		list.push(...right.slice(chunkStart, chunkStart + 1e4));
		chunkStart += 1e4;
	}
}
//#endregion
//#region node_modules/micromark-util-subtokenize/index.js
/**
* @import {Chunk, Event, Token} from 'micromark-util-types'
*/
/**
* Tokenize subcontent.
*
* @param {Array<Event>} eventsArray
*   List of events.
* @returns {boolean}
*   Whether subtokens were found.
*/
function subtokenize(eventsArray) {
	/** @type {Record<string, number>} */
	const jumps = {};
	let index = -1;
	/** @type {Event} */
	let event;
	/** @type {number | undefined} */
	let lineIndex;
	/** @type {number} */
	let otherIndex;
	/** @type {Event} */
	let otherEvent;
	/** @type {Array<Event>} */
	let parameters;
	/** @type {Array<Event>} */
	let subevents;
	/** @type {boolean | undefined} */
	let more;
	const events = new SpliceBuffer(eventsArray);
	while (++index < events.length) {
		while (index in jumps) index = jumps[index];
		event = events.get(index);
		if (index && event[1].type === "chunkFlow" && events.get(index - 1)[1].type === "listItemPrefix") {
			subevents = event[1]._tokenizer.events;
			otherIndex = 0;
			if (otherIndex < subevents.length && subevents[otherIndex][1].type === "lineEndingBlank") otherIndex += 2;
			if (otherIndex < subevents.length && subevents[otherIndex][1].type === "content") while (++otherIndex < subevents.length) {
				if (subevents[otherIndex][1].type === "content") break;
				if (subevents[otherIndex][1].type === "chunkText") {
					subevents[otherIndex][1]._isInFirstContentOfListItem = true;
					otherIndex++;
				}
			}
		}
		if (event[0] === "enter") {
			if (event[1].contentType) {
				Object.assign(jumps, subcontent(events, index));
				index = jumps[index];
				more = true;
			}
		} else if (event[1]._container) {
			otherIndex = index;
			lineIndex = void 0;
			while (otherIndex--) {
				otherEvent = events.get(otherIndex);
				if (otherEvent[1].type === "lineEnding" || otherEvent[1].type === "lineEndingBlank") {
					if (otherEvent[0] === "enter") {
						if (lineIndex) events.get(lineIndex)[1].type = "lineEndingBlank";
						otherEvent[1].type = "lineEnding";
						lineIndex = otherIndex;
					}
				} else if (otherEvent[1].type === "linePrefix" || otherEvent[1].type === "listItemIndent") {} else break;
			}
			if (lineIndex) {
				event[1].end = { ...events.get(lineIndex)[1].start };
				parameters = events.slice(lineIndex, index);
				parameters.unshift(event);
				events.splice(lineIndex, index - lineIndex + 1, parameters);
			}
		}
	}
	splice(eventsArray, 0, Number.POSITIVE_INFINITY, events.slice(0));
	return !more;
}
/**
* Tokenize embedded tokens.
*
* @param {SpliceBuffer<Event>} events
*   Events.
* @param {number} eventIndex
*   Index.
* @returns {Record<string, number>}
*   Gaps.
*/
function subcontent(events, eventIndex) {
	const token = events.get(eventIndex)[1];
	const context = events.get(eventIndex)[2];
	let startPosition = eventIndex - 1;
	/** @type {Array<number>} */
	const startPositions = [];
	let tokenizer = token._tokenizer;
	if (!tokenizer) {
		tokenizer = context.parser[token.contentType](token.start);
		if (token._contentTypeTextTrailing) tokenizer._contentTypeTextTrailing = true;
	}
	const childEvents = tokenizer.events;
	/** @type {Array<[number, number]>} */
	const jumps = [];
	/** @type {Record<string, number>} */
	const gaps = {};
	/** @type {Array<Chunk>} */
	let stream;
	/** @type {Token | undefined} */
	let previous;
	let index = -1;
	/** @type {Token | undefined} */
	let current = token;
	let adjust = 0;
	let start = 0;
	const breaks = [start];
	while (current) {
		while (events.get(++startPosition)[1] !== current);
		startPositions.push(startPosition);
		if (!current._tokenizer) {
			stream = context.sliceStream(current);
			if (!current.next) stream.push(null);
			if (previous) tokenizer.defineSkip(current.start);
			if (current._isInFirstContentOfListItem) tokenizer._gfmTasklistFirstContentOfListItem = true;
			tokenizer.write(stream);
			if (current._isInFirstContentOfListItem) tokenizer._gfmTasklistFirstContentOfListItem = void 0;
		}
		previous = current;
		current = current.next;
	}
	current = token;
	while (++index < childEvents.length) if (childEvents[index][0] === "exit" && childEvents[index - 1][0] === "enter" && childEvents[index][1].type === childEvents[index - 1][1].type && childEvents[index][1].start.line !== childEvents[index][1].end.line) {
		start = index + 1;
		breaks.push(start);
		current._tokenizer = void 0;
		current.previous = void 0;
		current = current.next;
	}
	tokenizer.events = [];
	if (current) {
		current._tokenizer = void 0;
		current.previous = void 0;
	} else breaks.pop();
	index = breaks.length;
	while (index--) {
		const slice = childEvents.slice(breaks[index], breaks[index + 1]);
		const start = startPositions.pop();
		jumps.push([start, start + slice.length - 1]);
		events.splice(start, 2, slice);
	}
	jumps.reverse();
	index = -1;
	while (++index < jumps.length) {
		gaps[adjust + jumps[index][0]] = adjust + jumps[index][1];
		adjust += jumps[index][1] - jumps[index][0] - 1;
	}
	return gaps;
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/content.js
/**
* @import {
*   Construct,
*   Resolver,
*   State,
*   TokenizeContext,
*   Tokenizer,
*   Token
* } from 'micromark-util-types'
*/
/**
* No name because it must not be turned off.
* @type {Construct}
*/
var content = {
	resolve: resolveContent,
	tokenize: tokenizeContent
};
/** @type {Construct} */
var continuationConstruct = {
	partial: true,
	tokenize: tokenizeContinuation
};
/**
* Content is transparent: it’s parsed right now. That way, definitions are also
* parsed right now: before text in paragraphs (specifically, media) are parsed.
*
* @type {Resolver}
*/
function resolveContent(events) {
	subtokenize(events);
	return events;
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeContent(effects, ok) {
	/** @type {Token | undefined} */
	let previous;
	return chunkStart;
	/**
	* Before a content chunk.
	*
	* ```markdown
	* > | abc
	*     ^
	* ```
	*
	* @type {State}
	*/
	function chunkStart(code) {
		effects.enter("content");
		previous = effects.enter("chunkContent", { contentType: "content" });
		return chunkInside(code);
	}
	/**
	* In a content chunk.
	*
	* ```markdown
	* > | abc
	*     ^^^
	* ```
	*
	* @type {State}
	*/
	function chunkInside(code) {
		if (code === null) return contentEnd(code);
		if (markdownLineEnding(code)) return effects.check(continuationConstruct, contentContinue, contentEnd)(code);
		effects.consume(code);
		return chunkInside;
	}
	/**
	*
	*
	* @type {State}
	*/
	function contentEnd(code) {
		effects.exit("chunkContent");
		effects.exit("content");
		return ok(code);
	}
	/**
	*
	*
	* @type {State}
	*/
	function contentContinue(code) {
		effects.consume(code);
		effects.exit("chunkContent");
		previous.next = effects.enter("chunkContent", {
			contentType: "content",
			previous
		});
		previous = previous.next;
		return chunkInside;
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeContinuation(effects, ok, nok) {
	const self = this;
	return startLookahead;
	/**
	*
	*
	* @type {State}
	*/
	function startLookahead(code) {
		effects.exit("chunkContent");
		effects.enter("lineEnding");
		effects.consume(code);
		effects.exit("lineEnding");
		return factorySpace(effects, prefixed, "linePrefix");
	}
	/**
	*
	*
	* @type {State}
	*/
	function prefixed(code) {
		if (code === null || markdownLineEnding(code)) return nok(code);
		const tail = self.events[self.events.length - 1];
		if (!self.parser.constructs.disable.null.includes("codeIndented") && tail && tail[1].type === "linePrefix" && tail[2].sliceSerialize(tail[1], true).length >= 4) return ok(code);
		return effects.interrupt(self.parser.constructs.flow, nok, ok)(code);
	}
}
//#endregion
//#region node_modules/micromark-factory-destination/index.js
/**
* @import {Effects, State, TokenType} from 'micromark-util-types'
*/
/**
* Parse destinations.
*
* ###### Examples
*
* ```markdown
* <a>
* <a\>b>
* <a b>
* <a)>
* a
* a\)b
* a(b)c
* a(b)
* ```
*
* @param {Effects} effects
*   Context.
* @param {State} ok
*   State switched to when successful.
* @param {State} nok
*   State switched to when unsuccessful.
* @param {TokenType} type
*   Type for whole (`<a>` or `b`).
* @param {TokenType} literalType
*   Type when enclosed (`<a>`).
* @param {TokenType} literalMarkerType
*   Type for enclosing (`<` and `>`).
* @param {TokenType} rawType
*   Type when not enclosed (`b`).
* @param {TokenType} stringType
*   Type for the value (`a` or `b`).
* @param {number | undefined} [max=Infinity]
*   Depth of nested parens (inclusive).
* @returns {State}
*   Start state.
*/
function factoryDestination(effects, ok, nok, type, literalType, literalMarkerType, rawType, stringType, max) {
	const limit = max || Number.POSITIVE_INFINITY;
	let balance = 0;
	return start;
	/**
	* Start of destination.
	*
	* ```markdown
	* > | <aa>
	*     ^
	* > | aa
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		if (code === 60) {
			effects.enter(type);
			effects.enter(literalType);
			effects.enter(literalMarkerType);
			effects.consume(code);
			effects.exit(literalMarkerType);
			return enclosedBefore;
		}
		if (code === null || code === 32 || code === 41 || asciiControl(code)) return nok(code);
		effects.enter(type);
		effects.enter(rawType);
		effects.enter(stringType);
		effects.enter("chunkString", { contentType: "string" });
		return raw(code);
	}
	/**
	* After `<`, at an enclosed destination.
	*
	* ```markdown
	* > | <aa>
	*      ^
	* ```
	*
	* @type {State}
	*/
	function enclosedBefore(code) {
		if (code === 62) {
			effects.enter(literalMarkerType);
			effects.consume(code);
			effects.exit(literalMarkerType);
			effects.exit(literalType);
			effects.exit(type);
			return ok;
		}
		effects.enter(stringType);
		effects.enter("chunkString", { contentType: "string" });
		return enclosed(code);
	}
	/**
	* In enclosed destination.
	*
	* ```markdown
	* > | <aa>
	*      ^
	* ```
	*
	* @type {State}
	*/
	function enclosed(code) {
		if (code === 62) {
			effects.exit("chunkString");
			effects.exit(stringType);
			return enclosedBefore(code);
		}
		if (code === null || code === 60 || markdownLineEnding(code)) return nok(code);
		effects.consume(code);
		return code === 92 ? enclosedEscape : enclosed;
	}
	/**
	* After `\`, at a special character.
	*
	* ```markdown
	* > | <a\*a>
	*        ^
	* ```
	*
	* @type {State}
	*/
	function enclosedEscape(code) {
		if (code === 60 || code === 62 || code === 92) {
			effects.consume(code);
			return enclosed;
		}
		return enclosed(code);
	}
	/**
	* In raw destination.
	*
	* ```markdown
	* > | aa
	*     ^
	* ```
	*
	* @type {State}
	*/
	function raw(code) {
		if (!balance && (code === null || code === 41 || markdownLineEndingOrSpace(code))) {
			effects.exit("chunkString");
			effects.exit(stringType);
			effects.exit(rawType);
			effects.exit(type);
			return ok(code);
		}
		if (balance < limit && code === 40) {
			effects.consume(code);
			balance++;
			return raw;
		}
		if (code === 41) {
			effects.consume(code);
			balance--;
			return raw;
		}
		if (code === null || code === 32 || code === 40 || asciiControl(code)) return nok(code);
		effects.consume(code);
		return code === 92 ? rawEscape : raw;
	}
	/**
	* After `\`, at special character.
	*
	* ```markdown
	* > | a\*a
	*       ^
	* ```
	*
	* @type {State}
	*/
	function rawEscape(code) {
		if (code === 40 || code === 41 || code === 92) {
			effects.consume(code);
			return raw;
		}
		return raw(code);
	}
}
//#endregion
//#region node_modules/micromark-factory-label/index.js
/**
* @import {
*   Effects,
*   State,
*   TokenizeContext,
*   TokenType
* } from 'micromark-util-types'
*/
/**
* Parse labels.
*
* > 👉 **Note**: labels in markdown are capped at 999 characters in the string.
*
* ###### Examples
*
* ```markdown
* [a]
* [a
* b]
* [a\]b]
* ```
*
* @this {TokenizeContext}
*   Tokenize context.
* @param {Effects} effects
*   Context.
* @param {State} ok
*   State switched to when successful.
* @param {State} nok
*   State switched to when unsuccessful.
* @param {TokenType} type
*   Type of the whole label (`[a]`).
* @param {TokenType} markerType
*   Type for the markers (`[` and `]`).
* @param {TokenType} stringType
*   Type for the identifier (`a`).
* @returns {State}
*   Start state.
*/
function factoryLabel(effects, ok, nok, type, markerType, stringType) {
	const self = this;
	let size = 0;
	/** @type {boolean} */
	let seen;
	return start;
	/**
	* Start of label.
	*
	* ```markdown
	* > | [a]
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter(type);
		effects.enter(markerType);
		effects.consume(code);
		effects.exit(markerType);
		effects.enter(stringType);
		return atBreak;
	}
	/**
	* In label, at something, before something else.
	*
	* ```markdown
	* > | [a]
	*      ^
	* ```
	*
	* @type {State}
	*/
	function atBreak(code) {
		if (size > 999 || code === null || code === 91 || code === 93 && !seen || 
		/* c8 ignore next 3 */
		code === 94 && !size && "_hiddenFootnoteSupport" in self.parser.constructs) return nok(code);
		if (code === 93) {
			effects.exit(stringType);
			effects.enter(markerType);
			effects.consume(code);
			effects.exit(markerType);
			effects.exit(type);
			return ok;
		}
		if (markdownLineEnding(code)) {
			effects.enter("lineEnding");
			effects.consume(code);
			effects.exit("lineEnding");
			return atBreak;
		}
		effects.enter("chunkString", { contentType: "string" });
		return labelInside(code);
	}
	/**
	* In label, in text.
	*
	* ```markdown
	* > | [a]
	*      ^
	* ```
	*
	* @type {State}
	*/
	function labelInside(code) {
		if (code === null || code === 91 || code === 93 || markdownLineEnding(code) || size++ > 999) {
			effects.exit("chunkString");
			return atBreak(code);
		}
		effects.consume(code);
		if (!seen) seen = !markdownSpace(code);
		return code === 92 ? labelEscape : labelInside;
	}
	/**
	* After `\`, at a special character.
	*
	* ```markdown
	* > | [a\*a]
	*        ^
	* ```
	*
	* @type {State}
	*/
	function labelEscape(code) {
		if (code === 91 || code === 92 || code === 93) {
			effects.consume(code);
			size++;
			return labelInside;
		}
		return labelInside(code);
	}
}
//#endregion
//#region node_modules/micromark-factory-title/index.js
/**
* @import {
*   Code,
*   Effects,
*   State,
*   TokenType
* } from 'micromark-util-types'
*/
/**
* Parse titles.
*
* ###### Examples
*
* ```markdown
* "a"
* 'b'
* (c)
* "a
* b"
* 'a
*     b'
* (a\)b)
* ```
*
* @param {Effects} effects
*   Context.
* @param {State} ok
*   State switched to when successful.
* @param {State} nok
*   State switched to when unsuccessful.
* @param {TokenType} type
*   Type of the whole title (`"a"`, `'b'`, `(c)`).
* @param {TokenType} markerType
*   Type for the markers (`"`, `'`, `(`, and `)`).
* @param {TokenType} stringType
*   Type for the value (`a`).
* @returns {State}
*   Start state.
*/
function factoryTitle(effects, ok, nok, type, markerType, stringType) {
	/** @type {NonNullable<Code>} */
	let marker;
	return start;
	/**
	* Start of title.
	*
	* ```markdown
	* > | "a"
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		if (code === 34 || code === 39 || code === 40) {
			effects.enter(type);
			effects.enter(markerType);
			effects.consume(code);
			effects.exit(markerType);
			marker = code === 40 ? 41 : code;
			return begin;
		}
		return nok(code);
	}
	/**
	* After opening marker.
	*
	* This is also used at the closing marker.
	*
	* ```markdown
	* > | "a"
	*      ^
	* ```
	*
	* @type {State}
	*/
	function begin(code) {
		if (code === marker) {
			effects.enter(markerType);
			effects.consume(code);
			effects.exit(markerType);
			effects.exit(type);
			return ok;
		}
		effects.enter(stringType);
		return atBreak(code);
	}
	/**
	* At something, before something else.
	*
	* ```markdown
	* > | "a"
	*      ^
	* ```
	*
	* @type {State}
	*/
	function atBreak(code) {
		if (code === marker) {
			effects.exit(stringType);
			return begin(marker);
		}
		if (code === null) return nok(code);
		if (markdownLineEnding(code)) {
			effects.enter("lineEnding");
			effects.consume(code);
			effects.exit("lineEnding");
			return factorySpace(effects, atBreak, "linePrefix");
		}
		effects.enter("chunkString", { contentType: "string" });
		return inside(code);
	}
	/**
	*
	*
	* @type {State}
	*/
	function inside(code) {
		if (code === marker || code === null || markdownLineEnding(code)) {
			effects.exit("chunkString");
			return atBreak(code);
		}
		effects.consume(code);
		return code === 92 ? escape : inside;
	}
	/**
	* After `\`, at a special character.
	*
	* ```markdown
	* > | "a\*b"
	*      ^
	* ```
	*
	* @type {State}
	*/
	function escape(code) {
		if (code === marker || code === 92) {
			effects.consume(code);
			return inside;
		}
		return inside(code);
	}
}
//#endregion
//#region node_modules/micromark-factory-whitespace/index.js
/**
* @import {Effects, State} from 'micromark-util-types'
*/
/**
* Parse spaces and tabs.
*
* There is no `nok` parameter:
*
* *   line endings or spaces in markdown are often optional, in which case this
*     factory can be used and `ok` will be switched to whether spaces were found
*     or not
* *   one line ending or space can be detected with
*     `markdownLineEndingOrSpace(code)` right before using `factoryWhitespace`
*
* @param {Effects} effects
*   Context.
* @param {State} ok
*   State switched to when successful.
* @returns {State}
*   Start state.
*/
function factoryWhitespace(effects, ok) {
	/** @type {boolean} */
	let seen;
	return start;
	/** @type {State} */
	function start(code) {
		if (markdownLineEnding(code)) {
			effects.enter("lineEnding");
			effects.consume(code);
			effects.exit("lineEnding");
			seen = true;
			return start;
		}
		if (markdownSpace(code)) return factorySpace(effects, start, seen ? "linePrefix" : "lineSuffix")(code);
		return ok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/definition.js
/**
* @import {
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var definition = {
	name: "definition",
	tokenize: tokenizeDefinition
};
/** @type {Construct} */
var titleBefore = {
	partial: true,
	tokenize: tokenizeTitleBefore
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeDefinition(effects, ok, nok) {
	const self = this;
	/** @type {string} */
	let identifier;
	return start;
	/**
	* At start of a definition.
	*
	* ```markdown
	* > | [a]: b "c"
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("definition");
		return before(code);
	}
	/**
	* After optional whitespace, at `[`.
	*
	* ```markdown
	* > | [a]: b "c"
	*     ^
	* ```
	*
	* @type {State}
	*/
	function before(code) {
		return factoryLabel.call(self, effects, labelAfter, nok, "definitionLabel", "definitionLabelMarker", "definitionLabelString")(code);
	}
	/**
	* After label.
	*
	* ```markdown
	* > | [a]: b "c"
	*        ^
	* ```
	*
	* @type {State}
	*/
	function labelAfter(code) {
		identifier = normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1));
		if (code === 58) {
			effects.enter("definitionMarker");
			effects.consume(code);
			effects.exit("definitionMarker");
			return markerAfter;
		}
		return nok(code);
	}
	/**
	* After marker.
	*
	* ```markdown
	* > | [a]: b "c"
	*         ^
	* ```
	*
	* @type {State}
	*/
	function markerAfter(code) {
		return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, destinationBefore)(code) : destinationBefore(code);
	}
	/**
	* Before destination.
	*
	* ```markdown
	* > | [a]: b "c"
	*          ^
	* ```
	*
	* @type {State}
	*/
	function destinationBefore(code) {
		return factoryDestination(effects, destinationAfter, nok, "definitionDestination", "definitionDestinationLiteral", "definitionDestinationLiteralMarker", "definitionDestinationRaw", "definitionDestinationString")(code);
	}
	/**
	* After destination.
	*
	* ```markdown
	* > | [a]: b "c"
	*           ^
	* ```
	*
	* @type {State}
	*/
	function destinationAfter(code) {
		return effects.attempt(titleBefore, after, after)(code);
	}
	/**
	* After definition.
	*
	* ```markdown
	* > | [a]: b
	*           ^
	* > | [a]: b "c"
	*               ^
	* ```
	*
	* @type {State}
	*/
	function after(code) {
		return markdownSpace(code) ? factorySpace(effects, afterWhitespace, "whitespace")(code) : afterWhitespace(code);
	}
	/**
	* After definition, after optional whitespace.
	*
	* ```markdown
	* > | [a]: b
	*           ^
	* > | [a]: b "c"
	*               ^
	* ```
	*
	* @type {State}
	*/
	function afterWhitespace(code) {
		if (code === null || markdownLineEnding(code)) {
			effects.exit("definition");
			self.parser.defined.push(identifier);
			return ok(code);
		}
		return nok(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeTitleBefore(effects, ok, nok) {
	return titleBefore;
	/**
	* After destination, at whitespace.
	*
	* ```markdown
	* > | [a]: b
	*           ^
	* > | [a]: b "c"
	*           ^
	* ```
	*
	* @type {State}
	*/
	function titleBefore(code) {
		return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, beforeMarker)(code) : nok(code);
	}
	/**
	* At title.
	*
	* ```markdown
	*   | [a]: b
	* > | "c"
	*     ^
	* ```
	*
	* @type {State}
	*/
	function beforeMarker(code) {
		return factoryTitle(effects, titleAfter, nok, "definitionTitle", "definitionTitleMarker", "definitionTitleString")(code);
	}
	/**
	* After title.
	*
	* ```markdown
	* > | [a]: b "c"
	*               ^
	* ```
	*
	* @type {State}
	*/
	function titleAfter(code) {
		return markdownSpace(code) ? factorySpace(effects, titleAfterOptionalWhitespace, "whitespace")(code) : titleAfterOptionalWhitespace(code);
	}
	/**
	* After title, after optional whitespace.
	*
	* ```markdown
	* > | [a]: b "c"
	*               ^
	* ```
	*
	* @type {State}
	*/
	function titleAfterOptionalWhitespace(code) {
		return code === null || markdownLineEnding(code) ? ok(code) : nok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/hard-break-escape.js
/**
* @import {
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var hardBreakEscape = {
	name: "hardBreakEscape",
	tokenize: tokenizeHardBreakEscape
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeHardBreakEscape(effects, ok, nok) {
	return start;
	/**
	* Start of a hard break (escape).
	*
	* ```markdown
	* > | a\
	*      ^
	*   | b
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("hardBreakEscape");
		effects.consume(code);
		return after;
	}
	/**
	* After `\`, at eol.
	*
	* ```markdown
	* > | a\
	*       ^
	*   | b
	* ```
	*
	*  @type {State}
	*/
	function after(code) {
		if (markdownLineEnding(code)) {
			effects.exit("hardBreakEscape");
			return ok(code);
		}
		return nok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/heading-atx.js
/**
* @import {
*   Construct,
*   Resolver,
*   State,
*   TokenizeContext,
*   Tokenizer,
*   Token
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var headingAtx = {
	name: "headingAtx",
	resolve: resolveHeadingAtx,
	tokenize: tokenizeHeadingAtx
};
/** @type {Resolver} */
function resolveHeadingAtx(events, context) {
	let contentEnd = events.length - 2;
	let contentStart = 3;
	/** @type {Token} */
	let content;
	/** @type {Token} */
	let text;
	if (events[contentStart][1].type === "whitespace") contentStart += 2;
	if (contentEnd - 2 > contentStart && events[contentEnd][1].type === "whitespace") contentEnd -= 2;
	if (events[contentEnd][1].type === "atxHeadingSequence" && (contentStart === contentEnd - 1 || contentEnd - 4 > contentStart && events[contentEnd - 2][1].type === "whitespace")) contentEnd -= contentStart + 1 === contentEnd ? 2 : 4;
	if (contentEnd > contentStart) {
		content = {
			type: "atxHeadingText",
			start: events[contentStart][1].start,
			end: events[contentEnd][1].end
		};
		text = {
			type: "chunkText",
			start: events[contentStart][1].start,
			end: events[contentEnd][1].end,
			contentType: "text"
		};
		splice(events, contentStart, contentEnd - contentStart + 1, [
			[
				"enter",
				content,
				context
			],
			[
				"enter",
				text,
				context
			],
			[
				"exit",
				text,
				context
			],
			[
				"exit",
				content,
				context
			]
		]);
	}
	return events;
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeHeadingAtx(effects, ok, nok) {
	let size = 0;
	return start;
	/**
	* Start of a heading (atx).
	*
	* ```markdown
	* > | ## aa
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("atxHeading");
		return before(code);
	}
	/**
	* After optional whitespace, at `#`.
	*
	* ```markdown
	* > | ## aa
	*     ^
	* ```
	*
	* @type {State}
	*/
	function before(code) {
		effects.enter("atxHeadingSequence");
		return sequenceOpen(code);
	}
	/**
	* In opening sequence.
	*
	* ```markdown
	* > | ## aa
	*     ^
	* ```
	*
	* @type {State}
	*/
	function sequenceOpen(code) {
		if (code === 35 && size++ < 6) {
			effects.consume(code);
			return sequenceOpen;
		}
		if (code === null || markdownLineEndingOrSpace(code)) {
			effects.exit("atxHeadingSequence");
			return atBreak(code);
		}
		return nok(code);
	}
	/**
	* After something, before something else.
	*
	* ```markdown
	* > | ## aa
	*       ^
	* ```
	*
	* @type {State}
	*/
	function atBreak(code) {
		if (code === 35) {
			effects.enter("atxHeadingSequence");
			return sequenceFurther(code);
		}
		if (code === null || markdownLineEnding(code)) {
			effects.exit("atxHeading");
			return ok(code);
		}
		if (markdownSpace(code)) return factorySpace(effects, atBreak, "whitespace")(code);
		effects.enter("atxHeadingText");
		return data(code);
	}
	/**
	* In further sequence (after whitespace).
	*
	* Could be normal “visible” hashes in the heading or a final sequence.
	*
	* ```markdown
	* > | ## aa ##
	*           ^
	* ```
	*
	* @type {State}
	*/
	function sequenceFurther(code) {
		if (code === 35) {
			effects.consume(code);
			return sequenceFurther;
		}
		effects.exit("atxHeadingSequence");
		return atBreak(code);
	}
	/**
	* In text.
	*
	* ```markdown
	* > | ## aa
	*        ^
	* ```
	*
	* @type {State}
	*/
	function data(code) {
		if (code === null || code === 35 || markdownLineEndingOrSpace(code)) {
			effects.exit("atxHeadingText");
			return atBreak(code);
		}
		effects.consume(code);
		return data;
	}
}
//#endregion
//#region node_modules/micromark-util-html-tag-name/index.js
/**
* List of lowercase HTML “block” tag names.
*
* The list, when parsing HTML (flow), results in more relaxed rules (condition
* 6).
* Because they are known blocks, the HTML-like syntax doesn’t have to be
* strictly parsed.
* For tag names not in this list, a more strict algorithm (condition 7) is used
* to detect whether the HTML-like syntax is seen as HTML (flow) or not.
*
* This is copied from:
* <https://spec.commonmark.org/0.30/#html-blocks>.
*
* > 👉 **Note**: `search` was added in `CommonMark@0.31`.
*/
var htmlBlockNames = [
	"address",
	"article",
	"aside",
	"base",
	"basefont",
	"blockquote",
	"body",
	"caption",
	"center",
	"col",
	"colgroup",
	"dd",
	"details",
	"dialog",
	"dir",
	"div",
	"dl",
	"dt",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"frame",
	"frameset",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"head",
	"header",
	"hr",
	"html",
	"iframe",
	"legend",
	"li",
	"link",
	"main",
	"menu",
	"menuitem",
	"nav",
	"noframes",
	"ol",
	"optgroup",
	"option",
	"p",
	"param",
	"search",
	"section",
	"summary",
	"table",
	"tbody",
	"td",
	"tfoot",
	"th",
	"thead",
	"title",
	"tr",
	"track",
	"ul"
];
/**
* List of lowercase HTML “raw” tag names.
*
* The list, when parsing HTML (flow), results in HTML that can include lines
* without exiting, until a closing tag also in this list is found (condition
* 1).
*
* This module is copied from:
* <https://spec.commonmark.org/0.30/#html-blocks>.
*
* > 👉 **Note**: `textarea` was added in `CommonMark@0.30`.
*/
var htmlRawNames = [
	"pre",
	"script",
	"style",
	"textarea"
];
//#endregion
//#region node_modules/micromark-core-commonmark/lib/html-flow.js
/**
* @import {
*   Code,
*   Construct,
*   Resolver,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var htmlFlow = {
	concrete: true,
	name: "htmlFlow",
	resolveTo: resolveToHtmlFlow,
	tokenize: tokenizeHtmlFlow
};
/** @type {Construct} */
var blankLineBefore = {
	partial: true,
	tokenize: tokenizeBlankLineBefore
};
var nonLazyContinuationStart = {
	partial: true,
	tokenize: tokenizeNonLazyContinuationStart
};
/** @type {Resolver} */
function resolveToHtmlFlow(events) {
	let index = events.length;
	while (index--) if (events[index][0] === "enter" && events[index][1].type === "htmlFlow") break;
	if (index > 1 && events[index - 2][1].type === "linePrefix") {
		events[index][1].start = events[index - 2][1].start;
		events[index + 1][1].start = events[index - 2][1].start;
		events.splice(index - 2, 2);
	}
	return events;
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeHtmlFlow(effects, ok, nok) {
	const self = this;
	/** @type {number} */
	let marker;
	/** @type {boolean} */
	let closingTag;
	/** @type {string} */
	let buffer;
	/** @type {number} */
	let index;
	/** @type {Code} */
	let markerB;
	return start;
	/**
	* Start of HTML (flow).
	*
	* ```markdown
	* > | <x />
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		return before(code);
	}
	/**
	* At `<`, after optional whitespace.
	*
	* ```markdown
	* > | <x />
	*     ^
	* ```
	*
	* @type {State}
	*/
	function before(code) {
		effects.enter("htmlFlow");
		effects.enter("htmlFlowData");
		effects.consume(code);
		return open;
	}
	/**
	* After `<`, at tag name or other stuff.
	*
	* ```markdown
	* > | <x />
	*      ^
	* > | <!doctype>
	*      ^
	* > | <!--xxx-->
	*      ^
	* ```
	*
	* @type {State}
	*/
	function open(code) {
		if (code === 33) {
			effects.consume(code);
			return declarationOpen;
		}
		if (code === 47) {
			effects.consume(code);
			closingTag = true;
			return tagCloseStart;
		}
		if (code === 63) {
			effects.consume(code);
			marker = 3;
			return self.interrupt ? ok : continuationDeclarationInside;
		}
		if (asciiAlpha(code)) {
			effects.consume(code);
			buffer = String.fromCharCode(code);
			return tagName;
		}
		return nok(code);
	}
	/**
	* After `<!`, at declaration, comment, or CDATA.
	*
	* ```markdown
	* > | <!doctype>
	*       ^
	* > | <!--xxx-->
	*       ^
	* > | <![CDATA[>&<]]>
	*       ^
	* ```
	*
	* @type {State}
	*/
	function declarationOpen(code) {
		if (code === 45) {
			effects.consume(code);
			marker = 2;
			return commentOpenInside;
		}
		if (code === 91) {
			effects.consume(code);
			marker = 5;
			index = 0;
			return cdataOpenInside;
		}
		if (asciiAlpha(code)) {
			effects.consume(code);
			marker = 4;
			return self.interrupt ? ok : continuationDeclarationInside;
		}
		return nok(code);
	}
	/**
	* After `<!-`, inside a comment, at another `-`.
	*
	* ```markdown
	* > | <!--xxx-->
	*        ^
	* ```
	*
	* @type {State}
	*/
	function commentOpenInside(code) {
		if (code === 45) {
			effects.consume(code);
			return self.interrupt ? ok : continuationDeclarationInside;
		}
		return nok(code);
	}
	/**
	* After `<![`, inside CDATA, expecting `CDATA[`.
	*
	* ```markdown
	* > | <![CDATA[>&<]]>
	*        ^^^^^^
	* ```
	*
	* @type {State}
	*/
	function cdataOpenInside(code) {
		if (code === "CDATA[".charCodeAt(index++)) {
			effects.consume(code);
			if (index === 6) return self.interrupt ? ok : continuation;
			return cdataOpenInside;
		}
		return nok(code);
	}
	/**
	* After `</`, in closing tag, at tag name.
	*
	* ```markdown
	* > | </x>
	*       ^
	* ```
	*
	* @type {State}
	*/
	function tagCloseStart(code) {
		if (asciiAlpha(code)) {
			effects.consume(code);
			buffer = String.fromCharCode(code);
			return tagName;
		}
		return nok(code);
	}
	/**
	* In tag name.
	*
	* ```markdown
	* > | <ab>
	*      ^^
	* > | </ab>
	*       ^^
	* ```
	*
	* @type {State}
	*/
	function tagName(code) {
		if (code === null || code === 47 || code === 62 || markdownLineEndingOrSpace(code)) {
			const slash = code === 47;
			const name = buffer.toLowerCase();
			if (!slash && !closingTag && htmlRawNames.includes(name)) {
				marker = 1;
				return self.interrupt ? ok(code) : continuation(code);
			}
			if (htmlBlockNames.includes(buffer.toLowerCase())) {
				marker = 6;
				if (slash) {
					effects.consume(code);
					return basicSelfClosing;
				}
				return self.interrupt ? ok(code) : continuation(code);
			}
			marker = 7;
			return self.interrupt && !self.parser.lazy[self.now().line] ? nok(code) : closingTag ? completeClosingTagAfter(code) : completeAttributeNameBefore(code);
		}
		if (code === 45 || asciiAlphanumeric(code)) {
			effects.consume(code);
			buffer += String.fromCharCode(code);
			return tagName;
		}
		return nok(code);
	}
	/**
	* After closing slash of a basic tag name.
	*
	* ```markdown
	* > | <div/>
	*          ^
	* ```
	*
	* @type {State}
	*/
	function basicSelfClosing(code) {
		if (code === 62) {
			effects.consume(code);
			return self.interrupt ? ok : continuation;
		}
		return nok(code);
	}
	/**
	* After closing slash of a complete tag name.
	*
	* ```markdown
	* > | <x/>
	*        ^
	* ```
	*
	* @type {State}
	*/
	function completeClosingTagAfter(code) {
		if (markdownSpace(code)) {
			effects.consume(code);
			return completeClosingTagAfter;
		}
		return completeEnd(code);
	}
	/**
	* At an attribute name.
	*
	* At first, this state is used after a complete tag name, after whitespace,
	* where it expects optional attributes or the end of the tag.
	* It is also reused after attributes, when expecting more optional
	* attributes.
	*
	* ```markdown
	* > | <a />
	*        ^
	* > | <a :b>
	*        ^
	* > | <a _b>
	*        ^
	* > | <a b>
	*        ^
	* > | <a >
	*        ^
	* ```
	*
	* @type {State}
	*/
	function completeAttributeNameBefore(code) {
		if (code === 47) {
			effects.consume(code);
			return completeEnd;
		}
		if (code === 58 || code === 95 || asciiAlpha(code)) {
			effects.consume(code);
			return completeAttributeName;
		}
		if (markdownSpace(code)) {
			effects.consume(code);
			return completeAttributeNameBefore;
		}
		return completeEnd(code);
	}
	/**
	* In attribute name.
	*
	* ```markdown
	* > | <a :b>
	*         ^
	* > | <a _b>
	*         ^
	* > | <a b>
	*         ^
	* ```
	*
	* @type {State}
	*/
	function completeAttributeName(code) {
		if (code === 45 || code === 46 || code === 58 || code === 95 || asciiAlphanumeric(code)) {
			effects.consume(code);
			return completeAttributeName;
		}
		return completeAttributeNameAfter(code);
	}
	/**
	* After attribute name, at an optional initializer, the end of the tag, or
	* whitespace.
	*
	* ```markdown
	* > | <a b>
	*         ^
	* > | <a b=c>
	*         ^
	* ```
	*
	* @type {State}
	*/
	function completeAttributeNameAfter(code) {
		if (code === 61) {
			effects.consume(code);
			return completeAttributeValueBefore;
		}
		if (markdownSpace(code)) {
			effects.consume(code);
			return completeAttributeNameAfter;
		}
		return completeAttributeNameBefore(code);
	}
	/**
	* Before unquoted, double quoted, or single quoted attribute value, allowing
	* whitespace.
	*
	* ```markdown
	* > | <a b=c>
	*          ^
	* > | <a b="c">
	*          ^
	* ```
	*
	* @type {State}
	*/
	function completeAttributeValueBefore(code) {
		if (code === null || code === 60 || code === 61 || code === 62 || code === 96) return nok(code);
		if (code === 34 || code === 39) {
			effects.consume(code);
			markerB = code;
			return completeAttributeValueQuoted;
		}
		if (markdownSpace(code)) {
			effects.consume(code);
			return completeAttributeValueBefore;
		}
		return completeAttributeValueUnquoted(code);
	}
	/**
	* In double or single quoted attribute value.
	*
	* ```markdown
	* > | <a b="c">
	*           ^
	* > | <a b='c'>
	*           ^
	* ```
	*
	* @type {State}
	*/
	function completeAttributeValueQuoted(code) {
		if (code === markerB) {
			effects.consume(code);
			markerB = null;
			return completeAttributeValueQuotedAfter;
		}
		if (code === null || markdownLineEnding(code)) return nok(code);
		effects.consume(code);
		return completeAttributeValueQuoted;
	}
	/**
	* In unquoted attribute value.
	*
	* ```markdown
	* > | <a b=c>
	*          ^
	* ```
	*
	* @type {State}
	*/
	function completeAttributeValueUnquoted(code) {
		if (code === null || code === 34 || code === 39 || code === 47 || code === 60 || code === 61 || code === 62 || code === 96 || markdownLineEndingOrSpace(code)) return completeAttributeNameAfter(code);
		effects.consume(code);
		return completeAttributeValueUnquoted;
	}
	/**
	* After double or single quoted attribute value, before whitespace or the
	* end of the tag.
	*
	* ```markdown
	* > | <a b="c">
	*            ^
	* ```
	*
	* @type {State}
	*/
	function completeAttributeValueQuotedAfter(code) {
		if (code === 47 || code === 62 || markdownSpace(code)) return completeAttributeNameBefore(code);
		return nok(code);
	}
	/**
	* In certain circumstances of a complete tag where only an `>` is allowed.
	*
	* ```markdown
	* > | <a b="c">
	*             ^
	* ```
	*
	* @type {State}
	*/
	function completeEnd(code) {
		if (code === 62) {
			effects.consume(code);
			return completeAfter;
		}
		return nok(code);
	}
	/**
	* After `>` in a complete tag.
	*
	* ```markdown
	* > | <x>
	*        ^
	* ```
	*
	* @type {State}
	*/
	function completeAfter(code) {
		if (code === null || markdownLineEnding(code)) return continuation(code);
		if (markdownSpace(code)) {
			effects.consume(code);
			return completeAfter;
		}
		return nok(code);
	}
	/**
	* In continuation of any HTML kind.
	*
	* ```markdown
	* > | <!--xxx-->
	*          ^
	* ```
	*
	* @type {State}
	*/
	function continuation(code) {
		if (code === 45 && marker === 2) {
			effects.consume(code);
			return continuationCommentInside;
		}
		if (code === 60 && marker === 1) {
			effects.consume(code);
			return continuationRawTagOpen;
		}
		if (code === 62 && marker === 4) {
			effects.consume(code);
			return continuationClose;
		}
		if (code === 63 && marker === 3) {
			effects.consume(code);
			return continuationDeclarationInside;
		}
		if (code === 93 && marker === 5) {
			effects.consume(code);
			return continuationCdataInside;
		}
		if (markdownLineEnding(code) && (marker === 6 || marker === 7)) {
			effects.exit("htmlFlowData");
			return effects.check(blankLineBefore, continuationAfter, continuationStart)(code);
		}
		if (code === null || markdownLineEnding(code)) {
			effects.exit("htmlFlowData");
			return continuationStart(code);
		}
		effects.consume(code);
		return continuation;
	}
	/**
	* In continuation, at eol.
	*
	* ```markdown
	* > | <x>
	*        ^
	*   | asd
	* ```
	*
	* @type {State}
	*/
	function continuationStart(code) {
		return effects.check(nonLazyContinuationStart, continuationStartNonLazy, continuationAfter)(code);
	}
	/**
	* In continuation, at eol, before non-lazy content.
	*
	* ```markdown
	* > | <x>
	*        ^
	*   | asd
	* ```
	*
	* @type {State}
	*/
	function continuationStartNonLazy(code) {
		effects.enter("lineEnding");
		effects.consume(code);
		effects.exit("lineEnding");
		return continuationBefore;
	}
	/**
	* In continuation, before non-lazy content.
	*
	* ```markdown
	*   | <x>
	* > | asd
	*     ^
	* ```
	*
	* @type {State}
	*/
	function continuationBefore(code) {
		if (code === null || markdownLineEnding(code)) return continuationStart(code);
		effects.enter("htmlFlowData");
		return continuation(code);
	}
	/**
	* In comment continuation, after one `-`, expecting another.
	*
	* ```markdown
	* > | <!--xxx-->
	*             ^
	* ```
	*
	* @type {State}
	*/
	function continuationCommentInside(code) {
		if (code === 45) {
			effects.consume(code);
			return continuationDeclarationInside;
		}
		return continuation(code);
	}
	/**
	* In raw continuation, after `<`, at `/`.
	*
	* ```markdown
	* > | <script>console.log(1)<\/script>
	*                            ^
	* ```
	*
	* @type {State}
	*/
	function continuationRawTagOpen(code) {
		if (code === 47) {
			effects.consume(code);
			buffer = "";
			return continuationRawEndTag;
		}
		return continuation(code);
	}
	/**
	* In raw continuation, after `</`, in a raw tag name.
	*
	* ```markdown
	* > | <script>console.log(1)<\/script>
	*                             ^^^^^^
	* ```
	*
	* @type {State}
	*/
	function continuationRawEndTag(code) {
		if (code === 62) {
			const name = buffer.toLowerCase();
			if (htmlRawNames.includes(name)) {
				effects.consume(code);
				return continuationClose;
			}
			return continuation(code);
		}
		if (asciiAlpha(code) && buffer.length < 8) {
			effects.consume(code);
			buffer += String.fromCharCode(code);
			return continuationRawEndTag;
		}
		return continuation(code);
	}
	/**
	* In cdata continuation, after `]`, expecting `]>`.
	*
	* ```markdown
	* > | <![CDATA[>&<]]>
	*                  ^
	* ```
	*
	* @type {State}
	*/
	function continuationCdataInside(code) {
		if (code === 93) {
			effects.consume(code);
			return continuationDeclarationInside;
		}
		return continuation(code);
	}
	/**
	* In declaration or instruction continuation, at `>`.
	*
	* ```markdown
	* > | <!-->
	*         ^
	* > | <?>
	*       ^
	* > | <!q>
	*        ^
	* > | <!--ab-->
	*             ^
	* > | <![CDATA[>&<]]>
	*                   ^
	* ```
	*
	* @type {State}
	*/
	function continuationDeclarationInside(code) {
		if (code === 62) {
			effects.consume(code);
			return continuationClose;
		}
		if (code === 45 && marker === 2) {
			effects.consume(code);
			return continuationDeclarationInside;
		}
		return continuation(code);
	}
	/**
	* In closed continuation: everything we get until the eol/eof is part of it.
	*
	* ```markdown
	* > | <!doctype>
	*               ^
	* ```
	*
	* @type {State}
	*/
	function continuationClose(code) {
		if (code === null || markdownLineEnding(code)) {
			effects.exit("htmlFlowData");
			return continuationAfter(code);
		}
		effects.consume(code);
		return continuationClose;
	}
	/**
	* Done.
	*
	* ```markdown
	* > | <!doctype>
	*               ^
	* ```
	*
	* @type {State}
	*/
	function continuationAfter(code) {
		effects.exit("htmlFlow");
		return ok(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeNonLazyContinuationStart(effects, ok, nok) {
	const self = this;
	return start;
	/**
	* At eol, before continuation.
	*
	* ```markdown
	* > | * ```js
	*            ^
	*   | b
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		if (markdownLineEnding(code)) {
			effects.enter("lineEnding");
			effects.consume(code);
			effects.exit("lineEnding");
			return after;
		}
		return nok(code);
	}
	/**
	* A continuation.
	*
	* ```markdown
	*   | * ```js
	* > | b
	*     ^
	* ```
	*
	* @type {State}
	*/
	function after(code) {
		return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeBlankLineBefore(effects, ok, nok) {
	return start;
	/**
	* Before eol, expecting blank line.
	*
	* ```markdown
	* > | <div>
	*          ^
	*   |
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("lineEnding");
		effects.consume(code);
		effects.exit("lineEnding");
		return effects.attempt(blankLine, ok, nok);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/html-text.js
/**
* @import {
*   Code,
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var htmlText = {
	name: "htmlText",
	tokenize: tokenizeHtmlText
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeHtmlText(effects, ok, nok) {
	const self = this;
	/** @type {NonNullable<Code> | undefined} */
	let marker;
	/** @type {number} */
	let index;
	/** @type {State} */
	let returnState;
	return start;
	/**
	* Start of HTML (text).
	*
	* ```markdown
	* > | a <b> c
	*       ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("htmlText");
		effects.enter("htmlTextData");
		effects.consume(code);
		return open;
	}
	/**
	* After `<`, at tag name or other stuff.
	*
	* ```markdown
	* > | a <b> c
	*        ^
	* > | a <!doctype> c
	*        ^
	* > | a <!--b--> c
	*        ^
	* ```
	*
	* @type {State}
	*/
	function open(code) {
		if (code === 33) {
			effects.consume(code);
			return declarationOpen;
		}
		if (code === 47) {
			effects.consume(code);
			return tagCloseStart;
		}
		if (code === 63) {
			effects.consume(code);
			return instruction;
		}
		if (asciiAlpha(code)) {
			effects.consume(code);
			return tagOpen;
		}
		return nok(code);
	}
	/**
	* After `<!`, at declaration, comment, or CDATA.
	*
	* ```markdown
	* > | a <!doctype> c
	*         ^
	* > | a <!--b--> c
	*         ^
	* > | a <![CDATA[>&<]]> c
	*         ^
	* ```
	*
	* @type {State}
	*/
	function declarationOpen(code) {
		if (code === 45) {
			effects.consume(code);
			return commentOpenInside;
		}
		if (code === 91) {
			effects.consume(code);
			index = 0;
			return cdataOpenInside;
		}
		if (asciiAlpha(code)) {
			effects.consume(code);
			return declaration;
		}
		return nok(code);
	}
	/**
	* In a comment, after `<!-`, at another `-`.
	*
	* ```markdown
	* > | a <!--b--> c
	*          ^
	* ```
	*
	* @type {State}
	*/
	function commentOpenInside(code) {
		if (code === 45) {
			effects.consume(code);
			return commentEnd;
		}
		return nok(code);
	}
	/**
	* In comment.
	*
	* ```markdown
	* > | a <!--b--> c
	*           ^
	* ```
	*
	* @type {State}
	*/
	function comment(code) {
		if (code === null) return nok(code);
		if (code === 45) {
			effects.consume(code);
			return commentClose;
		}
		if (markdownLineEnding(code)) {
			returnState = comment;
			return lineEndingBefore(code);
		}
		effects.consume(code);
		return comment;
	}
	/**
	* In comment, after `-`.
	*
	* ```markdown
	* > | a <!--b--> c
	*             ^
	* ```
	*
	* @type {State}
	*/
	function commentClose(code) {
		if (code === 45) {
			effects.consume(code);
			return commentEnd;
		}
		return comment(code);
	}
	/**
	* In comment, after `--`.
	*
	* ```markdown
	* > | a <!--b--> c
	*              ^
	* ```
	*
	* @type {State}
	*/
	function commentEnd(code) {
		return code === 62 ? end(code) : code === 45 ? commentClose(code) : comment(code);
	}
	/**
	* After `<![`, in CDATA, expecting `CDATA[`.
	*
	* ```markdown
	* > | a <![CDATA[>&<]]> b
	*          ^^^^^^
	* ```
	*
	* @type {State}
	*/
	function cdataOpenInside(code) {
		if (code === "CDATA[".charCodeAt(index++)) {
			effects.consume(code);
			return index === 6 ? cdata : cdataOpenInside;
		}
		return nok(code);
	}
	/**
	* In CDATA.
	*
	* ```markdown
	* > | a <![CDATA[>&<]]> b
	*                ^^^
	* ```
	*
	* @type {State}
	*/
	function cdata(code) {
		if (code === null) return nok(code);
		if (code === 93) {
			effects.consume(code);
			return cdataClose;
		}
		if (markdownLineEnding(code)) {
			returnState = cdata;
			return lineEndingBefore(code);
		}
		effects.consume(code);
		return cdata;
	}
	/**
	* In CDATA, after `]`, at another `]`.
	*
	* ```markdown
	* > | a <![CDATA[>&<]]> b
	*                    ^
	* ```
	*
	* @type {State}
	*/
	function cdataClose(code) {
		if (code === 93) {
			effects.consume(code);
			return cdataEnd;
		}
		return cdata(code);
	}
	/**
	* In CDATA, after `]]`, at `>`.
	*
	* ```markdown
	* > | a <![CDATA[>&<]]> b
	*                     ^
	* ```
	*
	* @type {State}
	*/
	function cdataEnd(code) {
		if (code === 62) return end(code);
		if (code === 93) {
			effects.consume(code);
			return cdataEnd;
		}
		return cdata(code);
	}
	/**
	* In declaration.
	*
	* ```markdown
	* > | a <!b> c
	*          ^
	* ```
	*
	* @type {State}
	*/
	function declaration(code) {
		if (code === null || code === 62) return end(code);
		if (markdownLineEnding(code)) {
			returnState = declaration;
			return lineEndingBefore(code);
		}
		effects.consume(code);
		return declaration;
	}
	/**
	* In instruction.
	*
	* ```markdown
	* > | a <?b?> c
	*         ^
	* ```
	*
	* @type {State}
	*/
	function instruction(code) {
		if (code === null) return nok(code);
		if (code === 63) {
			effects.consume(code);
			return instructionClose;
		}
		if (markdownLineEnding(code)) {
			returnState = instruction;
			return lineEndingBefore(code);
		}
		effects.consume(code);
		return instruction;
	}
	/**
	* In instruction, after `?`, at `>`.
	*
	* ```markdown
	* > | a <?b?> c
	*           ^
	* ```
	*
	* @type {State}
	*/
	function instructionClose(code) {
		return code === 62 ? end(code) : instruction(code);
	}
	/**
	* After `</`, in closing tag, at tag name.
	*
	* ```markdown
	* > | a </b> c
	*         ^
	* ```
	*
	* @type {State}
	*/
	function tagCloseStart(code) {
		if (asciiAlpha(code)) {
			effects.consume(code);
			return tagClose;
		}
		return nok(code);
	}
	/**
	* After `</x`, in a tag name.
	*
	* ```markdown
	* > | a </b> c
	*          ^
	* ```
	*
	* @type {State}
	*/
	function tagClose(code) {
		if (code === 45 || asciiAlphanumeric(code)) {
			effects.consume(code);
			return tagClose;
		}
		return tagCloseBetween(code);
	}
	/**
	* In closing tag, after tag name.
	*
	* ```markdown
	* > | a </b> c
	*          ^
	* ```
	*
	* @type {State}
	*/
	function tagCloseBetween(code) {
		if (markdownLineEnding(code)) {
			returnState = tagCloseBetween;
			return lineEndingBefore(code);
		}
		if (markdownSpace(code)) {
			effects.consume(code);
			return tagCloseBetween;
		}
		return end(code);
	}
	/**
	* After `<x`, in opening tag name.
	*
	* ```markdown
	* > | a <b> c
	*         ^
	* ```
	*
	* @type {State}
	*/
	function tagOpen(code) {
		if (code === 45 || asciiAlphanumeric(code)) {
			effects.consume(code);
			return tagOpen;
		}
		if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) return tagOpenBetween(code);
		return nok(code);
	}
	/**
	* In opening tag, after tag name.
	*
	* ```markdown
	* > | a <b> c
	*         ^
	* ```
	*
	* @type {State}
	*/
	function tagOpenBetween(code) {
		if (code === 47) {
			effects.consume(code);
			return end;
		}
		if (code === 58 || code === 95 || asciiAlpha(code)) {
			effects.consume(code);
			return tagOpenAttributeName;
		}
		if (markdownLineEnding(code)) {
			returnState = tagOpenBetween;
			return lineEndingBefore(code);
		}
		if (markdownSpace(code)) {
			effects.consume(code);
			return tagOpenBetween;
		}
		return end(code);
	}
	/**
	* In attribute name.
	*
	* ```markdown
	* > | a <b c> d
	*          ^
	* ```
	*
	* @type {State}
	*/
	function tagOpenAttributeName(code) {
		if (code === 45 || code === 46 || code === 58 || code === 95 || asciiAlphanumeric(code)) {
			effects.consume(code);
			return tagOpenAttributeName;
		}
		return tagOpenAttributeNameAfter(code);
	}
	/**
	* After attribute name, before initializer, the end of the tag, or
	* whitespace.
	*
	* ```markdown
	* > | a <b c> d
	*           ^
	* ```
	*
	* @type {State}
	*/
	function tagOpenAttributeNameAfter(code) {
		if (code === 61) {
			effects.consume(code);
			return tagOpenAttributeValueBefore;
		}
		if (markdownLineEnding(code)) {
			returnState = tagOpenAttributeNameAfter;
			return lineEndingBefore(code);
		}
		if (markdownSpace(code)) {
			effects.consume(code);
			return tagOpenAttributeNameAfter;
		}
		return tagOpenBetween(code);
	}
	/**
	* Before unquoted, double quoted, or single quoted attribute value, allowing
	* whitespace.
	*
	* ```markdown
	* > | a <b c=d> e
	*            ^
	* ```
	*
	* @type {State}
	*/
	function tagOpenAttributeValueBefore(code) {
		if (code === null || code === 60 || code === 61 || code === 62 || code === 96) return nok(code);
		if (code === 34 || code === 39) {
			effects.consume(code);
			marker = code;
			return tagOpenAttributeValueQuoted;
		}
		if (markdownLineEnding(code)) {
			returnState = tagOpenAttributeValueBefore;
			return lineEndingBefore(code);
		}
		if (markdownSpace(code)) {
			effects.consume(code);
			return tagOpenAttributeValueBefore;
		}
		effects.consume(code);
		return tagOpenAttributeValueUnquoted;
	}
	/**
	* In double or single quoted attribute value.
	*
	* ```markdown
	* > | a <b c="d"> e
	*             ^
	* ```
	*
	* @type {State}
	*/
	function tagOpenAttributeValueQuoted(code) {
		if (code === marker) {
			effects.consume(code);
			marker = void 0;
			return tagOpenAttributeValueQuotedAfter;
		}
		if (code === null) return nok(code);
		if (markdownLineEnding(code)) {
			returnState = tagOpenAttributeValueQuoted;
			return lineEndingBefore(code);
		}
		effects.consume(code);
		return tagOpenAttributeValueQuoted;
	}
	/**
	* In unquoted attribute value.
	*
	* ```markdown
	* > | a <b c=d> e
	*            ^
	* ```
	*
	* @type {State}
	*/
	function tagOpenAttributeValueUnquoted(code) {
		if (code === null || code === 34 || code === 39 || code === 60 || code === 61 || code === 96) return nok(code);
		if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) return tagOpenBetween(code);
		effects.consume(code);
		return tagOpenAttributeValueUnquoted;
	}
	/**
	* After double or single quoted attribute value, before whitespace or the end
	* of the tag.
	*
	* ```markdown
	* > | a <b c="d"> e
	*               ^
	* ```
	*
	* @type {State}
	*/
	function tagOpenAttributeValueQuotedAfter(code) {
		if (code === 47 || code === 62 || markdownLineEndingOrSpace(code)) return tagOpenBetween(code);
		return nok(code);
	}
	/**
	* In certain circumstances of a tag where only an `>` is allowed.
	*
	* ```markdown
	* > | a <b c="d"> e
	*               ^
	* ```
	*
	* @type {State}
	*/
	function end(code) {
		if (code === 62) {
			effects.consume(code);
			effects.exit("htmlTextData");
			effects.exit("htmlText");
			return ok;
		}
		return nok(code);
	}
	/**
	* At eol.
	*
	* > 👉 **Note**: we can’t have blank lines in text, so no need to worry about
	* > empty tokens.
	*
	* ```markdown
	* > | a <!--a
	*            ^
	*   | b-->
	* ```
	*
	* @type {State}
	*/
	function lineEndingBefore(code) {
		effects.exit("htmlTextData");
		effects.enter("lineEnding");
		effects.consume(code);
		effects.exit("lineEnding");
		return lineEndingAfter;
	}
	/**
	* After eol, at optional whitespace.
	*
	* > 👉 **Note**: we can’t have blank lines in text, so no need to worry about
	* > empty tokens.
	*
	* ```markdown
	*   | a <!--a
	* > | b-->
	*     ^
	* ```
	*
	* @type {State}
	*/
	function lineEndingAfter(code) {
		return markdownSpace(code) ? factorySpace(effects, lineEndingAfterPrefix, "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code) : lineEndingAfterPrefix(code);
	}
	/**
	* After eol, after optional whitespace.
	*
	* > 👉 **Note**: we can’t have blank lines in text, so no need to worry about
	* > empty tokens.
	*
	* ```markdown
	*   | a <!--a
	* > | b-->
	*     ^
	* ```
	*
	* @type {State}
	*/
	function lineEndingAfterPrefix(code) {
		effects.enter("htmlTextData");
		return returnState(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/label-end.js
/**
* @import {
*   Construct,
*   Event,
*   Resolver,
*   State,
*   TokenizeContext,
*   Tokenizer,
*   Token
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var labelEnd = {
	name: "labelEnd",
	resolveAll: resolveAllLabelEnd,
	resolveTo: resolveToLabelEnd,
	tokenize: tokenizeLabelEnd
};
/** @type {Construct} */
var resourceConstruct = { tokenize: tokenizeResource };
/** @type {Construct} */
var referenceFullConstruct = { tokenize: tokenizeReferenceFull };
/** @type {Construct} */
var referenceCollapsedConstruct = { tokenize: tokenizeReferenceCollapsed };
/** @type {Resolver} */
function resolveAllLabelEnd(events) {
	let index = -1;
	/** @type {Array<Event>} */
	const newEvents = [];
	while (++index < events.length) {
		const token = events[index][1];
		newEvents.push(events[index]);
		if (token.type === "labelImage" || token.type === "labelLink" || token.type === "labelEnd") {
			const offset = token.type === "labelImage" ? 4 : 2;
			token.type = "data";
			index += offset;
		}
	}
	if (events.length !== newEvents.length) splice(events, 0, events.length, newEvents);
	return events;
}
/** @type {Resolver} */
function resolveToLabelEnd(events, context) {
	let index = events.length;
	let offset = 0;
	/** @type {Token} */
	let token;
	/** @type {number | undefined} */
	let open;
	/** @type {number | undefined} */
	let close;
	/** @type {Array<Event>} */
	let media;
	while (index--) {
		token = events[index][1];
		if (open) {
			if (token.type === "link" || token.type === "labelLink" && token._inactive) break;
			if (events[index][0] === "enter" && token.type === "labelLink") token._inactive = true;
		} else if (close) {
			if (events[index][0] === "enter" && (token.type === "labelImage" || token.type === "labelLink") && !token._balanced) {
				open = index;
				if (token.type !== "labelLink") {
					offset = 2;
					break;
				}
			}
		} else if (token.type === "labelEnd") close = index;
	}
	const group = {
		type: events[open][1].type === "labelLink" ? "link" : "image",
		start: { ...events[open][1].start },
		end: { ...events[events.length - 1][1].end }
	};
	const label = {
		type: "label",
		start: { ...events[open][1].start },
		end: { ...events[close][1].end }
	};
	const text = {
		type: "labelText",
		start: { ...events[open + offset + 2][1].end },
		end: { ...events[close - 2][1].start }
	};
	media = [[
		"enter",
		group,
		context
	], [
		"enter",
		label,
		context
	]];
	media = push(media, events.slice(open + 1, open + offset + 3));
	media = push(media, [[
		"enter",
		text,
		context
	]]);
	media = push(media, resolveAll(context.parser.constructs.insideSpan.null, events.slice(open + offset + 4, close - 3), context));
	media = push(media, [
		[
			"exit",
			text,
			context
		],
		events[close - 2],
		events[close - 1],
		[
			"exit",
			label,
			context
		]
	]);
	media = push(media, events.slice(close + 1));
	media = push(media, [[
		"exit",
		group,
		context
	]]);
	splice(events, open, events.length, media);
	return events;
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeLabelEnd(effects, ok, nok) {
	const self = this;
	let index = self.events.length;
	/** @type {Token} */
	let labelStart;
	/** @type {boolean} */
	let defined;
	while (index--) if ((self.events[index][1].type === "labelImage" || self.events[index][1].type === "labelLink") && !self.events[index][1]._balanced) {
		labelStart = self.events[index][1];
		break;
	}
	return start;
	/**
	* Start of label end.
	*
	* ```markdown
	* > | [a](b) c
	*       ^
	* > | [a][b] c
	*       ^
	* > | [a][] b
	*       ^
	* > | [a] b
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		if (!labelStart) return nok(code);
		if (labelStart._inactive) return labelEndNok(code);
		defined = self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize({
			start: labelStart.end,
			end: self.now()
		})));
		effects.enter("labelEnd");
		effects.enter("labelMarker");
		effects.consume(code);
		effects.exit("labelMarker");
		effects.exit("labelEnd");
		return after;
	}
	/**
	* After `]`.
	*
	* ```markdown
	* > | [a](b) c
	*       ^
	* > | [a][b] c
	*       ^
	* > | [a][] b
	*       ^
	* > | [a] b
	*       ^
	* ```
	*
	* @type {State}
	*/
	function after(code) {
		if (code === 40) return effects.attempt(resourceConstruct, labelEndOk, defined ? labelEndOk : labelEndNok)(code);
		if (code === 91) return effects.attempt(referenceFullConstruct, labelEndOk, defined ? referenceNotFull : labelEndNok)(code);
		return defined ? labelEndOk(code) : labelEndNok(code);
	}
	/**
	* After `]`, at `[`, but not at a full reference.
	*
	* > 👉 **Note**: we only get here if the label is defined.
	*
	* ```markdown
	* > | [a][] b
	*        ^
	* > | [a] b
	*        ^
	* ```
	*
	* @type {State}
	*/
	function referenceNotFull(code) {
		return effects.attempt(referenceCollapsedConstruct, labelEndOk, labelEndNok)(code);
	}
	/**
	* Done, we found something.
	*
	* ```markdown
	* > | [a](b) c
	*           ^
	* > | [a][b] c
	*           ^
	* > | [a][] b
	*          ^
	* > | [a] b
	*        ^
	* ```
	*
	* @type {State}
	*/
	function labelEndOk(code) {
		return ok(code);
	}
	/**
	* Done, it’s nothing.
	*
	* There was an okay opening, but we didn’t match anything.
	*
	* ```markdown
	* > | [a](b c
	*        ^
	* > | [a][b c
	*        ^
	* > | [a] b
	*        ^
	* ```
	*
	* @type {State}
	*/
	function labelEndNok(code) {
		labelStart._balanced = true;
		return nok(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeResource(effects, ok, nok) {
	return resourceStart;
	/**
	* At a resource.
	*
	* ```markdown
	* > | [a](b) c
	*        ^
	* ```
	*
	* @type {State}
	*/
	function resourceStart(code) {
		effects.enter("resource");
		effects.enter("resourceMarker");
		effects.consume(code);
		effects.exit("resourceMarker");
		return resourceBefore;
	}
	/**
	* In resource, after `(`, at optional whitespace.
	*
	* ```markdown
	* > | [a](b) c
	*         ^
	* ```
	*
	* @type {State}
	*/
	function resourceBefore(code) {
		return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceOpen)(code) : resourceOpen(code);
	}
	/**
	* In resource, after optional whitespace, at `)` or a destination.
	*
	* ```markdown
	* > | [a](b) c
	*         ^
	* ```
	*
	* @type {State}
	*/
	function resourceOpen(code) {
		if (code === 41) return resourceEnd(code);
		return factoryDestination(effects, resourceDestinationAfter, resourceDestinationMissing, "resourceDestination", "resourceDestinationLiteral", "resourceDestinationLiteralMarker", "resourceDestinationRaw", "resourceDestinationString", 32)(code);
	}
	/**
	* In resource, after destination, at optional whitespace.
	*
	* ```markdown
	* > | [a](b) c
	*          ^
	* ```
	*
	* @type {State}
	*/
	function resourceDestinationAfter(code) {
		return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceBetween)(code) : resourceEnd(code);
	}
	/**
	* At invalid destination.
	*
	* ```markdown
	* > | [a](<<) b
	*         ^
	* ```
	*
	* @type {State}
	*/
	function resourceDestinationMissing(code) {
		return nok(code);
	}
	/**
	* In resource, after destination and whitespace, at `(` or title.
	*
	* ```markdown
	* > | [a](b ) c
	*           ^
	* ```
	*
	* @type {State}
	*/
	function resourceBetween(code) {
		if (code === 34 || code === 39 || code === 40) return factoryTitle(effects, resourceTitleAfter, nok, "resourceTitle", "resourceTitleMarker", "resourceTitleString")(code);
		return resourceEnd(code);
	}
	/**
	* In resource, after title, at optional whitespace.
	*
	* ```markdown
	* > | [a](b "c") d
	*              ^
	* ```
	*
	* @type {State}
	*/
	function resourceTitleAfter(code) {
		return markdownLineEndingOrSpace(code) ? factoryWhitespace(effects, resourceEnd)(code) : resourceEnd(code);
	}
	/**
	* In resource, at `)`.
	*
	* ```markdown
	* > | [a](b) d
	*          ^
	* ```
	*
	* @type {State}
	*/
	function resourceEnd(code) {
		if (code === 41) {
			effects.enter("resourceMarker");
			effects.consume(code);
			effects.exit("resourceMarker");
			effects.exit("resource");
			return ok;
		}
		return nok(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeReferenceFull(effects, ok, nok) {
	const self = this;
	return referenceFull;
	/**
	* In a reference (full), at the `[`.
	*
	* ```markdown
	* > | [a][b] d
	*        ^
	* ```
	*
	* @type {State}
	*/
	function referenceFull(code) {
		return factoryLabel.call(self, effects, referenceFullAfter, referenceFullMissing, "reference", "referenceMarker", "referenceString")(code);
	}
	/**
	* In a reference (full), after `]`.
	*
	* ```markdown
	* > | [a][b] d
	*          ^
	* ```
	*
	* @type {State}
	*/
	function referenceFullAfter(code) {
		return self.parser.defined.includes(normalizeIdentifier(self.sliceSerialize(self.events[self.events.length - 1][1]).slice(1, -1))) ? ok(code) : nok(code);
	}
	/**
	* In reference (full) that was missing.
	*
	* ```markdown
	* > | [a][b d
	*        ^
	* ```
	*
	* @type {State}
	*/
	function referenceFullMissing(code) {
		return nok(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeReferenceCollapsed(effects, ok, nok) {
	return referenceCollapsedStart;
	/**
	* In reference (collapsed), at `[`.
	*
	* > 👉 **Note**: we only get here if the label is defined.
	*
	* ```markdown
	* > | [a][] d
	*        ^
	* ```
	*
	* @type {State}
	*/
	function referenceCollapsedStart(code) {
		effects.enter("reference");
		effects.enter("referenceMarker");
		effects.consume(code);
		effects.exit("referenceMarker");
		return referenceCollapsedOpen;
	}
	/**
	* In reference (collapsed), at `]`.
	*
	* > 👉 **Note**: we only get here if the label is defined.
	*
	* ```markdown
	* > | [a][] d
	*         ^
	* ```
	*
	*  @type {State}
	*/
	function referenceCollapsedOpen(code) {
		if (code === 93) {
			effects.enter("referenceMarker");
			effects.consume(code);
			effects.exit("referenceMarker");
			effects.exit("reference");
			return ok;
		}
		return nok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/label-start-image.js
/**
* @import {
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var labelStartImage = {
	name: "labelStartImage",
	resolveAll: labelEnd.resolveAll,
	tokenize: tokenizeLabelStartImage
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeLabelStartImage(effects, ok, nok) {
	const self = this;
	return start;
	/**
	* Start of label (image) start.
	*
	* ```markdown
	* > | a ![b] c
	*       ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("labelImage");
		effects.enter("labelImageMarker");
		effects.consume(code);
		effects.exit("labelImageMarker");
		return open;
	}
	/**
	* After `!`, at `[`.
	*
	* ```markdown
	* > | a ![b] c
	*        ^
	* ```
	*
	* @type {State}
	*/
	function open(code) {
		if (code === 91) {
			effects.enter("labelMarker");
			effects.consume(code);
			effects.exit("labelMarker");
			effects.exit("labelImage");
			return after;
		}
		return nok(code);
	}
	/**
	* After `![`.
	*
	* ```markdown
	* > | a ![b] c
	*         ^
	* ```
	*
	* This is needed in because, when GFM footnotes are enabled, images never
	* form when started with a `^`.
	* Instead, links form:
	*
	* ```markdown
	* ![^a](b)
	*
	* ![^a][b]
	*
	* [b]: c
	* ```
	*
	* ```html
	* <p>!<a href=\"b\">^a</a></p>
	* <p>!<a href=\"c\">^a</a></p>
	* ```
	*
	* @type {State}
	*/
	function after(code) {
		/* c8 ignore next 3 */
		return code === 94 && "_hiddenFootnoteSupport" in self.parser.constructs ? nok(code) : ok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/label-start-link.js
/**
* @import {
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var labelStartLink = {
	name: "labelStartLink",
	resolveAll: labelEnd.resolveAll,
	tokenize: tokenizeLabelStartLink
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeLabelStartLink(effects, ok, nok) {
	const self = this;
	return start;
	/**
	* Start of label (link) start.
	*
	* ```markdown
	* > | a [b] c
	*       ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("labelLink");
		effects.enter("labelMarker");
		effects.consume(code);
		effects.exit("labelMarker");
		effects.exit("labelLink");
		return after;
	}
	/** @type {State} */
	function after(code) {
		/* c8 ignore next 3 */
		return code === 94 && "_hiddenFootnoteSupport" in self.parser.constructs ? nok(code) : ok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/line-ending.js
/**
* @import {
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var lineEnding = {
	name: "lineEnding",
	tokenize: tokenizeLineEnding
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeLineEnding(effects, ok) {
	return start;
	/** @type {State} */
	function start(code) {
		effects.enter("lineEnding");
		effects.consume(code);
		effects.exit("lineEnding");
		return factorySpace(effects, ok, "linePrefix");
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/thematic-break.js
/**
* @import {
*   Code,
*   Construct,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var thematicBreak = {
	name: "thematicBreak",
	tokenize: tokenizeThematicBreak
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeThematicBreak(effects, ok, nok) {
	let size = 0;
	/** @type {NonNullable<Code>} */
	let marker;
	return start;
	/**
	* Start of thematic break.
	*
	* ```markdown
	* > | ***
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		effects.enter("thematicBreak");
		return before(code);
	}
	/**
	* After optional whitespace, at marker.
	*
	* ```markdown
	* > | ***
	*     ^
	* ```
	*
	* @type {State}
	*/
	function before(code) {
		marker = code;
		return atBreak(code);
	}
	/**
	* After something, before something else.
	*
	* ```markdown
	* > | ***
	*     ^
	* ```
	*
	* @type {State}
	*/
	function atBreak(code) {
		if (code === marker) {
			effects.enter("thematicBreakSequence");
			return sequence(code);
		}
		if (size >= 3 && (code === null || markdownLineEnding(code))) {
			effects.exit("thematicBreak");
			return ok(code);
		}
		return nok(code);
	}
	/**
	* In sequence.
	*
	* ```markdown
	* > | ***
	*     ^
	* ```
	*
	* @type {State}
	*/
	function sequence(code) {
		if (code === marker) {
			effects.consume(code);
			size++;
			return sequence;
		}
		effects.exit("thematicBreakSequence");
		return markdownSpace(code) ? factorySpace(effects, atBreak, "whitespace")(code) : atBreak(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/list.js
/**
* @import {
*   Code,
*   Construct,
*   Exiter,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var list = {
	continuation: { tokenize: tokenizeListContinuation },
	exit: tokenizeListEnd,
	name: "list",
	tokenize: tokenizeListStart
};
/** @type {Construct} */
var listItemPrefixWhitespaceConstruct = {
	partial: true,
	tokenize: tokenizeListItemPrefixWhitespace
};
/** @type {Construct} */
var indentConstruct = {
	partial: true,
	tokenize: tokenizeIndent
};
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeListStart(effects, ok, nok) {
	const self = this;
	const tail = self.events[self.events.length - 1];
	let initialSize = tail && tail[1].type === "linePrefix" ? tail[2].sliceSerialize(tail[1], true).length : 0;
	let size = 0;
	return start;
	/** @type {State} */
	function start(code) {
		const kind = self.containerState.type || (code === 42 || code === 43 || code === 45 ? "listUnordered" : "listOrdered");
		if (kind === "listUnordered" ? !self.containerState.marker || code === self.containerState.marker : asciiDigit(code)) {
			if (!self.containerState.type) {
				self.containerState.type = kind;
				effects.enter(kind, { _container: true });
			}
			if (kind === "listUnordered") {
				effects.enter("listItemPrefix");
				return code === 42 || code === 45 ? effects.check(thematicBreak, nok, atMarker)(code) : atMarker(code);
			}
			if (!self.interrupt || code === 49) {
				effects.enter("listItemPrefix");
				effects.enter("listItemValue");
				return inside(code);
			}
		}
		return nok(code);
	}
	/** @type {State} */
	function inside(code) {
		if (asciiDigit(code) && ++size < 10) {
			effects.consume(code);
			return inside;
		}
		if ((!self.interrupt || size < 2) && (self.containerState.marker ? code === self.containerState.marker : code === 41 || code === 46)) {
			effects.exit("listItemValue");
			return atMarker(code);
		}
		return nok(code);
	}
	/**
	* @type {State}
	**/
	function atMarker(code) {
		effects.enter("listItemMarker");
		effects.consume(code);
		effects.exit("listItemMarker");
		self.containerState.marker = self.containerState.marker || code;
		return effects.check(blankLine, self.interrupt ? nok : onBlank, effects.attempt(listItemPrefixWhitespaceConstruct, endOfPrefix, otherPrefix));
	}
	/** @type {State} */
	function onBlank(code) {
		self.containerState.initialBlankLine = true;
		initialSize++;
		return endOfPrefix(code);
	}
	/** @type {State} */
	function otherPrefix(code) {
		if (markdownSpace(code)) {
			effects.enter("listItemPrefixWhitespace");
			effects.consume(code);
			effects.exit("listItemPrefixWhitespace");
			return endOfPrefix;
		}
		return nok(code);
	}
	/** @type {State} */
	function endOfPrefix(code) {
		self.containerState.size = initialSize + self.sliceSerialize(effects.exit("listItemPrefix"), true).length;
		return ok(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeListContinuation(effects, ok, nok) {
	const self = this;
	self.containerState._closeFlow = void 0;
	return effects.check(blankLine, onBlank, notBlank);
	/** @type {State} */
	function onBlank(code) {
		self.containerState.furtherBlankLines = self.containerState.furtherBlankLines || self.containerState.initialBlankLine;
		return factorySpace(effects, ok, "listItemIndent", self.containerState.size + 1)(code);
	}
	/** @type {State} */
	function notBlank(code) {
		if (self.containerState.furtherBlankLines || !markdownSpace(code)) {
			self.containerState.furtherBlankLines = void 0;
			self.containerState.initialBlankLine = void 0;
			return notInCurrentItem(code);
		}
		self.containerState.furtherBlankLines = void 0;
		self.containerState.initialBlankLine = void 0;
		return effects.attempt(indentConstruct, ok, notInCurrentItem)(code);
	}
	/** @type {State} */
	function notInCurrentItem(code) {
		self.containerState._closeFlow = true;
		self.interrupt = void 0;
		return factorySpace(effects, effects.attempt(list, ok, nok), "linePrefix", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 4)(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeIndent(effects, ok, nok) {
	const self = this;
	return factorySpace(effects, afterPrefix, "listItemIndent", self.containerState.size + 1);
	/** @type {State} */
	function afterPrefix(code) {
		const tail = self.events[self.events.length - 1];
		return tail && tail[1].type === "listItemIndent" && tail[2].sliceSerialize(tail[1], true).length === self.containerState.size ? ok(code) : nok(code);
	}
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Exiter}
*/
function tokenizeListEnd(effects) {
	effects.exit(this.containerState.type);
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeListItemPrefixWhitespace(effects, ok, nok) {
	const self = this;
	return factorySpace(effects, afterPrefix, "listItemPrefixWhitespace", self.parser.constructs.disable.null.includes("codeIndented") ? void 0 : 5);
	/** @type {State} */
	function afterPrefix(code) {
		const tail = self.events[self.events.length - 1];
		return !markdownSpace(code) && tail && tail[1].type === "listItemPrefixWhitespace" ? ok(code) : nok(code);
	}
}
//#endregion
//#region node_modules/micromark-core-commonmark/lib/setext-underline.js
/**
* @import {
*   Code,
*   Construct,
*   Resolver,
*   State,
*   TokenizeContext,
*   Tokenizer
* } from 'micromark-util-types'
*/
/** @type {Construct} */
var setextUnderline = {
	name: "setextUnderline",
	resolveTo: resolveToSetextUnderline,
	tokenize: tokenizeSetextUnderline
};
/** @type {Resolver} */
function resolveToSetextUnderline(events, context) {
	let index = events.length;
	/** @type {number | undefined} */
	let content;
	/** @type {number | undefined} */
	let text;
	/** @type {number | undefined} */
	let definition;
	while (index--) if (events[index][0] === "enter") {
		if (events[index][1].type === "content") {
			content = index;
			break;
		}
		if (events[index][1].type === "paragraph") text = index;
	} else {
		if (events[index][1].type === "content") events.splice(index, 1);
		if (!definition && events[index][1].type === "definition") definition = index;
	}
	const heading = {
		type: "setextHeading",
		start: { ...events[content][1].start },
		end: { ...events[events.length - 1][1].end }
	};
	events[text][1].type = "setextHeadingText";
	if (definition) {
		events.splice(text, 0, [
			"enter",
			heading,
			context
		]);
		events.splice(definition + 1, 0, [
			"exit",
			events[content][1],
			context
		]);
		events[content][1].end = { ...events[definition][1].end };
	} else events[content][1] = heading;
	events.push([
		"exit",
		heading,
		context
	]);
	return events;
}
/**
* @this {TokenizeContext}
*   Context.
* @type {Tokenizer}
*/
function tokenizeSetextUnderline(effects, ok, nok) {
	const self = this;
	/** @type {NonNullable<Code>} */
	let marker;
	return start;
	/**
	* At start of heading (setext) underline.
	*
	* ```markdown
	*   | aa
	* > | ==
	*     ^
	* ```
	*
	* @type {State}
	*/
	function start(code) {
		let index = self.events.length;
		/** @type {boolean | undefined} */
		let paragraph;
		while (index--) if (self.events[index][1].type !== "lineEnding" && self.events[index][1].type !== "linePrefix" && self.events[index][1].type !== "content") {
			paragraph = self.events[index][1].type === "paragraph";
			break;
		}
		if (!self.parser.lazy[self.now().line] && (self.interrupt || paragraph)) {
			effects.enter("setextHeadingLine");
			marker = code;
			return before(code);
		}
		return nok(code);
	}
	/**
	* After optional whitespace, at `-` or `=`.
	*
	* ```markdown
	*   | aa
	* > | ==
	*     ^
	* ```
	*
	* @type {State}
	*/
	function before(code) {
		effects.enter("setextHeadingLineSequence");
		return inside(code);
	}
	/**
	* In sequence.
	*
	* ```markdown
	*   | aa
	* > | ==
	*     ^
	* ```
	*
	* @type {State}
	*/
	function inside(code) {
		if (code === marker) {
			effects.consume(code);
			return inside;
		}
		effects.exit("setextHeadingLineSequence");
		return markdownSpace(code) ? factorySpace(effects, after, "lineSuffix")(code) : after(code);
	}
	/**
	* After sequence, after optional whitespace.
	*
	* ```markdown
	*   | aa
	* > | ==
	*       ^
	* ```
	*
	* @type {State}
	*/
	function after(code) {
		if (code === null || markdownLineEnding(code)) {
			effects.exit("setextHeadingLine");
			return ok(code);
		}
		return nok(code);
	}
}
//#endregion
//#region node_modules/micromark/lib/initialize/flow.js
/**
* @import {
*   InitialConstruct,
*   Initializer,
*   State,
*   TokenizeContext
* } from 'micromark-util-types'
*/
/** @type {InitialConstruct} */
var flow$1 = { tokenize: initializeFlow };
/**
* @this {TokenizeContext}
*   Self.
* @type {Initializer}
*   Initializer.
*/
function initializeFlow(effects) {
	const self = this;
	const initial = effects.attempt(blankLine, atBlankEnding, effects.attempt(this.parser.constructs.flowInitial, afterConstruct, factorySpace(effects, effects.attempt(this.parser.constructs.flow, afterConstruct, effects.attempt(content, afterConstruct)), "linePrefix")));
	return initial;
	/** @type {State} */
	function atBlankEnding(code) {
		if (code === null) {
			effects.consume(code);
			return;
		}
		effects.enter("lineEndingBlank");
		effects.consume(code);
		effects.exit("lineEndingBlank");
		self.currentConstruct = void 0;
		return initial;
	}
	/** @type {State} */
	function afterConstruct(code) {
		if (code === null) {
			effects.consume(code);
			return;
		}
		effects.enter("lineEnding");
		effects.consume(code);
		effects.exit("lineEnding");
		self.currentConstruct = void 0;
		return initial;
	}
}
//#endregion
//#region node_modules/micromark/lib/initialize/text.js
/**
* @import {
*   Code,
*   InitialConstruct,
*   Initializer,
*   Resolver,
*   State,
*   TokenizeContext
* } from 'micromark-util-types'
*/
var resolver = { resolveAll: createResolver() };
var string$1 = initializeFactory("string");
var text$1 = initializeFactory("text");
/**
* @param {'string' | 'text'} field
*   Field.
* @returns {InitialConstruct}
*   Construct.
*/
function initializeFactory(field) {
	return {
		resolveAll: createResolver(field === "text" ? resolveAllLineSuffixes : void 0),
		tokenize: initializeText
	};
	/**
	* @this {TokenizeContext}
	*   Context.
	* @type {Initializer}
	*/
	function initializeText(effects) {
		const self = this;
		const constructs = this.parser.constructs[field];
		const text = effects.attempt(constructs, start, notText);
		return start;
		/** @type {State} */
		function start(code) {
			return atBreak(code) ? text(code) : notText(code);
		}
		/** @type {State} */
		function notText(code) {
			if (code === null) {
				effects.consume(code);
				return;
			}
			effects.enter("data");
			effects.consume(code);
			return data;
		}
		/** @type {State} */
		function data(code) {
			if (atBreak(code)) {
				effects.exit("data");
				return text(code);
			}
			effects.consume(code);
			return data;
		}
		/**
		* @param {Code} code
		*   Code.
		* @returns {boolean}
		*   Whether the code is a break.
		*/
		function atBreak(code) {
			if (code === null) return true;
			const list = constructs[code];
			let index = -1;
			if (list) while (++index < list.length) {
				const item = list[index];
				if (!item.previous || item.previous.call(self, self.previous)) return true;
			}
			return false;
		}
	}
}
/**
* @param {Resolver | undefined} [extraResolver]
*   Resolver.
* @returns {Resolver}
*   Resolver.
*/
function createResolver(extraResolver) {
	return resolveAllText;
	/** @type {Resolver} */
	function resolveAllText(events, context) {
		let index = -1;
		/** @type {number | undefined} */
		let enter;
		while (++index <= events.length) if (enter === void 0) {
			if (events[index] && events[index][1].type === "data") {
				enter = index;
				index++;
			}
		} else if (!events[index] || events[index][1].type !== "data") {
			if (index !== enter + 2) {
				events[enter][1].end = events[index - 1][1].end;
				events.splice(enter + 2, index - enter - 2);
				index = enter + 2;
			}
			enter = void 0;
		}
		return extraResolver ? extraResolver(events, context) : events;
	}
}
/**
* A rather ugly set of instructions which again looks at chunks in the input
* stream.
* The reason to do this here is that it is *much* faster to parse in reverse.
* And that we can’t hook into `null` to split the line suffix before an EOF.
* To do: figure out if we can make this into a clean utility, or even in core.
* As it will be useful for GFMs literal autolink extension (and maybe even
* tables?)
*
* @type {Resolver}
*/
function resolveAllLineSuffixes(events, context) {
	let eventIndex = 0;
	while (++eventIndex <= events.length) if ((eventIndex === events.length || events[eventIndex][1].type === "lineEnding") && events[eventIndex - 1][1].type === "data") {
		const data = events[eventIndex - 1][1];
		const chunks = context.sliceStream(data);
		let index = chunks.length;
		let bufferIndex = -1;
		let size = 0;
		/** @type {boolean | undefined} */
		let tabs;
		while (index--) {
			const chunk = chunks[index];
			if (typeof chunk === "string") {
				bufferIndex = chunk.length;
				while (chunk.charCodeAt(bufferIndex - 1) === 32) {
					size++;
					bufferIndex--;
				}
				if (bufferIndex) break;
				bufferIndex = -1;
			} else if (chunk === -2) {
				tabs = true;
				size++;
			} else if (chunk === -1) {} else {
				index++;
				break;
			}
		}
		if (context._contentTypeTextTrailing && eventIndex === events.length) size = 0;
		if (size) {
			const token = {
				type: eventIndex === events.length || tabs || size < 2 ? "lineSuffix" : "hardBreakTrailing",
				start: {
					_bufferIndex: index ? bufferIndex : data.start._bufferIndex + bufferIndex,
					_index: data.start._index + index,
					line: data.end.line,
					column: data.end.column - size,
					offset: data.end.offset - size
				},
				end: { ...data.end }
			};
			data.end = { ...token.start };
			if (data.start.offset === data.end.offset) Object.assign(data, token);
			else {
				events.splice(eventIndex, 0, [
					"enter",
					token,
					context
				], [
					"exit",
					token,
					context
				]);
				eventIndex += 2;
			}
		}
		eventIndex++;
	}
	return events;
}
//#endregion
//#region node_modules/micromark/lib/constructs.js
/**
* @import {Extension} from 'micromark-util-types'
*/
var constructs_exports = /* @__PURE__ */ __exportAll({
	attentionMarkers: () => attentionMarkers,
	contentInitial: () => contentInitial,
	disable: () => disable,
	document: () => document,
	flow: () => flow,
	flowInitial: () => flowInitial,
	insideSpan: () => insideSpan,
	string: () => string,
	text: () => text
});
/** @satisfies {Extension['document']} */
var document = {
	[42]: list,
	[43]: list,
	[45]: list,
	[48]: list,
	[49]: list,
	[50]: list,
	[51]: list,
	[52]: list,
	[53]: list,
	[54]: list,
	[55]: list,
	[56]: list,
	[57]: list,
	[62]: blockQuote
};
/** @satisfies {Extension['contentInitial']} */
var contentInitial = { [91]: definition };
/** @satisfies {Extension['flowInitial']} */
var flowInitial = {
	[-2]: codeIndented,
	[-1]: codeIndented,
	[32]: codeIndented
};
/** @satisfies {Extension['flow']} */
var flow = {
	[35]: headingAtx,
	[42]: thematicBreak,
	[45]: [setextUnderline, thematicBreak],
	[60]: htmlFlow,
	[61]: setextUnderline,
	[95]: thematicBreak,
	[96]: codeFenced,
	[126]: codeFenced
};
/** @satisfies {Extension['string']} */
var string = {
	[38]: characterReference,
	[92]: characterEscape
};
/** @satisfies {Extension['text']} */
var text = {
	[-5]: lineEnding,
	[-4]: lineEnding,
	[-3]: lineEnding,
	[33]: labelStartImage,
	[38]: characterReference,
	[42]: attention,
	[60]: [autolink, htmlText],
	[91]: labelStartLink,
	[92]: [hardBreakEscape, characterEscape],
	[93]: labelEnd,
	[95]: attention,
	[96]: codeText
};
/** @satisfies {Extension['insideSpan']} */
var insideSpan = { null: [attention, resolver] };
/** @satisfies {Extension['attentionMarkers']} */
var attentionMarkers = { null: [42, 95] };
/** @satisfies {Extension['disable']} */
var disable = { null: [] };
//#endregion
//#region node_modules/micromark/lib/create-tokenizer.js
/**
* @import {
*   Chunk,
*   Code,
*   ConstructRecord,
*   Construct,
*   Effects,
*   InitialConstruct,
*   ParseContext,
*   Point,
*   State,
*   TokenizeContext,
*   Token
* } from 'micromark-util-types'
*/
/**
* @callback Restore
*   Restore the state.
* @returns {undefined}
*   Nothing.
*
* @typedef Info
*   Info.
* @property {Restore} restore
*   Restore.
* @property {number} from
*   From.
*
* @callback ReturnHandle
*   Handle a successful run.
* @param {Construct} construct
*   Construct.
* @param {Info} info
*   Info.
* @returns {undefined}
*   Nothing.
*/
/**
* Create a tokenizer.
* Tokenizers deal with one type of data (e.g., containers, flow, text).
* The parser is the object dealing with it all.
* `initialize` works like other constructs, except that only its `tokenize`
* function is used, in which case it doesn’t receive an `ok` or `nok`.
* `from` can be given to set the point before the first character, although
* when further lines are indented, they must be set with `defineSkip`.
*
* @param {ParseContext} parser
*   Parser.
* @param {InitialConstruct} initialize
*   Construct.
* @param {Omit<Point, '_bufferIndex' | '_index'> | undefined} [from]
*   Point (optional).
* @returns {TokenizeContext}
*   Context.
*/
function createTokenizer(parser, initialize, from) {
	/** @type {Point} */
	let point = {
		_bufferIndex: -1,
		_index: 0,
		line: from && from.line || 1,
		column: from && from.column || 1,
		offset: from && from.offset || 0
	};
	/** @type {Record<string, number>} */
	const columnStart = {};
	/** @type {Array<Construct>} */
	const resolveAllConstructs = [];
	/** @type {Array<Chunk>} */
	let chunks = [];
	/** @type {Array<Token>} */
	let stack = [];
	/**
	* Tools used for tokenizing.
	*
	* @type {Effects}
	*/
	const effects = {
		attempt: constructFactory(onsuccessfulconstruct),
		check: constructFactory(onsuccessfulcheck),
		consume,
		enter,
		exit,
		interrupt: constructFactory(onsuccessfulcheck, { interrupt: true })
	};
	/**
	* State and tools for resolving and serializing.
	*
	* @type {TokenizeContext}
	*/
	const context = {
		code: null,
		containerState: {},
		defineSkip,
		events: [],
		now,
		parser,
		previous: null,
		sliceSerialize,
		sliceStream,
		write
	};
	/**
	* The state function.
	*
	* @type {State | undefined}
	*/
	let state = initialize.tokenize.call(context, effects);
	if (initialize.resolveAll) resolveAllConstructs.push(initialize);
	return context;
	/** @type {TokenizeContext['write']} */
	function write(slice) {
		chunks = push(chunks, slice);
		main();
		if (chunks[chunks.length - 1] !== null) return [];
		addResult(initialize, 0);
		context.events = resolveAll(resolveAllConstructs, context.events, context);
		return context.events;
	}
	/** @type {TokenizeContext['sliceSerialize']} */
	function sliceSerialize(token, expandTabs) {
		return serializeChunks(sliceStream(token), expandTabs);
	}
	/** @type {TokenizeContext['sliceStream']} */
	function sliceStream(token) {
		return sliceChunks(chunks, token);
	}
	/** @type {TokenizeContext['now']} */
	function now() {
		const { _bufferIndex, _index, line, column, offset } = point;
		return {
			_bufferIndex,
			_index,
			line,
			column,
			offset
		};
	}
	/** @type {TokenizeContext['defineSkip']} */
	function defineSkip(value) {
		columnStart[value.line] = value.column;
		accountForPotentialSkip();
	}
	/**
	* Main loop (note that `_index` and `_bufferIndex` in `point` are modified by
	* `consume`).
	* Here is where we walk through the chunks, which either include strings of
	* several characters, or numerical character codes.
	* The reason to do this in a loop instead of a call is so the stack can
	* drain.
	*
	* @returns {undefined}
	*   Nothing.
	*/
	function main() {
		/** @type {number} */
		let chunkIndex;
		while (point._index < chunks.length) {
			const chunk = chunks[point._index];
			if (typeof chunk === "string") {
				chunkIndex = point._index;
				if (point._bufferIndex < 0) point._bufferIndex = 0;
				while (point._index === chunkIndex && point._bufferIndex < chunk.length) go(chunk.charCodeAt(point._bufferIndex));
			} else go(chunk);
		}
	}
	/**
	* Deal with one code.
	*
	* @param {Code} code
	*   Code.
	* @returns {undefined}
	*   Nothing.
	*/
	function go(code) {
		state = state(code);
	}
	/** @type {Effects['consume']} */
	function consume(code) {
		if (markdownLineEnding(code)) {
			point.line++;
			point.column = 1;
			point.offset += code === -3 ? 2 : 1;
			accountForPotentialSkip();
		} else if (code !== -1) {
			point.column++;
			point.offset++;
		}
		if (point._bufferIndex < 0) point._index++;
		else {
			point._bufferIndex++;
			if (point._bufferIndex === chunks[point._index].length) {
				point._bufferIndex = -1;
				point._index++;
			}
		}
		context.previous = code;
	}
	/** @type {Effects['enter']} */
	function enter(type, fields) {
		/** @type {Token} */
		const token = fields || {};
		token.type = type;
		token.start = now();
		context.events.push([
			"enter",
			token,
			context
		]);
		stack.push(token);
		return token;
	}
	/** @type {Effects['exit']} */
	function exit(type) {
		const token = stack.pop();
		token.end = now();
		context.events.push([
			"exit",
			token,
			context
		]);
		return token;
	}
	/**
	* Use results.
	*
	* @type {ReturnHandle}
	*/
	function onsuccessfulconstruct(construct, info) {
		addResult(construct, info.from);
	}
	/**
	* Discard results.
	*
	* @type {ReturnHandle}
	*/
	function onsuccessfulcheck(_, info) {
		info.restore();
	}
	/**
	* Factory to attempt/check/interrupt.
	*
	* @param {ReturnHandle} onreturn
	*   Callback.
	* @param {{interrupt?: boolean | undefined} | undefined} [fields]
	*   Fields.
	*/
	function constructFactory(onreturn, fields) {
		return hook;
		/**
		* Handle either an object mapping codes to constructs, a list of
		* constructs, or a single construct.
		*
		* @param {Array<Construct> | ConstructRecord | Construct} constructs
		*   Constructs.
		* @param {State} returnState
		*   State.
		* @param {State | undefined} [bogusState]
		*   State.
		* @returns {State}
		*   State.
		*/
		function hook(constructs, returnState, bogusState) {
			/** @type {ReadonlyArray<Construct>} */
			let listOfConstructs;
			/** @type {number} */
			let constructIndex;
			/** @type {Construct} */
			let currentConstruct;
			/** @type {Info} */
			let info;
			return Array.isArray(constructs) ? handleListOfConstructs(constructs) : "tokenize" in constructs ? handleListOfConstructs([constructs]) : handleMapOfConstructs(constructs);
			/**
			* Handle a list of construct.
			*
			* @param {ConstructRecord} map
			*   Constructs.
			* @returns {State}
			*   State.
			*/
			function handleMapOfConstructs(map) {
				return start;
				/** @type {State} */
				function start(code) {
					const left = code !== null && map[code];
					const all = code !== null && map.null;
					return handleListOfConstructs([...Array.isArray(left) ? left : left ? [left] : [], ...Array.isArray(all) ? all : all ? [all] : []])(code);
				}
			}
			/**
			* Handle a list of construct.
			*
			* @param {ReadonlyArray<Construct>} list
			*   Constructs.
			* @returns {State}
			*   State.
			*/
			function handleListOfConstructs(list) {
				listOfConstructs = list;
				constructIndex = 0;
				if (list.length === 0) return bogusState;
				return handleConstruct(list[constructIndex]);
			}
			/**
			* Handle a single construct.
			*
			* @param {Construct} construct
			*   Construct.
			* @returns {State}
			*   State.
			*/
			function handleConstruct(construct) {
				return start;
				/** @type {State} */
				function start(code) {
					info = store();
					currentConstruct = construct;
					if (!construct.partial) context.currentConstruct = construct;
					if (construct.name && context.parser.constructs.disable.null.includes(construct.name)) return nok(code);
					return construct.tokenize.call(fields ? Object.assign(Object.create(context), fields) : context, effects, ok, nok)(code);
				}
			}
			/** @type {State} */
			function ok(code) {
				onreturn(currentConstruct, info);
				return returnState;
			}
			/** @type {State} */
			function nok(code) {
				info.restore();
				if (++constructIndex < listOfConstructs.length) return handleConstruct(listOfConstructs[constructIndex]);
				return bogusState;
			}
		}
	}
	/**
	* @param {Construct} construct
	*   Construct.
	* @param {number} from
	*   From.
	* @returns {undefined}
	*   Nothing.
	*/
	function addResult(construct, from) {
		if (construct.resolveAll && !resolveAllConstructs.includes(construct)) resolveAllConstructs.push(construct);
		if (construct.resolve) splice(context.events, from, context.events.length - from, construct.resolve(context.events.slice(from), context));
		if (construct.resolveTo) context.events = construct.resolveTo(context.events, context);
	}
	/**
	* Store state.
	*
	* @returns {Info}
	*   Info.
	*/
	function store() {
		const startPoint = now();
		const startPrevious = context.previous;
		const startCurrentConstruct = context.currentConstruct;
		const startEventsIndex = context.events.length;
		const startStack = Array.from(stack);
		return {
			from: startEventsIndex,
			restore
		};
		/**
		* Restore state.
		*
		* @returns {undefined}
		*   Nothing.
		*/
		function restore() {
			point = startPoint;
			context.previous = startPrevious;
			context.currentConstruct = startCurrentConstruct;
			context.events.length = startEventsIndex;
			stack = startStack;
			accountForPotentialSkip();
		}
	}
	/**
	* Move the current point a bit forward in the line when it’s on a column
	* skip.
	*
	* @returns {undefined}
	*   Nothing.
	*/
	function accountForPotentialSkip() {
		if (point.line in columnStart && point.column < 2) {
			point.column = columnStart[point.line];
			point.offset += columnStart[point.line] - 1;
		}
	}
}
/**
* Get the chunks from a slice of chunks in the range of a token.
*
* @param {ReadonlyArray<Chunk>} chunks
*   Chunks.
* @param {Pick<Token, 'end' | 'start'>} token
*   Token.
* @returns {Array<Chunk>}
*   Chunks.
*/
function sliceChunks(chunks, token) {
	const startIndex = token.start._index;
	const startBufferIndex = token.start._bufferIndex;
	const endIndex = token.end._index;
	const endBufferIndex = token.end._bufferIndex;
	/** @type {Array<Chunk>} */
	let view;
	if (startIndex === endIndex) view = [chunks[startIndex].slice(startBufferIndex, endBufferIndex)];
	else {
		view = chunks.slice(startIndex, endIndex);
		if (startBufferIndex > -1) {
			const head = view[0];
			if (typeof head === "string") view[0] = head.slice(startBufferIndex);
			else view.shift();
		}
		if (endBufferIndex > 0) view.push(chunks[endIndex].slice(0, endBufferIndex));
	}
	return view;
}
/**
* Get the string value of a slice of chunks.
*
* @param {ReadonlyArray<Chunk>} chunks
*   Chunks.
* @param {boolean | undefined} [expandTabs=false]
*   Whether to expand tabs (default: `false`).
* @returns {string}
*   Result.
*/
function serializeChunks(chunks, expandTabs) {
	let index = -1;
	/** @type {Array<string>} */
	const result = [];
	/** @type {boolean | undefined} */
	let atTab;
	while (++index < chunks.length) {
		const chunk = chunks[index];
		/** @type {string} */
		let value;
		if (typeof chunk === "string") value = chunk;
		else switch (chunk) {
			case -5:
				value = "\r";
				break;
			case -4:
				value = "\n";
				break;
			case -3:
				value = "\r\n";
				break;
			case -2:
				value = expandTabs ? " " : "	";
				break;
			case -1:
				if (!expandTabs && atTab) continue;
				value = " ";
				break;
			default: value = String.fromCharCode(chunk);
		}
		atTab = chunk === -2;
		result.push(value);
	}
	return result.join("");
}
//#endregion
//#region node_modules/micromark/lib/parse.js
/**
* @import {
*   Create,
*   FullNormalizedExtension,
*   InitialConstruct,
*   ParseContext,
*   ParseOptions
* } from 'micromark-util-types'
*/
/**
* @param {ParseOptions | null | undefined} [options]
*   Configuration (optional).
* @returns {ParseContext}
*   Parser.
*/
function parse(options) {
	/** @type {ParseContext} */
	const parser = {
		constructs: combineExtensions([constructs_exports, ...(options || {}).extensions || []]),
		content: create(content$1),
		defined: [],
		document: create(document$1),
		flow: create(flow$1),
		lazy: {},
		string: create(string$1),
		text: create(text$1)
	};
	return parser;
	/**
	* @param {InitialConstruct} initial
	*   Construct to start with.
	* @returns {Create}
	*   Create a tokenizer.
	*/
	function create(initial) {
		return creator;
		/** @type {Create} */
		function creator(from) {
			return createTokenizer(parser, initial, from);
		}
	}
}
//#endregion
//#region node_modules/micromark/lib/postprocess.js
/**
* @import {Event} from 'micromark-util-types'
*/
/**
* @param {Array<Event>} events
*   Events.
* @returns {Array<Event>}
*   Events.
*/
function postprocess(events) {
	while (!subtokenize(events));
	return events;
}
//#endregion
//#region node_modules/micromark/lib/preprocess.js
/**
* @import {Chunk, Code, Encoding, Value} from 'micromark-util-types'
*/
/**
* @callback Preprocessor
*   Preprocess a value.
* @param {Value} value
*   Value.
* @param {Encoding | null | undefined} [encoding]
*   Encoding when `value` is a typed array (optional).
* @param {boolean | null | undefined} [end=false]
*   Whether this is the last chunk (default: `false`).
* @returns {Array<Chunk>}
*   Chunks.
*/
var search = /[\0\t\n\r]/g;
/**
* @returns {Preprocessor}
*   Preprocess a value.
*/
function preprocess() {
	let column = 1;
	let buffer = "";
	/** @type {boolean | undefined} */
	let start = true;
	/** @type {boolean | undefined} */
	let atCarriageReturn;
	return preprocessor;
	/** @type {Preprocessor} */
	function preprocessor(value, encoding, end) {
		/** @type {Array<Chunk>} */
		const chunks = [];
		/** @type {RegExpMatchArray | null} */
		let match;
		/** @type {number} */
		let next;
		/** @type {number} */
		let startPosition;
		/** @type {number} */
		let endPosition;
		/** @type {Code} */
		let code;
		value = buffer + (typeof value === "string" ? value.toString() : new TextDecoder(encoding || void 0).decode(value));
		startPosition = 0;
		buffer = "";
		if (start) {
			if (value.charCodeAt(0) === 65279) startPosition++;
			start = void 0;
		}
		while (startPosition < value.length) {
			search.lastIndex = startPosition;
			match = search.exec(value);
			endPosition = match && match.index !== void 0 ? match.index : value.length;
			code = value.charCodeAt(endPosition);
			if (!match) {
				buffer = value.slice(startPosition);
				break;
			}
			if (code === 10 && startPosition === endPosition && atCarriageReturn) {
				chunks.push(-3);
				atCarriageReturn = void 0;
			} else {
				if (atCarriageReturn) {
					chunks.push(-5);
					atCarriageReturn = void 0;
				}
				if (startPosition < endPosition) {
					chunks.push(value.slice(startPosition, endPosition));
					column += endPosition - startPosition;
				}
				switch (code) {
					case 0:
						chunks.push(65533);
						column++;
						break;
					case 9:
						next = Math.ceil(column / 4) * 4;
						chunks.push(-2);
						while (column++ < next) chunks.push(-1);
						break;
					case 10:
						chunks.push(-4);
						column = 1;
						break;
					default:
						atCarriageReturn = true;
						column = 1;
				}
			}
			startPosition = endPosition + 1;
		}
		if (end) {
			if (atCarriageReturn) chunks.push(-5);
			if (buffer) chunks.push(buffer);
			chunks.push(null);
		}
		return chunks;
	}
}
//#endregion
//#region node_modules/micromark-util-decode-string/index.js
var characterEscapeOrReference = /\\([!-/:-@[-`{-~])|&(#(?:\d{1,7}|x[\da-f]{1,6})|[\da-z]{1,31});/gi;
/**
* Decode markdown strings (which occur in places such as fenced code info
* strings, destinations, labels, and titles).
*
* The “string” content type allows character escapes and -references.
* This decodes those.
*
* @param {string} value
*   Value to decode.
* @returns {string}
*   Decoded value.
*/
function decodeString(value) {
	return value.replace(characterEscapeOrReference, decode);
}
/**
* @param {string} $0
*   Match.
* @param {string} $1
*   Character escape.
* @param {string} $2
*   Character reference.
* @returns {string}
*   Decoded value
*/
function decode($0, $1, $2) {
	if ($1) return $1;
	if ($2.charCodeAt(0) === 35) {
		const head = $2.charCodeAt(1);
		const hex = head === 120 || head === 88;
		return decodeNumericCharacterReference($2.slice(hex ? 2 : 1), hex ? 16 : 10);
	}
	return decodeNamedCharacterReference($2) || $0;
}
//#endregion
//#region node_modules/unist-util-stringify-position/lib/index.js
/**
* @typedef {import('unist').Node} Node
* @typedef {import('unist').Point} Point
* @typedef {import('unist').Position} Position
*/
/**
* @typedef NodeLike
* @property {string} type
* @property {PositionLike | null | undefined} [position]
*
* @typedef PointLike
* @property {number | null | undefined} [line]
* @property {number | null | undefined} [column]
* @property {number | null | undefined} [offset]
*
* @typedef PositionLike
* @property {PointLike | null | undefined} [start]
* @property {PointLike | null | undefined} [end]
*/
/**
* Serialize the positional info of a point, position (start and end points),
* or node.
*
* @param {Node | NodeLike | Point | PointLike | Position | PositionLike | null | undefined} [value]
*   Node, position, or point.
* @returns {string}
*   Pretty printed positional info of a node (`string`).
*
*   In the format of a range `ls:cs-le:ce` (when given `node` or `position`)
*   or a point `l:c` (when given `point`), where `l` stands for line, `c` for
*   column, `s` for `start`, and `e` for end.
*   An empty string (`''`) is returned if the given value is neither `node`,
*   `position`, nor `point`.
*/
function stringifyPosition(value) {
	if (!value || typeof value !== "object") return "";
	if ("position" in value || "type" in value) return position(value.position);
	if ("start" in value || "end" in value) return position(value);
	if ("line" in value || "column" in value) return point$1(value);
	return "";
}
/**
* @param {Point | PointLike | null | undefined} point
* @returns {string}
*/
function point$1(point) {
	return index(point && point.line) + ":" + index(point && point.column);
}
/**
* @param {Position | PositionLike | null | undefined} pos
* @returns {string}
*/
function position(pos) {
	return point$1(pos && pos.start) + "-" + point$1(pos && pos.end);
}
/**
* @param {number | null | undefined} value
* @returns {number}
*/
function index(value) {
	return value && typeof value === "number" ? value : 1;
}
//#endregion
//#region node_modules/mdast-util-from-markdown/lib/index.js
/**
* @import {
*   Break,
*   Blockquote,
*   Code,
*   Definition,
*   Emphasis,
*   Heading,
*   Html,
*   Image,
*   InlineCode,
*   Link,
*   ListItem,
*   List,
*   Nodes,
*   Paragraph,
*   PhrasingContent,
*   ReferenceType,
*   Root,
*   Strong,
*   Text,
*   ThematicBreak
* } from 'mdast'
* @import {
*   Encoding,
*   Event,
*   Token,
*   Value
* } from 'micromark-util-types'
* @import {Point} from 'unist'
* @import {
*   CompileContext,
*   CompileData,
*   Config,
*   Extension,
*   Handle,
*   OnEnterError,
*   Options
* } from './types.js'
*/
var own = {}.hasOwnProperty;
/**
* Turn markdown into a syntax tree.
*
* @overload
* @param {Value} value
* @param {Encoding | null | undefined} [encoding]
* @param {Options | null | undefined} [options]
* @returns {Root}
*
* @overload
* @param {Value} value
* @param {Options | null | undefined} [options]
* @returns {Root}
*
* @param {Value} value
*   Markdown to parse.
* @param {Encoding | Options | null | undefined} [encoding]
*   Character encoding for when `value` is `Buffer`.
* @param {Options | null | undefined} [options]
*   Configuration.
* @returns {Root}
*   mdast tree.
*/
function fromMarkdown(value, encoding, options) {
	if (encoding && typeof encoding === "object") {
		options = encoding;
		encoding = void 0;
	}
	return compiler(options)(postprocess(parse(options).document().write(preprocess()(value, encoding, true))));
}
/**
* Note this compiler only understand complete buffering, not streaming.
*
* @param {Options | null | undefined} [options]
*/
function compiler(options) {
	/** @type {Config} */
	const config = {
		transforms: [],
		canContainEols: [
			"emphasis",
			"fragment",
			"heading",
			"paragraph",
			"strong"
		],
		enter: {
			autolink: opener(link),
			autolinkProtocol: onenterdata,
			autolinkEmail: onenterdata,
			atxHeading: opener(heading),
			blockQuote: opener(blockQuote),
			characterEscape: onenterdata,
			characterReference: onenterdata,
			codeFenced: opener(codeFlow),
			codeFencedFenceInfo: buffer,
			codeFencedFenceMeta: buffer,
			codeIndented: opener(codeFlow, buffer),
			codeText: opener(codeText, buffer),
			codeTextData: onenterdata,
			data: onenterdata,
			codeFlowValue: onenterdata,
			definition: opener(definition),
			definitionDestinationString: buffer,
			definitionLabelString: buffer,
			definitionTitleString: buffer,
			emphasis: opener(emphasis),
			hardBreakEscape: opener(hardBreak),
			hardBreakTrailing: opener(hardBreak),
			htmlFlow: opener(html, buffer),
			htmlFlowData: onenterdata,
			htmlText: opener(html, buffer),
			htmlTextData: onenterdata,
			image: opener(image),
			label: buffer,
			link: opener(link),
			listItem: opener(listItem),
			listItemValue: onenterlistitemvalue,
			listOrdered: opener(list, onenterlistordered),
			listUnordered: opener(list),
			paragraph: opener(paragraph),
			reference: onenterreference,
			referenceString: buffer,
			resourceDestinationString: buffer,
			resourceTitleString: buffer,
			setextHeading: opener(heading),
			strong: opener(strong),
			thematicBreak: opener(thematicBreak)
		},
		exit: {
			atxHeading: closer(),
			atxHeadingSequence: onexitatxheadingsequence,
			autolink: closer(),
			autolinkEmail: onexitautolinkemail,
			autolinkProtocol: onexitautolinkprotocol,
			blockQuote: closer(),
			characterEscapeValue: onexitdata,
			characterReferenceMarkerHexadecimal: onexitcharacterreferencemarker,
			characterReferenceMarkerNumeric: onexitcharacterreferencemarker,
			characterReferenceValue: onexitcharacterreferencevalue,
			characterReference: onexitcharacterreference,
			codeFenced: closer(onexitcodefenced),
			codeFencedFence: onexitcodefencedfence,
			codeFencedFenceInfo: onexitcodefencedfenceinfo,
			codeFencedFenceMeta: onexitcodefencedfencemeta,
			codeFlowValue: onexitdata,
			codeIndented: closer(onexitcodeindented),
			codeText: closer(onexitcodetext),
			codeTextData: onexitdata,
			data: onexitdata,
			definition: closer(),
			definitionDestinationString: onexitdefinitiondestinationstring,
			definitionLabelString: onexitdefinitionlabelstring,
			definitionTitleString: onexitdefinitiontitlestring,
			emphasis: closer(),
			hardBreakEscape: closer(onexithardbreak),
			hardBreakTrailing: closer(onexithardbreak),
			htmlFlow: closer(onexithtmlflow),
			htmlFlowData: onexitdata,
			htmlText: closer(onexithtmltext),
			htmlTextData: onexitdata,
			image: closer(onexitimage),
			label: onexitlabel,
			labelText: onexitlabeltext,
			lineEnding: onexitlineending,
			link: closer(onexitlink),
			listItem: closer(),
			listOrdered: closer(),
			listUnordered: closer(),
			paragraph: closer(),
			referenceString: onexitreferencestring,
			resourceDestinationString: onexitresourcedestinationstring,
			resourceTitleString: onexitresourcetitlestring,
			resource: onexitresource,
			setextHeading: closer(onexitsetextheading),
			setextHeadingLineSequence: onexitsetextheadinglinesequence,
			setextHeadingText: onexitsetextheadingtext,
			strong: closer(),
			thematicBreak: closer()
		}
	};
	configure(config, (options || {}).mdastExtensions || []);
	/** @type {CompileData} */
	const data = {};
	return compile;
	/**
	* Turn micromark events into an mdast tree.
	*
	* @param {Array<Event>} events
	*   Events.
	* @returns {Root}
	*   mdast tree.
	*/
	function compile(events) {
		/** @type {Root} */
		let tree = {
			type: "root",
			children: []
		};
		/** @type {Omit<CompileContext, 'sliceSerialize'>} */
		const context = {
			stack: [tree],
			tokenStack: [],
			config,
			enter,
			exit,
			buffer,
			resume,
			data
		};
		/** @type {Array<number>} */
		const listStack = [];
		let index = -1;
		while (++index < events.length) if (events[index][1].type === "listOrdered" || events[index][1].type === "listUnordered") {
			if (events[index][0] === "enter") listStack.push(index);
			else index = prepareList(events, listStack.pop(), index);
		}
		index = -1;
		while (++index < events.length) {
			const handler = config[events[index][0]];
			if (own.call(handler, events[index][1].type)) handler[events[index][1].type].call(Object.assign({ sliceSerialize: events[index][2].sliceSerialize }, context), events[index][1]);
		}
		if (context.tokenStack.length > 0) {
			const tail = context.tokenStack[context.tokenStack.length - 1];
			(tail[1] || defaultOnError).call(context, void 0, tail[0]);
		}
		tree.position = {
			start: point(events.length > 0 ? events[0][1].start : {
				line: 1,
				column: 1,
				offset: 0
			}),
			end: point(events.length > 0 ? events[events.length - 2][1].end : {
				line: 1,
				column: 1,
				offset: 0
			})
		};
		index = -1;
		while (++index < config.transforms.length) tree = config.transforms[index](tree) || tree;
		return tree;
	}
	/**
	* @param {Array<Event>} events
	* @param {number} start
	* @param {number} length
	* @returns {number}
	*/
	function prepareList(events, start, length) {
		let index = start - 1;
		let containerBalance = -1;
		let listSpread = false;
		/** @type {Token | undefined} */
		let listItem;
		/** @type {number | undefined} */
		let lineIndex;
		/** @type {number | undefined} */
		let firstBlankLineIndex;
		/** @type {boolean | undefined} */
		let atMarker;
		while (++index <= length) {
			const event = events[index];
			switch (event[1].type) {
				case "listUnordered":
				case "listOrdered":
				case "blockQuote":
					if (event[0] === "enter") containerBalance++;
					else containerBalance--;
					atMarker = void 0;
					break;
				case "lineEndingBlank":
					if (event[0] === "enter") {
						if (listItem && !atMarker && !containerBalance && !firstBlankLineIndex) firstBlankLineIndex = index;
						atMarker = void 0;
					}
					break;
				case "linePrefix":
				case "listItemValue":
				case "listItemMarker":
				case "listItemPrefix":
				case "listItemPrefixWhitespace": break;
				default: atMarker = void 0;
			}
			if (!containerBalance && event[0] === "enter" && event[1].type === "listItemPrefix" || containerBalance === -1 && event[0] === "exit" && (event[1].type === "listUnordered" || event[1].type === "listOrdered")) {
				if (listItem) {
					let tailIndex = index;
					lineIndex = void 0;
					while (tailIndex--) {
						const tailEvent = events[tailIndex];
						if (tailEvent[1].type === "lineEnding" || tailEvent[1].type === "lineEndingBlank") {
							if (tailEvent[0] === "exit") continue;
							if (lineIndex) {
								events[lineIndex][1].type = "lineEndingBlank";
								listSpread = true;
							}
							tailEvent[1].type = "lineEnding";
							lineIndex = tailIndex;
						} else if (tailEvent[1].type === "linePrefix" || tailEvent[1].type === "blockQuotePrefix" || tailEvent[1].type === "blockQuotePrefixWhitespace" || tailEvent[1].type === "blockQuoteMarker" || tailEvent[1].type === "listItemIndent") {} else break;
					}
					if (firstBlankLineIndex && (!lineIndex || firstBlankLineIndex < lineIndex)) listItem._spread = true;
					listItem.end = Object.assign({}, lineIndex ? events[lineIndex][1].start : event[1].end);
					events.splice(lineIndex || index, 0, [
						"exit",
						listItem,
						event[2]
					]);
					index++;
					length++;
				}
				if (event[1].type === "listItemPrefix") {
					/** @type {Token} */
					const item = {
						type: "listItem",
						_spread: false,
						start: Object.assign({}, event[1].start),
						end: void 0
					};
					listItem = item;
					events.splice(index, 0, [
						"enter",
						item,
						event[2]
					]);
					index++;
					length++;
					firstBlankLineIndex = void 0;
					atMarker = true;
				}
			}
		}
		events[start][1]._spread = listSpread;
		return length;
	}
	/**
	* Create an opener handle.
	*
	* @param {(token: Token) => Nodes} create
	*   Create a node.
	* @param {Handle | undefined} [and]
	*   Optional function to also run.
	* @returns {Handle}
	*   Handle.
	*/
	function opener(create, and) {
		return open;
		/**
		* @this {CompileContext}
		* @param {Token} token
		* @returns {undefined}
		*/
		function open(token) {
			enter.call(this, create(token), token);
			if (and) and.call(this, token);
		}
	}
	/**
	* @type {CompileContext['buffer']}
	*/
	function buffer() {
		this.stack.push({
			type: "fragment",
			children: []
		});
	}
	/**
	* @type {CompileContext['enter']}
	*/
	function enter(node, token, errorHandler) {
		this.stack[this.stack.length - 1].children.push(node);
		this.stack.push(node);
		this.tokenStack.push([token, errorHandler || void 0]);
		node.position = {
			start: point(token.start),
			end: void 0
		};
	}
	/**
	* Create a closer handle.
	*
	* @param {Handle | undefined} [and]
	*   Optional function to also run.
	* @returns {Handle}
	*   Handle.
	*/
	function closer(and) {
		return close;
		/**
		* @this {CompileContext}
		* @param {Token} token
		* @returns {undefined}
		*/
		function close(token) {
			if (and) and.call(this, token);
			exit.call(this, token);
		}
	}
	/**
	* @type {CompileContext['exit']}
	*/
	function exit(token, onExitError) {
		const node = this.stack.pop();
		const open = this.tokenStack.pop();
		if (!open) throw new Error("Cannot close `" + token.type + "` (" + stringifyPosition({
			start: token.start,
			end: token.end
		}) + "): it\u2019s not open");
		else if (open[0].type !== token.type) {
			if (onExitError) onExitError.call(this, token, open[0]);
			else (open[1] || defaultOnError).call(this, token, open[0]);
		}
		node.position.end = point(token.end);
	}
	/**
	* @type {CompileContext['resume']}
	*/
	function resume() {
		return toString(this.stack.pop());
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onenterlistordered() {
		this.data.expectingFirstListItemValue = true;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onenterlistitemvalue(token) {
		if (this.data.expectingFirstListItemValue) {
			const ancestor = this.stack[this.stack.length - 2];
			ancestor.start = Number.parseInt(this.sliceSerialize(token), 10);
			this.data.expectingFirstListItemValue = void 0;
		}
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitcodefencedfenceinfo() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.lang = data;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitcodefencedfencemeta() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.meta = data;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitcodefencedfence() {
		if (this.data.flowCodeInside) return;
		this.buffer();
		this.data.flowCodeInside = true;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitcodefenced() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.value = data.replace(/^(\r?\n|\r)|(\r?\n|\r)$/g, "");
		this.data.flowCodeInside = void 0;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitcodeindented() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.value = data.replace(/(\r?\n|\r)$/g, "");
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitdefinitionlabelstring(token) {
		const label = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.label = label;
		node.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitdefinitiontitlestring() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.title = data;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitdefinitiondestinationstring() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.url = data;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitatxheadingsequence(token) {
		const node = this.stack[this.stack.length - 1];
		if (!node.depth) node.depth = this.sliceSerialize(token).length;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitsetextheadingtext() {
		this.data.setextHeadingSlurpLineEnding = true;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitsetextheadinglinesequence(token) {
		const node = this.stack[this.stack.length - 1];
		node.depth = this.sliceSerialize(token).codePointAt(0) === 61 ? 1 : 2;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitsetextheading() {
		this.data.setextHeadingSlurpLineEnding = void 0;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onenterdata(token) {
		/** @type {Array<Nodes>} */
		const siblings = this.stack[this.stack.length - 1].children;
		let tail = siblings[siblings.length - 1];
		if (!tail || tail.type !== "text") {
			tail = text();
			tail.position = {
				start: point(token.start),
				end: void 0
			};
			siblings.push(tail);
		}
		this.stack.push(tail);
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitdata(token) {
		const tail = this.stack.pop();
		tail.value += this.sliceSerialize(token);
		tail.position.end = point(token.end);
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitlineending(token) {
		const context = this.stack[this.stack.length - 1];
		if (this.data.atHardBreak) {
			const tail = context.children[context.children.length - 1];
			tail.position.end = point(token.end);
			this.data.atHardBreak = void 0;
			return;
		}
		if (!this.data.setextHeadingSlurpLineEnding && config.canContainEols.includes(context.type)) {
			onenterdata.call(this, token);
			onexitdata.call(this, token);
		}
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexithardbreak() {
		this.data.atHardBreak = true;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexithtmlflow() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.value = data;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexithtmltext() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.value = data;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitcodetext() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.value = data;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitlink() {
		const node = this.stack[this.stack.length - 1];
		if (this.data.inReference) {
			/** @type {ReferenceType} */
			const referenceType = this.data.referenceType || "shortcut";
			node.type += "Reference";
			node.referenceType = referenceType;
			delete node.url;
			delete node.title;
		} else {
			delete node.identifier;
			delete node.label;
		}
		this.data.referenceType = void 0;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitimage() {
		const node = this.stack[this.stack.length - 1];
		if (this.data.inReference) {
			/** @type {ReferenceType} */
			const referenceType = this.data.referenceType || "shortcut";
			node.type += "Reference";
			node.referenceType = referenceType;
			delete node.url;
			delete node.title;
		} else {
			delete node.identifier;
			delete node.label;
		}
		this.data.referenceType = void 0;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitlabeltext(token) {
		const string = this.sliceSerialize(token);
		const ancestor = this.stack[this.stack.length - 2];
		ancestor.label = decodeString(string);
		ancestor.identifier = normalizeIdentifier(string).toLowerCase();
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitlabel() {
		const fragment = this.stack[this.stack.length - 1];
		const value = this.resume();
		const node = this.stack[this.stack.length - 1];
		this.data.inReference = true;
		if (node.type === "link") node.children = fragment.children;
		else node.alt = value;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitresourcedestinationstring() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.url = data;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitresourcetitlestring() {
		const data = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.title = data;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitresource() {
		this.data.inReference = void 0;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onenterreference() {
		this.data.referenceType = "collapsed";
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitreferencestring(token) {
		const label = this.resume();
		const node = this.stack[this.stack.length - 1];
		node.label = label;
		node.identifier = normalizeIdentifier(this.sliceSerialize(token)).toLowerCase();
		this.data.referenceType = "full";
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitcharacterreferencemarker(token) {
		this.data.characterReferenceType = token.type;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitcharacterreferencevalue(token) {
		const data = this.sliceSerialize(token);
		const type = this.data.characterReferenceType;
		/** @type {string} */
		let value;
		if (type) {
			value = decodeNumericCharacterReference(data, type === "characterReferenceMarkerNumeric" ? 10 : 16);
			this.data.characterReferenceType = void 0;
		} else value = decodeNamedCharacterReference(data);
		const tail = this.stack[this.stack.length - 1];
		tail.value += value;
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitcharacterreference(token) {
		const tail = this.stack.pop();
		tail.position.end = point(token.end);
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitautolinkprotocol(token) {
		onexitdata.call(this, token);
		const node = this.stack[this.stack.length - 1];
		node.url = this.sliceSerialize(token);
	}
	/**
	* @this {CompileContext}
	* @type {Handle}
	*/
	function onexitautolinkemail(token) {
		onexitdata.call(this, token);
		const node = this.stack[this.stack.length - 1];
		node.url = "mailto:" + this.sliceSerialize(token);
	}
	/** @returns {Blockquote} */
	function blockQuote() {
		return {
			type: "blockquote",
			children: []
		};
	}
	/** @returns {Code} */
	function codeFlow() {
		return {
			type: "code",
			lang: null,
			meta: null,
			value: ""
		};
	}
	/** @returns {InlineCode} */
	function codeText() {
		return {
			type: "inlineCode",
			value: ""
		};
	}
	/** @returns {Definition} */
	function definition() {
		return {
			type: "definition",
			identifier: "",
			label: null,
			title: null,
			url: ""
		};
	}
	/** @returns {Emphasis} */
	function emphasis() {
		return {
			type: "emphasis",
			children: []
		};
	}
	/** @returns {Heading} */
	function heading() {
		return {
			type: "heading",
			depth: 0,
			children: []
		};
	}
	/** @returns {Break} */
	function hardBreak() {
		return { type: "break" };
	}
	/** @returns {Html} */
	function html() {
		return {
			type: "html",
			value: ""
		};
	}
	/** @returns {Image} */
	function image() {
		return {
			type: "image",
			title: null,
			url: "",
			alt: null
		};
	}
	/** @returns {Link} */
	function link() {
		return {
			type: "link",
			title: null,
			url: "",
			children: []
		};
	}
	/**
	* @param {Token} token
	* @returns {List}
	*/
	function list(token) {
		return {
			type: "list",
			ordered: token.type === "listOrdered",
			start: null,
			spread: token._spread,
			children: []
		};
	}
	/**
	* @param {Token} token
	* @returns {ListItem}
	*/
	function listItem(token) {
		return {
			type: "listItem",
			spread: token._spread,
			checked: null,
			children: []
		};
	}
	/** @returns {Paragraph} */
	function paragraph() {
		return {
			type: "paragraph",
			children: []
		};
	}
	/** @returns {Strong} */
	function strong() {
		return {
			type: "strong",
			children: []
		};
	}
	/** @returns {Text} */
	function text() {
		return {
			type: "text",
			value: ""
		};
	}
	/** @returns {ThematicBreak} */
	function thematicBreak() {
		return { type: "thematicBreak" };
	}
}
/**
* Copy a point-like value.
*
* @param {Point} d
*   Point-like value.
* @returns {Point}
*   unist point.
*/
function point(d) {
	return {
		line: d.line,
		column: d.column,
		offset: d.offset
	};
}
/**
* @param {Config} combined
* @param {Array<Array<Extension> | Extension>} extensions
* @returns {undefined}
*/
function configure(combined, extensions) {
	let index = -1;
	while (++index < extensions.length) {
		const value = extensions[index];
		if (Array.isArray(value)) configure(combined, value);
		else extension(combined, value);
	}
}
/**
* @param {Config} combined
* @param {Extension} extension
* @returns {undefined}
*/
function extension(combined, extension) {
	/** @type {keyof Extension} */
	let key;
	for (key in extension) if (own.call(extension, key)) switch (key) {
		case "canContainEols": {
			const right = extension[key];
			if (right) combined[key].push(...right);
			break;
		}
		case "transforms": {
			const right = extension[key];
			if (right) combined[key].push(...right);
			break;
		}
		case "enter":
		case "exit": {
			const right = extension[key];
			if (right) Object.assign(combined[key], right);
			break;
		}
	}
}
/** @type {OnEnterError} */
function defaultOnError(left, right) {
	if (left) throw new Error("Cannot close `" + left.type + "` (" + stringifyPosition({
		start: left.start,
		end: left.end
	}) + "): a different token (`" + right.type + "`, " + stringifyPosition({
		start: right.start,
		end: right.end
	}) + ") is open");
	else throw new Error("Cannot close document, a token (`" + right.type + "`, " + stringifyPosition({
		start: right.start,
		end: right.end
	}) + ") is still open");
}
//#endregion
//#region packages/core/src/release/escape-body.ts
/**
* Escapes configured characters while preserving the original source of Markdown
* code spans and blocks, including their delimiters and indentation.
*/
var escapeBody = (body, escapes) => {
	if (!body || !escapes) return body;
	const characters = new Set(escapes);
	const escapeText = (text) => {
		let result = "";
		let backslashes = 0;
		for (const character of text) {
			if (characters.has(character)) {
				if (character === "@" || character === "#") {
					result += `${character}<!---->`;
					backslashes = 0;
					continue;
				}
				if (character === "\\" || backslashes % 2 === 0) result += "\\";
			}
			result += character;
			backslashes = character === "\\" ? backslashes + (characters.has("\\") ? 2 : 1) : 0;
		}
		return result;
	};
	const tree = fromMarkdown(body);
	let offset = 0;
	let result = "";
	const visit = (node) => {
		if (node.type === "code" || node.type === "inlineCode") {
			const start = node.position?.start.offset;
			const end = node.position?.end.offset;
			if (start !== void 0 && end !== void 0) {
				result += escapeText(body.slice(offset, start)) + body.slice(start, end);
				offset = end;
			}
		} else if ("children" in node) for (const child of node.children) visit(child);
	};
	visit(tree);
	return result + escapeText(body.slice(offset));
};
//#endregion
//#region packages/core/src/release/generate-contributors-sentence.ts
var botSuffix = "[bot]";
var pullRequestKey = (pullRequest) => `${pullRequest.baseRepository}#${pullRequest.number}`;
var normalizeLogin = (login, isBot = false) => isBot && !login.endsWith(botSuffix) ? `${login}${botSuffix}` : login;
var renderAuthorMention = (contributor, serverUrl) => {
	if ("name" in contributor) return contributor.name;
	const botUrl = contributor.login.endsWith(botSuffix) ? contributor.botUrl ?? `${serverUrl.replace(/\/$/, "")}/apps/${contributor.login.slice(0, -5)}` : void 0;
	if (botUrl) return `[@${contributor.login}](${botUrl})`;
	return `@${contributor.login}`;
};
var generateContributorsSentence = (params) => {
	const { commits, pullRequests, config, serverUrl } = params;
	const includedPullRequests = filterPullRequestsByPreCategories(pullRequests, config.categories);
	return generateAuthorsSentence({
		commits,
		pullRequests: includedPullRequests,
		serverUrl,
		excludeContributors: config["exclude-contributors"],
		noAuthorsTemplate: config["no-contributors-template"]
	});
};
var generateAuthorsSentence = (params) => {
	const { commits, pullRequests } = params;
	const includedPullRequestKeys = new Set(pullRequests.map(pullRequestKey));
	const includedMergeCommitOids = new Set(pullRequests.flatMap((pullRequest) => pullRequest.mergeCommitOid ? [pullRequest.mergeCommitOid] : []));
	const contributors = /* @__PURE__ */ new Map();
	const pullRequestAuthorLogins = /* @__PURE__ */ new Set();
	for (const commit of commits) {
		if (!includedMergeCommitOids.has(commit.oid) && !commit.associatedPullRequests?.some((pullRequest) => pullRequest && includedPullRequestKeys.has(pullRequestKey(pullRequest)))) continue;
		for (const author of commit.authors ?? (commit.author ? [commit.author] : [])) if (author?.login) {
			const login = normalizeLogin(author.login);
			contributors.set(`login:${login}`, { login });
		} else if (author?.name) contributors.set(`name:${author.name}`, { name: author.name });
	}
	for (const pullRequest of pullRequests) if (pullRequest.author) {
		const isBot = pullRequest.author.type === "Bot";
		const login = normalizeLogin(pullRequest.author.login, isBot);
		pullRequestAuthorLogins.add(login);
		contributors.set(`login:${login}`, {
			login,
			botUrl: isBot ? pullRequest.author.url : void 0
		});
	}
	const sortedContributors = [...contributors.values()].filter((contributor) => "name" in contributor || !(params.excludeContributors ?? []).some((excluded) => excluded === contributor.login || `${excluded}${botSuffix}` === contributor.login)).sort((a, b) => {
		const aIsPullRequestAuthor = "login" in a && pullRequestAuthorLogins.has(a.login);
		if (aIsPullRequestAuthor !== ("login" in b && pullRequestAuthorLogins.has(b.login))) return aIsPullRequestAuthor ? -1 : 1;
		const aIsBot = "login" in a && (a.botUrl !== void 0 || a.login.endsWith(botSuffix));
		if (aIsBot !== ("login" in b && (b.botUrl !== void 0 || b.login.endsWith(botSuffix)))) return aIsBot ? 1 : -1;
		const aName = "name" in a ? a.name : a.login;
		const bName = "name" in b ? b.name : b.login;
		return aName.localeCompare(bName);
	});
	if (sortedContributors.length === 0) return params.noAuthorsTemplate ?? "";
	if (params.authorTemplate !== void 0) {
		const authorTemplate = params.authorTemplate;
		const authors = sortedContributors.map((contributor) => {
			const author = "name" in contributor ? contributor.name : contributor.login;
			return renderTemplate({
				template: authorTemplate,
				object: {
					$AUTHOR: author,
					$AUTHOR_MENTION: renderAuthorMention(contributor, params.serverUrl)
				}
			});
		});
		const separator = params.authorsSeparator ?? ", ";
		if (params.authorsFinalSeparator !== void 0 && authors.length > 1) return `${authors.slice(0, -1).join(separator)}${params.authorsFinalSeparator}${authors.at(-1)}`;
		return authors.join(separator);
	}
	const mentions = sortedContributors.map((contributor) => renderAuthorMention(contributor, params.serverUrl));
	if (mentions.length > 1) return `${mentions.slice(0, -1).join(", ")} and ${mentions.slice(-1)}`;
	return mentions[0];
};
var generateNewContributorsList = (params) => {
	const { pullRequests, newContributorLogins, config } = params;
	const firstPullRequestByLogin = /* @__PURE__ */ new Map();
	const includedPullRequestKeys = new Set(filterPullRequestsByPreCategories(pullRequests, config.categories).map(pullRequestKey));
	for (const pullRequest of pullRequests) {
		if (!pullRequest.author || !newContributorLogins.has(pullRequest.author.login) || config["exclude-contributors"].includes(pullRequest.author.login)) continue;
		const previous = firstPullRequestByLogin.get(pullRequest.author.login);
		if (!previous || (pullRequest.mergedAt ?? "") < (previous.mergedAt ?? "")) firstPullRequestByLogin.set(pullRequest.author.login, pullRequest);
	}
	const entries = [...firstPullRequestByLogin.entries()].filter(([, pullRequest]) => includedPullRequestKeys.has(pullRequestKey(pullRequest))).sort(([, a], [, b]) => (a.mergedAt ?? "").localeCompare(b.mergedAt ?? "") || a.number - b.number);
	if (entries.length === 0) return config["no-new-contributor-template"];
	return entries.map(([login, pullRequest]) => renderTemplate({
		template: config["new-contributor-template"],
		object: {
			$AUTHOR: login,
			$AUTHOR_MENTION: `@${login}`,
			$AUTHOR_URL: pullRequest.author?.url,
			$NUMBER: pullRequest.number,
			$URL: pullRequest.url
		}
	})).join("\n");
};
//#endregion
//#region packages/core/src/release/pull-request-to-string.ts
/** Separator between the pull request numbers of `$NUMBERS`. */
var numbersSeparator = ", ";
var pullRequestToString = (params) => params.changes.map((change) => {
	const pullRequest = change.representative;
	let pullAuthor = "ghost";
	if (pullRequest.author) pullAuthor = pullRequest.author.type === "Bot" ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})` : pullRequest.author.login;
	const authorTemplate = params.config["change-author-template"];
	return renderTemplate({
		template: params.config["change-template"],
		object: {
			$CATEGORY: params.category ?? "",
			$TITLE: escapeTitle({
				title: change.title,
				escapes: params.config["change-title-escapes"]
			}),
			$NUMBER: pullRequest.number.toString(),
			$NUMBERS: change.pullRequests.map(({ number }) => `#${number}`).join(numbersSeparator),
			$AUTHORS: generateAuthorsSentence({
				commits: params.commits,
				pullRequests: change.pullRequests,
				serverUrl: params.serverUrl,
				noAuthorsTemplate: renderTemplate({
					template: authorTemplate,
					object: {
						$AUTHOR: "ghost",
						$AUTHOR_MENTION: "@ghost"
					}
				}),
				authorTemplate,
				authorsSeparator: params.config["change-authors-separator"],
				authorsFinalSeparator: params.config["change-authors-final-separator"]
			}),
			$AUTHOR: pullAuthor,
			$AUTHOR_URL: pullRequest.author?.url ?? "",
			$BODY: escapeBody(pullRequest.body, params.config["change-body-escapes"]),
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
//#region packages/core/src/release/generate-changelog.ts
var generateChangeLog = (params) => {
	const { commits = [], logger = noopLogger, pullRequests, serverUrl, config } = params;
	const [uncategorizedPullRequests, categorizedPullRequests] = categorizePullRequests({
		pullRequests,
		config
	});
	if (uncategorizedPullRequests.length + categorizedPullRequests.reduce((sum, category) => sum + category.pullRequests.length, 0) === 0) return config["no-changes-template"];
	const changeLog = [];
	const toGroupedChanges = (categoryPullRequests) => groupChanges({
		pullRequests: categoryPullRequests,
		rules: config["group-changes"],
		logger
	});
	if (uncategorizedPullRequests.length > 0) changeLog.push(pullRequestToString({
		changes: toGroupedChanges(uncategorizedPullRequests),
		commits,
		serverUrl,
		config
	}), "\n\n");
	const nonEmptyCategories = categorizedPullRequests.filter((category) => category.pullRequests.length > 0);
	for (const [index, category] of nonEmptyCategories.entries()) {
		const categoryTitle = renderTemplate({
			template: config["category-template"],
			object: { $TITLE: category.title }
		});
		if (categoryTitle) changeLog.push(categoryTitle, "\n\n");
		const changes = toGroupedChanges(category.pullRequests);
		const pullRequestString = pullRequestToString({
			category: category.title,
			changes,
			commits,
			serverUrl,
			config
		});
		if (category["collapse-after"] !== -1 && changes.length > category["collapse-after"]) changeLog.push("<details>", "\n", `<summary>${changes.length} change${changes.length > 1 ? "s" : ""}</summary>`, "\n\n", pullRequestString, "\n", "</details>");
		else changeLog.push(pullRequestString);
		if (index + 1 !== nonEmptyCategories.length) changeLog.push("\n\n");
	}
	return changeLog.join("").trim();
};
//#endregion
//#region packages/core/src/release/version-descriptor.ts
var VersionDescriptor = class VersionDescriptor {
	version = null;
	major = null;
	minor = null;
	patch = null;
	prerelease = null;
	preReleaseIdentifier;
	tagPrefix;
	logger;
	constructor(from, opt) {
		this.logger = opt.logger;
		this.preReleaseIdentifier = opt.preReleaseIdentifier;
		this.tagPrefix = opt.tagPrefix;
		this.version = this.coerce(from);
		this.major = this.version ? getMajor(this.version).toString() : null;
		this.minor = this.version ? getMinor(this.version).toString() : null;
		this.patch = this.version ? getPatch(this.version).toString() : null;
		const prerelease = this.version ? getPrerelease(this.version) : null;
		this.prerelease = this.version ? prerelease?.length ? `-${prerelease.join(".")}` : "" : null;
	}
	coerce(from) {
		if (!from) {
			this.logger.debug("Building version descriptor without version input. Defaulting coerced version to null.");
			return null;
		}
		const version = typeof from === "object" ? this.isRelease(from) ? this.toSemver(this.stripTag(from.tagName)) || this.toSemver(this.stripTag(from.name)) : this.toSemver(from) : this.toSemver(this.stripTag(from));
		if (version) return version;
		this.logger.warning(`Failed to parse version from input ${String(from)}. Defaulting coerced version to null.`);
		return null;
	}
	isRelease(input) {
		return typeof input === "object" && input !== null && (typeof input.tagName === "string" || typeof input.name === "string");
	}
	stripTag(input) {
		return this.tagPrefix && input?.startsWith(this.tagPrefix) ? input.slice(this.tagPrefix.length) : input;
	}
	toSemver(version) {
		if (!version) return null;
		return tryParse$1(version) ?? coerce(version);
	}
	incremented(incrementType) {
		if (!this.version || incrementType === "no_increment") return this;
		const incrementedVersion = increment(this.version, incrementType, {
			loose: true,
			identifier: this.preReleaseIdentifier
		});
		if (!incrementedVersion) throw new Error(`Failed to increment version ${normalize(this.version)} with increment ${incrementType}`);
		const incrementedSemver = this.toSemver(incrementedVersion);
		if (!incrementedSemver) throw new Error(`Failed to parse version ${incrementedVersion} after incrementing ${normalize(this.version)} with increment ${incrementType}`);
		return new VersionDescriptor(incrementedSemver, {
			logger: this.logger,
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
//#region packages/core/src/release/get-version-info.ts
var getVersionInfo = (params) => {
	const { lastRelease, config, input, logger, versionKeyIncrement: _versionKeyIncrement } = params;
	logger.info(`Resolving version info based on:`);
	logger.info(`   - last release: ${lastRelease?.tagName || "none"}`);
	logger.info(`   - version input: ${input.version || input.tag || input.name || "none"}`);
	logger.info(`   - version key increment: ${_versionKeyIncrement}`);
	let _localIncrement = structuredClone(_versionKeyIncrement);
	logger.info(`Coerce and parse versions from last release...`);
	const versionFromLastRelease = new VersionDescriptor(lastRelease, {
		logger,
		tagPrefix: config["tag-prefix"],
		preReleaseIdentifier: config["prerelease-identifier"]
	});
	logger.info(`Parsed version from last release: ${normalize(versionFromLastRelease.version ?? "") || "none"}.`);
	logger.info(`Coerce and parse versions from input...`);
	const versionFromInput = new VersionDescriptor(input.version || input.tag || input.name, {
		logger,
		tagPrefix: config["tag-prefix"],
		preReleaseIdentifier: config["prerelease-identifier"]
	});
	logger.info(`Parsed version from input: ${normalize(versionFromInput.version ?? "") || "none"}.`);
	let referenceVersion;
	if (versionFromInput.version) {
		_localIncrement = "no_increment";
		referenceVersion = versionFromInput;
	} else if (versionFromLastRelease.version) {
		referenceVersion = versionFromLastRelease;
		const incrementsToPrerelease = _localIncrement?.startsWith("pre");
		const lastReleaseIsPrerelease = referenceVersion?.prerelease?.length;
		if (incrementsToPrerelease) {
			if (lastReleaseIsPrerelease) {
				if (_localIncrement !== "prerelease") {
					logger.info(`versionKeyIncrement is set to "${_localIncrement}", but the last release is already a prerelease (${normalize(referenceVersion.version ?? "") || "none"}). The version will be incremented as a prerelease instead.`);
					_localIncrement = "prerelease";
				}
			}
		}
	} else referenceVersion = new VersionDescriptor("0.0.0", {
		logger,
		preReleaseIdentifier: config["prerelease-identifier"],
		tagPrefix: config["tag-prefix"]
	});
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
//#region packages/core/src/release/last-release-not-found.ts
var lastReleaseNotFoundTemplate = `> [!WARNING]
> Release Drafter could not find a previous **published release** for \`$OWNER/$REPOSITORY\`. This draft was created **without a comparison baseline**.

> [!IMPORTANT]
> Treat this draft as a manual starting point.
> Review the proposed version, tag, and notes before publishing.

If you did not expect this to happen, [open an issue](https://github.com/release-drafter/release-drafter/issues/new?template=previous-published-release-not-found.yml).
`;
//#endregion
//#region packages/core/src/release/render-release-name.ts
/**
* Renders the release name,
* based on the input and config.
*/
var renderReleaseName = (params) => {
	let name = structuredClone(params.inputName);
	const { config, versionInfo, logger } = params;
	if (name === void 0) name = versionInfo ? renderTemplate({
		template: config["name-template"] || "",
		object: versionInfo
	}) : "";
	else if (versionInfo) name = renderTemplate({
		template: name,
		object: versionInfo
	});
	logger.debug(`name: ${name}`);
	return name;
};
//#endregion
//#region packages/core/src/release/render-tag-name.ts
/**
* Renders the tag name for the release,
* based on the input and config.
*/
var renderTagName = (params) => {
	let tagName = structuredClone(params.inputTagName);
	const { config, versionInfo, logger } = params;
	if (tagName === void 0) tagName = versionInfo ? renderTemplate({
		template: config["tag-template"] || "",
		object: versionInfo
	}) : "";
	else if (versionInfo) tagName = renderTemplate({
		template: tagName,
		object: versionInfo
	});
	logger.debug(`tag: ${tagName}`);
	return tagName;
};
//#endregion
//#region packages/core/src/release/resolve-version-increment.ts
var priority = {
	patch: 1,
	minor: 2,
	major: 3
};
var highestIncrement = (increments, fallback = "patch") => increments.reduce((current, increment) => priority[increment] > priority[current] ? increment : current, fallback);
var resolveVersionKeyIncrement = (params) => {
	const { pullRequests, config, logger } = params;
	const changelogIncrements = [];
	const explicitResolverIncrements = [];
	for (const pullRequest of pullRequests) {
		const evaluation = evaluateCategories(pullRequest, config.categories);
		if (!evaluation.included) continue;
		for (const category of evaluation.changelogCategories) if (category["semver-increment"] in priority) changelogIncrements.push(category["semver-increment"]);
		if (!evaluation.usedVersionFallback) {
			for (const category of evaluation.versionResolverCategories) if (category["semver-increment"] in priority) explicitResolverIncrements.push(category["semver-increment"]);
		}
	}
	const resolverFallback = getVersionResolverCategories(config.categories).find((category) => category.when.length === 0)?.["semver-increment"];
	const resolverIncrement = highestIncrement(explicitResolverIncrements.length > 0 ? explicitResolverIncrements : resolverFallback && resolverFallback in priority ? [resolverFallback] : ["patch"]);
	const resolved = highestIncrement([...changelogIncrements, resolverIncrement]);
	logger.debug(`versionKey: ${resolved}`);
	let versionKeyIncrement = resolved;
	if (config.prerelease && config["prerelease-identifier"]) versionKeyIncrement = `pre${versionKeyIncrement}`;
	logger.info(`Resolved version increment: ${versionKeyIncrement}`);
	return versionKeyIncrement;
};
//#endregion
//#region packages/core/src/release/sort-pull-requests.ts
var sortPullRequests = (params) => {
	const { pullRequests, logger, config: { "sort-by": sortBy, "sort-direction": sortDirection } } = params;
	const getSortField = sortBy === "title" ? getTitle : getMergedAt;
	const sort = sortDirection === "ascending" ? sortAscending : sortDescending;
	return structuredClone(pullRequests).sort((a, b) => {
		try {
			return sort(getSortField(a), getSortField(b));
		} catch (error) {
			logger.warning(`Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`);
			logger.error(error);
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
//#region packages/core/src/release/build-release-payload.ts
var buildReleasePayload = async (params) => {
	const { adapter, commits, config, input, lastRelease, logger, newContributorLogins = /* @__PURE__ */ new Set(), pullRequests, repository } = params;
	logger.info("Building release payload and body...");
	const sortedPullRequests = sortPullRequests({
		pullRequests,
		config,
		logger
	});
	let body = (config.header || "") + config.template + (!lastRelease && !input.from ? `\n---\n${renderTemplate({
		template: lastReleaseNotFoundTemplate,
		object: {
			$OWNER: repository.owner,
			$REPOSITORY: repository.name
		}
	})}\n---\n` : "") + (config.footer || "");
	body = renderTemplate({
		template: body,
		object: {
			$PREVIOUS_TAG: lastRelease?.tagName ?? "",
			$CHANGES: generateChangeLog({
				commits,
				logger,
				pullRequests: sortedPullRequests,
				serverUrl: repository.serverUrl,
				config
			}),
			$CONTRIBUTORS: generateContributorsSentence({
				commits,
				pullRequests: sortedPullRequests,
				serverUrl: repository.serverUrl,
				config
			}),
			$NEW_CONTRIBUTORS: generateNewContributorsList({
				pullRequests: sortedPullRequests,
				newContributorLogins,
				config
			}),
			$OWNER: repository.owner,
			$REPOSITORY: repository.name
		},
		replacers: config.replacers
	});
	const versionKeyIncrement = resolveVersionKeyIncrement({
		pullRequests,
		config,
		logger
	});
	const versionInfo = getVersionInfo({
		lastRelease,
		config,
		input,
		versionKeyIncrement,
		logger
	});
	logger.debug(`versionInfo: ${JSON.stringify(versionInfo, null, 2)}`);
	const tag = renderTagName({
		inputTagName: input.tag,
		config,
		versionInfo,
		logger
	});
	body = renderTemplate({
		template: body,
		object: {
			...versionInfo,
			$RESOLVED_TAG: tag
		}
	});
	const releasePayload = {
		name: renderReleaseName({
			inputName: input.name,
			config,
			versionInfo,
			logger
		}),
		tag,
		body,
		targetCommitish: await adapter.resolveCommitish({
			repository,
			commitish: config.commitish
		}),
		prerelease: config.prerelease,
		makeLatest: config.latest,
		draft: !input.publish,
		resolvedVersion: versionInfo?.$RESOLVED_VERSION,
		majorVersion: versionInfo?.$RESOLVED_VERSION_MAJOR,
		minorVersion: versionInfo?.$RESOLVED_VERSION_MINOR,
		patchVersion: versionInfo?.$RESOLVED_VERSION_PATCH,
		prereleaseVersion: versionInfo?.$RESOLVED_VERSION_PRERELEASE
	};
	logger.info("Release payload built successfully");
	logger.info(`  name:                        ${releasePayload.name}`);
	logger.info(`  tag:                         ${releasePayload.tag}`);
	logger.info(`  body:                        ${releasePayload.body.length} characters long`);
	logger.info(`  targetCommitish:             ${releasePayload.targetCommitish}`);
	logger.info(`  prerelease:                  ${releasePayload.prerelease}`);
	logger.info(`  make_latest:                 ${releasePayload.makeLatest}`);
	logger.info(`  draft:                       ${releasePayload.draft}${!releasePayload.draft ? " (will be published !)" : ""}`);
	logger.info(`  RESOLVED_VERSION:            ${releasePayload.resolvedVersion}`);
	logger.info(`  RESOLVED_VERSION_MAJOR:      ${releasePayload.majorVersion}`);
	logger.info(`  RESOLVED_VERSION_MINOR:      ${releasePayload.minorVersion}`);
	logger.info(`  RESOLVED_VERSION_PATCH:      ${releasePayload.patchVersion}`);
	logger.info(`  RESOLVED_VERSION_PRERELEASE: ${releasePayload.prereleaseVersion}`);
	return releasePayload;
};
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
//#region packages/core/src/release-orchestration.ts
var stripHeadRef = (commitish) => commitish.replace(/^refs\/heads\//, "");
var sortReleases = (params) => {
	const stripTagPrefix = (tagName) => params.tagPrefix && tagName.startsWith(params.tagPrefix) ? tagName.slice(params.tagPrefix.length) : tagName;
	return [...params.releases].sort((first, second) => {
		try {
			const semverOrder = compareVersions(stripTagPrefix(first.tagName), stripTagPrefix(second.tagName));
			if (semverOrder !== 0) return semverOrder;
		} catch {
			const firstCreatedAt = new Date(first.createdAt ?? "").getTime();
			const secondCreatedAt = new Date(second.createdAt ?? "").getTime();
			if (Number.isFinite(firstCreatedAt) && Number.isFinite(secondCreatedAt) && firstCreatedAt !== secondCreatedAt) return firstCreatedAt - secondCreatedAt;
		}
		return first.tagName.localeCompare(second.tagName) || String(first.id).localeCompare(String(second.id));
	});
};
var selectPreviousReleases = (params) => {
	const { config, logger } = params;
	const targetCommitish = stripHeadRef(config.commitish ?? "");
	const filterByRange = config["filter-by-range"];
	const shouldFilterByRange = Boolean(filterByRange) && filterByRange !== "*";
	const parsedRange = shouldFilterByRange && filterByRange ? normalizeRange(filterByRange) : null;
	const releases = params.releases.filter((release) => {
		if (config["filter-by-commitish"] && targetCommitish !== stripHeadRef(release.targetCommitish ?? "")) return false;
		if (config["tag-prefix"] && !release.tagName.startsWith(config["tag-prefix"])) return false;
		if (shouldFilterByRange) {
			if (!parsedRange) return false;
			const coercedVersion = coerce(release.tagName, { loose: true });
			if (!coercedVersion) {
				logger.warning(`Failed to coerce semver version for "${release.tagName}" : will be excluded from releases considered for drafting.`);
				return false;
			}
			return satisfies(coercedVersion, parsedRange, { loose: true });
		}
		return true;
	});
	const draftReleases = releases.filter((release) => config.prerelease ? release.prerelease : !release.prerelease);
	const publishedReleases = releases.filter((release) => !release.draft && (config.prerelease || config["include-pre-releases"] || !release.prerelease));
	return {
		draftRelease: draftReleases.find((release) => release.draft),
		lastRelease: sortReleases({
			releases: publishedReleases,
			tagPrefix: config["tag-prefix"]
		}).at(-1)
	};
};
var protectReleaseInput = (params) => {
	const { commitish, input, logger } = params;
	if (!/^refs\/pull\/\d+\/merge$/.test(commitish)) return input;
	if (!input.dryRun) logger.warning(`${commitish} points to an ephemeral pull request merge commit; forcing dry-run mode and disabling publish. Set dry-run: true explicitly to suppress this warning.`);
	return {
		...input,
		dryRun: true,
		publish: false
	};
};
var executeReleasePlan = async (params) => {
	const { adapter, logger, plan, repository } = params;
	if (plan.action === "dry-run") {
		logger.info(plan.draftRelease ? `[dry-run] Would update existing release (id: ${plan.draftRelease.id}) with payload: ${JSON.stringify(plan.releasePayload, null, 2)}` : `[dry-run] Would create a new release with payload: ${JSON.stringify(plan.releasePayload, null, 2)}`);
		return;
	}
	if (plan.action === "update") {
		logger.info("Updating existing release...");
		const release = await adapter.updateRelease({
			repository,
			release: plan.draftRelease,
			payload: plan.releasePayload
		});
		logger.info("Release updated!");
		return release;
	}
	logger.info("Creating new release...");
	const release = await adapter.createRelease({
		repository,
		payload: plan.releasePayload
	});
	logger.info("Release created!");
	return release;
};
var buildReleasePlan = (params) => {
	const { draftRelease, input, releasePayload } = params;
	if (input.dryRun) return {
		action: "dry-run",
		draftRelease,
		releasePayload
	};
	return draftRelease ? {
		action: "update",
		draftRelease,
		releasePayload
	} : {
		action: "create",
		releasePayload
	};
};
var draftRelease = async (params) => {
	const { adapter, config, logger, repository } = params;
	let input = protectReleaseInput({
		commitish: config.commitish,
		input: params.input,
		logger
	});
	if (!adapter.capabilities.draftReleases && !input.publish) {
		if (!input.dryRun) logger.info("This forge does not support draft releases. Because publish is false, Release Drafter will calculate the release but will not write it.");
		input = {
			...input,
			dryRun: true
		};
	}
	const releases = await adapter.listReleases({ repository });
	const { draftRelease, lastRelease } = selectPreviousReleases({
		config,
		logger,
		releases
	});
	const comparisonBase = input.from ?? (lastRelease ? `refs/tags/${lastRelease.tagName}` : void 0);
	const { commits, newContributorLogins, pullRequests } = comparisonBase ? await adapter.findChanges({
		repository,
		comparison: {
			baseRef: comparisonBase,
			headRef: config.commitish
		},
		pullRequestFields: {
			body: config["change-template"].includes("$BODY"),
			url: config["change-template"].includes("$URL"),
			baseRefName: config["change-template"].includes("$BASE_REF_NAME"),
			headRefName: config["change-template"].includes("$HEAD_REF_NAME")
		},
		pullRequestLimit: config["pull-request-limit"],
		historyLimit: config["history-limit"],
		includeChangedFiles: needsPullRequestChangedFiles(config.categories),
		includeNewContributors: [
			config.header,
			config.template,
			config.footer
		].some((template) => template?.includes("$NEW_CONTRIBUTORS"))
	}) : (() => {
		logger.warning("A previous (published) release is required to find changes");
		return {
			commits: [],
			newContributorLogins: /* @__PURE__ */ new Set(),
			pullRequests: []
		};
	})();
	if (pullRequests.length > 0) logger.info(`Found ${pullRequests.length} merged pull requests targeting ${repository.owner}/${repository.name}: ${pullRequests.map(({ number }) => `#${number}`).join(", ")}`);
	const releasePayload = await buildReleasePayload({
		adapter,
		commits,
		config,
		input,
		lastRelease,
		logger,
		newContributorLogins,
		pullRequests,
		repository
	});
	const plan = buildReleasePlan({
		draftRelease: adapter.capabilities.draftReleases ? draftRelease : releases.find((release) => !release.draft && release.tagName === releasePayload.tag),
		input,
		releasePayload
	});
	return {
		plan,
		release: await executeReleasePlan({
			adapter,
			logger,
			plan,
			repository
		}),
		releasePayload,
		labels: [...new Set(pullRequests.flatMap((pullRequest) => {
			const evaluation = evaluateCategories(pullRequest, config.categories);
			return evaluation.included ? evaluation.matchedLabels : [];
		}))].sort()
	};
};
//#endregion
//#region packages/gh-actions/src/drafter/action-input.schema.ts
var exclusiveInputSchema = object({
	"config-name": string$2().optional().default("release-drafter.yml"),
	/** Ref, tag, branch, or commit SHA used only as the change comparison base. */
	from: string$2().optional(),
	name: string$2().optional(),
	tag: string$2().optional(),
	version: string$2().optional(),
	publish: stringbool().optional().default(false)
}).and(sharedInputSchema);
var actionInputSchema = exclusiveInputSchema.and(commonConfigSchema);
//#endregion
//#region packages/gh-actions/src/drafter/action-metadata.ts
var actionInputNames = defineActionInputNames()([
	"config-name",
	"token",
	"name",
	"tag",
	"version",
	"from",
	"publish",
	"latest",
	"prerelease",
	"prerelease-identifier",
	"include-pre-releases",
	"commitish",
	"header",
	"footer",
	"dry-run",
	"filter-by-range"
]);
var actionOutputNames = [
	"id",
	"html_url",
	"upload_url",
	"tag_name",
	"name",
	"resolved_version",
	"major_version",
	"minor_version",
	"patch_version",
	"body",
	"labels"
];
//#endregion
//#region packages/gh-actions/src/drafter/get-action-inputs.ts
var getActionInput = () => actionInputSchema.parse(readActionInputs(actionInputNames));
//#endregion
//#region packages/gh-actions/src/drafter/get-config.ts
var getConfig = async (configName, token) => {
	return getReleaseDrafterConfig(configName, context, token);
};
//#endregion
//#region packages/gh-actions/src/drafter/set-action-output.ts
/** Set every declared Drafter action output from the release result. */
var setActionOutput = ({ release, releasePayload, labels }) => {
	info("Set action outputs...");
	const outputName = release?.name ?? releasePayload.name;
	const outputTagName = release?.tagName ?? releasePayload.tag;
	writeActionOutputs(actionOutputNames, {
		id: release?.id && Number.isInteger(release.id) ? release.id.toString() : void 0,
		html_url: release?.url || void 0,
		upload_url: release?.uploadUrl || void 0,
		tag_name: outputTagName || void 0,
		name: outputName || void 0,
		resolved_version: releasePayload.resolvedVersion || void 0,
		major_version: releasePayload.majorVersion || void 0,
		minor_version: releasePayload.minorVersion || void 0,
		patch_version: releasePayload.patchVersion || void 0,
		body: releasePayload.body,
		labels: JSON.stringify(labels)
	});
	info("Outputs set!");
};
//#endregion
//#region packages/gh-actions/src/drafter/runner.ts
var toReleaseInput = (input) => ({
	...input.from !== void 0 ? { from: input.from } : {},
	...input.name !== void 0 ? { name: input.name } : {},
	...input.tag !== void 0 ? { tag: input.tag } : {},
	...input.version !== void 0 ? { version: input.version } : {},
	publish: input.publish,
	...input["dry-run"] !== void 0 ? { dryRun: input["dry-run"] } : {}
});
/** Run the Drafter action using core orchestration and the GitHub adapter. */
async function run() {
	try {
		info("Parsing inputs and configuration...");
		const input = getActionInput();
		const config = mergeInputAndConfig({
			config: await getConfig(input["config-name"], input.token),
			input,
			defaultCommitish: context.ref || context.payload.ref,
			logger: actionLogger
		});
		const result = await draftRelease({
			adapter: getGitHubAdapter(input.token),
			config,
			input: toReleaseInput(input),
			logger: actionLogger,
			repository: getRepository()
		});
		setActionOutput(result);
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
	}
}
//#endregion
//#region packages/gh-actions/src/drafter/run.ts
/*! release-drafter-action-entry:drafter */
/* node:coverage ignore file -- @preserve */
await run();
//#endregion
export {};
