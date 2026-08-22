# release-drafter

Release Drafter's public package provides both a forge-neutral programmatic API
and the `release-drafter` command-line interface. Node.js 24 or later is
required.

## CLI

Install the package globally or in a project:

```sh
npm install --global release-drafter
# or
npm install --save-dev release-drafter
```

You can also run it without a permanent installation:

```sh
npx release-drafter owner/repo --dry-run
```

For GitHub, Gitea, and Forgejo, use `owner/repo`. For GitLab, use
`namespace/project`. A GitLab namespace can contain multiple segments.

### Authentication

The CLI selects credentials for the target host in this order:

- GitHub.com: `--token`, then `GITHUB_TOKEN`, then `GH_TOKEN`
- GitHub Enterprise Server: `--token`, then `GH_ENTERPRISE_TOKEN`, then
  `GITHUB_ENTERPRISE_TOKEN`
- Gitea: `--token`, then `GITEA_TOKEN`
- Forgejo: `--token`, then `FORGEJO_TOKEN`
- GitLab: `--token`, then `GITLAB_TOKEN`

GitHub.com token variables are not reused for a GitHub Enterprise Server host.
Tokens are never reused across forge families. Automatic environment
credentials are rejected when an explicit API endpoint uses another origin;
use `--token` to authorize that combination deliberately.
Release Drafter never invokes `gh`. If you manage credentials with GitHub CLI,
you can explicitly pass them to Release Drafter from your shell:

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

`--publish`, `--prerelease`, and `--latest` accept an explicit `true` or
`false`. Omitting the value is equivalent to `true`.

GitHub remains the default forge. Explicit Gitea, Forgejo, and GitLab selection
defaults to `https://gitea.com`, `https://codeberg.org`, and
`https://gitlab.com`, respectively. Pass `--server-url` for a self-hosted
instance and `--api-url` only when its REST endpoint is nonstandard.

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

Publish a prerelease and control GitHub's latest-release flag:

```sh
npx release-drafter owner/repo \
  --publish true \
  --prerelease true \
  --latest false
```

The booleans can also be explicitly disabled:

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
condition with `conventional` validates the title. A condition with labels
validates current labels. If one condition defines both, title and labels must
both match. The command ignores path predicates, and a path-only condition
cannot pass validation. If a `pre-exclude` category excludes the pull request by
title or label, the command reports it as skipped. An unconditional fallback
category cannot make the pull request valid by itself.

The command exits with `0` for valid or excluded pull requests and `1` for an
invalid pull request. In JSON mode, it returns the pull request number, title, status,
valid and skipped flags, and the number of selected categories:

```sh
npx release-drafter check-pr owner/repo 123 --json
```

### JSON automation

Use `--json` for scripts and CI:

```sh
npx release-drafter owner/repo --dry-run --json >release.json
```

JSON mode emits exactly one JSON document on stdout. Progress, warnings,
diagnostics, and errors are written to stderr, so stdout can be parsed directly.

The document's primary fields are:

- `action`: `create`, `update`, or `dry-run`
- `id`: release ID, when an existing or written release is available
- `html_url` and `upload_url`: release URLs when available
- `tag_name`, `name`, and `body`: the resolved release payload
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
  "body": "## What's Changed\n"
}
```

### Config targets

`--config` accepts YAML or JSON from the local filesystem or the selected forge
repository. GitHub.com and GitHub Enterprise Server blob URLs are also
accepted. Repository paths without `.github/` are resolved beneath `.github/`.

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

CLI config loading supports Release Drafter's `_extends` chains, including
`override`, `append`, and `prepend` merge strategies. Relative inherited paths
are resolved from the config that declares `_extends`. A repository config
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
an explicit `--forge` selection. `--graphql-url` is supported only for GitHub.
Endpoint URLs must be absolute HTTP(S) URLs without credentials, query
parameters, or fragments. Environment credentials are used only when
configured API endpoints stay on the expected credential origin. The expected
origin is `api.github.com` for GitHub.com and the configured server origin for
other targets. Cross-origin endpoints require an explicit `--token`.

### Exit codes

| Code | Meaning                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------- |
| `0`  | The command completed successfully, a pull request passed or was skipped, or help/version was displayed.  |
| `1`  | A pull request failed validation, or authentication, config loading, network access, or execution failed. |
| `2`  | Command-line usage was invalid, or no credential could be resolved.                                       |

## Programmatic API

```ts
import {
  createForgeAdapter,
  draftRelease,
  type DraftReleaseConfig,
  type ForgeAdapter,
} from 'release-drafter'

const adapter: ForgeAdapter = createForgeAdapter({
  forge: 'github',
  token: process.env.GITHUB_TOKEN,
})
const config: DraftReleaseConfig = loadAndNormalizeReleaseDrafterConfig()

const result = await draftRelease({
  adapter,
  config,
  repository: {
    owner: 'release-drafter',
    name: 'release-drafter',
    serverUrl: 'https://github.com',
  },
  input: {
    publish: false,
    dryRun: true,
  },
})

console.log(result.plan.action, result.releasePayload)
```

`draftRelease(options)` uses the Release Drafter core to calculate a release. It
calls the adapter when the selected operation writes a release. The public API
is forge-neutral:

- `adapter` is an injected `ForgeAdapter`. It supplies repository, change, ref,
  and release operations for the forge.
- `config` must be a fully parsed `DraftReleaseConfig`. The caller or runtime
  must load YAML, apply config inheritance, and normalize the raw configuration.
- `input` selects the comparison base and the operation mode: dry run, draft, or
  publish.
- `repository` identifies the target. The package does not read the target from
  GitHub Actions state.
- `logger` is optional. Omitting it uses a no-op logger.

`DraftReleaseResult` contains the forge-neutral release plan and normalized
release payload. If the adapter writes a release, the result also contains the
created or updated release.

Importing `release-drafter` does not start the CLI, read environment variables,
or perform network requests.

`createForgeAdapter(options)` constructs bundled `github`, `gitea`, `forgejo`,
and `gitlab` adapters without exposing private workspace packages. The
programmatic API always requires an explicit token.
