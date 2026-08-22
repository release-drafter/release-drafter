import { C as setFailed, S as info, _ as union, h as string, i as actionLogger, l as _enum, m as object, p as number, r as tokenInputSchema, u as array, x as getInput, y as context } from "../../chunks/config.js";
import { g as evaluateCategories, n as mergeInputAndConfig, t as getReleaseDrafterConfig } from "../../chunks/get-release-drafter-config.js";
//#region packages/core/src/pull-request-validation.ts
/** Keep title and label predicates while excluding path-only validation. */
var projectPullRequestValidationCategories = (categories) => categories.flatMap((category) => {
	if (category.when.length === 0) return [category];
	const when = category.when.flatMap((condition) => {
		if (condition.conventional === void 0 && condition.labels.length === 0) return [];
		return [{
			...condition,
			paths: []
		}];
	});
	return when.length > 0 ? [{
		...category,
		when
	}] : [];
});
/** Evaluate whether a PR's title or labels select a non-fallback category. */
var evaluatePullRequest = (pullRequest, categories) => {
	const evaluation = evaluateCategories(pullRequest, projectPullRequestValidationCategories(categories));
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
//#region packages/gh-actions/src/check-pr/event.ts
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
//#region packages/gh-actions/src/check-pr/action-input.schema.ts
var actionInputSchema = object({ "config-name": string().optional().default("release-drafter.yml") }).and(tokenInputSchema);
//#endregion
//#region packages/gh-actions/src/check-pr/get-action-inputs.ts
var getActionInput = () => actionInputSchema.parse({
	"config-name": getInput("config-name") || void 0,
	token: getInput("token") || void 0
});
//#endregion
//#region packages/gh-actions/src/check-pr/get-config.ts
var getConfig = async (configName, token) => getReleaseDrafterConfig(configName, context, token);
//#endregion
//#region packages/gh-actions/src/check-pr/runner.ts
var defaultDependencies = () => ({
	eventName: context.eventName,
	payload: context.payload,
	getInput: getActionInput,
	getConfig
});
/** Check the current pull request without performing any write operation. */
async function checkPullRequest(dependencies = defaultDependencies()) {
	if (dependencies.eventName !== "pull_request" && dependencies.eventName !== "pull_request_target") throw new Error(`Event type is wrong. Expected 'pull_request' or 'pull_request_target', received '${dependencies.eventName}'`);
	const pullRequest = parsePullRequestEvent(dependencies.eventName, dependencies.payload);
	const input = dependencies.getInput();
	const config = mergeInputAndConfig({
		config: await dependencies.getConfig(input["config-name"], input.token),
		input: {},
		defaultCommitish: pullRequest.baseRef,
		logger: actionLogger
	});
	const evaluation = evaluatePullRequest({
		title: pullRequest.title,
		labels: pullRequest.labels
	}, config.categories);
	if (evaluation.skipped) {
		info(`Skipping excluded pull request #${pullRequest.number}.`);
		return;
	}
	if (!evaluation.valid) throw new Error(`Pull request #${pullRequest.number} does not match any configured conventional or label-based changelog or version-resolver category.`);
	info(`Pull request #${pullRequest.number} matches the configuration.`);
}
async function run() {
	try {
		await checkPullRequest();
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
	}
}
//#endregion
//#region packages/gh-actions/src/check-pr/run.ts
/*! release-drafter-action-entry:check-pr */
/* node:coverage ignore file -- @preserve */
await run();
//#endregion
export {};
