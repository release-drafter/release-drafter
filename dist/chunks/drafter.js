import { w as getOctokit } from "./ignore.js";
import { i as getConfig, o as actionInputSchema, r as mergeInputAndConfig, t as main } from "./main.js";
//#region src/drafter.ts
var draftRelease = async (options) => {
	const octokit = options.octokit ?? getOctokit(options.token);
	const repository = options.commitish ? void 0 : await octokit.rest.repos.get(options.repo);
	const commitish = options.commitish || repository?.data.default_branch;
	if (!commitish) throw new Error("Unable to resolve the target commitish");
	const github = {
		repo: options.repo,
		ref: commitish,
		serverUrl: options.serverUrl ?? "https://github.com",
		octokit
	};
	const input = actionInputSchema.parse({
		"config-name": options.configName,
		version: options.version,
		publish: options.publish?.toString(),
		prerelease: options.prerelease?.toString(),
		latest: options.latest?.toString(),
		token: options.token,
		"dry-run": options.dryRun,
		commitish
	});
	return main({
		config: mergeInputAndConfig({
			config: await getConfig(input["config-name"], github),
			input,
			ref: github.ref
		}),
		input,
		previousCommitish: options.previousCommitish,
		github
	});
};
//#endregion
export { draftRelease as t };
