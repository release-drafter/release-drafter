import { A as setFailed, T as context, k as info, w as getOctokit } from "../../chunks/ignore.js";
import { a as getActionInput, i as getConfig, n as setActionOutput, r as mergeInputAndConfig, t as main } from "../../chunks/main.js";
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
