import type { ActionInput as AutolabelerActionInput } from '#gh-actions/autolabeler/action-input.schema.ts'
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
      'Configuration filename to use when the workflow has more than one Release Drafter configuration.\nStore the file in `.github`; Release Drafter searches only that directory.\n',
    required: false,
    default: 'release-drafter.yml',
  },
  token: {
    description:
      'Access token used to make requests against the GitHub API. Defaults to github.token.\n',
    default: `\${{ github.token }}`,
  },
  name: {
    description:
      "The name that will be used in the GitHub release that's created or updated.\nThis will override any `name-template` specified in your `release-drafter.yml` if defined.\n",
    required: false,
  },
  tag: {
    description:
      "The tag name to be associated with the GitHub release that's created or updated.\nThis will override any `tag-template` specified in your `release-drafter.yml` if defined.\n",
    required: false,
  },
  version: {
    description:
      "The version to be associated with the GitHub release that's created or updated.\nThis will override any version calculated by the release-drafter.\n",
    required: false,
  },
  from: {
    description:
      'A ref, tag, branch, or commit SHA used only as the baseline when comparing changes.\nThis does not select the release version or change which existing draft release is updated.\n',
    required: false,
  },
  publish: {
    description:
      'A boolean indicating whether the release being created or updated should be immediately published.\n',
    required: false,
    default: '',
  },
  latest: {
    description:
      'A boolean indicating whether the release being created or updated should be marked as latest.\n',
    required: false,
    default: '',
  },
  prerelease: {
    description:
      'Whether to draft a prerelease, with changes since another prerelease (if applicable). Default `false`.\n',
    required: false,
    default: '',
  },
  'prerelease-identifier': {
    description:
      'A string indicating an identifier (alpha, beta, rc, etc), to increment the prerelease version. This automatically enables `prerelease` when both values come from the same config location; explicit action inputs still take precedence.\n',
    required: false,
    default: '',
  },
  'include-pre-releases': {
    description:
      'When looking for the last published release to scan changes up-to, include pre-releases. Has no effect if using `prerelease: true` (already enabled). Default `false`.\n',
    required: false,
    default: '',
  },
  commitish: {
    description:
      'The release target.\nUse a branch, commit SHA, fully qualified tag, or pull request ref.\nRelease Drafter resolves tag and pull request refs to commit SHAs.\nPull request merge refs force dry-run mode and disable publishing because they point to ephemeral merge commits.\nDefaults to the branch where Release Drafter runs, such as `main` when the workflow runs on pushes to `main`.\n',
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
      'A boolean indicating whether to run without performing any write operations.\nWhen enabled, the action logs what it would have done instead of creating or updating releases.\n',
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
  name: { description: 'The name of the release' },
  tag_name: {
    description: 'The name of the tag associated with the release.',
  },
  body: { description: 'The body of the drafted release.' },
  html_url: {
    description: 'The URL for viewing the release.',
  },
  upload_url: {
    description:
      'The URL for uploading release assets. For example, pass this URL to the `@actions/upload-release-asset` GitHub Action.',
  },
  major_version: {
    description:
      'The next major version number. For example, if the last tag or release was v1.2.3, the value would be v2.0.0.',
  },
  minor_version: {
    description:
      'The next minor version number. For example, if the last tag or release was v1.2.3, the value would be v1.3.0.',
  },
  patch_version: {
    description:
      'The next patch version number. For example, if the last tag or release was v1.2.3, the value would be v1.2.4.',
  },
  resolved_version: {
    description: 'The next resolved version number, based on GitHub labels.',
  },
}

const autolabelerInputs = defineActionInputs<AutolabelerActionInput>()({
  token: {
    description:
      'Access token used to make requests against the GitHub API. Defaults to github.token.\n',
    default: `\${{ github.token }}`,
  },
  'config-name': {
    description:
      'Configuration filename to use when the workflow has more than one Autolabeler configuration.\nStore the file in `.github`; Release Drafter searches only that directory.\n',
    required: false,
    default: 'release-drafter.yml',
  },
  'dry-run': {
    description:
      'A boolean indicating whether to run without performing any write operations.\nWhen enabled, the action logs what it would have done instead of adding labels.\n',
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
} as const
