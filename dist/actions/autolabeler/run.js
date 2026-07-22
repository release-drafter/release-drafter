import { i as __toESM } from "../../chunks/rolldown-runtime.js";
import { D as setOutput, E as setFailed, O as warning, T as info, b as string, c as getPullRequestChangedFiles, d as composeConfigGet, f as getOctokit, g as array, i as sharedInputSchema, n as stringToRegex, p as context, t as require_ignore, w as getInput, y as object } from "../../chunks/ignore.js";
//#region src/actions/autolabeler/config/action-input.schema.ts
var actionInputSchema = object({ 
/**
* If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
* The config should still be located inside `.github` as that's where we are looking for config files.
* @default 'release-drafter.yml'
*/
"config-name": string().optional().default("release-drafter.yml") }).and(sharedInputSchema);
//#endregion
//#region src/actions/autolabeler/config/config.schema.ts
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
var import_ignore = /* @__PURE__ */ __toESM(require_ignore(), 1);
var main = async (params) => {
	info(`Running for event "${context.eventName || "[undefined]"}.${context.payload.action || "[undefined]"}"`);
	if (context.eventName !== "pull_request" && context.eventName !== "pull_request_target") throw new Error(`Event type is wrong. Expected 'pull_request' or 'pull_request_target', received '${context.eventName}'`);
	const octokit = getOctokit();
	/**
	* @see https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request
	*/
	const payload = context.payload;
	const changedFiles = await getPullRequestChangedFiles(octokit, {
		...context.repo,
		pull_number: payload.number
	});
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
