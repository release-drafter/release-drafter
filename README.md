<h1 align="center">
  <img src="design/logo.svg" alt="Release Drafter Logo" width="450" />
</h1>

<p align="center">Drafts your next release notes as pull requests are merged into master. Built with <a href="https://github.com/probot/probot">Probot</a>.</p>

---

## Usage

You can use the [Release Drafter GitHub Action](https://github.com/marketplace/actions/release-drafter) in a [GitHub Actions Workflow](https://help.github.com/en/articles/about-github-actions) by configuring a YAML-based workflow file, e.g. `.github/workflows/release-drafter.yml`, with the following:

```yaml
name: Release Drafter

on:
  push:
    # branches to consider in the event; optional, defaults to all
    branches:
      - master

jobs:
  update_release_draft:
    runs-on: ubuntu-latest
    steps:
      # Drafts your next Release notes as Pull Requests are merged into "master"
      - uses: release-drafter/release-drafter@v5
        with:
          # (Optional) specify config name to use, relative to .github/. Default: release-drafter.yml
          # config-name: my-config.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

If you're unable to use GitHub Actions, you can use the Release Drafter GitHub App. Please refer to the [Release Drafter GitHub App documentation](docs/github-app.md) for more information.

## Configuration

Once you’ve added Release Drafter to your repository, it must be enabled by adding a `.github/release-drafter.yml` configuration file to each repository.

### Example

For example, take the following `.github/release-drafter.yml` file in a repository:

```yml
template: |
  ## What’s Changed

  $CHANGES
```

As pull requests are merged, a draft release is kept up-to-date listing the changes, ready to publish when you’re ready:

<img src="design/screenshot.png" alt="Screenshot of generated draft release" width="586" />

The following is a more complicated configuration, which categorises the changes into headings, and automatically suggests the next version number:

```yml
name-template: 'v$NEXT_PATCH_VERSION 🌈'
tag-template: 'v$NEXT_PATCH_VERSION'
categories:
  - title: '🚀 Features'
    labels:
      - 'feature'
      - 'enhancement'
  - title: '🐛 Bug Fixes'
    labels:
      - 'fix'
      - 'bugfix'
      - 'bug'
  - title: '🧰 Maintenance'
    label: 'chore'
change-template: '- $TITLE @$AUTHOR (#$NUMBER)'
template: |
  ## Changes

  $CHANGES
```

## Configuration Options

You can configure Release Drafter using the following key in your `.github/release-drafter.yml` file:

| Key                   | Required | Description                                                                                                                                                                                                       |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `template`            | Required | The template for the body of the draft release. Use [template variables](#template-variables) to insert values.                                                                                                   |
| `name-template`       | Optional | The template for the name of the draft release. For example: `"v$NEXT_PATCH_VERSION"`.                                                                                                                            |
| `tag-template`        | Optional | The template for the tag of the draft release. For example: `"v$NEXT_PATCH_VERSION"`.                                                                                                                             |
| `version-template`    | Optional | The template to use when calculating the next version number for the release. Useful for projects that don't use semantic versioning. Default: `"$MAJOR.$MINOR.$PATCH"`                                           |
| `change-template`     | Optional | The template to use for each merged pull request. Use [change template variables](#change-template-variables) to insert values. Default: `"* $TITLE (#$NUMBER) @$AUTHOR"`.                                        |
| `no-changes-template` | Optional | The template to use for when there’s no changes. Default: `"* No changes"`.                                                                                                                                       |
| `branches`            | Optional | The branches to listen for configuration updates to `.github/release-drafter.yml` and for merge commits. Useful if you want to test the app on a pull request branch. Default is the repository’s default branch. |
| `categories`          | Optional | Categorize pull requests using labels. Refer to [Categorize Pull Requests](#categorize-pull-requests) to learn more about this option.                                                                            |
| `exclude-labels`      | Optional | Exclude pull requests using labels. Refer to [Exclude Pull Requests](#exclude-pull-requests) to learn more about this option.                                                                                     |
| `replacers`           | Optional | Search and replace content in the generated changelog body. Refer to [Replacers](#replacers) to learn more about this option.                                                                                     |
| `sort-by`             | Optional | Sort changelog by merged_at or title. Can be one of: `merged_at`, `title`. Default: `merged_at`.                                                                                                                  |
| `sort-direction`      | Optional | Sort changelog in ascending or descending order. Can be one of: `ascending`, `descending`. Default: `descending`.                                                                                                 |
| `prerelease`          | Optional | Mark the draft release as pre-release. Default `false`.                                                                                                                                                           |

Release Drafter also supports [Probot Config](https://github.com/probot/probot-config), if you want to store your configuration files in a central repository. This allows you to share configurations between projects, and create a organization-wide configuration file by creating a repository named `.github` with the file `.github/release-drafter.yml`.

## Template Variables

You can use any of the following variables in your `template`:

| Variable        | Description                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `$CHANGES`      | The markdown list of pull requests that have been merged.                                                             |
| `$CONTRIBUTORS` | A comma separated list of contributors to this release (pull request authors, commit authors, and commit committers). |
| `$PREVIOUS_TAG` | The previous releases’s tag.                                                                                          |

## Next Version Variables

You can use any of the following variables in your `template`, `name-template` and `tag-template`:

| Variable              | Description                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$NEXT_PATCH_VERSION` | The next patch version number. For example, if the last tag or release was `v1.2.3`, the value would be `v1.2.4`. This is the most commonly used value. |
| `$NEXT_MINOR_VERSION` | The next minor version number. For example, if the last tag or release was `v1.2.3`, the value would be `v1.3.0`.                                       |
| `$NEXT_MAJOR_VERSION` | The next major version number. For example, if the last tag or release was `v1.2.3`, the value would be `v2.0.0`.                                       |

## Version Template Variables

You can use any of the following variables in `version-template` to format the `$NEXT_{PATCH,MINOR,MAJOR}_VERSION` variables:

| Variable | Description               |
| -------- | ------------------------- |
| `$PATCH` | The patch version number. |
| `$MINOR` | The minor version number. |
| `$MAJOR` | The major version number. |

## Change Template Variables

You can use any of the following variables in `change-template`:

| Variable  | Description                                                 |
| --------- | ----------------------------------------------------------- |
| `$NUMBER` | The number of the pull request, e.g. `42`.                  |
| `$TITLE`  | The title of the pull request, e.g. `Add alien technology`. |
| `$AUTHOR` | The pull request author’s username, e.g. `gracehopper`.     |

## Categorize Pull Requests

With the `categories` option you can categorize pull requests in release notes using labels. For example, append the following to your `.github/release-drafter.yml` file:

```yml
categories:
  - title: '🚀 Features'
    label: 'feature'
  - title: '🐛 Bug Fixes'
    labels:
      - 'fix'
      - 'bugfix'
      - 'bug'
```

Pull requests with the label "feature" or "fix" will now be grouped together:

<img src="design/screenshot-2.png" alt="Screenshot of generated draft release with categories" width="586" />

Adding such labels to your PRs can be automated by using [PR Labeler](https://github.com/TimonVS/pr-labeler-action) or [Probot Auto Labeler](https://github.com/probot/autolabeler).

## Exclude Pull Requests

With the `exclude-labels` option you can exclude pull requests from the release notes using labels. For example, append the following to your `.github/release-drafter.yml` file:

```yml
exclude-labels:
  - 'skip-changelog'
```

Pull requests with the label "skip-changelog" will now be excluded from the release draft.

## Replacers

You can search and replace content in the generated changelog body, using regular expressions, with the `replacers` option. Each replacer is applied in order.

```yml
replacers:
  - search: '/CVE-(\d{4})-(\d+)/g'
    replace: 'https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-$1-$2'
  - search: 'myname'
    replace: 'My Name'
```

## Projects that don't use Semantic Versioning

If your project doesn't follow [Semantic Versioning](https://semver.org) you can still use Release Drafter, but you may want to set the `version-template` option to customize how the `$NEXT_{PATCH,MINOR,MAJOR}_VERSION` environment variables are generated.

For example, if your project doesn't use patch version numbers, you can set `version-template` to `$MAJOR.$MINOR`. If the current release is version 1.0, then `$NEXT_MINOR_VERSION` will be `1.1`.

## Action Outputs

The Release Drafter GitHub Action sets a couple of outputs which can be used as inputs to other Actions in the workflow ([example](https://github.com/actions/upload-release-asset#example-workflow---upload-a-release-asset)).

| Output       | Description                                                                                                                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | The ID of the release that was created or updated.                                                                                                                                                                            |
| `html_url`   | The URL users can navigate to in order to view the release. i.e. `https://github.com/octocat/Hello-World/releases/v1.0.0`.                                                                                                    |
| `upload_url` | The URL for uploading assets to the release, which could be used by GitHub Actions for additional uses, for example the [`@actions/upload-release-asset GitHub Action`](https://www.github.com/actions/upload-release-asset). |

## Developing

If you have Node v10+ installed locally, you can run the tests, and a local app, using the following commands:

```sh
# Install dependencies
yarn

# Run the tests
npm test

# Run the app locally
npm run dev
```

Once you've started the app, visit `localhost:3000` and you'll get [step-by-step instructions](https://probot.github.io/docs/development/#configuring-a-github-app) for installing it in your GitHub account so you can start pushing commits and testing it locally.

If you don’t have Node installed, you can use [Docker Compose](https://docs.docker.com/compose/):

```sh
# Run the tests
docker-compose run --rm app npm test
```

## Contributing

Third-party contributions are welcome! 🙏🏼 See [CONTRIBUTING.md](CONTRIBUTING.md) for step-by-step instructions.

If you need help or have a question, let me know via a GitHub issue.

## Deployment

If you want to deploy your own copy of Release Drafter, follow the [Probot Deployment Guide](https://probot.github.io/docs/deployment/).

## Releasing

Run the following command:

```bash
git checkout master && git pull && npm version [major | minor | patch]
```

The command does the following:

- Ensures you’re on master and don’t have local, un-commited changes
- Bumps the version number in [package.json](package.json) based on major, minor or patch
- Runs the `postversion` npm script in [package.json](package.json), which:
  - Pushes the tag to GitHub
  - Publishes the npm release
  - Deploys to [Now](https://now.sh)
  - Opens the GitHub releases page so you can publish the release notes
