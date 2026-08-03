import { C as context, D as setFailed, E as info, O as setOutput, T as getInput, _ as string, a as getGitHubAdapter, c as mergeInputAndConfig, f as commonConfigSchema, g as object, i as actionLogger, n as sharedInputSchema, o as getRepository, s as draftRelease, v as stringbool } from "../../chunks/config.js";
import { t as getReleaseDrafterConfig } from "../../chunks/get-release-drafter-config.js";
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
//#region packages/gh-actions/src/drafter/get-action-inputs.ts
var getActionInput = () => {
	const getInput$1 = (name) => getInput(name) || void 0;
	const input = {
		"config-name": getInput$1("config-name"),
		from: getInput$1("from"),
		name: getInput$1("name"),
		tag: getInput$1("tag"),
		version: getInput$1("version"),
		publish: getInput$1("publish"),
		token: getInput$1("token"),
		latest: getInput$1("latest"),
		prerelease: getInput$1("prerelease"),
		"prerelease-identifier": getInput$1("prerelease-identifier"),
		"include-pre-releases": getInput$1("include-pre-releases"),
		commitish: getInput$1("commitish"),
		header: getInput$1("header"),
		footer: getInput$1("footer"),
		"dry-run": getInput$1("dry-run"),
		"filter-by-range": getInput$1("filter-by-range")
	};
	return actionInputSchema.parse(input);
};
//#endregion
//#region packages/gh-actions/src/drafter/get-config.ts
var getConfig = async (configName, token) => {
	return getReleaseDrafterConfig(configName, context, token);
};
//#endregion
//#region packages/gh-actions/src/drafter/set-action-output.ts
/** Preserve the complete historical Drafter Action output contract. */
var setActionOutput = ({ release, releasePayload }) => {
	info("Set action outputs...");
	const outputName = release?.name ?? releasePayload.name;
	const outputTagName = release?.tagName ?? releasePayload.tag;
	if (release) {
		if (release.id && Number.isInteger(release.id)) setOutput("id", release.id.toString());
		if (release.url) setOutput("html_url", release.url);
		if (release.uploadUrl) setOutput("upload_url", release.uploadUrl);
	}
	if (outputTagName) setOutput("tag_name", outputTagName);
	if (outputName) setOutput("name", outputName);
	if (releasePayload.resolvedVersion) setOutput("resolved_version", releasePayload.resolvedVersion);
	if (releasePayload.majorVersion) setOutput("major_version", releasePayload.majorVersion);
	if (releasePayload.minorVersion) setOutput("minor_version", releasePayload.minorVersion);
	if (releasePayload.patchVersion) setOutput("patch_version", releasePayload.patchVersion);
	setOutput("body", releasePayload.body);
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
