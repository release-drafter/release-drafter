# Contributing

[fork]: https://github.com/release-drafter/release-drafter/fork
[pr]: https://github.com/release-drafter/release-drafter/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Thank you for contributing to Release Drafter.

This project uses a [Contributor Code of Conduct][code-of-conduct]. All
contributors must follow it.

## Submitting a pull request

1. [Fork][fork] and clone the repository.
2. Install the dependencies with `npm install`.
3. Create a branch with `git checkout -b my-branch-name`.
4. Make your change and add tests. Before you push, run `npm run ci`. This
   command formats and lints the code, checks types, runs tests, and builds the
   root action bundles and workspace packages. CI fails if the command changes a
   tracked generated file.
5. Push the branch to your fork and [submit a pull request][pr].

Follow these rules when you prepare a pull request:

- Run `npm run ci` and fix each reported error.
- Write and update tests.
- Keep the change focused. Submit independent changes as separate pull requests.
- Use a
  [conventional pull request title](https://www.conventionalcommits.org/en/v1.0.0/),
  such as `feat: add category matching` or `fix(config): handle missing input`.
  Release Drafter uses the pull request title to categorize changes and select
  the version increment.

Open a draft pull request to request early feedback or report a blocker.

## Workspace development

Release Drafter uses npm workspaces. Run `npm install` from the repository root.
npm links each workspace under `packages/*` and updates `package-lock.json`.

The public action entrypoints are `action.yml`, `drafter/action.yml`,
`autolabeler/action.yml`, and `check-pr/action.yml`. The tracked bundles are
under `dist/actions/*/run.js`. Workspace packages provide internal code
boundaries without changing the public action paths.

Only the root `dist/` directory is tracked. GitHub runs these JavaScript bundles
directly from the repository. Builds generate `packages/*/dist/`, but Git
ignores these directories. npm includes the generated files when it packs a
workspace package.

Common commands:

- `npm run ci` runs all repository checks and builds generated files. It
  formats and lints the code, checks dependencies, package boundaries, and
  types, runs tests, generates schemas, and builds action bundles and workspace
  packages.
  Tooling tests also run Node's `--check` against each `src/scripts/*.ts` entry.
  This verifies that Node 24 can run the scripts without a compile step.
- `npm run check:dependencies` uses Knip to find unused files, unused
  dependencies, and unlisted dependencies. It does not report unused exports.
- `npm run check:boundaries` uses dependency-cruiser's SWC parser to validate
  internal imports in workspace source, generated JavaScript, and declarations.
- `npm run check:packages` checks package publication settings and the required
  Node.js version. Only the `release-drafter` package can be published.
- `npm run test:package-readiness` builds and packs the public
  `release-drafter` package. It runs the ESM, NodeNext, CLI, and isolated `npx`
  consumer contracts. It checks the package contents and metadata, then runs an
  offline `npm publish --dry-run` against the same tarball.
- `npm run check:package-boundaries` reports runtime imports whose packages are
  listed only in `devDependencies`. Dependency-cruiser checks the source and
  generated dependency graphs. The SWC check separately identifies type-only
  imports because dependency-cruiser does not preserve that information.
- Run `npm run build:workspaces` before `npm run check:boundaries` outside
  `npm run ci` so generated JavaScript and declaration files are available.
- `npm run check:clean` fails if generation leaves unstaged or untracked changes
  relative to the staged tree.
- `npm run build --workspaces --if-present` builds workspace packages after the
  root Vite action bundle build.

### Forge conformance tests

`npm run test:run` and `npm run ci` do not start containers. Use these commands
to run Docker-backed forge conformance tests:

- `npm run test:conformance:gitea` runs the Gitea image.
- `npm run test:conformance:forgejo` runs the Forgejo image.
- `npm run test:conformance:gitea-forgejo` runs both images through the shared
  `ForgeAdapter` contract.
- `npm run test:conformance:gitlab` runs the GitLab suite serially and uses
  extended startup and teardown timeouts.

The CI matrix tests Gitea, Forgejo, and GitLab. Failed GitLab jobs upload
redacted container logs and fixture metadata.

The forge conformance workflow runs the matrix in these cases:

- A pull request changes one of these paths:
  - `.github/workflows/ci.yml`
  - `.github/workflows/forge-conformance.yml`
  - `.node-version`, `package.json`, or `package-lock.json`
  - Root TypeScript, Vite, or Vitest configuration files
  - `src/**`
  - Package source, manifests, or TypeScript configuration files
- A maintainer applies the exact `ci:forge-conformance` label. This label skips
  changed-file detection.
- A push to `main` changes one of the same paths.

Other pull request label events use changed file detection. The workflow also
runs the matrix if the base commit is missing or invalid, or if Git fails.

The scope job runs the checked-in TypeScript router with the repository's pinned
Node version. It passes fixed pathspec arguments directly to Git without shell
interpolation. The final gate also uses checked-in TypeScript and runs on
Node.js 24.

The shared contract tests the public API, normalized release listing, change
discovery, commitish resolution, release creation, and release updates.
Some forge fixtures also verify default-branch and repository configuration
loading. These commands require a working Docker-compatible daemon. They fail if
the daemon is not available.

The package-readiness workflow checks packaging only. It receives no
credentials and runs npm in offline and dry-run modes. It disables provenance
and grants only `contents: read`. It does not configure a registry or trusted
publisher.

Do not add a live npm publication step. Do not make a scoped
`@release-drafter/*` workspace publishable without an approved release plan.

## Issue management policy

A bot manages stale issues with this policy:

Issues with the `info-needed` label become stale after 30 days without activity.
The repository closes the issue after a further 7 days without a response.

The stale bot asks for the missing information. A response removes the stale
label and keeps the issue open.

The policy has these purposes:

- Keep the issue tracker focused on active issues.
- Request missing information within a defined time.
- Close inactive discussions.

If the bot closes your issue, add the requested information in a comment or open
a new issue.

## Releasing

Run this command:

```bash
git checkout main
git pull
npm version [major | minor | patch] --ignore-scripts=false
```

> [!IMPORTANT]
>
> - Select the version increment for the last drafted release.
> - Use a version number instead of `major | minor | patch` if needed.
> - This repository sets `ignore-scripts=true` in `.npmrc`. Use
>   `--ignore-scripts=false` to run the release lifecycle scripts.

The command performs these tasks:

- Runs tests (`preversion` script).
- Bumps the private root version in [package.json](../package.json).
- Synchronizes that version to every workspace manifest, including the public
  `packages/release-drafter/package.json`, refreshes `package-lock.json`, and
  stages all versioned manifests (`version` script).
- Commits the changes and creates the corresponding tag.
- Pushes the commit and tag (`postversion` script).

After the push, the `release.yml` workflow runs for the new tag. It performs
these tasks:

- Publishes the release draft.
- Updates the major version tag. For example, a `v6.2.1` tag moves `v6` to the
  same commit.

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
