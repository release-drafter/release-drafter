import { C as setOutput, E as __toESM, S as setFailed, T as __commonJSMin, _ as context, b as getInput, g as getOctokit, h as composeConfigGet, l as object, o as array, r as sharedInputSchema, t as stringToRegex, u as string, w as warning, x as info } from "../../chunks/common.js";
//#region src/actions/autolabeler/config/action-input.schema.ts
var actionInputSchema = object({ "config-name": string().optional().default("release-drafter.yml") }).and(sharedInputSchema);
//#endregion
//#region src/actions/autolabeler/config/config.schema.ts
var configSchema = object({ autolabeler: array(object({
	label: string().min(1),
	files: array(string().min(1)).optional().default([]),
	branch: array(string().min(1)).optional().default([]),
	title: array(string().min(1)).optional().default([]),
	body: array(string().min(1)).optional().default([])
})).min(1) }).meta({
	title: "JSON schema for Release Drafter's autolabeler action config.",
	id: "https://github.com/release-drafter/release-drafter/blob/master/autolabeler/schema.json"
});
//#endregion
//#region src/actions/autolabeler/config/get-action-inputs.ts
var getActionInput = () => {
	const getInput$1 = (name) => getInput(name) || void 0;
	return actionInputSchema.parse({
		"config-name": getInput$1("config-name"),
		token: getInput$1("token"),
		"dry-run": getInput$1("dry-run")
	});
};
//#endregion
//#region src/actions/autolabeler/config/get-config.ts
var getConfig = async (configName) => {
	const { config, contexts } = await composeConfigGet(configName, context);
	if (contexts.length > 1) info(`Config was fetched from ${contexts.length} different contexts.`);
	else if (contexts.length === 1) info(`Config fetched ${contexts[0].scheme === "file" ? "locally" : `on remote "${contexts[0].repo.owner}/${contexts[0].repo.repo}${contexts[0].ref ? `@${contexts[0].ref}` : ""}"${!contexts[0].ref ? " on the default branch" : ""}`}.`);
	return configSchema.parse(config);
};
//#endregion
//#region src/actions/autolabeler/config/parse-config.ts
/**
* Returns a copy of `config`, updated with values from `input`.
*
* Also performs some validation.
*
* Input takes precedence, because it's more easy to change at runtime
*/
var parseConfig = ({ config: originalConfig }) => {
	const config = structuredClone(originalConfig);
	const autolabeler = config.autolabeler.map((autolabel) => {
		try {
			return {
				...autolabel,
				branch: autolabel.branch.map((reg) => {
					return stringToRegex(reg);
				}),
				title: autolabel.title.map((reg) => {
					return stringToRegex(reg);
				}),
				body: autolabel.body.map((reg) => {
					return stringToRegex(reg);
				})
			};
		} catch {
			warning(`Bad autolabeler regex: '${autolabel.branch}', '${autolabel.title}' or '${autolabel.body}'`);
			return false;
		}
	}).filter((a) => !!a);
	return {
		...config,
		autolabeler
	};
};
//#endregion
//#region src/actions/autolabeler/main.ts
var import_ignore = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	function makeArray(subject) {
		return Array.isArray(subject) ? subject : [subject];
	}
	var UNDEFINED = void 0;
	var EMPTY = "";
	var SPACE = " ";
	var ESCAPE = "\\";
	var REGEX_TEST_BLANK_LINE = /^\s+$/;
	var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
	var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
	var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
	var REGEX_SPLITALL_CRLF = /\r?\n/g;
	var REGEX_TEST_INVALID_PATH = /^\.{0,2}\/|^\.{1,2}$/;
	var REGEX_TEST_TRAILING_SLASH = /\/$/;
	var SLASH = "/";
	var TMP_KEY_IGNORE = "node-ignore";
	/* istanbul ignore else */
	if (typeof Symbol !== "undefined") TMP_KEY_IGNORE = Symbol.for("node-ignore");
	var KEY_IGNORE = TMP_KEY_IGNORE;
	var define = (object, key, value) => {
		Object.defineProperty(object, key, { value });
		return value;
	};
	var REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
	var RETURN_FALSE = () => false;
	var sanitizeRange = (range) => range.replace(REGEX_REGEXP_RANGE, (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY);
	var cleanRangeBackSlash = (slashes) => {
		const { length } = slashes;
		return slashes.slice(0, length - length % 2);
	};
	var REPLACERS = [
		[/^\uFEFF/, () => EMPTY],
		[/((?:\\\\)*?)(\\?\s+)$/, (_, m1, m2) => m1 + (m2.indexOf("\\") === 0 ? SPACE : EMPTY)],
		[/(\\+?)\s/g, (_, m1) => {
			const { length } = m1;
			return m1.slice(0, length - length % 2) + SPACE;
		}],
		[/[\\$.|*+(){^]/g, (match) => `\\${match}`],
		[/(?!\\)\?/g, () => "[^/]"],
		[/^\//, () => "^"],
		[/\//g, () => "\\/"],
		[/^\^*\\\*\\\*\\\//, () => "^(?:.*\\/)?"],
		[/^(?=[^^])/, function startingReplacer() {
			return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
		}],
		[/\\\/\\\*\\\*(?=\\\/|$)/g, (_, index, str) => index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+"],
		[/(^|[^\\]+)(\\\*)+(?=.+)/g, (_, p1, p2) => {
			return p1 + p2.replace(/\\\*/g, "[^\\/]*");
		}],
		[/\\\\\\(?=[$.|*+(){^])/g, () => ESCAPE],
		[/\\\\/g, () => ESCAPE],
		[/(\\)?\[([^\]/]*?)(\\*)($|\])/g, (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" ? endEscape.length % 2 === 0 ? `[${sanitizeRange(range)}${endEscape}]` : "[]" : "[]"],
		[/(?:[^*])$/, (match) => /\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`]
	];
	var REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\\\*$/;
	var MODE_IGNORE = "regex";
	var MODE_CHECK_IGNORE = "checkRegex";
	var UNDERSCORE = "_";
	var TRAILING_WILD_CARD_REPLACERS = {
		[MODE_IGNORE](_, p1) {
			return `${p1 ? `${p1}[^/]+` : "[^/]*"}(?=$|\\/$)`;
		},
		[MODE_CHECK_IGNORE](_, p1) {
			return `${p1 ? `${p1}[^/]*` : "[^/]*"}(?=$|\\/$)`;
		}
	};
	var makeRegexPrefix = (pattern) => REPLACERS.reduce((prev, [matcher, replacer]) => prev.replace(matcher, replacer.bind(pattern)), pattern);
	var isString = (subject) => typeof subject === "string";
	var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) && pattern.indexOf("#") !== 0;
	var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF).filter(Boolean);
	var IgnoreRule = class {
		constructor(pattern, mark, body, ignoreCase, negative, prefix) {
			this.pattern = pattern;
			this.mark = mark;
			this.negative = negative;
			define(this, "body", body);
			define(this, "ignoreCase", ignoreCase);
			define(this, "regexPrefix", prefix);
		}
		get regex() {
			const key = UNDERSCORE + MODE_IGNORE;
			if (this[key]) return this[key];
			return this._make(MODE_IGNORE, key);
		}
		get checkRegex() {
			const key = UNDERSCORE + MODE_CHECK_IGNORE;
			if (this[key]) return this[key];
			return this._make(MODE_CHECK_IGNORE, key);
		}
		_make(mode, key) {
			const str = this.regexPrefix.replace(REGEX_REPLACE_TRAILING_WILDCARD, TRAILING_WILD_CARD_REPLACERS[mode]);
			const regex = this.ignoreCase ? new RegExp(str, "i") : new RegExp(str);
			return define(this, key, regex);
		}
	};
	var createRule = ({ pattern, mark }, ignoreCase) => {
		let negative = false;
		let body = pattern;
		if (body.indexOf("!") === 0) {
			negative = true;
			body = body.substr(1);
		}
		body = body.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
		const regexPrefix = makeRegexPrefix(body);
		return new IgnoreRule(pattern, mark, body, ignoreCase, negative, regexPrefix);
	};
	var RuleManager = class {
		constructor(ignoreCase) {
			this._ignoreCase = ignoreCase;
			this._rules = [];
		}
		_add(pattern) {
			if (pattern && pattern[KEY_IGNORE]) {
				this._rules = this._rules.concat(pattern._rules._rules);
				this._added = true;
				return;
			}
			if (isString(pattern)) pattern = { pattern };
			if (checkPattern(pattern.pattern)) {
				const rule = createRule(pattern, this._ignoreCase);
				this._added = true;
				this._rules.push(rule);
			}
		}
		add(pattern) {
			this._added = false;
			makeArray(isString(pattern) ? splitPattern(pattern) : pattern).forEach(this._add, this);
			return this._added;
		}
		test(path, checkUnignored, mode) {
			let ignored = false;
			let unignored = false;
			let matchedRule;
			this._rules.forEach((rule) => {
				const { negative } = rule;
				if (unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored) return;
				if (!rule[mode].test(path)) return;
				ignored = !negative;
				unignored = negative;
				matchedRule = negative ? UNDEFINED : rule;
			});
			const ret = {
				ignored,
				unignored
			};
			if (matchedRule) ret.rule = matchedRule;
			return ret;
		}
	};
	var throwError = (message, Ctor) => {
		throw new Ctor(message);
	};
	var checkPath = (path, originalPath, doThrow) => {
		if (!isString(path)) return doThrow(`path must be a string, but got \`${originalPath}\``, TypeError);
		if (!path) return doThrow(`path must not be empty`, TypeError);
		if (checkPath.isNotRelative(path)) return doThrow(`path should be a \`path.relative()\`d string, but got "${originalPath}"`, RangeError);
		return true;
	};
	var isNotRelative = (path) => REGEX_TEST_INVALID_PATH.test(path);
	checkPath.isNotRelative = isNotRelative;
	/* istanbul ignore next */
	checkPath.convert = (p) => p;
	var Ignore = class {
		constructor({ ignorecase = true, ignoreCase = ignorecase, allowRelativePaths = false } = {}) {
			define(this, KEY_IGNORE, true);
			this._rules = new RuleManager(ignoreCase);
			this._strictPathCheck = !allowRelativePaths;
			this._initCache();
		}
		_initCache() {
			this._ignoreCache = Object.create(null);
			this._testCache = Object.create(null);
		}
		add(pattern) {
			if (this._rules.add(pattern)) this._initCache();
			return this;
		}
		addPattern(pattern) {
			return this.add(pattern);
		}
		_test(originalPath, cache, checkUnignored, slices) {
			const path = originalPath && checkPath.convert(originalPath);
			checkPath(path, originalPath, this._strictPathCheck ? throwError : RETURN_FALSE);
			return this._t(path, cache, checkUnignored, slices);
		}
		checkIgnore(path) {
			if (!REGEX_TEST_TRAILING_SLASH.test(path)) return this.test(path);
			const slices = path.split(SLASH).filter(Boolean);
			slices.pop();
			if (slices.length) {
				const parent = this._t(slices.join(SLASH) + SLASH, this._testCache, true, slices);
				if (parent.ignored) return parent;
			}
			return this._rules.test(path, false, MODE_CHECK_IGNORE);
		}
		_t(path, cache, checkUnignored, slices) {
			if (path in cache) return cache[path];
			if (!slices) slices = path.split(SLASH).filter(Boolean);
			slices.pop();
			if (!slices.length) return cache[path] = this._rules.test(path, checkUnignored, MODE_IGNORE);
			const parent = this._t(slices.join(SLASH) + SLASH, cache, checkUnignored, slices);
			return cache[path] = parent.ignored ? parent : this._rules.test(path, checkUnignored, MODE_IGNORE);
		}
		ignores(path) {
			return this._test(path, this._ignoreCache, false).ignored;
		}
		createFilter() {
			return (path) => !this.ignores(path);
		}
		filter(paths) {
			return makeArray(paths).filter(this.createFilter());
		}
		test(path) {
			return this._test(path, this._testCache, true);
		}
	};
	var factory = (options) => new Ignore(options);
	var isPathValid = (path) => checkPath(path && checkPath.convert(path), path, RETURN_FALSE);
	/* istanbul ignore next */
	var setupWindows = () => {
		const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
		checkPath.convert = makePosix;
		const REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
		checkPath.isNotRelative = (path) => REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path) || isNotRelative(path);
	};
	/* istanbul ignore next */
	if (typeof process !== "undefined" && process.platform === "win32") setupWindows();
	module.exports = factory;
	factory.default = factory;
	module.exports.isPathValid = isPathValid;
	define(module.exports, Symbol.for("setupWindows"), setupWindows);
})))(), 1);
var main = async (params) => {
	info(`Running for event "${context.eventName || "[undefined]"}.${context.payload.action || "[undefined]"}"`);
	if (context.eventName !== "pull_request" && context.eventName !== "pull_request_target") throw new Error(`Event type is wrong. Expected 'pull_request' or 'pull_request_target', received '${context.eventName}'`);
	const octokit = getOctokit();
	/**
	* @see https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request
	*/
	const payload = context.payload;
	const changedFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
		...context.repo,
		issue_number: payload.number,
		pull_number: payload.number,
		per_page: 100
	}, (response) => response.data.map((file) => file.filename));
	const labels = /* @__PURE__ */ new Set();
	for (const autolabel of params.config.autolabeler) {
		let found = false;
		if (!found && autolabel.files.length > 0) {
			const matcher = (0, import_ignore.default)().add(autolabel.files);
			if (changedFiles.some((file) => matcher.ignores(file))) {
				labels.add(autolabel.label);
				found = true;
				info(`Found label for files: '${autolabel.label}'`);
			}
		}
		if (!found && autolabel.branch.length > 0) {
			for (const matcher of autolabel.branch) if (matcher.test(payload.pull_request.head.ref)) {
				labels.add(autolabel.label);
				found = true;
				info(`Found label for branch: '${autolabel.label}'`);
				break;
			}
		}
		if (!found && autolabel.title.length > 0) {
			for (const matcher of autolabel.title) if (matcher.test(payload.pull_request.title)) {
				labels.add(autolabel.label);
				found = true;
				info(`Found label for title: '${autolabel.label}'`);
				break;
			}
		}
		if (!found && payload.pull_request.body != null && autolabel.body.length > 0) {
			for (const matcher of autolabel.body) if (matcher.test(payload.pull_request.body)) {
				labels.add(autolabel.label);
				found = true;
				info(`Found label for body: '${autolabel.label}'`);
				break;
			}
		}
	}
	if (labels.size > 0) if (params.dryRun) info(`[dry-run] Would add labels [${Array.from(labels).join(", ")}] to PR #${payload.number}`);
	else await octokit.rest.issues.addLabels({
		...context.repo,
		issue_number: payload.number,
		labels: Array.from(labels)
	});
	return {
		pr_number: payload.number.toString(),
		labels: labels.size ? Array.from(labels).join(",") : void 0
	};
};
//#endregion
//#region src/actions/autolabeler/runner.ts
/**
* The main function for the action.
*
* @returns Resolves when the action is complete.
*/
async function run() {
	try {
		const input = getActionInput();
		const { labels, pr_number } = await main({
			config: parseConfig({ config: await getConfig(input["config-name"]) }),
			dryRun: input["dry-run"]
		});
		if (pr_number) setOutput("number", pr_number);
		if (labels) setOutput("labels", labels);
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
	}
}
//#endregion
//#region src/actions/autolabeler/run.ts
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
