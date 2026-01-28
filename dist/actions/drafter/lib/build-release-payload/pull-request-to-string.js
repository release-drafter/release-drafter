import { renderTemplate } from "./render-template.js";
import { e as escapeStringRegexp } from "../../../../index2.js";
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
export {
  pullRequestToString
};
