import { A as warning, C as stringbool, D as info, E as getInput, O as setFailed, S as string, T as debug, _ as needsPullRequestChangedFiles, a as composeConfigGet, c as buildReleasePayload$1, d as escapeStringRegexp, f as coerce, g as commonConfigSchema, h as configSchema, i as getOctokit, k as setOutput, l as mergeInputAndConfig$1, m as satisfies, n as parseCommitishForRelease, o as getGitHubAdapter, p as normalizeRange, s as getRepository, t as sharedInputSchema, w as core_exports, x as object, y as context } from "../../chunks/common.js";
//#region node_modules/compare-versions/lib/esm/utils.js
var semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
var validateAndParse = (version) => {
	if (typeof version !== "string") throw new TypeError("Invalid argument expected string");
	const match = version.match(semver);
	if (!match) throw new Error(`Invalid argument not valid semver ('${version}' received)`);
	match.shift();
	return match;
};
var isWildcard = (s) => s === "*" || s === "x" || s === "X";
var tryParse = (v) => {
	const n = parseInt(v, 10);
	return isNaN(n) ? v : n;
};
var forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
var compareStrings = (a, b) => {
	if (isWildcard(a) || isWildcard(b)) return 0;
	const [ap, bp] = forceType(tryParse(a), tryParse(b));
	if (ap > bp) return 1;
	if (ap < bp) return -1;
	return 0;
};
var compareSegments = (a, b) => {
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const r = compareStrings(a[i] || "0", b[i] || "0");
		if (r !== 0) return r;
	}
	return 0;
};
//#endregion
//#region node_modules/compare-versions/lib/esm/compareVersions.js
/**
* Compare [semver](https://semver.org/) version strings to find greater, equal or lesser.
* This library supports the full semver specification, including comparing versions with different number of digits like `1.0.0`, `1.0`, `1`, and pre-release versions like `1.0.0-alpha`.
* @param v1 - First version to compare
* @param v2 - Second version to compare
* @returns Numeric value compatible with the [Array.sort(fn) interface](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
*/
var compareVersions = (v1, v2) => {
	const n1 = validateAndParse(v1);
	const n2 = validateAndParse(v2);
	const p1 = n1.pop();
	const p2 = n2.pop();
	const r = compareSegments(n1, n2);
	if (r !== 0) return r;
	if (p1 && p2) return compareSegments(p1.split("."), p2.split("."));
	else if (p1 || p2) return p1 ? -1 : 1;
	return 0;
};
var actionInputSchema = object({
	/**
	* If your workflow requires multiple release-drafter configs it be helpful to override the config-name.
	* The config should still be located inside `.github` as that's where we are looking for config files.
	* @default 'release-drafter.yml'
	*/
	"config-name": string().optional().default("release-drafter.yml"),
	/**
	* The name that will be used in the GitHub release that's created or updated.
	* This will override any `name-template` specified in your `release-drafter.yml` if defined.
	*/
	name: string().optional(),
	/**
	* The tag name to be associated with the GitHub release that's created or updated.
	* This will override any `tag-template` specified in your `release-drafter.yml` if defined.
	*/
	tag: string().optional(),
	/**
	* The version to be associated with the GitHub release that's created or updated.
	* This will override any version calculated by the release-drafter.
	*/
	version: string().optional(),
	/**
	* A boolean indicating whether the release being created or updated should be immediately published.
	*/
	publish: stringbool().optional().default(false)
}).and(sharedInputSchema).and(commonConfigSchema);
//#endregion
//#region src/actions/drafter/config/get-action-inputs.ts
var getActionInput = () => {
	const getInput$1 = (name) => getInput(name) || void 0;
	const actionInput = {
		"config-name": getInput$1("config-name"),
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
	return actionInputSchema.parse(actionInput);
};
//#endregion
//#region src/actions/drafter/config/get-config.ts
var getConfig = async (configName) => {
	const { config, contexts } = await composeConfigGet(configName, context);
	contexts.forEach(({ filepath, ref, repo, scheme }) => {
		const remotePath = `${repo.owner}/${repo.repo}/${filepath}${ref ? `@${ref}` : ""}`;
		info(`Config fetched ${scheme === "file" ? `locally from "${filepath}"` : `from "${remotePath}"${ref ? "" : " on the default branch"}`}.`);
	});
	return configSchema.parse(config);
};
//#endregion
//#region src/actions/drafter/config/merge-input-and-config.ts
var mergeInputAndConfig = (params) => mergeInputAndConfig$1({
	...params,
	defaultCommitish: context.ref || context.payload.ref,
	logger: core_exports
});
//#endregion
//#region src/actions/drafter/config/set-action-output.ts
var setActionOutput = (params) => {
	const { releasePayload, upsertedRelease } = params;
	info("Set action outputs...");
	const { resolvedVersion, majorVersion, minorVersion, patchVersion, body, name: releaseName, tag: releaseTagName } = releasePayload;
	const outputName = upsertedRelease?.data.name ?? releaseName;
	const outputTagName = upsertedRelease?.data.tag_name ?? releaseTagName;
	if (upsertedRelease) {
		const { data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl } } = upsertedRelease;
		if (releaseId && Number.isInteger(releaseId)) setOutput("id", releaseId.toString());
		if (htmlUrl) setOutput("html_url", htmlUrl);
		if (uploadUrl) setOutput("upload_url", uploadUrl);
	}
	if (outputTagName) setOutput("tag_name", outputTagName);
	if (outputName) setOutput("name", outputName);
	if (resolvedVersion) setOutput("resolved_version", resolvedVersion);
	if (majorVersion) setOutput("major_version", majorVersion);
	if (minorVersion) setOutput("minor_version", minorVersion);
	if (patchVersion) setOutput("patch_version", patchVersion);
	setOutput("body", body);
	info("Outputs set!");
};
//#endregion
//#region src/actions/drafter/lib/core-compat.ts
var toCorePullRequest = (pullRequest) => ({
	number: pullRequest.number,
	title: pullRequest.title,
	body: pullRequest.body,
	url: pullRequest.url,
	mergedAt: pullRequest.mergedAt,
	baseRefName: pullRequest.baseRefName,
	headRefName: pullRequest.headRefName,
	baseRepository: pullRequest.baseRepository?.nameWithOwner,
	author: pullRequest.author ? {
		login: pullRequest.author.login,
		url: pullRequest.author.url,
		type: pullRequest.author.__typename
	} : pullRequest.author,
	labels: (pullRequest.labels?.nodes ?? []).map((label) => label?.name).filter((name) => Boolean(name)),
	changedFiles: "changedFiles" in pullRequest ? pullRequest.changedFiles : void 0,
	mergeCommitOid: "mergeCommit" in pullRequest && pullRequest.mergeCommit ? pullRequest.mergeCommit.oid : void 0
});
var toCoreCommit = (commit) => ({
	oid: commit.oid,
	author: commit.author ? {
		name: commit.author.name,
		login: commit.author.user?.login
	} : commit.author,
	authors: commit.authors ? (commit.authors.nodes ?? []).map((author) => author ? {
		name: author.name,
		login: author.user?.login
	} : author) : commit.authors,
	associatedPullRequests: commit.associatedPullRequests ? (commit.associatedPullRequests.nodes ?? []).map((pullRequest) => pullRequest ? {
		number: pullRequest.number,
		baseRepository: pullRequest.baseRepository?.nameWithOwner
	} : pullRequest) : commit.associatedPullRequests
});
var toCoreRelease = (release) => ({
	id: release.id ?? "",
	tagName: release.tag_name,
	name: release.name,
	targetCommitish: release.target_commitish,
	createdAt: release.created_at,
	draft: release.draft,
	prerelease: release.prerelease,
	url: release.html_url,
	uploadUrl: release.upload_url
});
var toLegacyReleasePayload = (payload) => {
	const { makeLatest, ...legacyPayload } = payload;
	return {
		...legacyPayload,
		make_latest: makeLatest
	};
};
//#endregion
//#region src/actions/drafter/lib/build-release-payload/build-release-payload.ts
var buildReleasePayload = async (params) => {
	return toLegacyReleasePayload(await buildReleasePayload$1({
		adapter: { resolveCommitish: ({ commitish }) => parseCommitishForRelease(commitish) },
		commits: params.commits.map(toCoreCommit),
		config: params.config,
		input: {
			name: params.input.name,
			tag: params.input.tag,
			version: params.input.version,
			publish: params.input.publish,
			dryRun: params.input["dry-run"]
		},
		lastRelease: params.lastRelease ? toCoreRelease(params.lastRelease) : void 0,
		logger: core_exports,
		newContributorLogins: params.newContributorLogins,
		pullRequests: params.pullRequests.map(toCorePullRequest),
		repository: {
			owner: context.repo.owner,
			name: context.repo.repo,
			serverUrl: context.serverUrl
		}
	}));
};
//#endregion
//#region src/actions/drafter/lib/find-previous-releases/sort-releases.ts
var sortReleases = (params) => {
	const tagPrefixRexExp = params.tagPrefix ? new RegExp(`^${escapeStringRegexp(params.tagPrefix)}`) : void 0;
	return params.releases.sort((r1, r2) => {
		const tag_name_1 = tagPrefixRexExp ? r1.tag_name.replace(tagPrefixRexExp, "") : r1.tag_name;
		const tag_name_2 = tagPrefixRexExp ? r2.tag_name.replace(tagPrefixRexExp, "") : r2.tag_name;
		try {
			return compareVersions(tag_name_1, tag_name_2);
		} catch {
			return new Date(r1.created_at ?? "").getTime() - new Date(r2.created_at ?? "").getTime();
		}
	});
};
//#endregion
//#region src/actions/drafter/lib/find-previous-releases/find-previous-releases.ts
/**
* Lists every release and :
* - filters by commitish if specified
* - filters by tag-prefix if specified
* - filters out pre-releases unless specified
* - extracts the first draft releases (according to return-order of GitHub API)
* - get latest published release according to ./sort-releases.ts implementation
*
* Returns one of (or both) draft release and latest published release
* The last stable release is used to determine the range of commits to include in the changelog,
* and to resolve the next version number.
*
* The draft release is used to determine if we should create a new release or update the existing one.
*/
var findPreviousReleases = async (params) => {
	const { commitish, "filter-by-commitish": filterByCommitish, "tag-prefix": tagPrefix, prerelease: isPreRelease, "include-pre-releases": includePreReleases, "filter-by-range": filterByRange } = params;
	info("Fetching releases from GitHub...");
	const releases = (await getGitHubAdapter(getOctokit()).listReleases({ repository: getRepository() })).map((release) => ({
		tag_name: release.tagName,
		...release.id !== void 0 ? { id: release.id } : {},
		...release.name !== void 0 ? { name: release.name } : {},
		...release.targetCommitish !== void 0 ? { target_commitish: release.targetCommitish } : {},
		...release.createdAt !== void 0 ? { created_at: release.createdAt } : {},
		...release.draft !== void 0 ? { draft: release.draft } : {},
		...release.prerelease !== void 0 ? { prerelease: release.prerelease } : {},
		...release.url !== void 0 ? { html_url: release.url } : {},
		...release.uploadUrl !== void 0 ? { upload_url: release.uploadUrl } : {}
	}));
	info(`Found ${releases.length} releases`);
	const headRefRegex = /^refs\/heads\//;
	const targetCommitishName = commitish.replace(headRefRegex, "");
	const commitishFilteredReleases = filterByCommitish ? releases.filter((r) => targetCommitishName === (r.target_commitish ?? "").replace(headRefRegex, "")) : releases;
	const semverRangeFilteredReleases = filterByRange && filterByRange !== "*" ? commitishFilteredReleases.filter((r) => {
		const parsedRange = normalizeRange(filterByRange);
		if (!parsedRange) return false;
		const parsedVersion = coerce(r.tag_name, { loose: true });
		if (!parsedVersion) {
			warning(`Failed to coerce semver version for "${r.tag_name}" : will be excluded from releases considered for drafting.`);
			return false;
		}
		const doesSatisfy = !!satisfies(parsedVersion, parsedRange, { loose: true });
		debug(`Range "${parsedRange}" ${doesSatisfy ? "satisfies" : "does not satisfy"} version "${parsedVersion}" `);
		return doesSatisfy;
	}) : commitishFilteredReleases;
	const filteredReleases = tagPrefix ? semverRangeFilteredReleases.filter((r) => r.tag_name.startsWith(tagPrefix)) : semverRangeFilteredReleases;
	let publishedReleases = filteredReleases.filter((r) => !r.draft);
	let draftReleases = filteredReleases.filter((r) => r.draft);
	publishedReleases = publishedReleases.filter((publishedRelease) => isPreRelease || includePreReleases ? publishedRelease.prerelease || !publishedRelease.prerelease : !publishedRelease.prerelease);
	draftReleases = draftReleases.filter((draftRelease) => isPreRelease ? draftRelease.prerelease : !draftRelease.prerelease);
	const draftRelease = draftReleases[0];
	const lastRelease = sortReleases({
		releases: publishedReleases,
		tagPrefix
	})?.at(-1);
	if (draftRelease) {
		if (draftReleases.length > 1) {
			warning(`Multiple draft releases found : ${draftReleases.map((r) => r.tag_name).join(", ")}`);
			warning(`Using the first one returned by GitHub API: ${draftRelease.tag_name}`);
		}
		info(`Draft release${isPreRelease ? " (which is a prerelease)" : ""}:`);
		info(`  tag_name:  ${draftRelease.tag_name}`);
		info(`  name:      ${draftRelease.name}`);
	} else info(`No draft release found${isPreRelease ? " (among prerelease drafts)" : ""}`);
	if (lastRelease) {
		info(`Last release${isPreRelease ? " (including prerelease)" : ""}:`);
		info(`  tag_name:  ${lastRelease.tag_name}`);
		info(`  name:      ${lastRelease.name}`);
	} else warning(`No published release found${isPreRelease ? " (including prerelease)" : ""}`);
	return {
		draftRelease,
		lastRelease
	};
};
//#endregion
//#region src/actions/drafter/lib/find-pull-requests/find-pull-requests.ts
var findPullRequests = async (params) => {
	if (!params.lastRelease?.tag_name) {
		warning("A previous (published) release is required to find changes");
		return {
			commits: [],
			newContributorLogins: /* @__PURE__ */ new Set(),
			pullRequests: []
		};
	}
	const baseRef = `refs/tags/${params.lastRelease.tag_name}`;
	info(`Finding commits between ${baseRef} and ${params.config.commitish}...`);
	const changes = await getGitHubAdapter(getOctokit()).findChanges({
		repository: getRepository(),
		comparison: {
			baseRef,
			headRef: params.config.commitish
		},
		pullRequestFields: {
			body: params.config["change-template"].includes("$BODY"),
			url: params.config["change-template"].includes("$URL"),
			baseRefName: params.config["change-template"].includes("$BASE_REF_NAME"),
			headRefName: params.config["change-template"].includes("$HEAD_REF_NAME")
		},
		pullRequestLimit: params.config["pull-request-limit"],
		historyLimit: params.config["history-limit"],
		includeChangedFiles: needsPullRequestChangedFiles(params.config.categories),
		includeNewContributors: [
			params.config.header,
			params.config.template,
			params.config.footer
		].some((template) => template?.includes("$NEW_CONTRIBUTORS"))
	});
	info(`Found ${changes.commits.length} commits.`);
	info(`Found ${changes.pullRequests.length} merged pull requests targeting ${context.repo.owner}/${context.repo.repo}${changes.pullRequests.length > 0 ? `: ${changes.pullRequests.map((pullRequest) => `#${pullRequest.number}`).join(", ")}` : "."}`);
	const rawPullRequests = changes.pullRequests.map((pullRequest) => ({
		__typename: "PullRequest",
		title: pullRequest.title,
		number: pullRequest.number,
		url: pullRequest.url,
		body: pullRequest.body,
		author: pullRequest.author ? {
			__typename: pullRequest.author.type,
			login: pullRequest.author.login,
			url: pullRequest.author.url
		} : pullRequest.author,
		baseRepository: pullRequest.baseRepository ? {
			__typename: "Repository",
			nameWithOwner: pullRequest.baseRepository
		} : null,
		mergedAt: pullRequest.mergedAt,
		isCrossRepository: pullRequest.isCrossRepository ?? false,
		labels: {
			__typename: "LabelConnection",
			nodes: (pullRequest.labels ?? []).map((name) => ({
				__typename: "Label",
				name
			}))
		},
		merged: true,
		baseRefName: pullRequest.baseRefName,
		headRefName: pullRequest.headRefName,
		...pullRequest.mergeCommitOid ? { mergeCommit: {
			__typename: "Commit",
			oid: pullRequest.mergeCommitOid
		} } : {},
		...pullRequest.changedFiles ? { changedFiles: pullRequest.changedFiles } : {}
	}));
	const pullRequestsByKey = new Map(rawPullRequests.map((pullRequest) => [`${pullRequest.baseRepository?.nameWithOwner}#${pullRequest.number}`, pullRequest]));
	return {
		commits: changes.commits.map((commit) => ({
			__typename: "Commit",
			id: commit.id,
			oid: commit.oid,
			committedDate: commit.committedAt,
			message: commit.message,
			author: commit.author ? {
				__typename: "GitActor",
				name: commit.author.name,
				user: commit.author.login ? {
					__typename: "User",
					login: commit.author.login
				} : null
			} : commit.author,
			authors: commit.authors ? {
				__typename: "GitActorConnection",
				nodes: commit.authors.map((author) => author ? {
					__typename: "GitActor",
					name: author.name,
					user: author.login ? {
						__typename: "User",
						login: author.login
					} : null
				} : author)
			} : commit.authors,
			associatedPullRequests: commit.associatedPullRequests ? {
				__typename: "PullRequestConnection",
				nodes: commit.associatedPullRequests.map((pullRequest) => pullRequest ? pullRequestsByKey.get(`${pullRequest.baseRepository}#${pullRequest.number}`) ?? {
					number: pullRequest.number,
					baseRepository: pullRequest.baseRepository ? {
						__typename: "Repository",
						nameWithOwner: pullRequest.baseRepository
					} : null
				} : pullRequest)
			} : commit.associatedPullRequests
		})),
		newContributorLogins: changes.newContributorLogins,
		pullRequests: rawPullRequests
	};
};
//#endregion
//#region src/actions/drafter/lib/upsert-release/create-release.ts
var createRelease = async (params) => {
	const { releasePayload } = params;
	const release = await getGitHubAdapter(getOctokit()).createRelease({
		repository: getRepository(),
		payload: {
			...releasePayload,
			makeLatest: releasePayload.make_latest
		}
	});
	return { data: {
		id: release.id,
		tag_name: release.tagName,
		name: release.name ?? null,
		target_commitish: release.targetCommitish ?? "",
		created_at: release.createdAt ?? "",
		draft: release.draft ?? false,
		prerelease: release.prerelease ?? false,
		html_url: release.url ?? "",
		upload_url: release.uploadUrl ?? ""
	} };
};
//#endregion
//#region src/actions/drafter/lib/upsert-release/update-release.ts
var updateRelease = async (params) => {
	const { draftRelease, releasePayload } = params;
	const release = await getGitHubAdapter(getOctokit()).updateRelease({
		repository: getRepository(),
		release: {
			id: draftRelease.id ?? "",
			tagName: draftRelease.tag_name,
			name: draftRelease.name,
			targetCommitish: draftRelease.target_commitish,
			createdAt: draftRelease.created_at,
			draft: draftRelease.draft,
			prerelease: draftRelease.prerelease,
			url: draftRelease.html_url,
			uploadUrl: draftRelease.upload_url
		},
		payload: {
			...releasePayload,
			makeLatest: releasePayload.make_latest
		}
	});
	return { data: {
		id: release.id,
		tag_name: release.tagName,
		name: release.name ?? null,
		target_commitish: release.targetCommitish ?? "",
		created_at: release.createdAt ?? "",
		draft: release.draft ?? false,
		prerelease: release.prerelease ?? false,
		html_url: release.url ?? "",
		upload_url: release.uploadUrl ?? ""
	} };
};
//#endregion
//#region src/actions/drafter/lib/upsert-release/upsert-release.ts
var upsertRelease = async (params) => {
	const { draftRelease, releasePayload, dryRun } = params;
	if (dryRun) {
		if (!draftRelease) info(`[dry-run] Would create a new release with payload: ${JSON.stringify(releasePayload, null, 2)}`);
		else info(`[dry-run] Would update existing release (id: ${draftRelease.id}) with payload: ${JSON.stringify(releasePayload, null, 2)}`);
		return;
	}
	if (!draftRelease) {
		info("Creating new release...");
		const res = await createRelease({ releasePayload });
		info("Release created!");
		return res;
	} else {
		info("Updating existing release...");
		const res = await updateRelease({
			draftRelease,
			releasePayload
		});
		info("Release updated!");
		return res;
	}
};
//#endregion
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
	const { draftRelease, lastRelease } = await findPreviousReleases(config);
	const { commits, newContributorLogins, pullRequests } = await findPullRequests({
		lastRelease,
		config
	});
	const releasePayload = await buildReleasePayload({
		commits,
		config,
		input: effectiveInput,
		lastRelease,
		newContributorLogins,
		pullRequests
	});
	return {
		upsertedRelease: await upsertRelease({
			draftRelease,
			releasePayload,
			dryRun: effectiveInput["dry-run"]
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
		const { upsertedRelease, releasePayload } = await main({
			input,
			config: mergeInputAndConfig({
				config: await getConfig(input["config-name"]),
				input
			})
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
