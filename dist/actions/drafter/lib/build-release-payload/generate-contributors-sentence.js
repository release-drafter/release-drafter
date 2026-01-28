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
export {
  generateContributorsSentence
};
//# sourceMappingURL=generate-contributors-sentence.js.map
