import { categorizePullRequests } from "./categorize-pull-requests.js";
import { pullRequestToString } from "./pull-request-to-string.js";
import { renderTemplate } from "./render-template.js";
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
export {
  generateChangeLog
};
//# sourceMappingURL=generate-changelog.js.map
