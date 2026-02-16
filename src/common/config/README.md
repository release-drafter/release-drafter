# Configuration loading

TODO

`[github:][[owner/]repo]:filepath[@ref]` or `file:filepath`

Grammar for [RR schema](https://www.bottlecaps.de/rr/ui) :
`target ::= ('github:')? ( (owner '/')? repo ':' )? filepath ( '@' ref )? | ( 'file:' filepath )`

## Syntax edge-cases

### Load config from your default branch

When not specifying a ref (with `@ref`), octokit will fetch from the default
branch of the repo.

However, our implementation of the config-loading will automatically set a value
for this ref parameter whenever the target repo and repo owner are the same
release-drafter is running for.

For instance, if you are running :

```yaml
# github.com/john_doe/my_repo/.github/workflows/release.yaml
on:
  push:
    branches:
      - feature/implement-auth

jobs:
  release-drafter:
    runs-on: ubuntu-latest
    steps:
      - uses: release-drafter/release-drafter@v7
        with:
          config-name: release-drafter.yaml
```

... This will fetch
`https://github.com/john_doe/my_repo/.github/workflows/release.yaml?ref=feature/implement-auth`.

If you need to fetch to your default branch instead, you will need to know the
name of your default branch :

```yaml
config-name: release-drafter.yaml@main
```

... or get it from your workflow's context :

```yaml
config-name: release-drafter.yaml@${{ github.event.repository.default_branch }}
```

### Fetching form a repo named `github`

The `github:` prefix is used internally to recognize you want to explicitly
fetch from a remote (using octokit) instead of loading a file on the runtime's
filesystem.

The same prefix could also be used if you wanted to specify fetching from a repo
you own named `github`.

For instance, `github:release-drafter.yaml` would mean both :

- fetch from current repo at current ref
- and fetch from my repo named `github`

If you intent the later, you will need to be more explicit. Use either :

- `my_org_or_name/github:release-drafter.yaml`
- or `github:github:release-drafter.yaml`
- or even `github:my_org_or_name/github:release-drafter.yaml`
