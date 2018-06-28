<h1 align="center">
  <img src="design/logo.svg" alt="Draftah Logo" width="350" />
</h1>

<p align="center">Drafts your next release notes as pull requests are merged into master. Built with <a href="https://github.com/probot/probot">Probot</a>.</p>

---

<p align="center"><a href="https://github.com/apps/draftah"><img src="design/install-button.svg" alt="Install the GitHub App" /></a></p>

---

## Usage

Firstly, you’ll need to install the [Draftah GitHub App](https://github.com/apps/draftah). This listens out for any releases, or any changes to the configuration.

Then, add a `.github/draftah.yml` configuration file to the GitHub repository where you publish new releases to.

For example, given the following `.github/draftah.yml` file:

```yml
tag: vx.x.x
title: vx.x.x (✏️ Code Name)
body: |
  ## What's Changed

  $CHANGES

  ## Upgrading

  ```diff
  - test-project#$PREVIOUS_TAG:
  + test-project#vx.x.x:
  ```
```

As pull requests get merged to master, a draft release is kept up to date, such as:

```markdown
## What's Changed

* 🚜 Add a new Widgets API #2 (@toolmantim)
* 👽 Integrate alien technology #3 (@toolmantim)
* 🐄 More cowbell #4 (@toolmantim)

## Upgrading

```diff
- test-project#v1.2.0:
+ test-project#vx.x.x:
```

## Template variables

You can use any of the following variables in your release template, and they'll be substituted when the tap is regenerated:

|Variable|Description|
|-|-|
|`$CHANGES`|The markdown list of pull requests that have been merged.|
|`$PREVIOUS_TAG`|The previous releases’s tag.|

## Configuration options

You can configure Draftah using the following key in your `.github/draftah.yml` file:

|Key|Required|Description|
|-|-|-|
|`tag`|Required|A list of paths and patterns to update when a new release is published.|
|`title`|Required|The path to the file to update.|
|`body`|Required|The template body for the release. Use [variables](#template-variables) to insert the values from the release.|
|`branches`|Optional|The branches to listen for configuration updates to `.github/draftah.yml` and for merge commits. Useful if you want to test the app on a pull request branch. Default is the repository’s default branch.|

Draftah also supports [Probot Config](https://github.com/probot/probot-config), if you want to store your configuration files in a central repository.

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

If you want to deploy your own copy of Draftah, follow the [Probot Deployment Guide](https://probot.github.io/docs/deployment/).
