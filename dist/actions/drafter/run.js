import { e as escapeStringRegexp, g as getOctokit, i as info, c as context, w as warning, a as error, d as debug, b as getDefaultExportFromCjs, s as setOutput, o as object, f as string, h as datetime, j as stringbool, k as boolean, l as sharedInputSchema, _ as _enum, m as array, n as number, p as getInput, q as stringToRegex, r as composeConfigGet, t as setFailed } from "../../chunks/shared-input.schema.js";
import "node:path";
import "node:fs";
import "node:os";
import "node:crypto";
import "node:fs";
import "node:path";
import "node:http";
import "node:https";
import "node:net";
import "node:tls";
import "node:events";
import "node:assert";
import "node:util";
import "node:assert";
import "node:net";
import "node:http";
import "node:stream";
import "node:buffer";
import "node:util";
import "node:querystring";
import "node:events";
import "node:diagnostics_channel";
import "node:tls";
import "node:zlib";
import "node:perf_hooks";
import "node:util/types";
import "node:worker_threads";
import "node:url";
import "node:async_hooks";
import "node:console";
import "node:dns";
import "node:string_decoder";
import "node:child_process";
import "node:timers";
const getPath = (obj, path) => path.reduce((acc, key) => acc?.[key], obj);
const hasPath = (obj, path) => getPath(obj, path) !== void 0;
const setPath = (obj, path, value) => {
  const parent = getPath(obj, path.slice(0, -1));
  parent[path.at(-1)] = value;
};
async function paginateGraphql(client, query, requestParameters, paginatePath) {
  const nodesPath = [...paginatePath, "nodes"];
  const pageInfoPath = [...paginatePath, "pageInfo"];
  const endCursorPath = [...pageInfoPath, "endCursor"];
  const hasNextPagePath = [...pageInfoPath, "hasNextPage"];
  const hasNextPage = (data2) => getPath(data2, hasNextPagePath);
  const data = await client(query, requestParameters);
  if (!hasPath(data, nodesPath)) {
    throw new Error(
      "Data doesn't contain `nodes` field. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `nodes` field."
    );
  }
  if (!hasPath(data, pageInfoPath) || !hasPath(data, endCursorPath) || !hasPath(data, hasNextPagePath)) {
    throw new Error(
      "Data doesn't contain `pageInfo` field with `endCursor` and `hasNextPage` fields. Make sure the `paginatePath` is set to the field you wish to paginate and that the query includes the `pageInfo` field."
    );
  }
  while (hasNextPage(data)) {
    const newData = await client(query, {
      ...requestParameters,
      after: getPath(data, [...pageInfoPath, "endCursor"])
    });
    const newNodes = getPath(newData, nodesPath);
    const newPageInfo = getPath(newData, pageInfoPath);
    setPath(data, pageInfoPath, newPageInfo);
    setPath(data, nodesPath, [...getPath(data, nodesPath), ...newNodes]);
  }
  return data;
}
function compareVersions(v1, v2) {
  const n1 = validateAndParse(v1);
  const n2 = validateAndParse(v2);
  const p1 = n1.pop();
  const p2 = n2.pop();
  const r = compareSegments(n1, n2);
  if (r !== 0) return r;
  if (p1 && p2) {
    return compareSegments(p1.split("."), p2.split("."));
  } else if (p1 || p2) {
    return p1 ? -1 : 1;
  }
  return 0;
}
const validate = (v) => typeof v === "string" && /^[v\d]/.test(v) && semver$1.test(v);
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
  if (op === "^") {
    return compareSegments([v2, v3], [r2, r3]) >= 0;
  }
  if (compareStrings(v2, r2) !== 0) return false;
  return compareStrings(v3, r3) >= 0;
};
compareVersions.validate = validate;
compareVersions.compare = compare;
compareVersions.sastisfies = satisfies;
const semver$1 = /^[v^~<>=]*?(\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+)(?:\.([x*]|\d+))?(?:-([\da-z\-]+(?:\.[\da-z\-]+)*))?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;
const validateAndParse = (v) => {
  if (typeof v !== "string") {
    throw new TypeError("Invalid argument expected string");
  }
  const match = v.match(semver$1);
  if (!match) {
    throw new Error(`Invalid argument not valid semver ('${v}' received)`);
  }
  match.shift();
  return match;
};
const isWildcard = (s) => s === "*" || s === "x" || s === "X";
const tryParse = (v) => {
  const n = parseInt(v, 10);
  return isNaN(n) ? v : n;
};
const forceType = (a, b) => typeof a !== typeof b ? [String(a), String(b)] : [a, b];
const compareStrings = (a, b) => {
  if (isWildcard(a) || isWildcard(b)) return 0;
  const [ap, bp] = forceType(tryParse(a), tryParse(b));
  if (ap > bp) return 1;
  if (ap < bp) return -1;
  return 0;
};
const compareSegments = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const r = compareStrings(a[i] || 0, b[i] || 0);
    if (r !== 0) return r;
  }
  return 0;
};
const operatorResMap = {
  ">": [1],
  ">=": [0, 1],
  "=": [0],
  "<=": [-1, 0],
  "<": [-1]
};
const allowedOperators = Object.keys(operatorResMap);
const assertValidOperator = (op) => {
  if (typeof op !== "string") {
    throw new TypeError(
      `Invalid operator type, expected string but got ${typeof op}`
    );
  }
  if (allowedOperators.indexOf(op) === -1) {
    throw new Error(
      `Invalid operator, expected one of ${allowedOperators.join("|")}`
    );
  }
};
const sortReleases = (params) => {
  const tagPrefixRexExp = params.tagPrefix ? new RegExp(`^${escapeStringRegexp(params.tagPrefix)}`) : void 0;
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
const RELEASE_COUNT_LIMIT = 1e3;
const findPreviousReleases = async (params) => {
  const {
    commitish,
    "filter-by-commitish": filterByCommitish,
    "tag-prefix": tagPrefix,
    prerelease: isPreRelease
  } = params;
  const octokit = getOctokit();
  info("Fetching releases from GitHub...");
  let releaseCount = 0;
  const releases = await octokit.paginate(
    octokit.rest.repos.listReleases,
    {
      ...context.repo,
      per_page: 100
    },
    (response, done) => {
      releaseCount += response.data.length;
      if (releaseCount >= RELEASE_COUNT_LIMIT) {
        done();
      }
      return response.data;
    }
  );
  info(`Found ${releases.length} releases`);
  const headRefRegex = /^refs\/heads\//;
  const targetCommitishName = commitish.replace(headRefRegex, "");
  const commitishFilteredReleases = filterByCommitish ? releases.filter(
    (r) => targetCommitishName === r.target_commitish.replace(headRefRegex, "")
  ) : releases;
  const filteredReleases = tagPrefix ? commitishFilteredReleases.filter((r) => r.tag_name.startsWith(tagPrefix)) : commitishFilteredReleases;
  let publishedReleases = filteredReleases.filter((r) => !r.draft);
  let draftReleases = filteredReleases.filter((r) => r.draft);
  publishedReleases = publishedReleases.filter(
    (publishedRelease) => isPreRelease ? publishedRelease.prerelease || !publishedRelease.prerelease : !publishedRelease.prerelease
    // Only regular published-releases
  );
  draftReleases = draftReleases.filter(
    (draftRelease2) => isPreRelease ? draftRelease2.prerelease : !draftRelease2.prerelease
    // Only regular drafts
  );
  const draftRelease = draftReleases[0];
  const lastRelease = sortReleases({
    releases: publishedReleases,
    tagPrefix
  })?.at(-1);
  if (draftRelease) {
    if (draftReleases.length > 1) {
      warning(
        `Multiple draft releases found : ${draftReleases.map((r) => r.tag_name).join(", ")}`
      );
      warning(
        `Using the first one returned by GitHub API: ${draftRelease.tag_name}`
      );
    }
    info(`Draft release${isPreRelease ? " (which is a prerelease)" : ""}:`);
    info(`  tag_name:  ${draftRelease.tag_name}`);
    info(`  name:      ${draftRelease.name}`);
  } else {
    info(
      `No draft release found${isPreRelease ? " (among prerelease drafts)" : ""}`
    );
  }
  if (lastRelease) {
    info(`Last release${isPreRelease ? " (including prerelease)" : ""}:`);
    info(`  tag_name:  ${lastRelease.tag_name}`);
    info(`  name:      ${lastRelease.name}`);
  } else {
    info(
      `No last release found${isPreRelease ? " (including prerelease)" : ""}`
    );
  }
  return { draftRelease, lastRelease };
};
const findCommitsWithPathChangeQuery = "query findCommitsWithPathChangesQuery(\n  $name: String!\n  $owner: String!\n  $targetCommitish: String!\n  $since: GitTimestamp\n  $after: String\n  $path: String\n) {\n  repository(name: $name, owner: $owner) {\n    object(expression: $targetCommitish) {\n      ... on Commit {\n        __typename\n        history(path: $path, since: $since, after: $after) {\n          __typename\n          pageInfo {\n            __typename\n            hasNextPage\n            endCursor\n          }\n          nodes {\n            __typename\n            id\n          }\n        }\n      }\n    }\n  }\n}\n";
const findCommitsWithPathChange = async (paths, params) => {
  const octokit = getOctokit();
  const commitIdsMatchingPaths = {};
  let hasFoundCommits = false;
  for (const path of paths) {
    const data = await paginateGraphql(
      octokit.graphql,
      findCommitsWithPathChangeQuery,
      { ...params, path },
      ["repository", "object", "history"]
    );
    if (data.repository?.object?.__typename !== "Commit") {
      throw new Error("Query returned an unexpected result");
    }
    const commits = (data.repository?.object?.history.nodes || []).filter(
      (c) => !!c
    );
    commitIdsMatchingPaths[path] = commitIdsMatchingPaths[path] || /* @__PURE__ */ new Set([]);
    for (const { id } of commits) {
      hasFoundCommits = true;
      commitIdsMatchingPaths[path].add(id);
    }
  }
  return { commitIdsMatchingPaths, hasFoundCommits };
};
const findCommitsWithPrQuery = "query findCommitsWithAssociatedPullRequests(\n  $name: String!\n  $owner: String!\n  $targetCommitish: String!\n  $withPullRequestBody: Boolean!\n  $withPullRequestURL: Boolean!\n  $since: GitTimestamp\n  $after: String\n  $withBaseRefName: Boolean!\n  $withHeadRefName: Boolean!\n  $pullRequestLimit: Int!\n  $historyLimit: Int!\n) {\n  repository(name: $name, owner: $owner) {\n    object(expression: $targetCommitish) {\n      ... on Commit {\n        __typename\n        history(first: $historyLimit, since: $since, after: $after) {\n          __typename\n          totalCount\n          pageInfo {\n            __typename\n            hasNextPage\n            endCursor\n          }\n          nodes {\n            __typename\n            id\n            committedDate\n            message\n            author {\n              __typename\n              name\n              user {\n                __typename\n                login\n              }\n            }\n            associatedPullRequests(first: $pullRequestLimit) {\n              __typename\n              nodes {\n                __typename\n                title\n                number\n                url @include(if: $withPullRequestURL)\n                body @include(if: $withPullRequestBody)\n                author {\n                  __typename\n                  login\n                  url\n                }\n                baseRepository {\n                  __typename\n                  nameWithOwner\n                }\n                mergedAt\n                isCrossRepository\n                labels(first: 100) {\n                  __typename\n                  nodes {\n                    __typename\n                    name\n                  }\n                }\n                merged\n                baseRefName @include(if: $withBaseRefName)\n                headRefName @include(if: $withHeadRefName)\n              }\n            }\n          }\n        }\n      }\n    }\n  }\n}\n";
const findCommitsWithPr = async (params) => {
  const octokit = getOctokit();
  const data = await paginateGraphql(
    octokit.graphql,
    findCommitsWithPrQuery,
    params,
    ["repository", "object", "history"]
  );
  if (data.repository?.object?.__typename !== "Commit") {
    throw new Error("Query returned an unexpected result");
  }
  const commits = (data.repository.object.history.nodes || []).filter(
    (commit) => commit != null
  );
  if (params.since) {
    return commits.filter(
      (commit) => !!commit?.committedDate && commit.committedDate != params.since
    );
  } else {
    return commits;
  }
};
const findPullRequests = async (params) => {
  const since = params.lastRelease?.created_at || params.config["initial-commits-since"];
  const shouldfilterByChangedPaths = params.config["include-paths"].length > 0;
  let commitIdsMatchingPaths = {};
  if (shouldfilterByChangedPaths) {
    info("Finding commits with path changes...");
    const {
      commitIdsMatchingPaths: commitIdsMatchingPathsRes,
      hasFoundCommits
    } = await findCommitsWithPathChange(params.config["include-paths"], {
      since,
      name: context.repo.repo,
      owner: context.repo.owner,
      targetCommitish: params.config.commitish
    });
    if (!hasFoundCommits) {
      return { commits: [], pullRequests: [] };
    }
    commitIdsMatchingPaths = commitIdsMatchingPathsRes;
    Object.entries(commitIdsMatchingPaths).forEach(([path, ids]) => {
      info(`Found ${ids.size} commits with changes to path "${path}"`);
    });
  }
  info(
    `Fetching parent commits of ${params.config["commitish"]}${since ? ` since ${since}` : ""}...`
  );
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
  commits = shouldfilterByChangedPaths ? commits.filter(
    (commit) => params.config["include-paths"].some(
      (path) => commitIdsMatchingPaths[path].has(commit.id)
    )
  ) : commits;
  if (shouldfilterByChangedPaths) {
    info(
      `After filtering by path changes, ${commits.length} commits remain.`
    );
  }
  const seen = /* @__PURE__ */ new Set();
  const pullRequestsRaw = commits.flatMap((commit) => commit.associatedPullRequests?.nodes ?? []).filter((pr) => pr != null).filter((pr) => {
    if (seen.has(pr.number)) return false;
    seen.add(pr.number);
    return true;
  });
  const pullRequests = pullRequestsRaw.filter(
    (pr) => (
      // Ensure PR is from the same repository
      pr.baseRepository?.nameWithOwner === `${context.repo.owner}/${context.repo.repo}` && // Ensure PR is merged
      pr.merged
    )
  );
  info(
    `Found ${pullRequestsRaw.length} pull requests associated with those commits. ${pullRequests.length} of those are merged and come from ${context.repo.owner}/${context.repo.repo}${pullRequests.length > 0 ? ` : ${pullRequests.map((pr) => `#${pr.number}`).join(", ")}` : "."}`
  );
  return { commits, pullRequests };
};
const sortPullRequests = (params) => {
  const {
    pullRequests,
    config: { "sort-by": sortBy, "sort-direction": sortDirection }
  } = params;
  const getSortField = sortBy === "title" ? getTitle : getMergedAt;
  const sort = sortDirection === "ascending" ? sortAscending : sortDescending;
  return structuredClone(pullRequests).sort((a, b) => {
    try {
      return sort(getSortField(a), getSortField(b));
    } catch (error$1) {
      warning(
        `Failed to sort pull-requests ${a.number} and ${b.number} by ${sortBy} in ${sortDirection} order. Returning unsorted.`
      );
      error(error$1);
      return 0;
    }
  });
};
const getTitle = (pr) => pr.title;
const getMergedAt = (pr) => pr.mergedAt;
const sortAscending = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
};
const sortDescending = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (a > b) return -1;
  if (a < b) return 1;
  return 0;
};
const renderTemplate = (params) => {
  const { template, object: object2, replacers } = params;
  let input = template.replace(/(\$[A-Z_]+)/g, (_, k) => {
    let result;
    const isValidKey = (key) => key in object2 && object2[key] !== void 0 && object2[key] !== null;
    if (!isValidKey(k)) {
      result = k;
    } else if (typeof object2[k] === "object") {
      result = renderTemplate({
        template: object2[k].template,
        object: object2[k]
      });
    } else {
      result = `${object2[k]}`;
    }
    return result;
  });
  if (replacers) {
    for (const { search, replace } of replacers) {
      input = input.replace(search, replace);
    }
  }
  return input;
};
const categorizePullRequests = (params) => {
  const { pullRequests, config } = params;
  const allCategoryLabels = new Set(
    config.categories.flatMap((category) => category.labels)
  );
  const uncategorizedPullRequests = [];
  const categorizedPullRequests = [...config.categories].map((category) => {
    return { ...category, pullRequests: [] };
  });
  const uncategorizedCategoryIndex = config.categories.findIndex(
    (category) => category.labels.length === 0
  );
  const filterUncategorizedPullRequests = (pullRequest) => {
    const labels = pullRequest.labels?.nodes || [];
    if (labels.length === 0 || !labels.some(
      (label) => !!label?.name && allCategoryLabels.has(label?.name)
    )) {
      if (uncategorizedCategoryIndex === -1) {
        uncategorizedPullRequests.push(pullRequest);
      } else {
        categorizedPullRequests[uncategorizedCategoryIndex].pullRequests.push(
          pullRequest
        );
      }
      return false;
    }
    return true;
  };
  const filteredPullRequests = pullRequests.filter(getFilterExcludedPullRequests(config["exclude-labels"])).filter(getFilterIncludedPullRequests(config["include-labels"])).filter((pullRequest) => filterUncategorizedPullRequests(pullRequest));
  for (const category of categorizedPullRequests) {
    for (const pullRequest of filteredPullRequests) {
      const labels = pullRequest.labels?.nodes || [];
      if (labels.some(
        (label) => !!label?.name && category.labels.includes(label.name)
      )) {
        category.pullRequests.push(pullRequest);
      }
    }
  }
  return [uncategorizedPullRequests, categorizedPullRequests];
};
const getFilterExcludedPullRequests = (excludeLabels) => {
  return (pullRequest) => {
    const labels = pullRequest.labels?.nodes || [];
    if (labels.some(
      (label) => !!label?.name && excludeLabels.includes(label.name)
    )) {
      return false;
    }
    return true;
  };
};
const getFilterIncludedPullRequests = (includeLabels) => {
  return (pullRequest) => {
    const labels = pullRequest.labels?.nodes || [];
    if (includeLabels.length === 0 || labels.some(
      (label) => !!label?.name && includeLabels.includes(label.name)
    )) {
      return true;
    }
    return false;
  };
};
const pullRequestToString = (params) => params.pullRequests.map((pullRequest) => {
  let pullAuthor = "ghost";
  if (pullRequest.author) {
    pullAuthor = pullRequest.author.__typename && pullRequest.author.__typename === "Bot" ? `[${pullRequest.author.login}[bot]](${pullRequest.author.url})` : pullRequest.author.login;
  }
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
const escapeTitle = (params) => (
  // If config['change-title-escapes'] contains backticks, then they will be escaped along with content contained inside backticks
  // If not, the entire backtick block is matched so that it will become a markdown code block without escaping any of its content
  params.title.replace(
    new RegExp(`[${escapeStringRegexp(params.escapes || "")}]|\`.*?\``, "g"),
    (match) => {
      if (match.length > 1) return match;
      if (match == "@" || match == "#") return `${match}<!---->`;
      return `\\${match}`;
    }
  )
);
const generateChangeLog = (params) => {
  const { pullRequests, config } = params;
  if (pullRequests.length === 0) {
    return config["no-changes-template"];
  }
  const [uncategorizedPullRequests, categorizedPullRequests] = categorizePullRequests({ pullRequests, config });
  const changeLog = [];
  if (uncategorizedPullRequests.length > 0) {
    changeLog.push(
      pullRequestToString({ pullRequests: uncategorizedPullRequests, config }),
      "\n\n"
    );
  }
  for (const [index, category] of categorizedPullRequests.entries()) {
    if (category.pullRequests.length === 0) {
      continue;
    }
    changeLog.push(
      renderTemplate({
        template: config["category-template"],
        object: { $TITLE: category.title }
      }),
      "\n\n"
    );
    const pullRequestString = pullRequestToString({
      pullRequests: category.pullRequests,
      config
    });
    const shouldCollapse = category["collapse-after"] !== 0 && category.pullRequests.length > category["collapse-after"];
    if (shouldCollapse) {
      changeLog.push(
        "<details>",
        "\n",
        `<summary>${category.pullRequests.length} changes</summary>`,
        "\n\n",
        pullRequestString,
        "\n",
        "</details>"
      );
    } else {
      changeLog.push(pullRequestString);
    }
    if (index + 1 !== categorizedPullRequests.length) changeLog.push("\n\n");
  }
  return changeLog.join("").trim();
};
const generateContributorsSentence = (params) => {
  const { commits, pullRequests, config } = params;
  const contributors = /* @__PURE__ */ new Set();
  for (const commit of commits) {
    if (commit.author?.user) {
      if (!config["exclude-contributors"].includes(commit.author.user.login)) {
        contributors.add(`@${commit.author.user.login}`);
      }
    } else if (commit.author?.name) {
      contributors.add(commit.author.name);
    }
  }
  for (const pullRequest of pullRequests) {
    if (pullRequest.author && !config["exclude-contributors"].includes(pullRequest.author.login)) {
      if (pullRequest.author.__typename === "Bot") {
        contributors.add(
          `[${pullRequest.author.login}[bot]](${pullRequest.author.url})`
        );
      } else {
        contributors.add(`@${pullRequest.author.login}`);
      }
    }
  }
  const sortedContributors = [...contributors].sort();
  if (sortedContributors.length > 1) {
    return sortedContributors.slice(0, -1).join(", ") + " and " + sortedContributors.slice(-1);
  } else if (sortedContributors.length === 1) {
    return sortedContributors[0];
  } else {
    return config["no-contributors-template"];
  }
};
const resolveVersionKeyIncrement = (params) => {
  const { pullRequests, config } = params;
  const priorityMap = {
    patch: 1,
    minor: 2,
    major: 3
  };
  const labelToKeyMap = Object.fromEntries(
    Object.keys(priorityMap).flatMap((key) => [
      config["version-resolver"][key].labels.map((label) => [label, key])
    ]).flat()
  );
  debug("labelToKeyMap: " + JSON.stringify(labelToKeyMap));
  const keys = pullRequests.filter(getFilterExcludedPullRequests(config["exclude-labels"])).filter(getFilterIncludedPullRequests(config["include-labels"])).flatMap(
    (pr) => pr.labels?.nodes?.filter((n) => !!n?.name).map((node) => labelToKeyMap[node.name])
  ).filter(Boolean);
  debug("keys: " + JSON.stringify(keys));
  const keyPriorities = keys.map((key) => priorityMap[key]);
  const priority = Math.max(...keyPriorities);
  const versionKey = Object.keys(priorityMap).find(
    (key) => priorityMap[key] === priority
  );
  debug("versionKey: " + versionKey);
  let versionKeyIncrement = versionKey || config["version-resolver"].default;
  const shouldIncrementAsPrerelease = config["prerelease"] && config["prerelease-identifier"];
  if (shouldIncrementAsPrerelease) {
    versionKeyIncrement = `pre${versionKeyIncrement}`;
  }
  info(
    `Version increment: ${versionKeyIncrement}${!versionKey ? " (default)" : ""}`
  );
  return versionKeyIncrement;
};
var debug_1;
var hasRequiredDebug;
function requireDebug() {
  if (hasRequiredDebug) return debug_1;
  hasRequiredDebug = 1;
  var define_process_env_default = {};
  const debug2 = typeof process === "object" && define_process_env_default && define_process_env_default.NODE_DEBUG && /\bsemver\b/i.test(define_process_env_default.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
  };
  debug_1 = debug2;
  return debug_1;
}
var constants;
var hasRequiredConstants;
function requireConstants() {
  if (hasRequiredConstants) return constants;
  hasRequiredConstants = 1;
  const SEMVER_SPEC_VERSION = "2.0.0";
  const MAX_LENGTH = 256;
  const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
  9007199254740991;
  const MAX_SAFE_COMPONENT_LENGTH = 16;
  const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
  const RELEASE_TYPES = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease"
  ];
  constants = {
    MAX_LENGTH,
    MAX_SAFE_COMPONENT_LENGTH,
    MAX_SAFE_BUILD_LENGTH,
    MAX_SAFE_INTEGER,
    RELEASE_TYPES,
    SEMVER_SPEC_VERSION,
    FLAG_INCLUDE_PRERELEASE: 1,
    FLAG_LOOSE: 2
  };
  return constants;
}
var re = { exports: {} };
var hasRequiredRe;
function requireRe() {
  if (hasRequiredRe) return re.exports;
  hasRequiredRe = 1;
  (function(module, exports$1) {
    const {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = requireConstants();
    const debug2 = requireDebug();
    exports$1 = module.exports = {};
    const re2 = exports$1.re = [];
    const safeRe = exports$1.safeRe = [];
    const src = exports$1.src = [];
    const safeSrc = exports$1.safeSrc = [];
    const t = exports$1.t = {};
    let R = 0;
    const LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    const safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    const makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    const createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug2(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re2[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports$1.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports$1.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports$1.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  })(re, re.exports);
  return re.exports;
}
var parseOptions_1;
var hasRequiredParseOptions;
function requireParseOptions() {
  if (hasRequiredParseOptions) return parseOptions_1;
  hasRequiredParseOptions = 1;
  const looseOption = Object.freeze({ loose: true });
  const emptyOpts = Object.freeze({});
  const parseOptions = (options) => {
    if (!options) {
      return emptyOpts;
    }
    if (typeof options !== "object") {
      return looseOption;
    }
    return options;
  };
  parseOptions_1 = parseOptions;
  return parseOptions_1;
}
var identifiers;
var hasRequiredIdentifiers;
function requireIdentifiers() {
  if (hasRequiredIdentifiers) return identifiers;
  hasRequiredIdentifiers = 1;
  const numeric = /^[0-9]+$/;
  const compareIdentifiers = (a, b) => {
    if (typeof a === "number" && typeof b === "number") {
      return a === b ? 0 : a < b ? -1 : 1;
    }
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (anum && bnum) {
      a = +a;
      b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
  };
  const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
  identifiers = {
    compareIdentifiers,
    rcompareIdentifiers
  };
  return identifiers;
}
var semver;
var hasRequiredSemver;
function requireSemver() {
  if (hasRequiredSemver) return semver;
  hasRequiredSemver = 1;
  const debug2 = requireDebug();
  const { MAX_LENGTH, MAX_SAFE_INTEGER } = requireConstants();
  const { safeRe: re2, t } = requireRe();
  const parseOptions = requireParseOptions();
  const { compareIdentifiers } = requireIdentifiers();
  class SemVer {
    constructor(version, options) {
      options = parseOptions(options);
      if (version instanceof SemVer) {
        if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
          return version;
        } else {
          version = version.version;
        }
      } else if (typeof version !== "string") {
        throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
      }
      if (version.length > MAX_LENGTH) {
        throw new TypeError(
          `version is longer than ${MAX_LENGTH} characters`
        );
      }
      debug2("SemVer", version, options);
      this.options = options;
      this.loose = !!options.loose;
      this.includePrerelease = !!options.includePrerelease;
      const m = version.trim().match(options.loose ? re2[t.LOOSE] : re2[t.FULL]);
      if (!m) {
        throw new TypeError(`Invalid Version: ${version}`);
      }
      this.raw = version;
      this.major = +m[1];
      this.minor = +m[2];
      this.patch = +m[3];
      if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
        throw new TypeError("Invalid major version");
      }
      if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
        throw new TypeError("Invalid minor version");
      }
      if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
        throw new TypeError("Invalid patch version");
      }
      if (!m[4]) {
        this.prerelease = [];
      } else {
        this.prerelease = m[4].split(".").map((id) => {
          if (/^[0-9]+$/.test(id)) {
            const num = +id;
            if (num >= 0 && num < MAX_SAFE_INTEGER) {
              return num;
            }
          }
          return id;
        });
      }
      this.build = m[5] ? m[5].split(".") : [];
      this.format();
    }
    format() {
      this.version = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease.length) {
        this.version += `-${this.prerelease.join(".")}`;
      }
      return this.version;
    }
    toString() {
      return this.version;
    }
    compare(other) {
      debug2("SemVer.compare", this.version, this.options, other);
      if (!(other instanceof SemVer)) {
        if (typeof other === "string" && other === this.version) {
          return 0;
        }
        other = new SemVer(other, this.options);
      }
      if (other.version === this.version) {
        return 0;
      }
      return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.major < other.major) {
        return -1;
      }
      if (this.major > other.major) {
        return 1;
      }
      if (this.minor < other.minor) {
        return -1;
      }
      if (this.minor > other.minor) {
        return 1;
      }
      if (this.patch < other.patch) {
        return -1;
      }
      if (this.patch > other.patch) {
        return 1;
      }
      return 0;
    }
    comparePre(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      if (this.prerelease.length && !other.prerelease.length) {
        return -1;
      } else if (!this.prerelease.length && other.prerelease.length) {
        return 1;
      } else if (!this.prerelease.length && !other.prerelease.length) {
        return 0;
      }
      let i = 0;
      do {
        const a = this.prerelease[i];
        const b = other.prerelease[i];
        debug2("prerelease compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    compareBuild(other) {
      if (!(other instanceof SemVer)) {
        other = new SemVer(other, this.options);
      }
      let i = 0;
      do {
        const a = this.build[i];
        const b = other.build[i];
        debug2("build compare", i, a, b);
        if (a === void 0 && b === void 0) {
          return 0;
        } else if (b === void 0) {
          return 1;
        } else if (a === void 0) {
          return -1;
        } else if (a === b) {
          continue;
        } else {
          return compareIdentifiers(a, b);
        }
      } while (++i);
    }
    // preminor will bump the version up to the next minor release, and immediately
    // down to pre-release. premajor and prepatch work the same way.
    inc(release, identifier, identifierBase) {
      if (release.startsWith("pre")) {
        if (!identifier && identifierBase === false) {
          throw new Error("invalid increment argument: identifier is empty");
        }
        if (identifier) {
          const match = `-${identifier}`.match(this.options.loose ? re2[t.PRERELEASELOOSE] : re2[t.PRERELEASE]);
          if (!match || match[1] !== identifier) {
            throw new Error(`invalid identifier: ${identifier}`);
          }
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
        // If the input is a non-prerelease version, this acts the same as
        // prepatch.
        case "prerelease":
          if (this.prerelease.length === 0) {
            this.inc("patch", identifier, identifierBase);
          }
          this.inc("pre", identifier, identifierBase);
          break;
        case "release":
          if (this.prerelease.length === 0) {
            throw new Error(`version ${this.raw} is not a prerelease`);
          }
          this.prerelease.length = 0;
          break;
        case "major":
          if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
            this.major++;
          }
          this.minor = 0;
          this.patch = 0;
          this.prerelease = [];
          break;
        case "minor":
          if (this.patch !== 0 || this.prerelease.length === 0) {
            this.minor++;
          }
          this.patch = 0;
          this.prerelease = [];
          break;
        case "patch":
          if (this.prerelease.length === 0) {
            this.patch++;
          }
          this.prerelease = [];
          break;
        // This probably shouldn't be used publicly.
        // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
        case "pre": {
          const base = Number(identifierBase) ? 1 : 0;
          if (this.prerelease.length === 0) {
            this.prerelease = [base];
          } else {
            let i = this.prerelease.length;
            while (--i >= 0) {
              if (typeof this.prerelease[i] === "number") {
                this.prerelease[i]++;
                i = -2;
              }
            }
            if (i === -1) {
              if (identifier === this.prerelease.join(".") && identifierBase === false) {
                throw new Error("invalid increment argument: identifier already exists");
              }
              this.prerelease.push(base);
            }
          }
          if (identifier) {
            let prerelease2 = [identifier, base];
            if (identifierBase === false) {
              prerelease2 = [identifier];
            }
            if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
              if (isNaN(this.prerelease[1])) {
                this.prerelease = prerelease2;
              }
            } else {
              this.prerelease = prerelease2;
            }
          }
          break;
        }
        default:
          throw new Error(`invalid increment argument: ${release}`);
      }
      this.raw = this.format();
      if (this.build.length) {
        this.raw += `+${this.build.join(".")}`;
      }
      return this;
    }
  }
  semver = SemVer;
  return semver;
}
var parse_1;
var hasRequiredParse;
function requireParse() {
  if (hasRequiredParse) return parse_1;
  hasRequiredParse = 1;
  const SemVer = requireSemver();
  const parse2 = (version, options, throwErrors = false) => {
    if (version instanceof SemVer) {
      return version;
    }
    try {
      return new SemVer(version, options);
    } catch (er) {
      if (!throwErrors) {
        return null;
      }
      throw er;
    }
  };
  parse_1 = parse2;
  return parse_1;
}
var coerce_1;
var hasRequiredCoerce;
function requireCoerce() {
  if (hasRequiredCoerce) return coerce_1;
  hasRequiredCoerce = 1;
  const SemVer = requireSemver();
  const parse2 = requireParse();
  const { safeRe: re2, t } = requireRe();
  const coerce2 = (version, options) => {
    if (version instanceof SemVer) {
      return version;
    }
    if (typeof version === "number") {
      version = String(version);
    }
    if (typeof version !== "string") {
      return null;
    }
    options = options || {};
    let match = null;
    if (!options.rtl) {
      match = version.match(options.includePrerelease ? re2[t.COERCEFULL] : re2[t.COERCE]);
    } else {
      const coerceRtlRegex = options.includePrerelease ? re2[t.COERCERTLFULL] : re2[t.COERCERTL];
      let next;
      while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
        if (!match || next.index + next[0].length !== match.index + match[0].length) {
          match = next;
        }
        coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
      }
      coerceRtlRegex.lastIndex = -1;
    }
    if (match === null) {
      return null;
    }
    const major2 = match[2];
    const minor2 = match[3] || "0";
    const patch2 = match[4] || "0";
    const prerelease2 = options.includePrerelease && match[5] ? `-${match[5]}` : "";
    const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
    return parse2(`${major2}.${minor2}.${patch2}${prerelease2}${build}`, options);
  };
  coerce_1 = coerce2;
  return coerce_1;
}
var coerceExports = requireCoerce();
const coerce = /* @__PURE__ */ getDefaultExportFromCjs(coerceExports);
var inc_1;
var hasRequiredInc;
function requireInc() {
  if (hasRequiredInc) return inc_1;
  hasRequiredInc = 1;
  const SemVer = requireSemver();
  const inc2 = (version, release, options, identifier, identifierBase) => {
    if (typeof options === "string") {
      identifierBase = identifier;
      identifier = options;
      options = void 0;
    }
    try {
      return new SemVer(
        version instanceof SemVer ? version.version : version,
        options
      ).inc(release, identifier, identifierBase).version;
    } catch (er) {
      return null;
    }
  };
  inc_1 = inc2;
  return inc_1;
}
var incExports = requireInc();
const inc = /* @__PURE__ */ getDefaultExportFromCjs(incExports);
var major_1;
var hasRequiredMajor;
function requireMajor() {
  if (hasRequiredMajor) return major_1;
  hasRequiredMajor = 1;
  const SemVer = requireSemver();
  const major2 = (a, loose) => new SemVer(a, loose).major;
  major_1 = major2;
  return major_1;
}
var majorExports = requireMajor();
const major = /* @__PURE__ */ getDefaultExportFromCjs(majorExports);
var minor_1;
var hasRequiredMinor;
function requireMinor() {
  if (hasRequiredMinor) return minor_1;
  hasRequiredMinor = 1;
  const SemVer = requireSemver();
  const minor2 = (a, loose) => new SemVer(a, loose).minor;
  minor_1 = minor2;
  return minor_1;
}
var minorExports = requireMinor();
const minor = /* @__PURE__ */ getDefaultExportFromCjs(minorExports);
var parseExports = requireParse();
const parse = /* @__PURE__ */ getDefaultExportFromCjs(parseExports);
var patch_1;
var hasRequiredPatch;
function requirePatch() {
  if (hasRequiredPatch) return patch_1;
  hasRequiredPatch = 1;
  const SemVer = requireSemver();
  const patch2 = (a, loose) => new SemVer(a, loose).patch;
  patch_1 = patch2;
  return patch_1;
}
var patchExports = requirePatch();
const patch = /* @__PURE__ */ getDefaultExportFromCjs(patchExports);
var prerelease_1;
var hasRequiredPrerelease;
function requirePrerelease() {
  if (hasRequiredPrerelease) return prerelease_1;
  hasRequiredPrerelease = 1;
  const parse2 = requireParse();
  const prerelease2 = (version, options) => {
    const parsed = parse2(version, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
  };
  prerelease_1 = prerelease2;
  return prerelease_1;
}
var prereleaseExports = requirePrerelease();
const prerelease = /* @__PURE__ */ getDefaultExportFromCjs(prereleaseExports);
const DEFAULT_VERSION_TEMPLATE = "$MAJOR.$MINOR.$PATCH";
const getVersionInfo = (params) => {
  const {
    lastRelease,
    config,
    input,
    versionKeyIncrement: _versionKeyIncrement
  } = params;
  let versionKeyIncrement = _versionKeyIncrement;
  const lastReleaseVersion = coerceVersion(lastRelease, {
    tagPrefix: config["tag-prefix"]
  });
  const inputVersion = coerceVersion(
    /**
     * Use the first override parameter to identify
     * a version, from the most accurate to the least
     */
    input.version || input.tag || input.name,
    {
      tagPrefix: config["tag-prefix"]
    }
  );
  const isPreVersionKeyIncrement = versionKeyIncrement?.startsWith("pre");
  if (!lastReleaseVersion && !inputVersion) {
    if (isPreVersionKeyIncrement) {
      defaultVersionInfo["$RESOLVED_VERSION"] = structuredClone(
        defaultVersionInfo["$NEXT_PRERELEASE_VERSION"]
      );
    }
    if (config["version-template"] && config["version-template"] !== DEFAULT_VERSION_TEMPLATE) {
      const defaultVersion = toSemver("0.1.0");
      const templateableVersion2 = getTemplatableVersion({
        version: defaultVersion,
        template: config["version-template"],
        inputVersion,
        versionKeyIncrement: versionKeyIncrement || "patch",
        preReleaseIdentifier: config["prerelease-identifier"]
      });
      for (const key of Object.keys(templateableVersion2)) {
        const keyTyped = key;
        if (templateableVersion2[keyTyped] && typeof templateableVersion2[keyTyped] === "object" && templateableVersion2[keyTyped].template) {
          templateableVersion2[keyTyped].version = renderTemplate({
            template: templateableVersion2[keyTyped].template,
            object: templateableVersion2[keyTyped]
          });
        }
      }
      let resolvedVersionObj = splitSemVersion({
        version: defaultVersion,
        template: config["version-template"],
        inputVersion,
        versionKeyIncrement: versionKeyIncrement || "patch",
        preReleaseIdentifier: config["prerelease-identifier"]
      });
      if (!resolvedVersionObj) {
        throw new Error("Failed to generate resolved version object");
      }
      resolvedVersionObj = {
        ...resolvedVersionObj,
        version: renderTemplate({
          template: config["version-template"],
          object: resolvedVersionObj
        })
      };
      templateableVersion2.$RESOLVED_VERSION = resolvedVersionObj;
      return templateableVersion2;
    }
    return defaultVersionInfo;
  }
  const shouldIncrementAsPrerelease = isPreVersionKeyIncrement && lastReleaseVersion?.prerelease?.length;
  if (shouldIncrementAsPrerelease) {
    versionKeyIncrement = "prerelease";
  }
  const templateableVersion = getTemplatableVersion({
    version: lastReleaseVersion,
    template: config["version-template"],
    inputVersion,
    versionKeyIncrement,
    preReleaseIdentifier: config["prerelease-identifier"]
  });
  if (config["version-template"] && config["version-template"] !== DEFAULT_VERSION_TEMPLATE) {
    for (const key of Object.keys(templateableVersion)) {
      const keyTyped = key;
      if (templateableVersion[keyTyped] && typeof templateableVersion[keyTyped] === "object" && templateableVersion[keyTyped].template) {
        templateableVersion[keyTyped].version = renderTemplate({
          template: templateableVersion[keyTyped].template,
          object: templateableVersion[keyTyped]
        });
      }
    }
  }
  return templateableVersion;
};
const toSemver = (version) => {
  const result = parse(version);
  if (result) {
    return result;
  }
  return coerce(version);
};
const coerceVersion = (input, opt) => {
  if (!input) {
    return null;
  }
  const stripTag = (input2) => !!opt?.tagPrefix && input2?.startsWith(opt.tagPrefix) ? input2.slice(opt.tagPrefix.length) : input2;
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
const splitSemVersion = (input, versionKey = "version") => {
  if (!input?.[versionKey]) {
    return;
  }
  const version = input.inc ? inc(input[versionKey], input.inc, true, input.preReleaseIdentifier) : typeof input[versionKey] === "string" ? input[versionKey] : input[versionKey].version;
  const prereleaseVersion = !version ? "" : prerelease(version)?.join(".") || "";
  return {
    ...input,
    version,
    $MAJOR: major(version || ""),
    $MINOR: minor(version || ""),
    $PATCH: patch(version || ""),
    $PRERELEASE: prereleaseVersion ? `-${prereleaseVersion}` : "",
    $COMPLETE: version
  };
};
const getTemplatableVersion = (input) => {
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
    $NEXT_MINOR_VERSION: splitSemVersion({ ...input, inc: "minor" }),
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
    $NEXT_PATCH_VERSION: splitSemVersion({ ...input, inc: "patch" }),
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
      $CHANGES: generateChangeLog({ pullRequests: sortedPullRequests, config }),
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
  const versionKeyIncrement = resolveVersionKeyIncrement({
    pullRequests,
    config
  });
  const versionInfo = getVersionInfo({
    lastRelease,
    config,
    input,
    versionKeyIncrement
  });
  debug("versionInfo: " + JSON.stringify(versionInfo, null, 2));
  if (versionInfo) {
    body = renderTemplate({ template: body, object: versionInfo });
  }
  let mutableInputTag = structuredClone(input["tag"]);
  let mutableInputName = structuredClone(input["name"]);
  let mutableCommitish = structuredClone(config["commitish"]);
  if (mutableInputTag === void 0) {
    mutableInputTag = versionInfo ? renderTemplate({
      template: config["tag-template"] || "",
      object: versionInfo
    }) : "";
  } else if (versionInfo) {
    mutableInputTag = renderTemplate({
      template: mutableInputTag,
      object: versionInfo
    });
  }
  debug("tag: " + mutableInputTag);
  if (mutableInputName === void 0) {
    mutableInputName = versionInfo ? renderTemplate({
      template: config["name-template"] || "",
      object: versionInfo
    }) : "";
  } else if (versionInfo) {
    mutableInputName = renderTemplate({
      template: mutableInputName,
      object: versionInfo
    });
  }
  debug("name: " + mutableInputName);
  if (mutableCommitish.startsWith("refs/tags/")) {
    info(
      `${mutableCommitish} is not supported as release target, falling back to default branch`
    );
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
  info(
    `  draft:             ${res.draft}${!res.draft ? " (will be published !)" : ""}`
  );
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
  if (!updateReleaseParameters.name) {
    delete updateReleaseParameters.name;
  }
  if (!updateReleaseParameters.tag_name) {
    delete updateReleaseParameters.tag_name;
  }
  if (!updateReleaseParameters.target_commitish) {
    delete updateReleaseParameters.target_commitish;
  }
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
    const res = await createRelease({
      releasePayload
    });
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
  const upsertedRelease = await upsertRelease({ draftRelease, releasePayload });
  return {
    upsertedRelease,
    releasePayload
  };
};
const setActionOutput = (params) => {
  const { releasePayload, upsertedRelease } = params;
  info("Set action outputs...");
  const {
    data: {
      id: releaseId,
      html_url: htmlUrl,
      upload_url: uploadUrl,
      tag_name: tagName,
      name
    }
  } = upsertedRelease;
  const { resolvedVersion, majorVersion, minorVersion, patchVersion, body } = releasePayload;
  if (releaseId && Number.isInteger(releaseId))
    setOutput("id", releaseId.toString());
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
  /**
   * A boolean indicating whether the release being created or updated should be marked as latest.
   */
  latest: stringbool().or(boolean()).optional(),
  /**
   * Whether to draft a prerelease, with changes since another prerelease (if applicable). Default `false`.
   */
  prerelease: stringbool().or(boolean()).optional(),
  /**
   * When drafting your first release, limit the amount of scanned commits. Expects an ISO 8601 date. Default: undefined (scan all commits).
   * @see https://zod.dev/api?id=iso-dates#iso-datetimes
   */
  "initial-commits-since": datetime().optional(),
  /**
   * A string indicating an identifier (alpha, beta, rc, etc), to increment the prerelease version. This automatically enables `prerelease` if not already set to `true`. Default `''`.
   */
  "prerelease-identifier": string().optional(),
  /**
   * The release target, i.e. branch or commit it should point to. Default: the ref that release-drafter runs for, e.g. `refs/heads/master` if configured to run on pushes to `master`.
   */
  commitish: string().optional(),
  /**
   * A string that would be added before the template body.
   */
  header: string().optional(),
  /**
   * A string that would be added after the template body.
   */
  footer: string().optional()
});
const exclusiveInputSchema = object({
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
}).and(sharedInputSchema);
const actionInputSchema = exclusiveInputSchema.and(commonConfigSchema);
const exclusiveConfigSchema = object({
  /**
   * The template to use for each merged pull request.
   */
  "change-template": string().optional().default("* $TITLE (#$NUMBER) @$AUTHOR"),
  /**
   * Characters to escape in `$TITLE` when inserting into `change-template` so that they are not interpreted as Markdown format characters.
   */
  "change-title-escapes": string().optional(),
  /**
   * The template to use for when there’s no changes.
   */
  "no-changes-template": string().optional().default("* No changes"),
  /**
   * The template to use when calculating the next version number for the release. Useful for projects that don't use semantic versioning.
   */
  "version-template": string().optional().default("$MAJOR.$MINOR.$PATCH$PRERELEASE"),
  /**
   * The template for the name of the draft release.
   */
  "name-template": string().optional(),
  /**
   * A known prefix used to filter release tags. For matching tags, this prefix is stripped before attempting to parse the version.
   */
  "tag-prefix": string().optional(),
  /**
   * The template for the tag of the draft release.
   */
  "tag-template": string().optional(),
  /**
   * Exclude pull requests using labels.
   */
  "exclude-labels": array(string()).optional().default([]),
  /**
   * Include only the specified pull requests using labels.
   */
  "include-labels": array(string()).optional().default([]),
  /**
   * Restrict pull requests included in the release notes to only the pull requests that modified any of the paths in this array. Supports files and directories.
   */
  "include-paths": array(string()).optional().default([]),
  /**
   * Exclude specific usernames from the generated `$CONTRIBUTORS` variable.
   */
  "exclude-contributors": array(string()).optional().default([]),
  /**
   * The template to use for `$CONTRIBUTORS` when there's no contributors to list.
   */
  "no-contributors-template": string().optional().default("No contributors"),
  /**
   * Sort changelog by merged_at or title.
   */
  "sort-by": _enum(["merged_at", "title"]).optional().default("merged_at"),
  /**
   * Sort changelog in ascending or descending order.
   */
  "sort-direction": _enum(["ascending", "descending"]).optional().default("descending"),
  /**
   * Filter previous releases to consider only those with the target matching `commitish`.
   */
  "filter-by-commitish": boolean().optional().default(false),
  "pull-request-limit": number().int().positive().optional().default(5),
  /**
   * Size of the pagination window when walking the repo. Can avoid erratic 502s from Github. Default: `15`
   */
  "history-limit": number().int().positive().optional().default(15),
  /**
   * Search and replace content in the generated changelog body.
   */
  replacers: array(
    object({
      search: string().min(1),
      replace: string().min(0)
    })
  ).optional().default([]),
  /**
   * Categorize pull requests using labels.
   */
  categories: array(
    object({
      title: string().min(1),
      "collapse-after": number().int().min(0).optional().default(0),
      labels: array(string().min(1)).optional().default([]),
      label: string().min(1).optional()
    })
  ).optional().default([]),
  /**
   * Adjust the `$RESOLVED_VERSION` variable using labels.
   */
  "version-resolver": object({
    major: object({
      labels: array(string().min(1))
    }).optional().default({ labels: [] }),
    minor: object({
      labels: array(string().min(1))
    }).optional().default({ labels: [] }),
    patch: object({
      labels: array(string().min(1))
    }).optional().default({ labels: [] }),
    default: _enum(["major", "minor", "patch"]).optional().default("patch")
  }).optional().default({
    major: { labels: [] },
    minor: { labels: [] },
    patch: { labels: [] },
    default: "patch"
  }),
  /**
   * The template to use for each category.
   */
  "category-template": string().optional().default("## $TITLE"),
  /**
   * The template for the body of the draft release.
   */
  template: string().min(1)
}).meta({
  title: "JSON schema for Release Drafter yaml files",
  id: "https://github.com/release-drafter/release-drafter/blob/master/drafter/schema.json"
});
const configSchema = exclusiveConfigSchema.and(commonConfigSchema);
const getActionInput = () => {
  const getInput$1 = (name) => getInput(name) || void 0;
  return actionInputSchema.parse({
    // exclusive to action input
    "config-name": getInput$1("config-name"),
    name: getInput$1("name"),
    tag: getInput$1("tag"),
    version: getInput$1("version"),
    publish: getInput$1("publish"),
    token: getInput$1("token"),
    // can override the config
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
    if (config.commitish && config.commitish !== input.commitish) {
      info(
        `Input's commitish "${input.commitish}" overrides config's commitish "${config.commitish}"`
      );
    }
    config.commitish = input.commitish;
  }
  if (input.header) {
    if (config.header && config.header !== input.header) {
      info(
        `Input's header "${input.header}" overrides config's header "${config.header}"`
      );
    }
    config.header = input.header;
  }
  if (input.footer) {
    if (config.footer && config.footer !== input.footer) {
      info(
        `Input's footer "${input.footer}" overrides config's footer "${config.footer}"`
      );
    }
    config.footer = input.footer;
  }
  if (input["prerelease-identifier"]) {
    if (config["prerelease-identifier"] && config["prerelease-identifier"] !== input["prerelease-identifier"]) {
      info(
        `Input's prerelease-identifier "${input["prerelease-identifier"]}" overrides config's prerelease-identifier "${config["prerelease-identifier"]}"`
      );
    }
    config["prerelease-identifier"] = input["prerelease-identifier"];
  }
  if (typeof input.prerelease === "boolean") {
    if (typeof config.prerelease === "boolean" && config.prerelease !== input.prerelease) {
      info(
        `Input's prerelease "${input.prerelease}" overrides config's prerelease "${config.prerelease}"`
      );
    }
    config.prerelease = input.prerelease;
  }
  if (typeof input.latest === "boolean") {
    if (typeof config.latest === "boolean" && config.latest !== input.latest) {
      info(
        `Input's latest "${input.latest}" overrides config's latest "${config.latest}"`
      );
    }
    config.latest = input.latest;
  }
  if (config.latest && config.prerelease) {
    warning(
      "'prerelease' and 'latest' cannot be both true. Switch 'latest' to false - release will be a pre-release."
    );
    config.latest = false;
  }
  if (config["prerelease-identifier"] && !config.prerelease) {
    warning(
      `You specified a 'prerelease-identifier' (${config["prerelease-identifier"]}), but 'prerelease' is set to false. Switching to true.`
    );
    config.prerelease = true;
  }
  const commitish = config.commitish || context.ref || context.payload.ref;
  const latest = typeof config.latest !== "boolean" ? true : config.latest;
  const prerelease2 = typeof config.prerelease !== "boolean" ? false : config.prerelease;
  const replacers = config.replacers.map((r) => {
    try {
      return { ...r, search: stringToRegex(r.search) };
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
    prerelease: prerelease2,
    replacers,
    categories
  };
  if (!parsedConfig.commitish) {
    throw new Error(
      "'commitish' is required. Please set 'commitish' to a valid value. (defaults to the current ref, but it seems to be undefined in this context)"
    );
  }
  if (parsedConfig.categories.filter((category) => category.labels.length === 0).length > 1) {
    throw new Error(
      "Multiple categories detected with no labels. Only one category with no labels is supported for uncategorized pull requests."
    );
  }
  return parsedConfig;
};
const getConfig = async (configName) => {
  const { config, contexts } = await composeConfigGet(configName, context);
  if (contexts.length > 1) {
    info(`Config was fetched from ${contexts.length} different contexts.`);
  } else if (contexts.length === 1) {
    info(
      `Config fetched ${contexts[0].scheme === "file" ? "locally." : `on remote "${contexts[0].repo.owner}/${contexts[0].repo.repo}${contexts[0].ref ? `@${contexts[0].ref}` : ""}"${!contexts[0].ref ? " on the default branch" : ""}`}.`
    );
  }
  return configSchema.parse(config);
};
async function run() {
  try {
    info("Parsing inputs and configuration...");
    const input = getActionInput();
    const config = mergeInputAndConfig({
      config: await getConfig(input["config-name"]),
      input
    });
    const { upsertedRelease, releasePayload } = await main({ input, config });
    setActionOutput({
      upsertedRelease,
      releasePayload
    });
  } catch (error2) {
    if (error2 instanceof Error) setFailed(error2.message);
  }
}
await run();
