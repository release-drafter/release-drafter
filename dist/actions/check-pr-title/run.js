import { C as context, D as setFailed, E as info, T as getInput, _ as string, a as getGitHubAdapter, b as evaluateCategories, c as mergeInputAndConfig, g as object, h as number, i as actionLogger, m as array, o as getRepository, p as _enum, r as tokenInputSchema, x as needsPullRequestChangedFiles, y as union } from "../../chunks/config.js";
import { t as getReleaseDrafterConfig } from "../../chunks/get-release-drafter-config.js";
//#region packages/gh-actions/src/check-pr-title/evaluate-title.ts
/** Keep only title-aware release categories while retaining their correlated predicates. */
var projectConventionalCategories = (categories) => categories.flatMap((category) => {
	if (category.type !== "changelog" && category.type !== "version-resolver") return [];
	if (category.when.length === 0) return [category];
	const when = category.when.filter((condition) => condition.conventional !== void 0);
	return when.length > 0 ? [{
		...category,
		when
	}] : [];
});
/** Keep every pre-category and only title-aware release categories. */
var projectTitleCategories = (categories) => [...categories.filter((category) => category.type === "pre-include" || category.type === "pre-exclude"), ...projectConventionalCategories(categories)];
/** Detect exclusions that can be decided without querying changed files. */
var canSkipWithoutChangedFiles = (pullRequest, categories) => {
	const preCategories = categories.filter((category) => category.type === "pre-include" || category.type === "pre-exclude");
	return !needsPullRequestChangedFiles(preCategories) && !evaluateCategories(pullRequest, preCategories).included;
};
/** Evaluate whether a PR's current title selects a non-fallback release category. */
var evaluatePullRequestTitle = (pullRequest, categories) => {
	const evaluation = evaluateCategories(pullRequest, projectTitleCategories(categories));
	if (!evaluation.included) return {
		valid: true,
		skipped: true
	};
	const selectedCount = evaluation.changelogCategories.length + evaluation.versionResolverCategories.length;
	return {
		valid: selectedCount > 0 && !evaluation.fallbackOnly,
		skipped: false,
		selectedCategoryCount: selectedCount
	};
};
//#endregion
//#region packages/gh-actions/src/check-pr-title/event.ts
var supportedPullRequestActions = [
	"opened",
	"edited",
	"synchronize",
	"reopened",
	"labeled",
	"unlabeled",
	"ready_for_review"
];
var labelSchema = union([string(), object({ name: string() })]);
var pullRequestEventSchema = object({
	action: _enum(supportedPullRequestActions),
	number: number().int().positive(),
	pull_request: object({
		title: string().min(1),
		labels: array(labelSchema),
		base: object({ ref: string().min(1) })
	})
});
/** Validate and normalize the current pull request webhook payload. */
var parsePullRequestEvent = (eventName, payload) => {
	if (eventName !== "pull_request" && eventName !== "pull_request_target") throw new Error(`Unsupported event '${eventName || "[undefined]"}'. Expected 'pull_request' or 'pull_request_target'.`);
	const result = pullRequestEventSchema.safeParse(payload);
	if (!result.success) {
		const action = typeof payload === "object" && payload !== null && "action" in payload ? String(payload.action) : "[undefined]";
		if (action !== "[undefined]" && !supportedPullRequestActions.includes(action)) throw new Error(`Unsupported pull request action '${action}'. Supported actions: ${supportedPullRequestActions.join(", ")}.`);
		throw new Error(`Malformed pull request event: ${result.error.message}`);
	}
	return {
		number: result.data.number,
		title: result.data.pull_request.title,
		labels: result.data.pull_request.labels.map((label) => typeof label === "string" ? label : label.name),
		baseRef: result.data.pull_request.base.ref
	};
};
//#endregion
//#region packages/gh-actions/src/check-pr-title/action-input.schema.ts
var actionInputSchema = object({ "config-name": string().optional().default("release-drafter.yml") }).and(tokenInputSchema);
//#endregion
//#region packages/gh-actions/src/check-pr-title/get-action-inputs.ts
var getActionInput = () => actionInputSchema.parse({
	"config-name": getInput("config-name") || void 0,
	token: getInput("token") || void 0
});
//#endregion
//#region packages/gh-actions/src/check-pr-title/get-config.ts
var getConfig = async (configName, token) => getReleaseDrafterConfig(configName, context, token);
//#endregion
//#region packages/gh-actions/src/check-pr-title/runner.ts
var defaultDependencies = () => ({
	eventName: context.eventName,
	payload: context.payload,
	getInput: getActionInput,
	getConfig,
	getAdapter: getGitHubAdapter,
	repository: getRepository()
});
/** Check the current pull request title without performing any write operation. */
async function checkPullRequestTitle(dependencies = defaultDependencies()) {
	if (dependencies.eventName !== "pull_request" && dependencies.eventName !== "pull_request_target") throw new Error(`Event type is wrong. Expected 'pull_request' or 'pull_request_target', received '${dependencies.eventName}'`);
	const pullRequest = parsePullRequestEvent(dependencies.eventName, dependencies.payload);
	const input = dependencies.getInput();
	const config = mergeInputAndConfig({
		config: await dependencies.getConfig(input["config-name"], input.token),
		input: {},
		defaultCommitish: pullRequest.baseRef,
		logger: actionLogger
	});
	const pullRequestWithoutFiles = {
		title: pullRequest.title,
		labels: pullRequest.labels
	};
	const titleCategories = projectTitleCategories(config.categories);
	if (canSkipWithoutChangedFiles(pullRequestWithoutFiles, titleCategories)) {
		info(`Skipping excluded pull request #${pullRequest.number}.`);
		return;
	}
	const changedFiles = needsPullRequestChangedFiles(titleCategories) ? await dependencies.getAdapter(input.token).findPullRequestChangedFiles({
		repository: dependencies.repository,
		number: pullRequest.number
	}) : [];
	const evaluation = evaluatePullRequestTitle({
		title: pullRequest.title,
		labels: pullRequest.labels,
		changedFiles
	}, titleCategories);
	if (evaluation.skipped) {
		info(`Skipping excluded pull request #${pullRequest.number}.`);
		return;
	}
	if (!evaluation.valid) throw new Error(`Pull request #${pullRequest.number} title '${pullRequest.title}' does not match any configured conventional changelog or version-resolver category.`);
	info(`Pull request #${pullRequest.number} title matches the configuration.`);
}
async function run() {
	try {
		await checkPullRequestTitle();
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
	}
}
//#endregion
//#region packages/gh-actions/src/check-pr-title/run.ts
/*! release-drafter-action-entry:check-pr-title */
/* node:coverage ignore file -- @preserve */
await run();
//#endregion
export {};
