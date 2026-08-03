import { C as context, D as setFailed, E as info, O as setOutput, S as require_ignore, T as getInput, _ as string, a as getGitHubAdapter, g as object, k as __toESM, l as require_lib, m as array, n as sharedInputSchema, t as composeConfigGet, u as escapeStringRegexp, w as core_exports } from "../../chunks/config.js";
import process from "node:process";
//#region packages/autolabeler/src/config/config.schema.ts
var configSchema = object({ 
/**
* You can add automatically a label into a pull request.
* Available matchers are `files` (glob), `branch` (regex), `title` (regex) and `body` (regex).
* Matchers are evaluated independently; the label will be set if at least one of the matchers meets the criteria.
*/
autolabeler: array(object({
	label: string().min(1),
	files: array(string().min(1)).optional().default([]),
	branch: array(string().min(1)).optional().default([]),
	title: array(string().min(1)).optional().default([]),
	body: array(string().min(1)).optional().default([])
})).min(1) }).meta({
	title: "JSON schema for Release Drafter's autolabeler action config.",
	id: "https://github.com/release-drafter/release-drafter/blob/main/autolabeler/schema.json"
});
//#endregion
//#region packages/autolabeler/src/util.ts
var import_lib = /* @__PURE__ */ __toESM(require_lib(), 1);
var stringToRegex = (search) => /^\/.+\/[AJUXgimsux]*$/.test(search) ? (0, import_lib.default)(search) : new RegExp(escapeStringRegexp(search), "g");
//#endregion
//#region packages/autolabeler/src/config/parse-config.ts
/** Compiles configured regex matchers while preserving all other config values. */
var parseConfig = (params) => {
	const config = structuredClone(params.config);
	const autolabeler = config.autolabeler.map((rule) => {
		try {
			return {
				...rule,
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
//#endregion
//#region packages/autolabeler/src/match-labels.ts
var import_ignore = /* @__PURE__ */ __toESM(require_ignore(), 1);
var test = (matcher, value) => {
	matcher.lastIndex = 0;
	return matcher.test(value);
};
var matchesFiles = (patterns, files) => {
	if (patterns.length === 0) return false;
	const matcher = (0, import_ignore.default)().add(patterns);
	return files.some((file) => matcher.ignores(file));
};
/** Evaluates configured rules in files, branch, title, and body order. */
var matchLabels = (params) => {
	const { config, pullRequest } = params;
	const labels = /* @__PURE__ */ new Set();
	const matches = [];
	for (const rule of config.autolabeler) {
		const body = pullRequest.body;
		let matcher;
		if (matchesFiles(rule.files, pullRequest.files)) matcher = "files";
		else if (rule.branch.some((regex) => test(regex, pullRequest.branch))) matcher = "branch";
		else if (rule.title.some((regex) => test(regex, pullRequest.title))) matcher = "title";
		else if (body != null && rule.body.some((regex) => test(regex, body))) matcher = "body";
		if (matcher) {
			labels.add(rule.label);
			matches.push({
				label: rule.label,
				matcher
			});
		}
	}
	return {
		labels: [...labels],
		matches
	};
};
//#endregion
//#region packages/gh-actions/src/autolabeler/action-input.schema.ts
var actionInputSchema = object({ "config-name": string().optional().default("release-drafter.yml") }).and(sharedInputSchema);
//#endregion
//#region packages/gh-actions/src/autolabeler/get-action-inputs.ts
var getActionInput = () => {
	const getInput$1 = (name) => getInput(name) || void 0;
	return actionInputSchema.parse({
		"config-name": getInput$1("config-name"),
		token: getInput$1("token"),
		"dry-run": getInput$1("dry-run")
	});
};
//#endregion
//#region packages/gh-actions/src/autolabeler/get-config.ts
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
//#endregion
//#region packages/gh-actions/src/autolabeler/runner.ts
/** Run the Autolabeler Action using package-owned config and matching logic. */
async function run() {
	try {
		const input = getActionInput();
		const config = await getConfig(input["config-name"], input.token);
		info(`Running for event "${context.eventName || "[undefined]"}.${context.payload.action || "[undefined]"}"`);
		if (context.eventName !== "pull_request" && context.eventName !== "pull_request_target") throw new Error(`Event type is wrong. Expected 'pull_request' or 'pull_request_target', received '${context.eventName}'`);
		const adapter = getGitHubAdapter(input.token);
		const payload = context.payload;
		const result = matchLabels({
			config,
			pullRequest: {
				files: await adapter.findPullRequestChangedFiles({
					repository: {
						owner: context.repo.owner,
						name: context.repo.repo,
						serverUrl: process.env.GITHUB_SERVER_URL ?? "https://github.com"
					},
					number: payload.number
				}),
				branch: payload.pull_request.head.ref,
				title: payload.pull_request.title,
				body: payload.pull_request.body
			}
		});
		for (const match of result.matches) info(`Found label for ${match.matcher}: '${match.label}'`);
		if (result.labels.length > 0) if (input["dry-run"]) info(`[dry-run] Would add labels [${result.labels.join(", ")}] to PR #${payload.number}`);
		else await adapter.octokit.rest.issues.addLabels({
			...context.repo,
			issue_number: payload.number,
			labels: result.labels
		});
		setOutput("number", payload.number.toString());
		if (result.labels.length > 0) setOutput("labels", result.labels.join(","));
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
	}
}
//#endregion
//#region packages/gh-actions/src/autolabeler/run.ts
/*! release-drafter-action-entry:autolabeler */
/* node:coverage ignore file -- @preserve */
await run();
//#endregion
export {};
