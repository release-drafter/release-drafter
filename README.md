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

Release Drafter also supports [Probot Config](https://github.com/probot/probot-config), if you want to store your configuration files in a central repository. This allows you to share configurations between projects, and create a organization-wide configuration file by creating a repository named `.github` and file named `release-drafter.yml`.


## Template variables

You can use any of the following variables in your `template`:

|Variable|Description|
|-|-|
|`$CHANGES`|The markdown list of pull requests that have been merged.|
|`$CONTRIBUTORS`|A comma separated list of contributors to this release (pull request authors, commit authors, and commit committers).|
|`$PREVIOUS_TAG`|The previous releases’s tag.|

## Change Template variables

You can use any of the following variables in `change-template`:

|Variable|Description|
|-|-|
|`$NUMBER`|The number of the pull request, e.g. `42`|
|`$TITLE`|The title of the pull request, e.g. `Add alien technology`|
|`$AUTHOR`|The pull request author’s username, e.g. `gracehopper`|

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
npm start
```

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
git checkout master && git pull && npm test && npm version [major | minor | patch]
```

The command does the following:

* Ensures you’re on master and don’t have local, un-commited changes
* Bumps the version number in [package.json](package.json) based on major, minor or patch
* Runs the `postversion` npm script in [package.json](package.json), which:
  * Pushes the tag to GitHub
  * Publishes the npm release
  * Deploys to [Now](https://now.sh)
  * Opens the GitHub releases page so you can publish the release notes
