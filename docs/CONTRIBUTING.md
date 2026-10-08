# Contributing

[fork]: https://github.com/release-drafter/release-drafter/fork
[pr]: https://github.com/release-drafter/release-drafter/compare
[code-of-conduct]: CODE_OF_CONDUCT.md
[license]: ../LICENSE

Thank you for contributing to Release Drafter.

This project uses a [Contributor Code of Conduct][code-of-conduct]. All
contributors must follow it.

By submitting a contribution, you agree that it may be distributed under the
project's [ISC license][license]. You are responsible for reviewing your
submission, including content produced with AI-assisted tools, and for ensuring
that you have the right to submit it.

When you open your first pull request, a bot will ask you to acknowledge these
contribution policies. After reading this guide, the Code of Conduct, and the
license, reply to the bot with exactly:

> I have read and agree to the Release Drafter contribution policies.

The pull request cannot be merged until this acknowledgement is recorded.

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

Split Drafter end-to-end tests into files by behavior, keeping cases within each
file sequential. `src/tests/setup.ts` selects the directories that need Action
mocks; update it when adding an Action test directory.

Common commands:

- `npm run ci` runs the standard repository checks and builds generated files. It
  formats and lints the code, checks dependencies, package settings, and types,
  runs tests, generates schemas, and builds action bundles and workspace packages.
  Tooling tests check script syntax with Node. GitHub Actions sets
  `COVERAGE_THRESHOLD=90` and `BRANCH_COVERAGE_THRESHOLD=90`; set them locally
  to enforce the same statement and branch coverage.
- `npm run test:run` runs source tests. For a focused run, use
  `npm run test:run -- path/to/file.test.ts`.
- `npm run test:artifacts` builds the action bundles and workspace packages,
  then tests their generated output and package consumers.
- `npm run coverage` prints statement coverage and, in GitHub Actions, adds a
  coverage table to the job summary.
- `npm run check:dependencies` uses Knip to find unused files, unused
  dependencies, and unlisted dependencies. It does not report unused exports.
  It uses Knip's normal parser to avoid raw-transfer buffer allocation failures
  on memory-limited workers, including Mend Renovate.
- `npm run check:dependencies:production` uses Knip strict mode to report
  production imports missing from each private workspace's runtime dependencies.
  Type-only source imports may use development dependencies. The public
  `release-drafter` package bundles private workspaces from development
  dependencies, so its shipped imports are checked by the package consumer
  tests instead.
- `npm run check:packages` checks publication settings and workspace version
  alignment. Only the `release-drafter` package can be published.
- `npm run test:package-readiness` builds and packs the public
  `release-drafter` package. It runs the ESM, NodeNext, CLI, and isolated `npx`
  consumer contracts. It checks the package contents and metadata, then runs an
  offline `npm publish --dry-run` against the same tarball.
- `npm run check:clean` fails if generation leaves unstaged or untracked changes
  relative to the staged tree.
- `npm run build:workspaces` builds workspace packages.

### Forge conformance tests

`npm run test:run` and `npm run ci` do not start containers. Use these commands
to run Docker-backed forge conformance tests:

- `npm run test:conformance:gitea` runs the Gitea image.
- `npm run test:conformance:forgejo` runs the Forgejo image.
- `npm run test:conformance:gitea-forgejo` runs both images through the shared
  `ForgeAdapter` contract.
- `npm run test:conformance:gitlab` runs the GitLab suite serially and uses
  extended startup and teardown timeouts. It uses a GitLab CE image from
  [`jetersen/gitlab-ce-warm`](https://github.com/jetersen/gitlab-ce-warm) with
  Omnibus configuration and the test project already applied, so it starts in
  seconds without Sidekiq. Changes to the seeded project belong in that
  repository's `seeds/release-drafter.sh`, followed by an image digest update
  in `src/tests/integration/forge-conformance/images.ts`. The image does not
  run Workhorse, so tests cannot create files or commits through the API. Add
  that data to the seed instead.

The CI matrix tests Gitea, Forgejo, and GitLab. Failed GitLab jobs upload
redacted container logs and fixture metadata. Each job moves Docker's storage
to memory, then starts its forge container with
`node src/tests/integration/forge-conformance/containers.ts start <forge>`
before installing dependencies, and the suite attaches to it when
`FORGE_CONFORMANCE_PRESTARTED=true`. Without that variable, the suites start the
same container definitions with Testcontainers. CI and forge conformance jobs
restore `node_modules` from the Actions cache when `package-lock.json`,
`.npmrc`, and `.node-version` are unchanged. Renovate updates the pinned images
in `images.ts`.

The forge conformance workflow runs the matrix for changes to these inputs:

- Source or TypeScript configurations in the core, public package, or adapters
  (`github-adapter`, `rest-adapter`, `gitea-adapter`, `forgejo-adapter`, and
  `gitlab-adapter`). Source scope uses package directories so new shared helpers
  are included automatically. Unit tests and the public CLI entrypoint are excluded.
- The conformance suites and fixtures under `src/tests/integration/forge-conformance`
  and `src/tests/integration/gitlab`, excluding the mocked GitHub unit suite.
- `.github/workflows/forge-conformance.yml`, `.node-version`, `.npmrc`, root
  TypeScript configurations, `vitest.forge.config.ts`, `vitest.gitlab.config.ts`,
  or `src/scripts/forge-conformance-router.ts`.
- Runtime dependency or module-resolution settings in the core, public package,
  or adapter manifests. Root manifest triggers are limited to conformance
  commands, Vitest, Vite, Testcontainers, installation overrides, and runtime
  and workspace resolution settings.
- Lockfile changes affecting runtime dependencies of those packages, or Vitest,
  Vite, and Testcontainers. The router follows transitive, nested, installed
  optional, required peer, and workspace dependencies in both lockfile versions.
  Workspace development dependencies and unused optional peer integrations
  such as coverage and browser runners are excluded.

Formatting, linting, code generation, publication metadata, unrelated unit tests,
CLI, autolabeler, and GitHub Actions changes use normal CI without starting forge
containers. A dependency update still runs the matrix if it changes a runtime
package shared with the forge suites. Shared package source changes remain
conservative triggers even when a particular function is not exercised.

Apply the exact `ci:forge-conformance` label when a change outside this scope
needs container verification. The label overrides detection. Extend the package
and tool lists when the suites start using another workspace or test tool.
The same routing applies to pushes to `main`.

Pushes to `ci/` branches select forges by branch name instead of by changed
files. A branch name containing `gitea`, `forgejo`, or `gitlab` runs only those
forges, for example `ci/gitlab-startup`. Other `ci/` branches skip the matrix.
Use these branches to iterate on forge test infrastructure before opening a
pull request.

Other pull request label events use changed file detection. The workflow also
runs the matrix if the base commit is missing or invalid, if Git fails, or if
changed dependency inputs cannot be inspected.

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
and grants only `contents: read`.

Only `.github/workflows/npm-publish.yml` may publish to npm. It uses npm trusted
publishing with GitHub OIDC and the protected `npm` environment; it does not use
a long-lived npm token. The trusted publisher must specify `npm-publish.yml`,
the `release-drafter/release-drafter` repository, and the `npm` environment.
Keep direct publishing and dist-tag management disabled; staging is always
allowed. Do not make a scoped `@release-drafter/*` workspace
publishable.

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

1. Run the **Release** workflow on `main`. Use `auto` for Release Drafter's
   proposed version, or enter `patch`, `minor`, `major`, or an exact stable version.
2. Review the generated version PR and merge it using GitHub's merge or squash
   method after checks pass. Release Drafter publishes the immutable GitHub
   release and updates the major tag automatically.
3. Approve the **Publish npm Package** workflow through the `npm` environment.
4. Review and approve the staged package on npm with 2FA to make it public.

Release PRs are excluded from the changelog automatically.

A later push to `main` retries failed GitHub publication. For a failed npm
publication, rerun **Publish npm Package** with the existing release tag.

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)
