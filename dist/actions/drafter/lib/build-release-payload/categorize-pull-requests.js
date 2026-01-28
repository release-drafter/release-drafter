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
export {
  categorizePullRequests,
  getFilterExcludedPullRequests,
  getFilterIncludedPullRequests
};
//# sourceMappingURL=categorize-pull-requests.js.map
