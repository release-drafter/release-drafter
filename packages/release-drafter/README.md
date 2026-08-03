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

The repository argument must be exactly `owner/repo`.

### Authentication

The CLI selects credentials for the target host in this order:

- GitHub.com: `--token`, then `GITHUB_TOKEN`, then `GH_TOKEN`
- GitHub Enterprise Server: `--token`, then `GH_ENTERPRISE_TOKEN`, then
  `GITHUB_ENTERPRISE_TOKEN`

GitHub.com token variables are not reused for a GitHub Enterprise Server host.
Release Drafter never invokes `gh`. If you manage credentials with GitHub CLI,
you can explicitly pass them to Release Drafter from your shell:

```sh
GH_TOKEN="$(gh auth token)" release-drafter owner/repo
```

### Options

```text
Usage: release-drafter <owner/repo> [options]

Options:
  -f, --from <ref>             Change comparison base
  -n, --name <name>            Release name override
      --tag <tag>              Release tag override
  -r, --release-version <ver>  Release version override
  -t, --to <ref>               Target commitish
  -c, --config <target>        Config target (default: release-drafter.yml)
      --dry-run                Calculate without writing
      --publish [true|false]   Publish instead of drafting (default: false)
      --prerelease [true|false]
      --latest [true|false]
      --json                   Write one JSON result document to stdout
      --forge <name>           Forge implementation (github only)
      --server-url <url>       Forge web URL
      --api-url <url>          Forge REST API URL
      --graphql-url <url>      Forge GraphQL API URL
      --token <token>          GitHub token (overrides environment variables)
      --help                   Show help
      --version                Show version
```

`--publish`, `--prerelease`, and `--latest` accept an explicit `true` or
`false`. Omitting the value is equivalent to `true`.

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

`--config` accepts YAML or JSON from the local filesystem, a repository, or a
GitHub/GitHub Enterprise blob URL. Repository paths without `.github/` are
resolved beneath `.github/`.

```sh
# Local file. The path is relative to the current working directory.
npx release-drafter owner/repo --config file:config/release-drafter.yml --dry-run

# Current repository, current target ref.
npx release-drafter owner/repo --config release-drafter.yml --dry-run

# Explicit repository and ref.
npx release-drafter owner/repo \
  --config github:shared/release-config:.github/release-drafter.yml@main \
  --dry-run

# GitHub or GitHub Enterprise blob URL on the selected server.
npx release-drafter owner/repo \
  --config https://github.com/owner/repo/blob/main/.github/release-drafter.yml \
  --dry-run
```

Repository targets use the form
`[github:][[owner/]repo:]filepath[@ref]`. Local targets use
`file:relative/path`, are resolved relative to the process's current working
directory, and both the lexical path and its canonical symlink or junction
target must remain within that directory.

CLI config loading supports Release Drafter's `_extends` chains, including
`override`, `append`, and `prepend` merge strategies. Relative inherited paths
are resolved from the config that declares `_extends`. A repository config
cannot extend a local `file:` target.

### GitHub Enterprise and forge selection

The current CLI build supports GitHub and GitHub Enterprise only:

```sh
npx release-drafter owner/repo \
  --forge github \
  --server-url https://github.example.com \
  --api-url https://github.example.com/api/v3 \
  --graphql-url https://github.example.com/api/graphql \
  --dry-run
```

GitHub.com and conventional GitHub Enterprise `/api/v3` endpoints can be
identified as GitHub. A custom ambiguous endpoint, including an `/api/v1`
endpoint, requires an explicit `--forge` selection. This build still accepts
only `--forge github`. Selecting `gitea`, `forgejo`, `gitlab`, or any other
unsupported forge fails instead of guessing. Those adapters are not shipped in
the current CLI build. Endpoint URLs must be absolute HTTP(S) URLs without
credentials, query parameters, or fragments.

### Exit codes

| Code | Meaning                                                                                  |
| ---- | ---------------------------------------------------------------------------------------- |
| `0`  | The command completed successfully, or help/version was displayed.                       |
| `1`  | Authentication, config loading, network access, validation, or release execution failed. |
| `2`  | Command-line usage was invalid.                                                          |

## Programmatic API

```ts
import {
  draftRelease,
  type DraftReleaseConfig,
  type ForgeAdapter,
} from 'release-drafter'

const adapter: ForgeAdapter = createForgeAdapter()
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

`draftRelease(options)` delegates release calculation and writes to the Release
Drafter core. The public boundary is forge-neutral:

- `adapter` is an injected `ForgeAdapter`. It supplies repository, change, ref,
  and release operations for the forge.
- `config` is a fully parsed `DraftReleaseConfig`. Loading YAML, applying config
  inheritance, and normalizing raw configuration are runtime concerns and are
  not performed by this facade.
- `input` controls the comparison base and whether the resulting release is a
  dry run, draft, or published release.
- `repository` identifies the target without relying on ambient Actions state.
- `logger` is optional. Omitting it uses a no-op logger.

The returned `DraftReleaseResult` contains the forge-neutral release plan,
normalized release payload, and the created or updated release when a write was
performed.

Importing `release-drafter` does not start the CLI, read environment variables,
or perform network requests.
