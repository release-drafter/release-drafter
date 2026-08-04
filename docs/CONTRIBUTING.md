# Contributing

[fork]: https://github.com/release-drafter/release-drafter/fork
[pr]: https://github.com/release-drafter/release-drafter/compare
[style]: https://standardjs.com/
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We are thrilled that you'd like to contribute to this project. Your
help is essential for keeping it great.

Please note that this project is released with a [Contributor Code of
Conduct][code-of-conduct]. By participating in this project you agree to abide
by its terms.

## Submitting a pull request

1. [Fork][fork] and clone the repository
2. Configure and install the dependencies: `npm install`
3. Create a new branch: `git checkout -b my-branch-name`
4. Make your change and add tests. Before you push, run `npm run ci`. This
   command formats and lints the code, checks types, runs tests, and builds the
   root action bundles and workspace packages. CI fails if the command changes a
   tracked generated file.
5. Push to your fork and [submit a pull request][pr]
6. Give yourself a high five, and wait for your pull request to be reviewed and
   merged.

Here are a few things you can do that will increase the likelihood of your pull
request being accepted:

- Follow the [style guide][style] which is using standard. Any linting errors
  should be shown when running `npm run ci`
- Write and update tests.
- Keep your change as focused as possible. If there are multiple changes you
  would like to make that are not dependent upon each other, consider submitting
  them as separate pull requests.
- Use a
  [conventional pull request title](https://www.conventionalcommits.org/en/v1.0.0/),
  such as `feat: add category matching` or `fix(config): handle missing input`.
  Release Drafter now uses the pull request title to categorize changes and
  determine version bumps.

Work in Progress pull requests are also welcome to get feedback early on, or if
there is something blocked you.

## Workspace development

Release Drafter uses npm workspaces. Run `npm install` from the repository root.
npm links each workspace under `packages/*` and updates `package-lock.json`.

The action entrypoints are at the repository root:
`action.yml`, `drafter/action.yml`, `autolabeler/action.yml`, and the tracked
bundles under `dist/actions/*/run.js`. Workspace packages provide internal code
boundaries without changing these public action paths.

Only the root `dist/` directory is tracked. The JavaScript actions run these
bundles directly from the repository. Builds under `packages/*/dist/` are
generated and ignored. After a workspace build, npm includes these files when it
packs a package.

Common commands:

- `npm run ci` runs all repository checks and builds generated files. It
  formats and lints the code, checks dependencies and boundaries, checks types,
  runs tests, generates schemas, and builds action bundles and workspaces.
  Tooling tests also run Node's `--check` against each `src/scripts/*.ts` entry.
  This verifies that Node 24 can run the scripts without a compile step.
- `npm run check:dependencies` uses Knip to find unused and unlisted
  dependencies. It does not check for unused files or exports.
- `npm run check:boundaries` uses dependency-cruiser's SWC parser to validate
  internal imports in workspace source, generated JavaScript, and declarations.
- `npm run check:packages` checks that the root and scoped workspaces are
  private. It also checks that each package requires Node 24 and that only
  `release-drafter` can be published.
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

The normal `npm run test:run` and `npm run all` commands remain container-free.
Real-forge compatibility is an opt-in Docker-backed layer:

- `npm run test:conformance:gitea` and `npm run test:conformance:forgejo` run
  one immutable image. Use
  `npm run test:conformance:gitea-forgejo` to run both images through the shared
  `ForgeAdapter` contract.
- `npm run test:conformance:gitlab` runs the heavier GitLab suite serially with
  extended startup and teardown timeouts.

Gitea, Forgejo, and GitLab all run in the normal forge-conformance CI matrix.
Failed GitLab jobs upload their redacted container logs and fixture metadata.

The dedicated forge-conformance workflow runs this Docker-backed matrix on pull
requests when changes touch either forge or normal CI workflow, the Node version,
root package manifest or lockfile, root TypeScript/Vite/Vitest configuration, any
`src/**` file, or workspace source, manifest, or TypeScript configuration under
`packages/*`. Maintainers can also apply the `ci:forge-conformance` label to
request the matrix explicitly. Adding any other label runs only the dedicated
workflow's inexpensive scope and gate jobs. It does not rerun normal CI or the
forge matrix. Pushes to `main` run the matrix only when one of the same relevant
paths changed.

The shared contract exercises the public facade and normalized release listing,
change discovery, commitish resolution, release creation, and release updates.
Forge-specific fixtures may additionally verify default-branch and repository
config loading. These suites require a working Docker-compatible daemon and fail
rather than silently skipping when explicitly invoked.

Do not add npm publication workflows or make scoped `@release-drafter/*`
workspaces publishable unless the maintainers approve a release plan.

## Issue Management Policy

To maintain project health and keep issues actionable, we automatically manage
stale issues using the following policy:

**Stale Issue Closure**: Issues labeled with `info-needed` that remain inactive
for 30 days will be automatically marked as stale. After an additional 7-day
grace period, the issue will be closed if no response is provided.

When an issue is marked as stale, we'll post a comment asking you to provide the
requested information. If you respond with the information or show continued
interest, the stale label will be removed and the issue will remain open.

This policy helps us:

- Keep the issue tracker focused on active issues
- Encourage timely responses to information requests
- Ensure discussions don't get lost in an ever-growing issue backlog

If your issue was closed due to inactivity but you still have relevant
information or context, please feel free to reopen it by commenting on the issue
or opening a new one.

## Releasing

Run the following command:

```bash
git checkout main
git pull
npm version [major | minor | patch] --ignore-scripts=false
```

> [!IMPORTANT]
>
> - You may want the version increment to correspond to the last drafted
>   release.
> - You can use a version number instead of `major | minor | patch` if needed.
> - This repository sets `ignore-scripts=true` in `.npmrc`, so the flag above is
>   required when you want `npm version` to run the release lifecycle scripts.

The command does the following:

- Runs tests (`preversion` script)
- Bumps the private root version in [package.json](../package.json)
- Synchronizes that version to every workspace manifest, including the public
  `packages/release-drafter/package.json` facade, refreshes `package-lock.json`,
  and stages all versioned manifests (`version` script)
- Commits the changes and creates the corresponding tag
- Pushes the commit and tag (`postversion` script)

After pushing, the `release.yml` workflow will trigger (`on: push: tag`), and :

- publish the release draft
- update major tag (ex: pushing `v6.2.1` bumps `v6` to the same commit)

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
