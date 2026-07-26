import { A as setFailed, M as warning, T as context, k as info, w as getOctokit } from "../../chunks/ignore.js";
import { a as setActionOutput, c as getActionInput, i as buildReleasePayload, n as findPullRequests, o as mergeInputAndConfig, r as findPreviousReleases, s as getConfig, t as upsertRelease } from "../../chunks/lib.js";
//#region src/actions/drafter/main.ts
var main = async (params) => {
	/**
	* 1. find previous releases - returns latest release
	* 2. find commits since latest release, with their associated pull-requests
	* 3. sort those pull-requests according to the desired config (for release-body)
	* 4. generate release info
	* 5. create a release (may be a draft) or update previous draft
	* 6. set action outputs
	*/
	const { config, input } = params;
	const isPullRequestMergeRef = /^refs\/pull\/\d+\/merge$/.test(config.commitish);
	const effectiveInput = isPullRequestMergeRef ? {
		...input,
		"dry-run": true,
		publish: false
	} : input;
	if (isPullRequestMergeRef && !input["dry-run"]) warning(`${config.commitish} points to an ephemeral pull request merge commit; forcing dry-run mode and disabling publish. Set dry-run: true explicitly to suppress this warning.`);
	const { draftRelease, lastRelease } = await findPreviousReleases({
		...config,
		github: params.github
	});
	const { commits, newContributorLogins, pullRequests } = await findPullRequests({
		lastRelease,
		config,
		github: params.github
	});
	const releasePayload = await buildReleasePayload({
		commits,
		config,
		input: effectiveInput,
		lastRelease,
		newContributorLogins,
		pullRequests,
		github: params.github
	});
	return {
		upsertedRelease: await upsertRelease({
			draftRelease,
			releasePayload,
			dryRun: effectiveInput["dry-run"],
			github: params.github
		}),
		releasePayload
	};
};
//#endregion
//#region src/actions/drafter/runner.ts
/**
* The main function for the action.
*
* @returns Resolves when the action is complete.
*/
async function run() {
	try {
		info("Parsing inputs and configuration...");
		const input = getActionInput();
		const github = {
			repo: context.repo,
			ref: context.ref || context.payload.ref,
			serverUrl: context.serverUrl,
			octokit: getOctokit(input.token)
		};
		const { upsertedRelease, releasePayload } = await main({
			input,
			config: mergeInputAndConfig({
				config: await getConfig(input["config-name"], github),
				input,
				ref: github.ref
			}),
			github
		});
		setActionOutput({
			upsertedRelease,
			releasePayload
		});
	} catch (error) {
		if (error instanceof Error) setFailed(error.message);
	}
}
//#endregion
//#region src/actions/drafter/run.ts
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
