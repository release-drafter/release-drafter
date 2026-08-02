export const CORE_PACKAGE_NAME = '@release-drafter/core' as const

export * from './category-matching.ts'
export * from './config/index.ts'
export * from './ports.ts'
export { buildReleasePayload } from './release/build-release-payload.ts'
export { categorizePullRequests } from './release/categorize-pull-requests.ts'
export { generateChangeLog } from './release/generate-changelog.ts'
export {
  generateAuthorsSentence,
  generateContributorsSentence,
  generateNewContributorsList,
} from './release/generate-contributors-sentence.ts'
export { getVersionInfo } from './release/get-version-info.ts'
export { pullRequestToString } from './release/pull-request-to-string.ts'
export { renderReleaseName } from './release/render-release-name.ts'
export { renderTagName } from './release/render-tag-name.ts'
export {
  type NestedTemplate,
  renderTemplate,
  type Template,
} from './release/render-template/index.ts'
export { resolveVersionKeyIncrement } from './release/resolve-version-increment.ts'
export { sortPullRequests } from './release/sort-pull-requests.ts'
export { VersionDescriptor } from './release/version-descriptor.ts'
export * from './release-orchestration.ts'
export * from './types.ts'
