# AGENTS.md

## Development

Read [the contribution guide](docs/CONTRIBUTING.md), especially
[Workspace development](docs/CONTRIBUTING.md#workspace-development), for setup,
workspace development, package publication, and release rules.

- Edit source files and use the repository generators for generated output.
  Do not read, search, or review generated `dist/` contents or diffs. Review
  source changes and verify generated output through regeneration and drift
  checks. The root `dist/` is tracked and must be regenerated before pushing.
  `packages/*/dist/` is ignored and must not be committed.
- Use `@actions/core` for GitHub Action runtime logging.
- Do not use Zod `refine` or `superRefine` on schemas converted to JSON schema.
  Keep those schemas JSON-schema-compatible and perform semantic validation
  during runtime parsing or configuration validation instead.
- Update tests for behavior changes and `README.md` for functionality or usage
  changes.
- Leave repository release-version bumps to the Release workflow unless
  explicitly requested.

## Verification

- Set up each checkout with `npm ci` using its own lockfile. Do not copy
  `node_modules` from another checkout.
- Before pushing, run `npm run ci`. It formats, lints, checks types, runs unit
  tests, regenerates schemas and action metadata, builds bundles and workspace
  packages, and checks package settings and dependencies.
- Review source and documentation diffs. Use file names or diff statistics to
  identify generated changes without reading `dist/` output. Stage intended
  changes, then run `npm run check:clean` with output redirected to a file.
  On failure, diagnose with Git status and source-only diffs; do not read the
  captured output, which can contain full `dist/` diffs. Report failed checks
  and checks that could not run; do not claim they passed.
- For targeted unit tests, use `npm run test:run`, not the watch-mode
  `npm run test`.
- Markdown uses `npm run format:docs` (included in `npm run ci`). Biome owns
  other supported file types; do not run Prettier on them.
- `npm run ci` does not run Docker-backed forge conformance tests. For adapter
  changes, consult the contribution guide's forge conformance section and run
  the relevant suite.

## Pull requests

- Read `.github/pull_request_template.md` before creating or rewriting a PR
  body. Preserve its Summary, Testing, and Checklist sections and checklist
  items; fill them in for the actual change instead of replacing the template
  with a custom summary.
- With `gh pr create` or `gh pr edit`, write the completed template to a file
  and pass `--body-file`. An explicit body bypasses automatic template filling.
- Use Conventional Commits for commits and PR titles. Check titles against
  `.github/release-drafter.yml` for category and version impact.
- Use `ci` for changes to this repository's own CI workflows and maintenance
  automations, including fixes; use `fix` for bugs in Release Drafter's released
  functionality. Scopes add context: `fix(ci)` still belongs under Bug Fixes.
- Describe the final change, dependency changes, relevant issue links, and
  actual validation. Check only checklist items that are satisfied. Leave
  human review and policy agreement items for the contributor to confirm;
  disclose AI assistance.
- Use repository-relative paths in public PR descriptions. Do not include
  local checkout paths or private thread history.
- After creating or updating the PR, read back its title and body with
  `gh pr view --json title,body,url` and verify that the template sections and
  checklist survived.
- Verify that the current PR head satisfies every required check before
  reporting the PR ready to merge.
