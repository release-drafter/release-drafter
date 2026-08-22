import { C as info, _ as string, a as writeActionOutputs, b as Minimatch, c as getRepository, d as _enum, f as array, g as object, h as number, i as readActionInputs, l as escapeStringRegexp, m as literal, n as sharedInputSchema, o as actionLogger, p as boolean, r as defineActionInputNames, s as getGitHubAdapter, t as composeConfigGet, u as ZodDefault, v as stringbool, w as setFailed, x as context, y as union } from "../../chunks/config.js";
//#region node_modules/conventional-commits-parser/dist/regex.js
var nomatchRegex = /(?!.*)/;
function escape(string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function joinOr(parts) {
	return parts.map((val) => typeof val === "string" ? escape(val.trim()) : val.source).filter(Boolean).join("|");
}
function getNotesRegex(noteKeywords, notesPattern) {
	if (!noteKeywords) return nomatchRegex;
	const noteKeywordsSelection = joinOr(noteKeywords);
	if (!notesPattern) return new RegExp(`^[\\s|*]*(${noteKeywordsSelection})[:\\s]+(.*)`, "i");
	return notesPattern(noteKeywordsSelection);
}
function getReferencePartsRegex(issuePrefixes, issuePrefixesCaseSensitive) {
	if (!issuePrefixes) return nomatchRegex;
	const flags = issuePrefixesCaseSensitive ? "g" : "gi";
	return new RegExp(`(?:.*?)??\\s*([\\w-\\.\\/]*?)??(${joinOr(issuePrefixes)})([\\w-]+)(?=\\s|$|[,;)\\]])`, flags);
}
function getReferencesRegex(referenceActions) {
	if (!referenceActions) return /()(.+)/gi;
	const joinedKeywords = joinOr(referenceActions);
	return new RegExp(`(${joinedKeywords})(?:\\s+(.*?))(?=(?:${joinedKeywords})|$)`, "gi");
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
		mentions: /@([\w-]+)/g,
		url: /\b(?:https?):\/\/(?:www\.)?([-a-zA-Z0-9@:%_+.~#?&//=])+\b/
	};
}
//#endregion
//#region node_modules/conventional-commits-parser/dist/utils.js
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
//#endregion
//#region node_modules/conventional-commits-parser/dist/options.js
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
	fieldPattern: /^-(.*?)-$/
};
//#endregion
//#region node_modules/conventional-commits-parser/dist/CommitParser.js
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
	parseReferences(input) {
		const { regexes } = this;
		const regex = input.match(regexes.references) ? regexes.references : /()(.+)/gi;
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
		let references = [];
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
				references = this.parseReferences(this.currentLine());
				if (references.length) commit.references.push(...references);
				else note.text = appendLine(note.text, this.currentLine());
				commit.footer = appendLine(commit.footer, this.currentLine());
				this.nextLine();
				if (references.length) break;
			}
			return true;
		}
		return false;
	}
	parseBodyAndFooter(isBody) {
		const { commit } = this;
		if (!this.isLineAvailable()) return isBody;
		const references = this.parseReferences(this.currentLine());
		const isStillBody = !references.length && isBody;
		if (isStillBody) commit.body = appendLine(commit.body, this.currentLine());
		else {
			commit.references.push(...references);
			commit.footer = appendLine(commit.footer, this.currentLine());
		}
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
		if (commit.body) commit.body = trimNewLines(commit.body);
		if (commit.footer) commit.footer = trimNewLines(commit.footer);
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
//#endregion
//#region packages/core/src/path-matcher.ts
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
//#endregion
//#region packages/core/src/category-matching.ts
var conventionalParser = new CommitParser({
	headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
	breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/
});
var priority$1 = {
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
	const highest = [...changelog.categories, ...version.categories].map((category) => category["semver-increment"]).filter((increment) => increment in priority$1).reduce((current, increment) => !current || priority$1[increment] > priority$1[current] ? increment : current, void 0);
	return {
		included,
		excluded,
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
//#endregion
//#region packages/core/src/config/common-config.schema.ts
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
//#endregion
//#region packages/core/src/config/config.schema.ts
/**
* A single set of predicates that are combined with AND logic.
* All specified predicates must be satisfied for a change to match.
*/
var changeConditionSchema = object({
	/**
	* Conventional commit predicate: matches a change whose title or message
	* follows the conventional commit shape, e.g. `feat(api)!: add endpoint`.
	*/
	conventional: union([literal(true), object({
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
	replacers: array(object({
		search: string().min(1),
		replace: string().min(0)
	})).optional().default([]),
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
//#endregion
//#region node_modules/verkit/dist/comparison-DenM3wCn.js
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
function tryParse$1(version, options = {}) {
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
//#endregion
//#region node_modules/verkit/dist/set-CC5YeoYX.js
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
//#endregion
//#region node_modules/verkit/dist/range-DvX-Y6iv.js
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
function isWildcard$1(value) {
	return !value || String(value).toLowerCase() === "x" || String(value) === "*";
}
function hasInvalidWildcardOrder(major, minor, patch) {
	return isWildcard$1(major) && !isWildcard$1(minor) || isWildcard$1(minor) && Boolean(patch) && !isWildcard$1(patch);
}
function replaceTilde(comparator, options) {
	const expression = options.loose ? LOOSE_TILDE : STRICT_TILDE;
	const lowerPrerelease = options.includePrerelease ? "-0" : "";
	return comparator.replace(expression, (_match, major, minor, patch, prerelease) => {
		if (isWildcard$1(major)) return "";
		if (isWildcard$1(minor)) return `>=${major}.0.0${lowerPrerelease} <${Number(major) + 1}.0.0-0`;
		if (isWildcard$1(patch)) return `>=${major}.${minor}.0${lowerPrerelease} <${major}.${Number(minor) + 1}.0-0`;
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
		if (isWildcard$1(major)) return "";
		if (isWildcard$1(minor)) return `>=${major}.0.0${lowerPrerelease} <${Number(major) + 1}.0.0-0`;
		if (isWildcard$1(patch)) return major === "0" ? `>=${major}.${minor}.0${lowerPrerelease} <${major}.${Number(minor) + 1}.0-0` : `>=${major}.${minor}.0${lowerPrerelease} <${Number(major) + 1}.0.0-0`;
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
		const wildcardMajor = isWildcard$1(major);
		const wildcardMinor = wildcardMajor || isWildcard$1(minor);
		const wildcardPatch = wildcardMinor || isWildcard$1(patch);
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
		if (isWildcard$1(fromMajor)) from = "";
		else if (isWildcard$1(fromMinor)) from = `>=${fromMajor}.0.0${options.includePrerelease ? "-0" : ""}`;
		else if (isWildcard$1(fromPatch)) from = `>=${fromMajor}.${fromMinor}.0${options.includePrerelease ? "-0" : ""}`;
		else if (fromPrerelease) from = `>=${from}`;
		else from = `>=${from}${options.includePrerelease ? "-0" : ""}`;
		if (isWildcard$1(toMajor)) to = "";
		else if (isWildcard$1(toMinor)) to = `<${Number(toMajor) + 1}.0.0-0`;
		else if (isWildcard$1(toPatch)) to = `<${toMajor}.${Number(toMinor) + 1}.0-0`;
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
	const parsed = tryParse$1(version, range.options);
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
//#endregion
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
		const expression = safeRegex(options.includePrerelease ? COERCE_FULL : COERCE, "g");
		let next;
		while ((next = expression.exec(input)) && (!match || match.index + match[0].length !== input.length)) {
			if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
			expression.lastIndex = next.index + next[1].length + next[2].length;
		}
	} else match = (options.includePrerelease ? COERCE_FULL_EXACT : COERCE_EXACT).exec(input);
	if (!match) return null;
	const major = match[2];
	return tryParse$1(`${major}.${match[3] || "0"}.${match[4] || "0"}${options.includePrerelease && match[5] ? `-${match[5]}` : ""}${options.includePrerelease && match[6] ? `+${match[6]}` : ""}`, options);
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
//#region packages/core/src/string-to-regex.ts
var regexLiteral = /^\/.+\/[AJUXgimsux]*$/;
var supportedFlags = /* @__PURE__ */ new Set("gimsuy");
/** Converts a regex literal or plain text matcher into a regular expression. */
var stringToRegex = (search) => {
	if (!regexLiteral.test(search)) return new RegExp(escapeStringRegexp(search), "g");
	const delimiter = search.lastIndexOf("/");
	const flags = [...new Set(search.slice(delimiter + 1))].filter((flag) => supportedFlags.has(flag)).join("");
	return new RegExp(search.slice(1, delimiter), flags);
};
//#endregion
//#region packages/core/src/config/parse-categories.ts
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
//#endregion
//#region packages/core/src/config/merge-input-and-config.ts
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
	if (config.latest && config.prerelease) {
		logger.warning("'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release.");
		config.latest = false;
	}
	const hasInputPrerelease = typeof input.prerelease === "boolean";
	const hasInputPrereleaseIdentifier = !!input["prerelease-identifier"];
	if (config["prerelease-identifier"] && !config.prerelease && (!hasInputPrerelease || hasInputPrereleaseIdentifier)) {
		logger.warning(`You specified a 'prerelease-identifier' (${config["prerelease-identifier"]}), but 'prerelease' is set to false. Switching to true.`);
		config.prerelease = true;
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
	const { config, contexts } = await composeConfigGet(configName, context, token);
	contexts.forEach(({ filepath, ref, repo, scheme }) => {
		const remotePath = `${repo.owner}/${repo.repo}/${filepath}${ref ? `@${ref}` : ""}`;
		const location = scheme === "file" ? `locally from "${filepath}"` : `from "${remotePath}"${ref ? "" : " on the default branch"}`;
		info(`Config fetched ${location}.`);
	});
	return configSchema.parse(config);
};
//#endregion
//#region packages/gh-actions/src/drafter/set-action-output.ts
/** Set every declared Drafter Action output from the release result. */
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
/** Run the Drafter Action using core orchestration and the GitHub adapter. */
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
