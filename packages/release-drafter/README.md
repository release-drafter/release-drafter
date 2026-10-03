<h1 align="center">
  <img src="https://raw.githubusercontent.com/release-drafter/release-drafter/main/docs/design/logo.svg" alt="Release Drafter Logo" width="450" />
</h1>

The public `release-drafter` package provides a forge-neutral programmatic API
and a command-line interface. It requires Node.js 24 or later.

## CLI

Install the package globally or in a project:

```sh
npm install --global release-drafter
# or
npm install --save-dev release-drafter
```

Run the CLI without installing it:

```sh
npx release-drafter owner/repo --dry-run
```

For GitHub, Gitea, and Forgejo, use `owner/repo`. For GitLab, use
`namespace/project`. A GitLab namespace can contain multiple segments.

### Authentication

The CLI selects credentials for the target host in this order:

- GitHub.com and GitHub Enterprise Cloud on `*.ghe.com`: `--token`, then
  `GH_TOKEN`, then `GITHUB_TOKEN`
- GitHub Enterprise Server: `--token`, then `GH_ENTERPRISE_TOKEN`, then
  `GITHUB_ENTERPRISE_TOKEN`
- Gitea: `--token`, then `GITEA_TOKEN`
- Forgejo: `--token`, then `FORGEJO_TOKEN`
- GitLab: `--token`, then `GITLAB_TOKEN`

Release Drafter does not use GitHub-hosted token variables for a GitHub
Enterprise Server host. It does not reuse tokens between forge types. An
explicit API endpoint on a different origin requires an explicit `--token`.

Release Drafter does not run `gh`. If GitHub CLI manages your credentials, pass
its token to Release Drafter from the shell:

```sh
GH_TOKEN="$(gh auth token)" release-drafter owner/repo
```

### Options

```text
Usage: release-drafter <repository> [options]
       release-drafter check-pr <repository> <number> [options]

Repository:
  owner/name                  GitHub, Gitea, or Forgejo repository
  namespace/project          GitLab repository; nested namespaces are allowed

Options:
  -f, --from <ref>             Change comparison base
  -n, --name <name>            Release name override
      --tag <tag>              Release tag override
  -r, --release-version <ver>  Release version override
  -t, --to <ref>               Target commitish
  -c, --config <target>        Config target (default: release-drafter.yml)
      --dry-run                Calculate without writing
      --publish [true|false]   Publish the release when true (default: false)
      --prerelease [true|false]
      --latest [true|false]
      --json                   Write one JSON result document to stdout
      --forge <name>           github, gitea, forgejo, or gitlab
      --server-url <url>       Forge web URL
      --api-url <url>          Forge REST API URL
      --graphql-url <url>      Forge GraphQL API URL
      --token <token>          Forge token (overrides environment variables)
      --help                   Show help
      --version                Show version
```

`--publish`, `--prerelease`, and `--latest` accept `true` or `false`. If you omit
the value, the CLI uses `true`.

GitHub is the default forge. Gitea defaults to `https://gitea.com`, Forgejo
defaults to `https://codeberg.org`, and GitLab defaults to
`https://gitlab.com`. Pass `--server-url` for a self-hosted instance. Pass
`--api-url` only when its REST endpoint is nonstandard.

GitLab Releases do not support drafts or prerelease semantics. For GitLab,
`--publish false` calculates and returns the proposed release without writing
it. `--publish true` creates or updates a non-prerelease release. A prerelease
payload is rejected before any GitLab request is sent.

### Examples

Calculate a release without creating or updating it:

```sh
npx release-drafter owner/repo --dry-run
```

Compare a specific range and target the `main` branch:

```sh
npx release-drafter owner/repo --from v2.0.0 --to main --dry-run
```

Override the calculated release metadata:

```sh
npx release-drafter owner/repo \
  --name 'Version 2.1' \
  --tag v2.1.0 \
  --release-version 2.1.0 \
  --dry-run
```

Publish a prerelease and control GitHub's latest release setting:

```sh
npx release-drafter owner/repo \
  --publish true \
  --prerelease true \
  --latest false
```

Set each Boolean option explicitly:

```sh
npx release-drafter owner/repo \
  --publish false \
  --prerelease false \
  --latest true
```

### Check a pull request

Use `check-pr` to validate a pull request with the same category rules as the
Check PR action:

```sh
npx release-drafter check-pr owner/repo 123
```

The command loads configuration from the pull request's base branch. A
condition that contains `conventional` validates the title. A condition that
contains `label` or `labels` validates the current labels. If a condition
contains both types of rule, the title and labels must match.

The command does not evaluate `path` or `paths`. A condition that contains only
path rules cannot pass validation. A matching `pre-exclude` category skips the
pull request. A fallback category without a `when` condition does not make the
pull request valid.

The command exits with `0` for valid or excluded pull requests and `1` for an
invalid pull request. In JSON mode, it returns the pull request number, title,
labels, status, validity, skip status, and number of selected categories.
`labels` is a JSON array of unique, sorted labels matched by successful
configuration conditions under Check PR's validation rules. Unrelated labels
are omitted. For excluded PRs, it contains labels matched by pre-include and
pre-exclude conditions; invalid PRs can still report matching pre-include labels:

```sh
npx release-drafter check-pr owner/repo 123 --json
```

### JSON automation

Use `--json` for scripts and CI:

```sh
npx release-drafter owner/repo --dry-run --json >release.json
```

JSON mode writes one JSON document to standard output. It writes progress,
warnings, diagnostics, and errors to standard error.

The result contains these fields:

- `action`: `create`, `update`, or `dry-run`
- `id`: release ID, when an existing or written release is available
- `html_url` and `upload_url`: release URLs when available
- `tag_name`, `name`, and `body`: the resolved release payload
- `labels`: a JSON array of unique, sorted labels matched by successful
  configuration conditions on included PRs. Only labels present on those PRs
  contribute. Excluded PRs and unrelated labels are omitted; empty results are `[]`
- `resolved_version`, `major_version`, `minor_version`, `patch_version`, and
  `prerelease_version`: calculated version fields when available
- `target_commitish`: the resolved release target
- `draft`, `prerelease`, `latest`, and `dry_run`: resolved release and execution
  booleans

For example:

```json
{
  "action": "dry-run",
  "tag_name": "v2.1.0",
  "name": "v2.1.0",
  "resolved_version": "2.1.0",
  "major_version": "2",
  "minor_version": "1",
  "patch_version": "0",
  "target_commitish": "main",
  "draft": true,
  "prerelease": false,
  "latest": true,
  "dry_run": true,
  "body": "## What's Changed\n",
  "labels": ["api/user", "feature"]
}
```

### Configuration targets

`--config` accepts YAML or JSON from the local file system or the selected forge
repository. GitHub.com and GitHub Enterprise Server blob URLs are also
accepted. Release Drafter resolves repository paths without `.github/` from the
repository's `.github/` directory.

```sh
# Local file. The path is relative to the current working directory.
npx release-drafter owner/repo --config file:config/release-drafter.yml --dry-run

# Current repository, current target ref.
npx release-drafter owner/repo --config release-drafter.yml --dry-run

# Explicit repository and ref.
npx release-drafter owner/repo \
  --config github:shared/release-config:.github/release-drafter.yml@main \
  --dry-run

# GitHub.com or GitHub Enterprise Server blob URL.
npx release-drafter owner/repo \
  --config https://github.com/owner/repo/blob/main/.github/release-drafter.yml \
  --dry-run
```

Repository targets use the form
`[github:][[owner/]repo:]filepath[@ref]`. Local targets use
`file:relative/path`. The CLI resolves local targets from the current working
directory. The lexical path and the final symlink or junction target must stay
in that directory.

CLI configuration loading supports Release Drafter's `_extends` chains, including
`override`, `append`, and `prepend` merge strategies. Relative inherited paths
start at the configuration that declares `_extends`. A repository configuration
cannot extend a local `file:` target.

### Forge selection and custom endpoints

The CLI supports GitHub, Gitea, Forgejo, and GitLab. GitHub is the default.
Select the other forges with `--forge`. GitLab repository arguments use
`namespace/project`. The namespace can contain multiple segments, such as
`group/subgroup/project`.

```sh
npx release-drafter owner/repo \
  --forge github \
  --server-url https://github.example.com \
  --api-url https://github.example.com/api/v3 \
  --graphql-url https://github.example.com/api/graphql \
  --dry-run
```

The CLI identifies GitHub.com and GitHub Enterprise Server endpoints that use
the standard `/api/v3` path. Other endpoint paths, including `/api/v1`, require
an explicit `--forge` selection. For GitHub Enterprise Cloud on `*.ghe.com`, the
CLI uses `api.<subdomain>.ghe.com` for REST and GraphQL requests.

Only GitHub supports `--graphql-url`. Endpoint URLs must be absolute HTTP or
HTTPS URLs without credentials, query parameters, or fragments. The CLI uses an
environment token only when the configured API endpoint has the expected
origin. A cross-origin endpoint requires an explicit `--token`.

### Exit codes

| Code | Meaning                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------- |
| `0`  | The command succeeded, pull request validation passed or skipped, or the command displayed help/version. |
| `1`  | Pull request validation, authentication, configuration loading, network access, or execution failed.     |
| `2`  | Command-line usage was invalid or credential resolution failed.                                          |

## Programmatic API

```ts
import { createForgeAdapter, draftRelease, loadConfig } from 'release-drafter'

const adapter = createForgeAdapter({
  forge: 'github',
  token: process.env.GITHUB_TOKEN!,
})

const repository = {
  owner: 'release-drafter',
  name: 'release-drafter',
  serverUrl: 'https://github.com',
}
const config = await loadConfig({ adapter, repository })

const result = await draftRelease({
  adapter,
  config,
  repository,
  input: {
    publish: false,
    dryRun: true,
  },
})

console.log(result.plan.action, result.releasePayload)
```

`draftRelease(options)` uses the Release Drafter core to calculate a release. It
calls the adapter when the selected operation writes a release. The API is
forge-neutral:

- `adapter` is an injected `ForgeAdapter`. It supplies repository, change, ref,
  and release operations for the forge.
- `config` is a fully parsed `DraftReleaseConfig`. Use the standard `loadConfig`
  helper or supply your own parsed configuration.
- `input` selects the comparison base and the operation mode. The modes are dry
  run, draft, and publish.
- `repository` identifies the target. The package does not read the target from
  GitHub Actions state.
- `logger` is optional. Omitting it uses a no-op logger.

`loadConfig(options)` loads `.github/release-drafter.yml` from the repository's
default branch through the supplied adapter. It supports the same YAML/JSON
files, `_extends` chains, merge strategies, and `.github` repository fallback
as the CLI. It validates the composed configuration, applies defaults, and
normalizes categories, replacer expressions, and change grouping.

Use `target` to select another repository configuration or a local
`file:relative/path` target. `ref` selects the branch or ref used to load the
configuration and supplies the default release commitish. `cwd` sets the base
directory for local files; it defaults to the current working directory. Local
paths and their symlink targets must stay within that directory. Repository
configurations cannot extend local files. `overrides` applies common config
values, such as `commitish`, `prerelease`, and `latest`, after inheritance.
`logger` is optional and defaults to a no-op logger.

```ts
const config = await loadConfig({
  adapter,
  repository,
  target: 'file:release-drafter.yml',
  ref: 'main',
  overrides: { prerelease: true, latest: false },
})
```

The bundled adapters returned by `createForgeAdapter` support configuration
loading. A custom `RepositoryConfigReader` can provide `getDefaultBranch` and
`getRepositoryConfig` for another forge or storage layer. Applications that
already load and normalize configuration can pass their `DraftReleaseConfig`
directly to `draftRelease`.

`DraftReleaseResult` contains the forge-neutral release plan and normalized
release payload. If the adapter writes a release, the result also contains the
created or updated release.

`DraftReleaseResult.labels` contains the unique, sorted labels matched by
successful configuration conditions on included PRs, including in dry-run mode.
It respects compound title/path predicates and category exclusivity. It is an
empty array when no configured labels match.

Importing `release-drafter` does not start the CLI, read environment variables,
or perform network requests.

`createForgeAdapter(options)` creates the bundled `github`, `gitea`, `forgejo`,
and `gitlab` adapters. The programmatic API requires an explicit token.

## Proxies and custom fetch

The CLI and bundled adapters use the runtime's built-in `globalThis.fetch` by
default. Configure proxy support in the runtime. With Node.js 24, enable
[environment proxy support](https://nodejs.org/docs/latest-v24.x/api/cli.html#node_use_env_proxy1)
when starting the process:

```sh
NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://proxy.example.com:8080 \
  NO_PROXY=localhost,127.0.0.1 npx release-drafter owner/repo --dry-run
```

For the programmatic API, pass a custom `fetch` to `createForgeAdapter` when
your application manages networking itself:

```ts
const adapter = createForgeAdapter({
  forge: 'github',
  token: process.env.GITHUB_TOKEN!,
  fetch: customFetch,
})
```

Release Drafter does not install a proxy dispatcher or change the global fetch.
