import { z } from "../../../external.js";
import { c as coreExports } from "../../../core.js";
import { g as githubExports } from "../../../github.js";
import { stringToRegex } from "../../../common/string-to-regex.js";
const configSchema = z.object({
  /**
   * The template to use for each merged pull request.
   */
  "change-template": z.string().optional().default("* $TITLE (#$NUMBER) @$AUTHOR"),
  /**
   * Characters to escape in `$TITLE` when inserting into `change-template` so that they are not interpreted as Markdown format characters.
   */
  "change-title-escapes": z.string().optional(),
  /**
   * The template to use for when there’s no changes.
   */
  "no-changes-template": z.string().optional().default("* No changes"),
  /**
   * The template to use when calculating the next version number for the release. Useful for projects that don't use semantic versioning.
   */
  "version-template": z.string().optional().default("$MAJOR.$MINOR.$PATCH$PRERELEASE"),
  /**
   * The template for the name of the draft release.
   */
  "name-template": z.string().optional(),
  /**
   * A known prefix used to filter release tags. For matching tags, this prefix is stripped before attempting to parse the version.
   */
  "tag-prefix": z.string().optional(),
  /**
   * The template for the tag of the draft release.
   */
  "tag-template": z.string().optional(),
  /**
   * Exclude pull requests using labels.
   */
  "exclude-labels": z.array(z.string()).optional().default([]),
  /**
   * Include only the specified pull requests using labels.
   */
  "include-labels": z.array(z.string()).optional().default([]),
  /**
   * Restrict pull requests included in the release notes to only the pull requests that modified any of the paths in this array. Supports files and directories.
   */
  "include-paths": z.array(z.string()).optional().default([]),
  /**
   * Exclude specific usernames from the generated `$CONTRIBUTORS` variable.
   */
  "exclude-contributors": z.array(z.string()).optional().default([]),
  /**
   * The template to use for `$CONTRIBUTORS` when there's no contributors to list.
   */
  "no-contributors-template": z.string().optional().default("No contributors"),
  /**
   * Sort changelog by merged_at or title.
   */
  "sort-by": z.enum(["merged_at", "title"]).optional().default("merged_at"),
  /**
   * Sort changelog in ascending or descending order.
   */
  "sort-direction": z.enum(["ascending", "descending"]).optional().default("descending"),
  /**
   * Mark the draft release as pre-release.
   */
  prerelease: z.boolean().optional().default(false),
  "prerelease-identifier": z.string().optional(),
  /**
   * Mark the release as latest. Only works for published releases.
   */
  latest: z.stringbool().optional().default(true),
  /**
   * Filter previous releases to consider only those with the target matching `commitish`.
   */
  "filter-by-commitish": z.boolean().optional().default(false),
  /**
   * When drafting your first release, limit the amount of scanned commits. Expects an ISO 8601 date. Default: undefined (scan all commits).
   * @see https://zod.dev/api?id=iso-dates#iso-datetimes
   */
  "initial-commits-since": z.iso.datetime().optional(),
  /**
   * Include pre releases as "full" releases when drafting release notes.
   */
  "include-pre-releases": z.boolean().optional().default(false),
  /**
   * The release target, i.e. branch or commit it should point to. Default: the ref that release-drafter runs for, e.g. `refs/heads/master` if configured to run on pushes to `master`.
   */
  commitish: z.string().optional().default(githubExports.context.ref || githubExports.context.payload.ref),
  "pull-request-limit": z.number().int().positive().optional().default(5),
  /**
   * Size of the pagination window when walking the repo. Can avoid erratic 502s from Github. Default: `15`
   */
  "history-limit": z.number().int().positive().optional().default(15),
  /**
   * Search and replace content in the generated changelog body.
   */
  replacers: z.array(
    z.object({
      search: z.string().min(1),
      replace: z.string().min(0)
    })
  ).optional().default([]).transform(
    (replacers) => (
      // convert 'search' to regex and remove invalid entries
      replacers.map((r) => {
        try {
          return { ...r, search: stringToRegex(r.search) };
        } catch {
          coreExports.warning(`Bad replacer regex: '${r.search}'`);
          return false;
        }
      }).filter((r) => !!r)
    )
  ),
  /**
   * Categorize pull requests using labels.
   */
  categories: z.array(
    z.object({
      title: z.string().min(1),
      "collapse-after": z.number().int().min(0).optional().default(0),
      labels: z.array(z.string().min(1)).optional().default([])
    })
  ).optional().default([]),
  /**
   * Adjust the `$RESOLVED_VERSION` variable using labels.
   */
  "version-resolver": z.object({
    major: z.object({
      labels: z.array(z.string().min(1)).optional().default([])
    }),
    minor: z.object({
      labels: z.array(z.string().min(1)).optional().default([])
    }),
    patch: z.object({
      labels: z.array(z.string().min(1)).optional().default([])
    }),
    default: z.enum(["major", "minor", "patch"]).optional().default("patch")
  }).optional().default({
    major: { labels: [] },
    minor: { labels: [] },
    patch: { labels: [] },
    default: "patch"
  }),
  /**
   * The template to use for each category.
   */
  "category-template": z.string().optional().default("## $TITLE"),
  /**
   * Will be prepended to `template`.
   */
  header: z.string().optional(),
  /**
   * The template for the body of the draft release.
   */
  template: z.string().min(1),
  /**
   * Will be appended to `template`.
   */
  footer: z.string().optional(),
  _extends: z.string().optional()
}).superRefine((config, ctx) => {
  const uncategorizedCategories = config.categories.filter(
    (category) => category.labels.length === 0
  );
  if (uncategorizedCategories.length > 1) {
    ctx.addIssue({
      code: "custom",
      message: "Multiple categories detected with no labels. Only one category with no labels is supported for uncategorized pull requests."
    });
  }
  if (config.latest && config.prerelease) {
    ctx.addIssue({
      code: "custom",
      message: "'prerelease' and 'latest' cannot both be truthy."
    });
  }
});
export {
  configSchema
};
