<h1 align="center">
  <img src="design/logo.svg" alt="Release Drafter Logo" width="400" />
</h1>

<p align="center">Drafts your next release notes as pull requests are merged into master. Built with <a href="https://github.com/probot/probot">Probot</a>.</p>

---

<p align="center"><a href="https://github.com/apps/release-drafter"><img src="design/install-button.svg" alt="Install the GitHub App" /></a></p>

---

## Usage

Firstly, you’ll need to install the [Release Drafter GitHub App](https://github.com/apps/release-drafter). This listens out for any releases, or any changes to the configuration.

Then, add a `.github/release-drafter.yml` configuration file to the GitHub repository where you publish new releases to.

For example, given the following `.github/release-drafter.yml` file:

```yml
template: |
  ## What's Changed

  $CHANGES
```

As pull requests are merged, a draft release is kept up to date listing the changes, ready to publish when you’re ready:

<img src="design/screenshot.png" alt="Screenshot of generated draft release" width="586" />

## Template variables

You can use any of the following variables in your release template, and they'll be substituted when the tap is regenerated:

|Variable|Description|
|-|-|
|`$CHANGES`|The markdown list of pull requests that have been merged.|
|`$PREVIOUS_TAG`|The previous releases’s tag.|

## Configuration options

You can configure Release Drafter using the following key in your `.github/release-drafter.yml` file:

|Key|Required|Description|
|-|-|-|
|`template`|Required|The template for the body of the draft release. Use [template variables](#template-variables) to insert values.|
|`branches`|Optional|The branches to listen for configuration updates to `.github/release-drafter.yml` and for merge commits. Useful if you want to test the app on a pull request branch. Default is the repository’s default branch.|

Release Drafter also supports [Probot Config](https://github.com/probot/probot-config), if you want to store your configuration files in a central repository.

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

If you don't have Node installed, you can use [Docker Compose](https://docs.docker.com/compose/):

```sh
# Run the tests
docker-compose run --rm app npm test
```

## Contributing

Third-pary contributions are welcome! 🙏🏼 See [CONTRIBUTING.md](CONTRIBUTING.md) for step-by-step instructions.

If you need help or have a question, let me know via a GitHub issue.

## Deployment

If you want to deploy your own copy of Release Drafter, follow the [Probot Deployment Guide](https://probot.github.io/docs/deployment/).
