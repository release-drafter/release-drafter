import "../../../../lodash.js";
import "../../../../lexer.js";
import "path";
import "fs";
import { c as coreExports } from "../../../../core.js";
import { getOctokit } from "../../../../common/get-octokit.js";
import "../../../../index.js";
import "../../../../common/shared-input.schema.js";
import { c as context } from "../../../../github.js";
import { sortReleases } from "./sort-releases.js";
const RELEASE_COUNT_LIMIT = 1e3;
const findPreviousReleases = async (params) => {
  const {
    commitish,
    "filter-by-commitish": filterByCommitish,
    "tag-prefix": tagPrefix,
    prerelease: isPreRelease
  } = params;
  const octokit = getOctokit();
  coreExports.info("Fetching releases from GitHub...");
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
  coreExports.info(`Found ${releases.length} releases`);
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
      coreExports.warning(
        `Multiple draft releases found : ${draftReleases.map((r) => r.tag_name).join(", ")}`
      );
      coreExports.warning(
        `Using the first one returned by GitHub API: ${draftRelease.tag_name}`
      );
    }
    coreExports.info(`Draft release${isPreRelease ? " (which is a prerelease)" : ""}:`);
    coreExports.info(`  tag_name:  ${draftRelease.tag_name}`);
    coreExports.info(`  name:      ${draftRelease.name}`);
  } else {
    coreExports.info(
      `No draft release found${isPreRelease ? " (among prerelease drafts)" : ""}`
    );
  }
  if (lastRelease) {
    coreExports.info(`Last release${isPreRelease ? " (including prerelease)" : ""}:`);
    coreExports.info(`  tag_name:  ${lastRelease.tag_name}`);
    coreExports.info(`  name:      ${lastRelease.name}`);
  } else {
    coreExports.info(
      `No last release found${isPreRelease ? " (including prerelease)" : ""}`
    );
  }
  return { draftRelease, lastRelease };
};
export {
  findPreviousReleases
};
