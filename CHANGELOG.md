# Changelog

## v6 -> v7

### BREAKING Changes

- Disabled use of the `references` config. Use
  [`on` conditions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#on)
  instead :

  ```yaml
  # .github/workflows/release-drafter.yaml

  on:
    push:
      # Sequence of patterns matched against refs/heads
      branches:
        - main
        - 'mona/octocat'
        - 'releases/**'
      # Sequence of patterns matched against refs/tags
      tags:
        - v2
        - v1.*
  ```

- Config syntax of autolabeler made use of Joi's `array.single()` syntax, which
  is not supported anymore. The new implementation of config validation runs on
  zod, which does not support a similar feature natively. (TODO implement to
  avoid breaking change ?). The configuration fields that relied on
  `array.single()` are :
  - `autolabeler[].branch`
  - `autolabeler[].title`
  - `autolabeler[].files`
  - `autolabeler[].body`
  - `categories[].labels` (you may have used `label` instead)
  - `version-resolver.major.labels`
  - `version-resolver.minor.labels`
  - `version-resolver.patch.labels`

  To migrate, do the following :

  ```yaml
  # .github/release-drafter.yaml

  # Before
  autolabeler:
    - label: bug
      files: "src/bugs/*"

  # After
  autolabeler:
    - label: bug
      files:
        - "src/bugs/*"
  ```

- Disabled config `categories[].label`. Use `categories[].labels` instead (as an
  array).

- Action inputs are now validated against
  [action-input.schema.ts](./src/types/action-input.schema.ts)

- removed option `"legacy"` for the `publish` input/config. Use `"false"`
  instead.

- following the removal of probot, your config is no longer fetched from the
  default branch. It is now directly read from the runner, meaning :
  - you'll have to checkout your repository beforehand (ex: using
    `@action/checkout`)
  - you'll be able to build a config in a branch that is not the default branch

  > [!note]
  > Probot used to fetch the config file using the handy `context.config`, which uses octokit's [`rest.repos.getContent`](https://octokit.github.io/rest.js/v18/#repos) under the hood. This is because probot is exepcted to run apps, which do not have the ability to have the repository in their filesystem as easily as actions do.
