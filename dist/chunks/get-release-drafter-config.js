import { E as info, d as configSchema, t as composeConfigGet } from "./config.js";
//#region packages/gh-actions/src/common/config/get-release-drafter-config.ts
/** Load and validate the standard Release Drafter configuration. */
var getReleaseDrafterConfig = async (configName, currentContext, token) => {
	const { config, contexts } = await composeConfigGet(configName, currentContext, token);
	contexts.forEach(({ filepath, ref, repo, scheme }) => {
		const remotePath = `${repo.owner}/${repo.repo}/${filepath}${ref ? `@${ref}` : ""}`;
		info(`Config fetched ${scheme === "file" ? `locally from "${filepath}"` : `from "${remotePath}"${ref ? "" : " on the default branch"}`}.`);
	});
	return configSchema.parse(config);
};
//#endregion
export { getReleaseDrafterConfig as t };
