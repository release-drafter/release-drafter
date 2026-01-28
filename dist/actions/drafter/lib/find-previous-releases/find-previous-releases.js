import { c as coreExports } from "../../../../core.js";
import "../../../../types/action-input.schema.js";
import "../../../../types/config.schema.js";
import "path";
import "fs";
import "../../../../isBoolean.js";
import "../../../../lexer.js";
import "../../../../common/string-to-regex.js";
import { getOctokit } from "../../../../common/get-octokit.js";
import "../../../../lodash.js";
import { g as githubExports } from "../../../../github.js";
import { sortReleases } from "./sort-releases.js";
const RELEASE_COUNT_LIMIT = 1e3;
const findPreviousReleases = async (params) => {
  const {
    commitish,
    "filter-by-commitish": filterByCommitish,
    "include-pre-releases": includePreReleases,
    "tag-prefix": tagPrefix
  } = params;
  const octokit = getOctokit();
  coreExports.info("Fetching releases from GitHub...");
  let releaseCount = 0;
  const releases = await octokit.paginate(
    octokit.rest.repos.listReleases,
    {
      ...githubExports.context.repo,
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
  coreExports.info(`Found ${releases.length} releases`);
  const headRefRegex = /^refs\/heads\//;
  const targetCommitishName = commitish.replace(headRefRegex, "");
  const commitishFilteredReleases = filterByCommitish ? releases.filter(
    (r) => targetCommitishName === r.target_commitish.replace(headRefRegex, "")
  ) : releases;
  const filteredReleases = tagPrefix ? commitishFilteredReleases.filter((r) => r.tag_name.startsWith(tagPrefix)) : commitishFilteredReleases;
  const sortedSelectedReleases = sortReleases({
    releases: filteredReleases.filter(
      (r) => !r.draft && (!r.prerelease || includePreReleases)
    ),
    tagPrefix
  });
  const draftRelease = filteredReleases.find(
    (r) => r.draft && r.prerelease === includePreReleases
  );
  const lastRelease = sortedSelectedReleases.at(-1);
  if (draftRelease) {
    coreExports.info(`Draft release: ${draftRelease.tag_name}`);
  } else {
    coreExports.info(`No draft release found`);
  }
  if (lastRelease) {
    coreExports.info(
      `Last release${includePreReleases ? " (including prerelease)" : ""}: ${lastRelease.tag_name}`
    );
  } else {
    coreExports.info(`No last release found`);
  }
  return { draftRelease, lastRelease };
};
export {
  findPreviousReleases
};
