import { S as context, T as setFailed, _ as object, a as readActionInputs, c as getGitHubAdapter, i as defineActionInputNames, l as getRepository, n as sharedInputSchema, o as writeActionOutputs, s as actionLogger, u as escapeStringRegexp, v as string, w as info, y as stringbool } from "../../chunks/config.js";
import { _ as filterPullRequestsByPreCategories, a as COERCE, b as needsPullRequestChangedFiles, c as PRERELEASE_LOOSE, d as formatFullVersion, f as parse, g as evaluateCategories, h as commonConfigSchema, i as satisfies, l as compareIdentifiers, m as tryParse$1, n as mergeInputAndConfig, o as COERCE_FULL, p as safeRegex, r as normalizeRange, s as PRERELEASE, t as getReleaseDrafterConfig, u as formatComparableVersion, v as getChangelogCategories, y as getVersionResolverCategories } from "../../chunks/get-release-drafter-config.js";
//#region node_modules/verkit/dist/version-CQ98ZBpL.js
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
		return incrementParsedVersion(parse(version, options), release, options.identifier, options.identifierBase, options.loose);
	} catch {
		return null;
	}
}
function getMajor(version, options = {}) {
	return parse(version, options).major;
}
function getMinor(version, options = {}) {
	return parse(version, options).minor;
}
function getPatch(version, options = {}) {
	return parse(version, options).patch;
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
	return generateAuthorsSentence({
		commits,
		pullRequests: filterPullRequestsByPreCategories(pullRequests, config.categories),
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
var pullRequestToString = (params) => params.pullRequests.map((pullRequest) => {
	let pullAuthor = "ghost";
	if (pullRequest.author) pullAuthor = pullRequest.author.type === "Bot" ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})` : pullRequest.author.login;
	const authorTemplate = params.config["change-author-template"];
	return renderTemplate({
		template: params.config["change-template"],
		object: {
			$CATEGORY: params.category ?? "",
			$TITLE: escapeTitle({
				title: pullRequest.title,
				escapes: params.config["change-title-escapes"]
			}),
			$NUMBER: pullRequest.number.toString(),
			$AUTHORS: generateAuthorsSentence({
				commits: params.commits,
				pullRequests: [pullRequest],
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
//#region packages/core/src/release/generate-changelog.ts
var generateChangeLog = (params) => {
	const { commits = [], pullRequests, serverUrl, config } = params;
	const [uncategorizedPullRequests, categorizedPullRequests] = categorizePullRequests({
		pullRequests,
		config
	});
	if (uncategorizedPullRequests.length + categorizedPullRequests.reduce((sum, category) => sum + category.pullRequests.length, 0) === 0) return config["no-changes-template"];
	const changeLog = [];
	if (uncategorizedPullRequests.length > 0) changeLog.push(pullRequestToString({
		commits,
		pullRequests: uncategorizedPullRequests,
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
		const pullRequestString = pullRequestToString({
			category: category.title,
			commits,
			pullRequests: category.pullRequests,
			serverUrl,
			config
		});
		if (category["collapse-after"] !== -1 && category.pullRequests.length > category["collapse-after"]) changeLog.push("<details>", "\n", `<summary>${category.pullRequests.length} change${category.pullRequests.length > 1 ? "s" : ""}</summary>`, "\n\n", pullRequestString, "\n", "</details>");
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
	let body = (config.header || "") + config.template + (!lastRelease ? `\n---\n${renderTemplate({
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
	const versionInfo = getVersionInfo({
		lastRelease,
		config,
		input,
		versionKeyIncrement: resolveVersionKeyIncrement({
			pullRequests,
			config,
			logger
		}),
		logger
	});
	logger.debug(`versionInfo: ${JSON.stringify(versionInfo, null, 2)}`);
	if (versionInfo) body = renderTemplate({
		template: body,
		object: versionInfo
	});
	const releasePayload = {
		name: renderReleaseName({
			inputName: input.name,
			config,
			versionInfo,
			logger
		}),
		tag: renderTagName({
			inputTagName: input.tag,
			config,
			versionInfo,
			logger
		}),
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
		releasePayload
	};
};
var actionInputSchema = object({
	"config-name": string().optional().default("release-drafter.yml"),
	/** Ref, tag, branch, or commit SHA used only as the change comparison base. */
	from: string().optional(),
	name: string().optional(),
	tag: string().optional(),
	version: string().optional(),
	publish: stringbool().optional().default(false)
}).and(sharedInputSchema).and(commonConfigSchema);
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
	"body"
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
var setActionOutput = ({ release, releasePayload }) => {
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
		body: releasePayload.body
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
		setActionOutput(await draftRelease({
			adapter: getGitHubAdapter(input.token),
			config,
			input: toReleaseInput(input),
			logger: actionLogger,
			repository: getRepository()
		}));
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
