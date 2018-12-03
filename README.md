<h1 align="center">
  <img src="design/logo.svg" alt="Release Drafter Logo" width="450" />
</h1>

<p align="center">Drafts your next release notes as pull requests are merged into master. Built with <a href="https://github.com/probot/probot">Probot</a>.</p>

---

<p align="center"><a href="https://github.com/apps/release-drafter"><img src="design/install-button.svg" alt="Install the GitHub App" /></a></p>

---

[![NPM package](https://img.shields.io/npm/v/release-drafter-github-app.svg)](https://www.npmjs.com/package/release-drafter-github-app)

## Usage

1. Install the [Release Drafter GitHub App](https://github.com/apps/release-drafter) into the repositories you wish to automatically create releases in.
2. Add a `.github/release-drafter.yml` configuration file to each repository.

## Example

For example, take the following `.github/release-drafter.yml` file in a repository:

```yml
template: |
  ## What’s Changed

  $CHANGES
```

As pull requests are merged, a draft release is kept up-to-date listing the changes, ready to publish when you’re ready:

<img src="design/screenshot.png" alt="Screenshot of generated draft release" width="586" />

## Configuration options

You can configure Release Drafter using the following key in your `.github/release-drafter.yml` file:

|Key|Required|Description|
|-|-|-|
|`template`|Required|The template for the body of the draft release. Use [template variables](#template-variables) to insert values.|
|`change-template`|Optional|The template to use for each merged pull request. Use [change template variables](#change-template-variables) to insert values. Default: `* $TITLE (#$NUMBER) @$AUTHOR`|
|`no-changes-template`|Optional|The template to use for when there’s no changes. Default: `* No changes`|
|`branches`|Optional|The branches to listen for configuration updates to `.github/release-drafter.yml` and for merge commits. Useful if you want to test the app on a pull request branch. Default is the repository’s default branch.|
|`categories`|Optional|Categorize pull requests using labels. Refer to [Categorize Pull Requests](#categorize-pull-requests) to learn more about this option.|
|`default-release-name`|Optional|A template to use for the name of new draft releases. Refer to [Automatic next version numbering](#automatic-next-version-numbering) to learn about this option.|
|`default-release-tag`|Optional|A template to use for the tag of new draft releases. Refer to [Automatic next version numbering](#automatic-next-version-numbering) to learn about this option.|

Release Drafter also supports [Probot Config](https://github.com/probot/probot-config), if you want to store your configuration files in a central repository. This allows you to share configurations between projects, and create a organization-wide configuration file by creating a repository named `.github` and file named `release-drafter.yml`.

## Template variables

You can use any of the following variables in your `template`:

|Variable|Description|
|-|-|
|`$CHANGES`|The markdown list of pull requests that have been merged.|
|`$CONTRIBUTORS`|A comma separated list of contributors to this release (pull request authors, commit authors, and commit committers).|
|`$PREVIOUS_TAG`|The previous releases’s tag.|
|`$NEXT_MAJOR_VERSION`|The next version number, as a major version increment. Refer to [Automatic next version numbering](#automatic-next-version-numbering) to learn about this option.|
|`$NEXT_MINOR_VERSION`|The next version number, as a minor version increment. Refer to [Automatic next version numbering](#automatic-next-version-numbering) to learn about this option.|
|`$NEXT_PATCH_VERSION`|The next version number, as a patch version increment. Refer to [Automatic next version numbering](#automatic-next-version-numbering) to learn about this option.|

## Change Template variables

You can use any of the following variables in `change-template`:

|Variable|Description|
|-|-|
|`$NUMBER`|The number of the pull request, e.g. `42`|
|`$TITLE`|The title of the pull request, e.g. `Add alien technology`|
|`$AUTHOR`|The pull request author’s username, e.g. `gracehopper`|

## Categorize Pull Requests

With the `categories` option you can categorize pull requests in release notes using labels. For example, append the following to your `.github/release-drafter.yml` file:

```yml
categories:
  - label: feature
    title: 🚀 Features
  - label: fix
    title: 🐛 Bug Fixes
```

Pull requests with the label "feature" or "fix" will now be grouped together like so:

<img src="design/screenshot-2.png" alt="Screenshot of generated draft release with categories" width="586" />

## Automatic next version numbering

You can use any of the following variables in your `template`, `default-release-name` and `default-release-tag`:

|Variable|Description|
|-|-|
|`$NEXT_MAJOR_VERSION`|The next version number, as a major version increment.|
|`$NEXT_MINOR_VERSION`|The next version number, as a minor version increment.|
|`$NEXT_PATCH_VERSION`|The next version number, as a patch version increment.|

This enables configurations such as:

```yaml
default-release-name: "$NEXT_PATCH_VERSION 🎉"
default-release-tag: v$NEXT_PATCH_VERSION
```

In the case, for example, where the last release name/tag was `v1.2.3`, the next draft version will automatically be named `1.2.4 🎉` and the tag will be `v1.2.4`.
`$NEXT_PATCH_VERSION` is expected to be the most commonly used placeholder, but `$NEXT_MAJOR_VERSION` and `$NEXT_MINOR_VERSION` are available as well (e.g. `1.2.3` becomes `2.0.0` or `1.3.0` when these are used).

## GitHub Installation Permissions

Release Drafter needs to update your releases for you, and so it requires write access to the repository you want to automatically update. Unfortunately, at this time, GitHub doesn't offer a release-only write scope. **Please don't just add it to your entire GitHub account!** Only add the repositories you want to draft releases on.

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

* Ensures you’re on master and don’t have local, un-commited changes
* Bumps the version number in [package.json](package.json) based on major, minor or patch
* Runs the `postversion` npm script in [package.json](package.json), which:
  * Pushes the tag to GitHub
  * Publishes the npm release
  * Deploys to [Now](https://now.sh)
  * Opens the GitHub releases page so you can publish the release notes
