import { A as setFailed, C as union, E as context, O as error, a as tokenInputSchema, b as object, c as writeActionOutputs, g as array, h as _enum, k as info, l as actionLogger, o as defineActionInputNames, r as ConfigError, s as readActionInputs, x as string, y as number } from "../../chunks/config.js";
import { b as matchesCategoryCondition, g as evaluateCategories, n as mergeInputAndConfig, t as getReleaseDrafterConfig } from "../../chunks/get-release-drafter-config.js";
//#region packages/core/src/pull-request-validation.ts
/** Remove path predicates and conditions that contain only path predicates. */
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
/** Evaluate whether a pull request's title or labels select a non-fallback category. */
var evaluatePullRequest = (pullRequest, categories) => {
	const evaluation = evaluateCategories(pullRequest, projectPullRequestValidationCategories(categories));
	if (!evaluation.included) return {
		valid: true,
		skipped: true,
		labels: evaluation.matchedLabels
	};
	const selectedCount = evaluation.changelogCategories.length + evaluation.versionResolverCategories.length;
	return {
		labels: evaluation.matchedLabels,
		valid: selectedCount > 0 && !evaluation.fallbackOnly,
		skipped: false,
		selectedCategoryCount: selectedCount
	};
};
//#endregion
//#region packages/gh-actions/src/check-pr/action-metadata.ts
var actionInputNames = defineActionInputNames()(["config-name", "token"]);
var actionOutputNames = ["labels"];
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
var getActionInput = () => actionInputSchema.parse(readActionInputs(actionInputNames));
//#endregion
//#region packages/gh-actions/src/check-pr/get-config.ts
var getConfig = async (configName, token, ref = context.ref) => getReleaseDrafterConfig(configName, {
	ref,
	repo: context.repo
}, token);
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
	if (dependencies.eventName !== "pull_request" && dependencies.eventName !== "pull_request_target") throw new Error(`Unsupported event \`${dependencies.eventName}\`. Expected \`pull_request\` or \`pull_request_target\`.`);
	const pullRequest = parsePullRequestEvent(dependencies.eventName, dependencies.payload);
	const input = dependencies.getInput();
	const snapshots = [{
		name: "Base configuration",
		ref: pullRequest.baseRef
	}, {
		name: "Proposed configuration",
		ref: `refs/pull/${pullRequest.number}/head`
	}];
	const failures = [];
	const evaluations = [];
	for (const snapshot of snapshots) {
		info(`${snapshot.name}: loading ${input["config-name"]} (repository ref: ${snapshot.ref}).`);
		try {
			const config = mergeInputAndConfig({
				config: await dependencies.getConfig(input["config-name"], input.token, snapshot.ref),
				input: {},
				defaultCommitish: pullRequest.baseRef,
				logger: actionLogger
			});
			const evaluation = evaluatePullRequest(pullRequest, config.categories);
			evaluations.push(evaluation);
			if (!evaluation.valid) {
				logMatchingRules(pullRequest, config.categories);
				throw new Error(`No configured changelog or version-resolver category matches the title or labels of pull request #${pullRequest.number}. Path-only conditions and fallback categories cannot pass Check PR.`);
			}
			info(evaluation.skipped ? `${snapshot.name}: skipping excluded pull request #${pullRequest.number}.` : `${snapshot.name}: pull request #${pullRequest.number} matches the configuration.`);
		} catch (error$1) {
			const message = `${snapshot.name} (${snapshot.ref}): ${error$1 instanceof Error ? error$1.message : String(error$1)}`;
			failures.push(message);
			error(message, {
				...error$1 instanceof ConfigError ? error$1.annotation(context.repo, snapshots[1].ref) : {},
				title: `${snapshot.name}: Check PR failed`
			});
		}
	}
	if (evaluations.length === snapshots.length) writeActionOutputs(actionOutputNames, { labels: JSON.stringify(evaluations[0].labels) });
	if (failures.length > 0) throw new Error(failures.join("\n"));
}
var logMatchingRules = (pullRequest, categories) => {
	info(`PR title: ${JSON.stringify(pullRequest.title)}`);
	info(`PR labels: ${JSON.stringify(pullRequest.labels)}`);
	categories.forEach((category, index) => {
		const name = "title" in category ? category.title : void 0;
		info(`Category ${index + 1}${name ? ` (${JSON.stringify(name)})` : ""}, type ${category.type}: ${JSON.stringify(category.when)}`);
		if (category.when.length === 0) info("Fallback category: cannot satisfy Check PR on its own.");
		category.when.forEach((condition, conditionIndex) => {
			if (!condition.conventional && condition.labels.length === 0) {
				info(`Condition ${conditionIndex + 1}: ignored (path-only).`);
				return;
			}
			const titleMatches = matchesCategoryCondition({
				...condition,
				paths: [],
				labels: []
			}, pullRequest);
			const labelsMatch = matchesCategoryCondition({
				...condition,
				paths: [],
				conventional: void 0
			}, pullRequest);
			info(`Condition ${conditionIndex + 1}: title ${titleMatches ? "matches" : "does not match"}, labels ${labelsMatch ? "match" : "do not match"}. Path predicates are ignored.`);
		});
	});
};
async function run() {
	try {
		await checkPullRequest();
	} catch (error) {
		setFailed(error instanceof Error ? error.message : String(error));
	}
}
//#endregion
//#region packages/gh-actions/src/check-pr/run.ts
/*! release-drafter-action-entry:check-pr */
/* node:coverage ignore file -- @preserve */
await run();
//#endregion
export {};
