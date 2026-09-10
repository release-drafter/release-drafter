import type { ActionInput as AutolabelerActionInput } from '#gh-actions/autolabeler/action-input.schema.ts'
import type { ActionInput as CheckPrActionInput } from '#gh-actions/check-pr/action-input.schema.ts'
import type { ActionInput as DrafterActionInput } from '#gh-actions/drafter/action-input.schema.ts'

export type ActionParameterMetadata = {
  description: string
  required?: boolean
  default?: string
}

type StringKeyOf<Value> = Extract<keyof Value, string>
type ExactInputMetadata<
  Input,
  Metadata extends Record<string, ActionParameterMetadata>,
> = Metadata &
  Record<Exclude<StringKeyOf<Input>, keyof Metadata>, never> &
  Record<Exclude<keyof Metadata, StringKeyOf<Input>>, never>

const defineActionInputs =
  <Input>() =>
  <const Metadata extends Record<string, ActionParameterMetadata>>(
    metadata: ExactInputMetadata<Input, Metadata>,
  ): Metadata =>
    metadata

const drafterInputs = defineActionInputs<DrafterActionInput>()({
  'config-name': {
    description:
      "Release Drafter configuration target.\nA relative path starts in the repository's `.github` directory.\n",
    required: false,
    default: 'release-drafter.yml',
  },
  token: {
    description:
      'Access token for GitHub API requests. Default: github.token.\n',
    default: `\${{ github.token }}`,
  },
  name: {
    description: 'Release name. This value overrides `name-template`.\n',
    required: false,
  },
  tag: {
    description: 'Release tag. This value overrides `tag-template`.\n',
    required: false,
  },
  version: {
    description:
      'Release version. This value overrides the calculated version.\n',
    required: false,
  },
  from: {
    description:
      'Ref, tag, branch, or commit SHA to use as the change comparison baseline.\nThis value does not select the release version or the draft release to update.\n',
    required: false,
  },
  publish: {
    description: 'Publishes the created or updated release immediately.\n',
    required: false,
    default: '',
  },
  latest: {
    description: 'Marks the created or updated release as latest.\n',
    required: false,
    default: '',
  },
  prerelease: {
    description:
      'Creates a prerelease and includes changes since the previous prerelease when one exists. Default: `false`.\n',
    required: false,
    default: '',
  },
  'prerelease-identifier': {
    description:
      'Prerelease identifier, such as `alpha`, `beta`, or `rc`.\nThis input enables `prerelease`.\n',
    required: false,
    default: '',
  },
  'include-pre-releases': {
    description:
      'Includes prereleases when Release Drafter selects the last published release.\nThis input has no effect when `prerelease` is `true`. Default: `false`.\n',
    required: false,
    default: '',
  },
  commitish: {
    description:
      'Release target. Use a branch, commit SHA, fully qualified tag, or pull request ref.\nRelease Drafter resolves tag and pull request refs to commit SHAs.\nA pull request merge ref forces dry-run mode because its merge commit is temporary.\nDefault: the workflow branch.\n',
    required: false,
    default: '',
  },
  header: {
    description: 'Text to add before the template body.\n',
    required: false,
    default: '',
  },
  footer: {
    description: 'Text to add after the template body.\n',
    required: false,
    default: '',
  },
  'dry-run': {
    description:
      'Prevents write operations. The action logs the proposed release operation.\n',
    required: false,
    default: '',
  },
  'filter-by-range': {
    description: 'Filter releases whose tag names satisfy this SemVer range.\n',
    required: false,
    default: '',
  },
})

const drafterOutputs = {
  id: { description: 'The ID of the release that was created or updated.' },
  name: { description: 'The name of the release.' },
  tag_name: {
    description: 'The name of the tag associated with the release.',
  },
  body: { description: 'The body of the drafted release.' },
  html_url: {
    description: 'The URL for viewing the release.',
  },
  upload_url: {
    description: 'The URL for uploading release assets.',
  },
  major_version: {
    description: 'The major component of the resolved version.',
  },
  minor_version: {
    description: 'The minor component of the resolved version.',
  },
  patch_version: {
    description: 'The patch component of the resolved version.',
  },
  resolved_version: {
    description: 'The resolved version number.',
  },
}

const autolabelerInputs = defineActionInputs<AutolabelerActionInput>()({
  token: {
    description:
      'Access token for GitHub API requests. Default: github.token.\n',
    default: `\${{ github.token }}`,
  },
  'config-name': {
    description:
      "Autolabeler configuration target.\nA relative path starts in the repository's `.github` directory.\n",
    required: false,
    default: 'release-drafter.yml',
  },
  'dry-run': {
    description:
      'Prevents label updates. The action logs the labels that it would add.\n',
    required: false,
    default: '',
  },
})

const autolabelerOutputs = {
  number: { description: 'The pull request number that was evaluated.' },
  labels: {
    description:
      'A comma-separated list of labels matched by the configuration.',
  },
}

const checkPrInputs = defineActionInputs<CheckPrActionInput>()({
  'config-name': {
    description:
      "Release Drafter configuration target.\nA relative path starts in the repository's `.github` directory.\n",
    required: false,
    default: 'release-drafter.yml',
  },
  token: {
    description:
      'Access token for configuration reads. Default: github.token.\n',
    default: `\${{ github.token }}`,
  },
})

export const actionManifests = {
  drafter: {
    paths: ['action.yml', 'drafter/action.yml'],
    inputs: drafterInputs,
    outputs: drafterOutputs,
  },
  autolabeler: {
    paths: ['autolabeler/action.yml'],
    inputs: autolabelerInputs,
    outputs: autolabelerOutputs,
  },
  checkPr: {
    paths: ['check-pr/action.yml'],
    inputs: checkPrInputs,
    outputs: {},
  },
} as const
