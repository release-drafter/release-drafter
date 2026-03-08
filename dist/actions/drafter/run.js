import { C as __commonJSMin, S as warning, _ as error, a as number, b as setFailed, c as stringbool, d as stringToRegex, f as escapeStringRegexp, g as debug$3, h as context, i as boolean, l as datetime, m as getOctokit, n as _enum, o as object, p as composeConfigGet, r as array, s as string, t as sharedInputSchema, u as paginateGraphql, v as getInput, w as __toESM, x as setOutput, y as info } from "../../chunks/common.js";
function compareVersions(v1, v2) {
	const n1 = validateAndParse(v1);
	const n2 = validateAndParse(v2);
	const p1 = n1.pop();
	const p2 = n2.pop();
	const r = compareSegments(n1, n2);
	if (r !== 0) return r;
	if (p1 && p2) return compareSegments(p1.split("."), p2.split("."));
	else if (p1 || p2) return p1 ? -1 : 1;
	return 0;
}
const validate = (v) => typeof v === "string" && /^[v\d]/.test(v) && semver.test(v);
const compare = (v1, v2, operator) => {
	assertValidOperator(operator);
	const res = compareVersions(v1, v2);
	return operatorResMap[operator].includes(res);
};
const satisfies = (v, r) => {
	const m = r.match(/^([<>=~^]+)/);
	const op = m ? m[1] : "=";
	if (op !== "^" && op !== "~") return compare(v, r, op);
	const [v1, v2, v3] = validateAndParse(v);
	const [r1, r2, r3] = validateAndParse(r);
	if (compareStrings(v1, r1) !== 0) return false;
	if (op === "^") return compareSegments([v2, v3], [r2, r3]) >= 0;
	if (compareStrings(v2, r2) !== 0) return false;
	return compareStrings(v3, r3) >= 0;
};
compareVersions.validate = validate;
compareVersions.compare = compare;
compareVersions.sastisfies = satisfies;
var semver = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
var validateAndParse = (v) => {
	if (typeof v !== "string") throw new TypeError("Invalid argument expected string");
	const match = v.match(semver);
	if (!match) throw new Error(`Invalid argument not valid semver ('${v}' received)`);
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
		const r = compareStrings(a[i] || 0, b[i] || 0);
		if (r !== 0) return r;
	}
	return 0;
};
var operatorResMap = {
	">": [1],
	">=": [0, 1],
	"=": [0],
	"<=": [-1, 0],
	"<": [-1]
};
var allowedOperators = Object.keys(operatorResMap);
var assertValidOperator = (op) => {
	if (typeof op !== "string") throw new TypeError(`Invalid operator type, expected string but got ${typeof op}`);
	if (allowedOperators.indexOf(op) === -1) throw new Error(`Invalid operator, expected one of ${allowedOperators.join("|")}`);
};
const sortReleases = (params) => {
	const tagPrefixRexExp = params.tagPrefix ? /* @__PURE__ */ new RegExp(`^${escapeStringRegexp(params.tagPrefix)}`) : void 0;
	return params.releases.sort((r1, r2) => {
		const tag_name_1 = tagPrefixRexExp ? r1.tag_name.replace(tagPrefixRexExp, "") : r1.tag_name;
		const tag_name_2 = tagPrefixRexExp ? r2.tag_name.replace(tagPrefixRexExp, "") : r2.tag_name;
		try {
			return compareVersions(tag_name_1, tag_name_2);
		} catch {
			return new Date(r1.created_at).getTime() - new Date(r2.created_at).getTime();
		}
	});
};
var RELEASE_COUNT_LIMIT = 1e3;
const findPreviousReleases = async (params) => {
	const { commitish, "filter-by-commitish": filterByCommitish, "tag-prefix": tagPrefix, prerelease: isPreRelease } = params;
	const octokit = getOctokit();
	info("Fetching releases from GitHub...");
	let releaseCount = 0;
	const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
		...context.repo,
		per_page: 100
	}, (response, done) => {
		releaseCount += response.data.length;
		if (releaseCount >= RELEASE_COUNT_LIMIT) done();
		return response.data;
	});
	info(`Found ${releases.length} releases`);
	const headRefRegex = /^refs\/heads\//;
	const targetCommitishName = commitish.replace(headRefRegex, "");
	const commitishFilteredReleases = filterByCommitish ? releases.filter((r) => targetCommitishName === r.target_commitish.replace(headRefRegex, "")) : releases;
	const filteredReleases = tagPrefix ? commitishFilteredReleases.filter((r) => r.tag_name.startsWith(tagPrefix)) : commitishFilteredReleases;
	let publishedReleases = filteredReleases.filter((r) => !r.draft);
	let draftReleases = filteredReleases.filter((r) => r.draft);
	publishedReleases = publishedReleases.filter((publishedRelease) => isPreRelease ? publishedRelease.prerelease || !publishedRelease.prerelease : !publishedRelease.prerelease);
	draftReleases = draftReleases.filter((draftRelease$1) => isPreRelease ? draftRelease$1.prerelease : !draftRelease$1.prerelease);
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
	} else info(`No last release found${isPreRelease ? " (including prerelease)" : ""}`);
	return {
		draftRelease,
		lastRelease
	};
};
var find_commits_with_path_changes_default = "query findCommitsWithPathChangesQuery(\n  $name: String!\n  $owner: String!\n  $targetCommitish: String!\n  $since: GitTimestamp\n  $after: String\n  $path: String\n) {\n  repository(name: $name, owner: $owner) {\n    object(expression: $targetCommitish) {\n      ... on Commit {\n        __typename\n        history(path: $path, since: $since, after: $after) {\n          __typename\n          pageInfo {\n            __typename\n            hasNextPage\n            endCursor\n          }\n          nodes {\n            __typename\n            id\n          }\n        }\n      }\n    }\n  }\n}\n";
const findCommitsWithPathChange = async (paths, params) => {
	const octokit = getOctokit();
	const commitIdsMatchingPaths = {};
	let hasFoundCommits = false;
	for (const path of paths) {
		const data = await paginateGraphql(octokit.graphql, find_commits_with_path_changes_default, {
			...params,
			path
		}, [
			"repository",
			"object",
			"history"
		]);
		if (data.repository?.object?.__typename !== "Commit") throw new Error("Query returned an unexpected result");
		const commits = (data.repository?.object?.history.nodes || []).filter((c) => !!c);
		commitIdsMatchingPaths[path] = commitIdsMatchingPaths[path] || /* @__PURE__ */ new Set([]);
		for (const { id } of commits) {
			hasFoundCommits = true;
			commitIdsMatchingPaths[path].add(id);
		}
	}
	return {
		commitIdsMatchingPaths,
		hasFoundCommits
	};
};
var find_commits_with_pr_default = "query findCommitsWithAssociatedPullRequests(\n  $name: String!\n  $owner: String!\n  $targetCommitish: String!\n  $withPullRequestBody: Boolean!\n  $withPullRequestURL: Boolean!\n  $since: GitTimestamp\n  $after: String\n  $withBaseRefName: Boolean!\n  $withHeadRefName: Boolean!\n  $pullRequestLimit: Int!\n  $historyLimit: Int!\n) {\n  repository(name: $name, owner: $owner) {\n    object(expression: $targetCommitish) {\n      ... on Commit {\n        __typename\n        history(first: $historyLimit, since: $since, after: $after) {\n          __typename\n          totalCount\n          pageInfo {\n            __typename\n            hasNextPage\n            endCursor\n          }\n          nodes {\n            __typename\n            id\n            committedDate\n            message\n            author {\n              __typename\n              name\n              user {\n                __typename\n                login\n              }\n            }\n            associatedPullRequests(first: $pullRequestLimit) {\n              __typename\n              nodes {\n                __typename\n                title\n                number\n                url @include(if: $withPullRequestURL)\n                body @include(if: $withPullRequestBody)\n                author {\n                  __typename\n                  login\n                  url\n                }\n                baseRepository {\n                  __typename\n                  nameWithOwner\n                }\n                mergedAt\n                isCrossRepository\n                labels(first: 100) {\n                  __typename\n                  nodes {\n                    __typename\n                    name\n                  }\n                }\n                merged\n                baseRefName @include(if: $withBaseRefName)\n                headRefName @include(if: $withHeadRefName)\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}\n";
const findCommitsWithPr = async (params) => {
	const data = await paginateGraphql(getOctokit().graphql, find_commits_with_pr_default, params, [
		"repository",
		"object",
		"history"
	]);
	if (data.repository?.object?.__typename !== "Commit") throw new Error("Query returned an unexpected result");
	const commits = (data.repository.object.history.nodes || []).filter((commit) => commit != null);
	if (params.since) return commits.filter((commit) => !!commit?.committedDate && commit.committedDate != params.since);
	else return commits;
};
const findPullRequests = async (params) => {
	const since = params.lastRelease?.created_at || params.config["initial-commits-since"];
	const shouldfilterByChangedPaths = params.config["include-paths"].length > 0;
	let commitIdsMatchingPaths = {};
	if (shouldfilterByChangedPaths) {
		info("Finding commits with path changes...");
		const { commitIdsMatchingPaths: commitIdsMatchingPathsRes, hasFoundCommits } = await findCommitsWithPathChange(params.config["include-paths"], {
			since,
			name: context.repo.repo,
			owner: context.repo.owner,
			targetCommitish: params.config.commitish
		});
		if (!hasFoundCommits) return {
			commits: [],
			pullRequests: []
		};
		commitIdsMatchingPaths = commitIdsMatchingPathsRes;
		Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
			info(`Found ${ids.size} commits with changes to path "${path}"`);
		});
	}
	info(`Fetching parent commits of ${params.config["commitish"]}${since ? ` since ${since}` : ""}...`);
	let commits = await findCommitsWithPr({
		since,
		name: context.repo.repo,
		owner: context.repo.owner,
		targetCommitish: params.config.commitish,
		withPullRequestBody: params.config["change-template"].includes("$BODY"),
		withPullRequestURL: params.config["change-template"].includes("$URL"),
		withBaseRefName: params.config["change-template"].includes("$BASE_REF_NAME"),
		withHeadRefName: params.config["change-template"].includes("$HEAD_REF_NAME"),
		pullRequestLimit: params.config["pull-request-limit"],
		historyLimit: params.config["history-limit"]
	});
	info(`Found ${commits.length} commits.`);
	commits = shouldfilterByChangedPaths ? commits.filter((commit) => params.config["include-paths"].some((path) => commitIdsMatchingPaths[path].has(commit.id))) : commits;
	if (shouldfilterByChangedPaths) info(`After filtering by path changes, ${commits.length} commits remain.`);
	const pullRequestsRaw = [...new Map(commits.flatMap((commit) => commit.associatedPullRequests?.nodes ?? []).filter((pr) => pr != null).map((pr) => [`${pr.baseRepository?.nameWithOwner}#${pr.number}`, pr])).values()];
	const pullRequests = pullRequestsRaw.filter((pr) => pr.baseRepository?.nameWithOwner === `${context.repo.owner}/${context.repo.repo}` && pr.merged);
	info(`Found ${pullRequestsRaw.length} pull requests associated with those commits. ${pullRequests.length} of those are merged and come from ${context.repo.owner}/${context.repo.repo}${pullRequests.length > 0 ? ` : ${pullRequests.map((pr) => `#${pr.number}`).join(", ")}` : "."}`);
	return {
		commits,
		pullRequests
	};
};
const sortPullRequests = (params) => {
	const { pullRequests, config: { "sort-by": sortBy, "sort-direction": sortDirection } } = params;
	const getSortField = sortBy === "title" ? getTitle : getMergedAt;
	const sort = sortDirection === "ascending" ? sortAscending : sortDescending;
	return structuredClone(pullRequests).sort((a, b) => {
		try {
			return sort(getSortField(a), getSortField(b));
		} catch (error$1) {
			warning(`Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`);
			error(error$1);
			return 0;
		}
	});
};
var getTitle = (pr) => pr.title;
var getMergedAt = (pr) => pr.mergedAt;
var sortAscending = (a, b) => {
	if (a == null && b == null) return 0;
	if (a == null) return 1;
	if (b == null) return -1;
	if (a > b) return 1;
	if (a < b) return -1;
	return 0;
};
var sortDescending = (a, b) => {
	if (a == null && b == null) return 0;
	if (a == null) return -1;
	if (b == null) return 1;
	if (a > b) return -1;
	if (a < b) return 1;
	return 0;
};
const renderTemplate = (params) => {
	const { template, object: object$1, replacers } = params;
	let input = template.replace(/(\$[A-Z_]+)/g, (_, k) => {
		let result;
		const isValidKey = (key) => key in object$1 && object$1[key] !== void 0 && object$1[key] !== null;
		if (!isValidKey(k)) result = k;
		else if (typeof object$1[k] === "object") result = renderTemplate({
			template: object$1[k].template,
			object: object$1[k]
		});
		else result = `${object$1[k]}`;
		return result;
	});
	if (replacers) for (const { search, replace } of replacers) input = input.replace(search, replace);
	return input;
};
const categorizePullRequests = (params) => {
	const { pullRequests, config } = params;
	const allCategoryLabels = new Set(config.categories.flatMap((category) => category.labels));
	const uncategorizedPullRequests = [];
	const categorizedPullRequests = [...config.categories].map((category) => {
		return {
			...category,
			pullRequests: []
		};
	});
	const uncategorizedCategoryIndex = config.categories.findIndex((category) => category.labels.length === 0);
	const filterUncategorizedPullRequests = (pullRequest) => {
		const labels = pullRequest.labels?.nodes || [];
		if (labels.length === 0 || !labels.some((label) => !!label?.name && allCategoryLabels.has(label?.name))) {
			if (uncategorizedCategoryIndex === -1) uncategorizedPullRequests.push(pullRequest);
			else categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(pullRequest);
			return false;
		}
		return true;
	};
	const filteredPullRequests = pullRequests.filter(getFilterExcludedPullRequests(config["exclude-labels"])).filter(getFilterIncludedPullRequests(config["include-labels"])).filter((pullRequest) => filterUncategorizedPullRequests(pullRequest));
	for (const category of categorizedPullRequests) for (const pullRequest of filteredPullRequests) if ((pullRequest.labels?.nodes || []).some((label) => !!label?.name && category.labels.includes(label.name))) category.pullRequests.push(pullRequest);
	return [uncategorizedPullRequests, categorizedPullRequests];
};
const getFilterExcludedPullRequests = (excludeLabels) => {
	return (pullRequest) => {
		if ((pullRequest.labels?.nodes || []).some((label) => !!label?.name && excludeLabels.includes(label.name))) return false;
		return true;
	};
};
const getFilterIncludedPullRequests = (includeLabels) => {
	return (pullRequest) => {
		const labels = pullRequest.labels?.nodes || [];
		if (includeLabels.length === 0 || labels.some((label) => !!label?.name && includeLabels.includes(label.name))) return true;
		return false;
	};
};
const pullRequestToString = (params) => params.pullRequests.map((pullRequest) => {
	let pullAuthor = "ghost";
	if (pullRequest.author) pullAuthor = pullRequest.author.__typename && pullRequest.author.__typename === "Bot" ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})` : pullRequest.author.login;
	return renderTemplate({
		template: params.config["change-template"],
		object: {
			$TITLE: escapeTitle({
				title: pullRequest.title,
				escapes: params.config["change-title-escapes"]
			}),
			$NUMBER: pullRequest.number.toString(),
			$AUTHOR: pullAuthor,
			$BODY: pullRequest.body,
			$URL: pullRequest.url,
			$BASE_REF_NAME: pullRequest.baseRefName,
			$HEAD_REF_NAME: pullRequest.headRefName
		}
	});
}).join("\n");
var escapeTitle = (params) => params.title.replace(new RegExp(`[${escapeStringRegexp(params.escapes || "")}]|\`.*?\``, "g"), (match) => {
	if (match.length > 1) return match;
	if (match == "@" || match == "#") return `${match}<!---->`;
	return `\\${match}`;
});
const generateChangeLog = (params) => {
	const { pullRequests, config } = params;
	if (pullRequests.length === 0) return config["no-changes-template"];
	const [uncategorizedPullRequests, categorizedPullRequests] = categorizePullRequests({
		pullRequests,
		config
	});
	const changeLog = [];
	if (uncategorizedPullRequests.length > 0) changeLog.push(pullRequestToString({
		pullRequests: uncategorizedPullRequests,
		config
	}), "\n\n");
	for (const [index, category] of categorizedPullRequests.entries()) {
		if (category.pullRequests.length === 0) continue;
		changeLog.push(renderTemplate({
			template: config["category-template"],
			object: { $TITLE: category.title }
		}), "\n\n");
		const pullRequestString = pullRequestToString({
			pullRequests: category.pullRequests,
			config
		});
		if (category["collapse-after"] !== 0 && category.pullRequests.length > category["collapse-after"]) changeLog.push("<details>", "\n", `<summary>${category.pullRequests.length} changes</summary>`, "\n\n", pullRequestString, "\n", "</details>");
		else changeLog.push(pullRequestString);
		if (index + 1 !== categorizedPullRequests.length) changeLog.push("\n\n");
	}
	return changeLog.join("").trim();
};
const generateContributorsSentence = (params) => {
	const { commits, pullRequests, config } = params;
	const contributors = /* @__PURE__ */ new Set();
	for (const commit of commits) if (commit.author?.user) {
		if (!config["exclude-contributors"].includes(commit.author.user.login)) contributors.add(`@${commit.author.user.login}`);
	} else if (commit.author?.name) contributors.add(commit.author.name);
	for (const pullRequest of pullRequests) if (pullRequest.author && !config["exclude-contributors"].includes(pullRequest.author.login)) if (pullRequest.author.__typename === "Bot") contributors.add(`[${pullRequest.author.login}[bot]](${pullRequest.author.url})`);
	else contributors.add(`@${pullRequest.author.login}`);
	const sortedContributors = [...contributors].sort();
	if (sortedContributors.length > 1) return sortedContributors.slice(0, -1).join(", ") + " and " + sortedContributors.slice(-1);
	else if (sortedContributors.length === 1) return sortedContributors[0];
	else return config["no-contributors-template"];
};
const resolveVersionKeyIncrement = (params) => {
	const { pullRequests, config } = params;
	const priorityMap = {
		patch: 1,
		minor: 2,
		major: 3
	};
	const labelToKeyMap = Object.fromEntries(Object.keys(priorityMap).flatMap((key) => [config["version-resolver"][key].labels.map((label) => [label, key])]).flat());
	debug$3("labelToKeyMap: " + JSON.stringify(labelToKeyMap));
	const keys = pullRequests.filter(getFilterExcludedPullRequests(config["exclude-labels"])).filter(getFilterIncludedPullRequests(config["include-labels"])).flatMap((pr) => pr.labels?.nodes?.filter((n) => !!n?.name).map((node) => labelToKeyMap[node.name])).filter(Boolean);
	debug$3("keys: " + JSON.stringify(keys));
	const keyPriorities = keys.map((key) => priorityMap[key]);
	const priority = Math.max(...keyPriorities);
	const versionKey = Object.keys(priorityMap).find((key) => priorityMap[key] === priority);
	debug$3("versionKey: " + versionKey);
	let versionKeyIncrement = versionKey || config["version-resolver"].default;
	if (config["prerelease"] && config["prerelease-identifier"]) versionKeyIncrement = `pre${versionKeyIncrement}`;
	info(`Version increment: ${versionKeyIncrement}${!versionKey ? " (default)" : ""}`);
	return versionKeyIncrement;
};
var require_debug = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = typeof process === "object" && {}.NODE_DEBUG && /\bsemver\b/i.test({}.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {};
}));
var require_constants = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SEMVER_SPEC_VERSION = "2.0.0";
	var MAX_LENGTH$2 = 256;
	var MAX_SAFE_INTEGER$1 = Number.MAX_SAFE_INTEGER || 9007199254740991;
	module.exports = {
		MAX_LENGTH: MAX_LENGTH$2,
		MAX_SAFE_COMPONENT_LENGTH: 16,
		MAX_SAFE_BUILD_LENGTH: MAX_LENGTH$2 - 6,
		MAX_SAFE_INTEGER: MAX_SAFE_INTEGER$1,
		RELEASE_TYPES: [
			"major",
			"premajor",
			"minor",
			"preminor",
			"patch",
			"prepatch",
			"prerelease"
		],
		SEMVER_SPEC_VERSION,
		FLAG_INCLUDE_PRERELEASE: 1,
		FLAG_LOOSE: 2
	};
}));
var require_re = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var { MAX_SAFE_COMPONENT_LENGTH, MAX_SAFE_BUILD_LENGTH, MAX_LENGTH: MAX_LENGTH$1 } = require_constants();
	var debug$1 = require_debug();
	exports = module.exports = {};
	var re$2 = exports.re = [];
	var safeRe = exports.safeRe = [];
	var src = exports.src = [];
	var safeSrc = exports.safeSrc = [];
	var t$2 = exports.t = {};
	var R = 0;
	var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
	var safeRegexReplacements = [
		["\\s", 1],
		["\\d", MAX_LENGTH$1],
		[LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
	];
	var makeSafeRegex = (value) => {
		for (const [token, max] of safeRegexReplacements) value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
		return value;
	};
	var createToken = (name, value, isGlobal) => {
		const safe = makeSafeRegex(value);
		const index = R++;
		debug$1(name, index, value);
		t$2[name] = index;
		src[index] = value;
		safeSrc[index] = safe;
		re$2[index] = new RegExp(value, isGlobal ? "g" : void 0);
		safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
	};
	createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
	createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
	createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
	createToken("MAINVERSION", `(${src[t$2.NUMERICIDENTIFIER]})\\.(${src[t$2.NUMERICIDENTIFIER]})\\.(${src[t$2.NUMERICIDENTIFIER]})`);
	createToken("MAINVERSIONLOOSE", `(${src[t$2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t$2.NUMERICIDENTIFIERLOOSE]})\\.(${src[t$2.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASEIDENTIFIER", `(?:${src[t$2.NONNUMERICIDENTIFIER]}|${src[t$2.NUMERICIDENTIFIER]})`);
	createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t$2.NONNUMERICIDENTIFIER]}|${src[t$2.NUMERICIDENTIFIERLOOSE]})`);
	createToken("PRERELEASE", `(?:-(${src[t$2.PRERELEASEIDENTIFIER]}(?:\\.${src[t$2.PRERELEASEIDENTIFIER]})*))`);
	createToken("PRERELEASELOOSE", `(?:-?(${src[t$2.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t$2.PRERELEASEIDENTIFIERLOOSE]})*))`);
	createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
	createToken("BUILD", `(?:\\+(${src[t$2.BUILDIDENTIFIER]}(?:\\.${src[t$2.BUILDIDENTIFIER]})*))`);
	createToken("FULLPLAIN", `v?${src[t$2.MAINVERSION]}${src[t$2.PRERELEASE]}?${src[t$2.BUILD]}?`);
	createToken("FULL", `^${src[t$2.FULLPLAIN]}$`);
	createToken("LOOSEPLAIN", `[v=\\s]*${src[t$2.MAINVERSIONLOOSE]}${src[t$2.PRERELEASELOOSE]}?${src[t$2.BUILD]}?`);
	createToken("LOOSE", `^${src[t$2.LOOSEPLAIN]}$`);
	createToken("GTLT", "((?:<|>)?=?)");
	createToken("XRANGEIDENTIFIERLOOSE", `${src[t$2.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
	createToken("XRANGEIDENTIFIER", `${src[t$2.NUMERICIDENTIFIER]}|x|X|\\*`);
	createToken("XRANGEPLAIN", `[v=\\s]*(${src[t$2.XRANGEIDENTIFIER]})(?:\\.(${src[t$2.XRANGEIDENTIFIER]})(?:\\.(${src[t$2.XRANGEIDENTIFIER]})(?:${src[t$2.PRERELEASE]})?${src[t$2.BUILD]}?)?)?`);
	createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t$2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t$2.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t$2.XRANGEIDENTIFIERLOOSE]})(?:${src[t$2.PRERELEASELOOSE]})?${src[t$2.BUILD]}?)?)?`);
	createToken("XRANGE", `^${src[t$2.GTLT]}\\s*${src[t$2.XRANGEPLAIN]}$`);
	createToken("XRANGELOOSE", `^${src[t$2.GTLT]}\\s*${src[t$2.XRANGEPLAINLOOSE]}$`);
	createToken("COERCEPLAIN", `(^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
	createToken("COERCE", `${src[t$2.COERCEPLAIN]}(?:$|[^\\d])`);
	createToken("COERCEFULL", src[t$2.COERCEPLAIN] + `(?:${src[t$2.PRERELEASE]})?(?:${src[t$2.BUILD]})?(?:$|[^\\d])`);
	createToken("COERCERTL", src[t$2.COERCE], true);
	createToken("COERCERTLFULL", src[t$2.COERCEFULL], true);
	createToken("LONETILDE", "(?:~>?)");
	createToken("TILDETRIM", `(\\s*)${src[t$2.LONETILDE]}\\s+`, true);
	exports.tildeTrimReplace = "$1~";
	createToken("TILDE", `^${src[t$2.LONETILDE]}${src[t$2.XRANGEPLAIN]}$`);
	createToken("TILDELOOSE", `^${src[t$2.LONETILDE]}${src[t$2.XRANGEPLAINLOOSE]}$`);
	createToken("LONECARET", "(?:\\^)");
	createToken("CARETTRIM", `(\\s*)${src[t$2.LONECARET]}\\s+`, true);
	exports.caretTrimReplace = "$1^";
	createToken("CARET", `^${src[t$2.LONECARET]}${src[t$2.XRANGEPLAIN]}$`);
	createToken("CARETLOOSE", `^${src[t$2.LONECARET]}${src[t$2.XRANGEPLAINLOOSE]}$`);
	createToken("COMPARATORLOOSE", `^${src[t$2.GTLT]}\\s*(${src[t$2.LOOSEPLAIN]})$|^$`);
	createToken("COMPARATOR", `^${src[t$2.GTLT]}\\s*(${src[t$2.FULLPLAIN]})$|^$`);
	createToken("COMPARATORTRIM", `(\\s*)${src[t$2.GTLT]}\\s*(${src[t$2.LOOSEPLAIN]}|${src[t$2.XRANGEPLAIN]})`, true);
	exports.comparatorTrimReplace = "$1$2$3";
	createToken("HYPHENRANGE", `^\\s*(${src[t$2.XRANGEPLAIN]})\\s+-\\s+(${src[t$2.XRANGEPLAIN]})\\s*$`);
	createToken("HYPHENRANGELOOSE", `^\\s*(${src[t$2.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t$2.XRANGEPLAINLOOSE]})\\s*$`);
	createToken("STAR", "(<|>)?=?\\s*\\*");
	createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
	createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
}));
var require_parse_options = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var looseOption = Object.freeze({ loose: true });
	var emptyOpts = Object.freeze({});
	var parseOptions$1 = (options) => {
		if (!options) return emptyOpts;
		if (typeof options !== "object") return looseOption;
		return options;
	};
	module.exports = parseOptions$1;
}));
var require_identifiers = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var numeric = /^[0-9]+$/;
	var compareIdentifiers$1 = (a, b) => {
		if (typeof a === "number" && typeof b === "number") return a === b ? 0 : a < b ? -1 : 1;
		const anum = numeric.test(a);
		const bnum = numeric.test(b);
		if (anum && bnum) {
			a = +a;
			b = +b;
		}
		return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
	};
	var rcompareIdentifiers = (a, b) => compareIdentifiers$1(b, a);
	module.exports = {
		compareIdentifiers: compareIdentifiers$1,
		rcompareIdentifiers
	};
}));
var require_semver = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var debug = require_debug();
	var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
	var { safeRe: re$1, t: t$1 } = require_re();
	var parseOptions = require_parse_options();
	var { compareIdentifiers } = require_identifiers();
	module.exports = class SemVer$6 {
		constructor(version, options) {
			options = parseOptions(options);
			if (version instanceof SemVer$6) if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) return version;
			else version = version.version;
			else if (typeof version !== "string") throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
			if (version.length > MAX_LENGTH) throw new TypeError(`version is longer than ${MAX_LENGTH} characters`);
			debug("SemVer", version, options);
			this.options = options;
			this.loose = !!options.loose;
			this.includePrerelease = !!options.includePrerelease;
			const m = version.trim().match(options.loose ? re$1[t$1.LOOSE] : re$1[t$1.FULL]);
			if (!m) throw new TypeError(`Invalid Version: ${version}`);
			this.raw = version;
			this.major = +m[1];
			this.minor = +m[2];
			this.patch = +m[3];
			if (this.major > MAX_SAFE_INTEGER || this.major < 0) throw new TypeError("Invalid major version");
			if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) throw new TypeError("Invalid minor version");
			if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) throw new TypeError("Invalid patch version");
			if (!m[4]) this.prerelease = [];
			else this.prerelease = m[4].split(".").map((id) => {
				if (/^[0-9]+$/.test(id)) {
					const num = +id;
					if (num >= 0 && num < MAX_SAFE_INTEGER) return num;
				}
				return id;
			});
			this.build = m[5] ? m[5].split(".") : [];
			this.format();
		}
		format() {
			this.version = `${this.major}.${this.minor}.${this.patch}`;
			if (this.prerelease.length) this.version += `-${this.prerelease.join(".")}`;
			return this.version;
		}
		toString() {
			return this.version;
		}
		compare(other) {
			debug("SemVer.compare", this.version, this.options, other);
			if (!(other instanceof SemVer$6)) {
				if (typeof other === "string" && other === this.version) return 0;
				other = new SemVer$6(other, this.options);
			}
			if (other.version === this.version) return 0;
			return this.compareMain(other) || this.comparePre(other);
		}
		compareMain(other) {
			if (!(other instanceof SemVer$6)) other = new SemVer$6(other, this.options);
			if (this.major < other.major) return -1;
			if (this.major > other.major) return 1;
			if (this.minor < other.minor) return -1;
			if (this.minor > other.minor) return 1;
			if (this.patch < other.patch) return -1;
			if (this.patch > other.patch) return 1;
			return 0;
		}
		comparePre(other) {
			if (!(other instanceof SemVer$6)) other = new SemVer$6(other, this.options);
			if (this.prerelease.length && !other.prerelease.length) return -1;
			else if (!this.prerelease.length && other.prerelease.length) return 1;
			else if (!this.prerelease.length && !other.prerelease.length) return 0;
			let i = 0;
			do {
				const a = this.prerelease[i];
				const b = other.prerelease[i];
				debug("prerelease compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		compareBuild(other) {
			if (!(other instanceof SemVer$6)) other = new SemVer$6(other, this.options);
			let i = 0;
			do {
				const a = this.build[i];
				const b = other.build[i];
				debug("build compare", i, a, b);
				if (a === void 0 && b === void 0) return 0;
				else if (b === void 0) return 1;
				else if (a === void 0) return -1;
				else if (a === b) continue;
				else return compareIdentifiers(a, b);
			} while (++i);
		}
		inc(release, identifier, identifierBase) {
			if (release.startsWith("pre")) {
				if (!identifier && identifierBase === false) throw new Error("invalid increment argument: identifier is empty");
				if (identifier) {
					const match = `-${identifier}`.match(this.options.loose ? re$1[t$1.PRERELEASELOOSE] : re$1[t$1.PRERELEASE]);
					if (!match || match[1] !== identifier) throw new Error(`invalid identifier: ${identifier}`);
				}
			}
			switch (release) {
				case "premajor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor = 0;
					this.major++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "preminor":
					this.prerelease.length = 0;
					this.patch = 0;
					this.minor++;
					this.inc("pre", identifier, identifierBase);
					break;
				case "prepatch":
					this.prerelease.length = 0;
					this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "prerelease":
					if (this.prerelease.length === 0) this.inc("patch", identifier, identifierBase);
					this.inc("pre", identifier, identifierBase);
					break;
				case "release":
					if (this.prerelease.length === 0) throw new Error(`version ${this.raw} is not a prerelease`);
					this.prerelease.length = 0;
					break;
				case "major":
					if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) this.major++;
					this.minor = 0;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "minor":
					if (this.patch !== 0 || this.prerelease.length === 0) this.minor++;
					this.patch = 0;
					this.prerelease = [];
					break;
				case "patch":
					if (this.prerelease.length === 0) this.patch++;
					this.prerelease = [];
					break;
				case "pre": {
					const base = Number(identifierBase) ? 1 : 0;
					if (this.prerelease.length === 0) this.prerelease = [base];
					else {
						let i = this.prerelease.length;
						while (--i >= 0) if (typeof this.prerelease[i] === "number") {
							this.prerelease[i]++;
							i = -2;
						}
						if (i === -1) {
							if (identifier === this.prerelease.join(".") && identifierBase === false) throw new Error("invalid increment argument: identifier already exists");
							this.prerelease.push(base);
						}
					}
					if (identifier) {
						let prerelease$2 = [identifier, base];
						if (identifierBase === false) prerelease$2 = [identifier];
						if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
							if (isNaN(this.prerelease[1])) this.prerelease = prerelease$2;
						} else this.prerelease = prerelease$2;
					}
					break;
				}
				default: throw new Error(`invalid increment argument: ${release}`);
			}
			this.raw = this.format();
			if (this.build.length) this.raw += `+${this.build.join(".")}`;
			return this;
		}
	};
}));
var require_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer$5 = require_semver();
	var parse$3 = (version, options, throwErrors = false) => {
		if (version instanceof SemVer$5) return version;
		try {
			return new SemVer$5(version, options);
		} catch (er) {
			if (!throwErrors) return null;
			throw er;
		}
	};
	module.exports = parse$3;
}));
var require_coerce = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer$4 = require_semver();
	var parse$2 = require_parse();
	var { safeRe: re, t } = require_re();
	var coerce$1 = (version, options) => {
		if (version instanceof SemVer$4) return version;
		if (typeof version === "number") version = String(version);
		if (typeof version !== "string") return null;
		options = options || {};
		let match = null;
		if (!options.rtl) match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
		else {
			const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
			let next;
			while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
				if (!match || next.index + next[0].length !== match.index + match[0].length) match = next;
				coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
			}
			coerceRtlRegex.lastIndex = -1;
		}
		if (match === null) return null;
		const major$2 = match[2];
		return parse$2(`${major$2}.${match[3] || "0"}.${match[4] || "0"}${options.includePrerelease && match[5] ? `-${match[5]}` : ""}${options.includePrerelease && match[6] ? `+${match[6]}` : ""}`, options);
	};
	module.exports = coerce$1;
}));
var require_inc = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer$3 = require_semver();
	var inc$1 = (version, release, options, identifier, identifierBase) => {
		if (typeof options === "string") {
			identifierBase = identifier;
			identifier = options;
			options = void 0;
		}
		try {
			return new SemVer$3(version instanceof SemVer$3 ? version.version : version, options).inc(release, identifier, identifierBase).version;
		} catch (er) {
			return null;
		}
	};
	module.exports = inc$1;
}));
var require_major = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer$2 = require_semver();
	var major$1 = (a, loose) => new SemVer$2(a, loose).major;
	module.exports = major$1;
}));
var require_minor = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer$1 = require_semver();
	var minor$1 = (a, loose) => new SemVer$1(a, loose).minor;
	module.exports = minor$1;
}));
var require_patch = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SemVer = require_semver();
	var patch$1 = (a, loose) => new SemVer(a, loose).patch;
	module.exports = patch$1;
}));
var require_prerelease = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var parse$1 = require_parse();
	var prerelease$1 = (version, options) => {
		const parsed = parse$1(version, options);
		return parsed && parsed.prerelease.length ? parsed.prerelease : null;
	};
	module.exports = prerelease$1;
}));
var import_coerce = /* @__PURE__ */ __toESM(require_coerce(), 1);
var import_inc = /* @__PURE__ */ __toESM(require_inc(), 1);
var import_major = /* @__PURE__ */ __toESM(require_major(), 1);
var import_minor = /* @__PURE__ */ __toESM(require_minor(), 1);
var import_parse = /* @__PURE__ */ __toESM(require_parse(), 1);
var import_patch = /* @__PURE__ */ __toESM(require_patch(), 1);
var import_prerelease = /* @__PURE__ */ __toESM(require_prerelease(), 1);
var DEFAULT_VERSION_TEMPLATE = "$MAJOR.$MINOR.$PATCH";
const getVersionInfo = (params) => {
	const { lastRelease, config, input, versionKeyIncrement: _versionKeyIncrement } = params;
	let versionKeyIncrement = _versionKeyIncrement;
	const lastReleaseVersion = coerceVersion(lastRelease, { tagPrefix: config["tag-prefix"] });
	const inputVersion = coerceVersion(input.version || input.tag || input.name, { tagPrefix: config["tag-prefix"] });
	const isPreVersionKeyIncrement = versionKeyIncrement?.startsWith("pre");
	if (!lastReleaseVersion && !inputVersion) {
		if (isPreVersionKeyIncrement) defaultVersionInfo["$RESOLVED_VERSION"] = structuredClone(defaultVersionInfo["$NEXT_PRERELEASE_VERSION"]);
		if (config["version-template"] && config["version-template"] !== DEFAULT_VERSION_TEMPLATE) {
			const defaultVersion = toSemver("0.1.0");
			const templateableVersion$1 = getTemplatableVersion({
				version: defaultVersion,
				template: config["version-template"],
				inputVersion,
				versionKeyIncrement: versionKeyIncrement || "patch",
				preReleaseIdentifier: config["prerelease-identifier"]
			});
			for (const key of Object.keys(templateableVersion$1)) {
				const keyTyped = key;
				if (templateableVersion$1[keyTyped] && typeof templateableVersion$1[keyTyped] === "object" && templateableVersion$1[keyTyped].template) templateableVersion$1[keyTyped].version = renderTemplate({
					template: templateableVersion$1[keyTyped].template,
					object: templateableVersion$1[keyTyped]
				});
			}
			let resolvedVersionObj = splitSemVersion({
				version: defaultVersion,
				template: config["version-template"],
				inputVersion,
				versionKeyIncrement: versionKeyIncrement || "patch",
				preReleaseIdentifier: config["prerelease-identifier"]
			});
			if (!resolvedVersionObj) throw new Error("Failed to generate resolved version object");
			resolvedVersionObj = {
				...resolvedVersionObj,
				version: renderTemplate({
					template: config["version-template"],
					object: resolvedVersionObj
				})
			};
			templateableVersion$1.$RESOLVED_VERSION = resolvedVersionObj;
			return templateableVersion$1;
		}
		return defaultVersionInfo;
	}
	if (isPreVersionKeyIncrement && lastReleaseVersion?.prerelease?.length) versionKeyIncrement = "prerelease";
	const templateableVersion = getTemplatableVersion({
		version: lastReleaseVersion,
		template: config["version-template"],
		inputVersion,
		versionKeyIncrement,
		preReleaseIdentifier: config["prerelease-identifier"]
	});
	if (config["version-template"] && config["version-template"] !== DEFAULT_VERSION_TEMPLATE) for (const key of Object.keys(templateableVersion)) {
		const keyTyped = key;
		if (templateableVersion[keyTyped] && typeof templateableVersion[keyTyped] === "object" && templateableVersion[keyTyped].template) templateableVersion[keyTyped].version = renderTemplate({
			template: templateableVersion[keyTyped].template,
			object: templateableVersion[keyTyped]
		});
	}
	return templateableVersion;
};
var toSemver = (version) => {
	const result = (0, import_parse.default)(version);
	if (result) return result;
	return (0, import_coerce.default)(version);
};
var coerceVersion = (input, opt) => {
	if (!input) return null;
	const stripTag = (input$1) => !!opt?.tagPrefix && input$1?.startsWith(opt.tagPrefix) ? input$1.slice(opt.tagPrefix.length) : input$1;
	return typeof input === "object" ? toSemver(stripTag(input.tag_name)) || toSemver(stripTag(input.name)) : toSemver(stripTag(input));
};
const defaultVersionInfo = {
	$NEXT_MAJOR_VERSION: {
		version: "1.0.0",
		template: "$MAJOR.$MINOR.$PATCH",
		inputVersion: null,
		versionKeyIncrement: "patch",
		inc: "major",
		$MAJOR: 1,
		$MINOR: 0,
		$PATCH: 0,
		$PRERELEASE: ""
	},
	$NEXT_MINOR_VERSION: {
		version: "0.1.0",
		template: "$MAJOR.$MINOR.$PATCH",
		inputVersion: null,
		versionKeyIncrement: "patch",
		inc: "minor",
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
		$PRERELEASE: ""
	},
	$NEXT_PATCH_VERSION: {
		version: "0.1.0",
		template: "$MAJOR.$MINOR.$PATCH",
		inputVersion: null,
		versionKeyIncrement: "patch",
		inc: "patch",
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
		$PRERELEASE: ""
	},
	$NEXT_PRERELEASE_VERSION: {
		version: "0.1.0-rc.0",
		template: "$MAJOR.$MINOR.$PATCH$PRERELEASE",
		inputVersion: null,
		versionKeyIncrement: "prerelease",
		inc: "prerelease",
		preReleaseIdentifier: "rc",
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
		$PRERELEASE: "-rc.0"
	},
	$INPUT_VERSION: null,
	$RESOLVED_VERSION: {
		version: "0.1.0",
		template: "$MAJOR.$MINOR.$PATCH",
		inputVersion: null,
		versionKeyIncrement: "patch",
		inc: "patch",
		$MAJOR: 0,
		$MINOR: 1,
		$PATCH: 0,
		$PRERELEASE: ""
	}
};
var splitSemVersion = (input, versionKey = "version") => {
	if (!input?.[versionKey]) return;
	const version = input.inc ? (0, import_inc.default)(input[versionKey], input.inc, true, input.preReleaseIdentifier) : typeof input[versionKey] === "string" ? input[versionKey] : input[versionKey].version;
	const prereleaseVersion = !version ? "" : (0, import_prerelease.default)(version)?.join(".") || "";
	return {
		...input,
		version,
		$MAJOR: (0, import_major.default)(version || ""),
		$MINOR: (0, import_minor.default)(version || ""),
		$PATCH: (0, import_patch.default)(version || ""),
		$PRERELEASE: prereleaseVersion ? `-${prereleaseVersion}` : "",
		$COMPLETE: version
	};
};
var getTemplatableVersion = (input) => {
	const templatableVersion = {
		$NEXT_MAJOR_VERSION: splitSemVersion({
			...input,
			inc: "major"
		}),
		$NEXT_MAJOR_VERSION_MAJOR: splitSemVersion({
			...input,
			inc: "major",
			template: "$MAJOR"
		}),
		$NEXT_MAJOR_VERSION_MINOR: splitSemVersion({
			...input,
			inc: "major",
			template: "$MINOR"
		}),
		$NEXT_MAJOR_VERSION_PATCH: splitSemVersion({
			...input,
			inc: "major",
			template: "$PATCH"
		}),
		$NEXT_MINOR_VERSION: splitSemVersion({
			...input,
			inc: "minor"
		}),
		$NEXT_MINOR_VERSION_MAJOR: splitSemVersion({
			...input,
			inc: "minor",
			template: "$MAJOR"
		}),
		$NEXT_MINOR_VERSION_MINOR: splitSemVersion({
			...input,
			inc: "minor",
			template: "$MINOR"
		}),
		$NEXT_MINOR_VERSION_PATCH: splitSemVersion({
			...input,
			inc: "minor",
			template: "$PATCH"
		}),
		$NEXT_PATCH_VERSION: splitSemVersion({
			...input,
			inc: "patch"
		}),
		$NEXT_PATCH_VERSION_MAJOR: splitSemVersion({
			...input,
			inc: "patch",
			template: "$MAJOR"
		}),
		$NEXT_PATCH_VERSION_MINOR: splitSemVersion({
			...input,
			inc: "patch",
			template: "$MINOR"
		}),
		$NEXT_PATCH_VERSION_PATCH: splitSemVersion({
			...input,
			inc: "patch",
			template: "$PATCH"
		}),
		$NEXT_PRERELEASE_VERSION: splitSemVersion({
			...input,
			inc: "prerelease",
			template: "$PRERELEASE"
		}),
		$INPUT_VERSION: splitSemVersion(input, "inputVersion"),
		$RESOLVED_VERSION: splitSemVersion({
			...input,
			inc: input.versionKeyIncrement || "patch"
		})
	};
	templatableVersion.$RESOLVED_VERSION = templatableVersion.$INPUT_VERSION || templatableVersion.$RESOLVED_VERSION;
	return templatableVersion;
};
const buildReleasePayload = (params) => {
	const { commits, config, input, lastRelease, pullRequests } = params;
	info(`Building release payload and body...`);
	const sortedPullRequests = sortPullRequests({
		pullRequests,
		config
	});
	let body = (config["header"] || "") + config.template + (config["footer"] || "");
	body = renderTemplate({
		template: body,
		object: {
			$PREVIOUS_TAG: lastRelease ? lastRelease.tag_name : "",
			$CHANGES: generateChangeLog({
				pullRequests: sortedPullRequests,
				config
			}),
			$CONTRIBUTORS: generateContributorsSentence({
				commits,
				pullRequests: sortedPullRequests,
				config
			}),
			$OWNER: context.repo.owner,
			$REPOSITORY: context.repo.repo
		},
		replacers: config.replacers
	});
	const versionInfo = getVersionInfo({
		lastRelease,
		config,
		input,
		versionKeyIncrement: resolveVersionKeyIncrement({
			pullRequests,
			config
		})
	});
	debug$3("versionInfo: " + JSON.stringify(versionInfo, null, 2));
	if (versionInfo) body = renderTemplate({
		template: body,
		object: versionInfo
	});
	let mutableInputTag = structuredClone(input["tag"]);
	let mutableInputName = structuredClone(input["name"]);
	let mutableCommitish = structuredClone(config["commitish"]);
	if (mutableInputTag === void 0) mutableInputTag = versionInfo ? renderTemplate({
		template: config["tag-template"] || "",
		object: versionInfo
	}) : "";
	else if (versionInfo) mutableInputTag = renderTemplate({
		template: mutableInputTag,
		object: versionInfo
	});
	debug$3("tag: " + mutableInputTag);
	if (mutableInputName === void 0) mutableInputName = versionInfo ? renderTemplate({
		template: config["name-template"] || "",
		object: versionInfo
	}) : "";
	else if (versionInfo) mutableInputName = renderTemplate({
		template: mutableInputName,
		object: versionInfo
	});
	debug$3("name: " + mutableInputName);
	if (mutableCommitish.startsWith("refs/tags/")) {
		info(`${mutableCommitish} is not supported as release target, falling back to default branch`);
		mutableCommitish = "";
	}
	const resolvedVersion = versionInfo.$RESOLVED_VERSION?.version;
	const majorVersion = versionInfo.$RESOLVED_VERSION?.$MAJOR;
	const minorVersion = versionInfo.$RESOLVED_VERSION?.$MINOR;
	const patchVersion = versionInfo.$RESOLVED_VERSION?.$PATCH;
	const res = {
		name: mutableInputName,
		tag: mutableInputTag,
		body,
		targetCommitish: mutableCommitish,
		prerelease: config["prerelease"],
		make_latest: config["latest"],
		draft: !input["publish"],
		resolvedVersion,
		majorVersion,
		minorVersion,
		patchVersion
	};
	info(`Release payload built successfully`);
	info(`  name:              ${res.name}`);
	info(`  tag:               ${res.tag}`);
	info(`  body:              ${res.body.length} characters long`);
	info(`  targetCommitish:   ${res.targetCommitish}`);
	info(`  prerelease:        ${res.prerelease}`);
	info(`  make_latest:       ${res.make_latest}`);
	info(`  draft:             ${res.draft}${!res.draft ? " (will be published !)" : ""}`);
	info(`  resolvedVersion:   ${res.resolvedVersion}`);
	info(`  majorVersion:      ${res.majorVersion}`);
	info(`  minorVersion:      ${res.minorVersion}`);
	info(`  patchVersion:      ${res.patchVersion}`);
	return res;
};
const createRelease = async (params) => {
	const octokit = getOctokit();
	const { releasePayload } = params;
	return octokit.rest.repos.createRelease({
		owner: context.repo.owner,
		repo: context.repo.repo,
		target_commitish: releasePayload.targetCommitish,
		name: releasePayload.name,
		tag_name: releasePayload.tag,
		body: releasePayload.body,
		draft: releasePayload.draft,
		prerelease: releasePayload.prerelease,
		make_latest: releasePayload.prerelease ? "false" : releasePayload.make_latest.toString()
	});
};
const updateRelease = async (params) => {
	const octokit = getOctokit();
	const { draftRelease, releasePayload } = params;
	const updateReleaseParameters = {
		name: releasePayload.name || draftRelease.name || void 0,
		tag_name: releasePayload.tag || draftRelease.tag_name,
		target_commitish: releasePayload.targetCommitish
	};
	if (!updateReleaseParameters.name) delete updateReleaseParameters.name;
	if (!updateReleaseParameters.tag_name) delete updateReleaseParameters.tag_name;
	if (!updateReleaseParameters.target_commitish) delete updateReleaseParameters.target_commitish;
	return octokit.rest.repos.updateRelease({
		owner: context.repo.owner,
		repo: context.repo.repo,
		release_id: draftRelease.id,
		body: releasePayload.body,
		draft: releasePayload.draft,
		prerelease: releasePayload.prerelease,
		make_latest: releasePayload.prerelease ? "false" : releasePayload.make_latest.toString(),
		...updateReleaseParameters
	});
};
const upsertRelease = async (params) => {
	const { draftRelease, releasePayload } = params;
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
const main = async (params) => {
	const { config, input } = params;
	const { draftRelease, lastRelease } = await findPreviousReleases(config);
	const { commits, pullRequests } = await findPullRequests({
		lastRelease,
		config
	});
	const releasePayload = buildReleasePayload({
		commits,
		config,
		input,
		lastRelease,
		pullRequests
	});
	return {
		upsertedRelease: await upsertRelease({
			draftRelease,
			releasePayload
		}),
		releasePayload
	};
};
const setActionOutput = (params) => {
	const { releasePayload, upsertedRelease } = params;
	info("Set action outputs...");
	const { data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl, tag_name: tagName, name } } = upsertedRelease;
	const { resolvedVersion, majorVersion, minorVersion, patchVersion, body } = releasePayload;
	if (releaseId && Number.isInteger(releaseId)) setOutput("id", releaseId.toString());
	if (htmlUrl) setOutput("html_url", htmlUrl);
	if (uploadUrl) setOutput("upload_url", uploadUrl);
	if (tagName) setOutput("tag_name", tagName);
	if (name) setOutput("name", name);
	if (resolvedVersion) setOutput("resolved_version", resolvedVersion);
	if (majorVersion) setOutput("major_version", majorVersion);
	if (minorVersion) setOutput("minor_version", minorVersion);
	if (patchVersion) setOutput("patch_version", patchVersion);
	setOutput("body", body);
	info("Outputs set!");
};
const commonConfigSchema = object({
	latest: stringbool().or(boolean()).optional(),
	prerelease: stringbool().or(boolean()).optional(),
	"initial-commits-since": datetime().optional(),
	"prerelease-identifier": string().optional(),
	commitish: string().optional(),
	header: string().optional(),
	footer: string().optional()
});
const actionInputSchema = object({
	"config-name": string().optional().default("release-drafter.yml"),
	name: string().optional(),
	tag: string().optional(),
	version: string().optional(),
	publish: stringbool().optional().default(false)
}).and(sharedInputSchema).and(commonConfigSchema);
const configSchema = object({
	"change-template": string().optional().default("* $TITLE (#$NUMBER) @$AUTHOR"),
	"change-title-escapes": string().optional(),
	"no-changes-template": string().optional().default("* No changes"),
	"version-template": string().optional().default("$MAJOR.$MINOR.$PATCH$PRERELEASE"),
	"name-template": string().optional(),
	"tag-prefix": string().optional(),
	"tag-template": string().optional(),
	"exclude-labels": array(string()).optional().default([]),
	"include-labels": array(string()).optional().default([]),
	"include-paths": array(string()).optional().default([]),
	"exclude-contributors": array(string()).optional().default([]),
	"no-contributors-template": string().optional().default("No contributors"),
	"sort-by": _enum(["merged_at", "title"]).optional().default("merged_at"),
	"sort-direction": _enum(["ascending", "descending"]).optional().default("descending"),
	"filter-by-commitish": boolean().optional().default(false),
	"pull-request-limit": number().int().positive().optional().default(5),
	"history-limit": number().int().positive().optional().default(15),
	replacers: array(object({
		search: string().min(1),
		replace: string().min(0)
	})).optional().default([]),
	categories: array(object({
		title: string().min(1),
		"collapse-after": number().int().min(0).optional().default(0),
		labels: array(string().min(1)).optional().default([]),
		label: string().min(1).optional()
	})).optional().default([]),
	"version-resolver": object({
		major: object({ labels: array(string().min(1)) }).optional().default({ labels: [] }),
		minor: object({ labels: array(string().min(1)) }).optional().default({ labels: [] }),
		patch: object({ labels: array(string().min(1)) }).optional().default({ labels: [] }),
		default: _enum([
			"major",
			"minor",
			"patch"
		]).optional().default("patch")
	}).optional().default({
		major: { labels: [] },
		minor: { labels: [] },
		patch: { labels: [] },
		default: "patch"
	}),
	"category-template": string().optional().default("## $TITLE"),
	template: string().min(1)
}).meta({
	title: "JSON schema for Release Drafter yaml files",
	id: "https://github.com/release-drafter/release-drafter/blob/master/drafter/schema.json"
}).and(commonConfigSchema);
const getActionInput = () => {
	const getInput$1 = (name) => getInput(name) || void 0;
	return actionInputSchema.parse({
		"config-name": getInput$1("config-name"),
		name: getInput$1("name"),
		tag: getInput$1("tag"),
		version: getInput$1("version"),
		publish: getInput$1("publish"),
		token: getInput$1("token"),
		latest: getInput$1("latest"),
		prerelease: getInput$1("prerelease"),
		"initial-commits-since": getInput$1("initial-commits-since"),
		"prerelease-identifier": getInput$1("prerelease-identifier"),
		commitish: getInput$1("commitish"),
		header: getInput$1("header"),
		footer: getInput$1("footer")
	});
};
const mergeInputAndConfig = (params) => {
	const { config: originalConfig, input } = params;
	const config = structuredClone(originalConfig);
	if (input.commitish) {
		if (config.commitish && config.commitish !== input.commitish) info(`Input's commitish "${input.commitish}" overrides config's commitish "${config.commitish}"`);
		config.commitish = input.commitish;
	}
	if (input.header) {
		if (config.header && config.header !== input.header) info(`Input's header "${input.header}" overrides config's header "${config.header}"`);
		config.header = input.header;
	}
	if (input.footer) {
		if (config.footer && config.footer !== input.footer) info(`Input's footer "${input.footer}" overrides config's footer "${config.footer}"`);
		config.footer = input.footer;
	}
	if (input["prerelease-identifier"]) {
		if (config["prerelease-identifier"] && config["prerelease-identifier"] !== input["prerelease-identifier"]) info(`Input's prerelease-identifier "${input["prerelease-identifier"]}" overrides config's prerelease-identifier "${config["prerelease-identifier"]}"`);
		config["prerelease-identifier"] = input["prerelease-identifier"];
	}
	if (typeof input.prerelease === "boolean") {
		if (typeof config.prerelease === "boolean" && config.prerelease !== input.prerelease) info(`Input's prerelease "${input.prerelease}" overrides config's prerelease "${config.prerelease}"`);
		config.prerelease = input.prerelease;
	}
	if (typeof input.latest === "boolean") {
		if (typeof config.latest === "boolean" && config.latest !== input.latest) info(`Input's latest "${input.latest}" overrides config's latest "${config.latest}"`);
		config.latest = input.latest;
	}
	if (config.latest && config.prerelease) {
		warning("'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release.");
		config.latest = false;
	}
	if (config["prerelease-identifier"] && !config.prerelease) {
		warning(`You specified a 'prerelease-identifier' (${config["prerelease-identifier"]}), but 'prerelease' is set to false. Switching to true.`);
		config.prerelease = true;
	}
	const commitish = config.commitish || context.ref || context.payload.ref;
	const latest = typeof config.latest !== "boolean" ? true : config.latest;
	const prerelease$2 = typeof config.prerelease !== "boolean" ? false : config.prerelease;
	const replacers = config.replacers.map((r) => {
		try {
			return {
				...r,
				search: stringToRegex(r.search)
			};
		} catch {
			warning(`Bad replacer regex: '${r.search}'`);
			return false;
		}
	}).filter((r) => !!r);
	const categories = config.categories.map((cat) => {
		const { label, ..._cat } = cat;
		_cat.labels = [...cat.labels, label].filter(Boolean);
		return _cat;
	});
	const parsedConfig = {
		...config,
		commitish,
		latest,
		prerelease: prerelease$2,
		replacers,
		categories
	};
	if (!parsedConfig.commitish) throw new Error("'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)");
	if (parsedConfig.categories.filter((category) => category.labels.length === 0).length > 1) throw new Error("Multiple categories detected with no labels. Only one category with no labels is supported for uncategorized pull requests.");
	return parsedConfig;
};
const getConfig = async (configName) => {
	const { config, contexts } = await composeConfigGet(configName, context);
	if (contexts.length > 1) info(`Config was fetched from ${contexts.length} different contexts.`);
	else if (contexts.length === 1) info(`Config fetched ${contexts[0].scheme === "file" ? "locally." : `on remote "${contexts[0].repo.owner}/${contexts[0].repo.repo}${contexts[0].ref ? `@${contexts[0].ref}` : ""}"${!contexts[0].ref ? " on the default branch" : ""}`}.`);
	return configSchema.parse(config);
};
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
	} catch (error$1) {
		if (error$1 instanceof Error) setFailed(error$1.message);
	}
}
/* node:coverage ignore file -- @preserve */
await run();
