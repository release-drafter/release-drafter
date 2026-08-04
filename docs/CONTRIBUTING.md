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
4. Make your change, add tests, and run `npm run all` before pushing — this runs
   formatting, linting, type checking, tests, and builds the root Action bundles
   and workspace packages. The CI pipeline enforces that tracked generated files
   have no uncommitted changes after these steps, so **you must run `npm run all`
   locally before pushing** to avoid build failures.
5. Push to your fork and [submit a pull request][pr]
6. Give yourself a high five, and wait for your pull request to be reviewed and
   merged.

Here are a few things you can do that will increase the likelihood of your pull
request being accepted:

- Follow the [style guide][style] which is using standard. Any linting errors
  should be shown when running `npm run all`
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

Release Drafter uses a private npm-workspaces root. Install dependencies from the
repository root with `npm install` so npm can link every workspace declared under
`packages/*` and update `package-lock.json` deterministically.

The current GitHub Action entrypoints remain at the repository root:
`action.yml`, `drafter/action.yml`, `autolabeler/action.yml`, and the tracked
bundles under `dist/actions/*/run.js`. Workspace skeletons are buildable package
boundaries only and do not move existing Action behavior.

Only the root `dist/` directory is tracked because GitHub Actions execute those
bundles directly from the repository. Builds under `packages/*/dist/` are
generated, ignored artifacts; package manifests include them when packing after
a workspace build.

Common commands:

- `npm run all` formats, lints, validates dependency hygiene, workspace
  publication and dependency boundaries, type-checks, tests, regenerates
  schemas, and rebuilds bundles. Tooling tests also run Node's `--check` against
  every `src/scripts/*.ts` entry so they remain directly runnable on Node 24
  without a compile step.
- `npm run check:dependencies` runs Knip's complementary unused and unlisted
  dependency checks without enabling its broader unused-file/export analysis.
- `npm run check:boundaries` uses dependency-cruiser's SWC parser to validate
  internal imports in workspace source and generated JavaScript/declarations.
- `npm run guard:packages` verifies the private root, private scoped workspaces,
  Node 24 declarations, and the sole structurally publishable `release-drafter`
  facade package.
- `npm run guard:boundaries` keeps the focused source-level check that runtime
  imports are not satisfied only by `devDependencies`. Dependency-cruiser owns
  the general source and emitted-output graph checks, while the focused SWC AST
  pass retains the type-only distinction its extracted edges do not expose.
- Run `npm run build:workspaces` before `npm run check:boundaries` outside
  `npm run all` so generated JavaScript and declaration files are available.
- `npm run check:clean` verifies generation left no unstaged or untracked drift
  relative to the intended staged tree.
- `npm run build --workspaces --if-present` builds package skeletons after the
  root Vite Action bundle build.

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
`packages/*`. The scope job runs the checked-in TypeScript router with the
repository's pinned Node version and passes fixed pathspec arguments directly to
Git without shell interpolation. Missing or invalid base commits and unexpected
Git failures fail open by running the matrix. Maintainers can also apply the
exact `ci:forge-conformance` label to request the matrix explicitly without
running changed-file detection. Other label events still use the same relevant
path detection, so they run the matrix only when the pull request changed a
covered path. The final gate runs checked-in TypeScript on Node.js 24 rather than
embedding result logic in the workflow. Pushes to `main` run the matrix only when
one of the same relevant paths changed.

The shared contract exercises the public facade and normalized release listing,
change discovery, commitish resolution, release creation, and release updates.
Forge-specific fixtures may additionally verify default-branch and repository
config loading. These suites require a working Docker-compatible daemon and fail
rather than silently skipping when explicitly invoked.

This fixture design selectively ports the real Gitea and Forgejo compatibility
coverage developed in #1684 into the workspace architecture from #1691. It does
not adopt #1684's former repository structure or REST implementation paths.

The pinned `testcontainers` dependency currently retains the transitive
`brace-expansion` security advisory because this repository's package-age cutoff
predates the patched releases. Keep this temporary acceptance visible in review
and upgrade the transitive dependency as soon as the cutoff permits it rather
than bypassing the repository-wide supply-chain policy.

Do not add npm publication workflows or make scoped `@release-drafter/*`
workspaces publishable without a dedicated maintainer-approved release plan.

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

- Run tests (`preversion` script)
- Bumps the private root version in [package.json](../package.json)
- Synchronizes that version to every workspace manifest, including the public
  `packages/release-drafter/package.json` facade, refreshes `package-lock.json`,
  and stages all versioned manifests (`version` script)
- Creates the corresponding tag
- Commit and tag
- Push & push tag (`postversion` script)

After pushing, the `release.yml` workflow will trigger (`on: push: tag`), and :

- publish the release draft
- update major tag (ex: pushing `v6.2.1` bumps `v6` to the same commit)

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
