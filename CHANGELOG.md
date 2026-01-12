# Changelog

## v6 -> v7

### BREAKING Changes

- Disabled use of the `references` config. Use [`on` conditions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#on) instead :

    ```yaml
    # .github/workflows/release-drafter.yaml
    
    on:
      push:
        # Sequence of patterns matched against refs/heads
        branches:
          - main
          - 'mona/octocat'
          - 'releases/**'
        # Sequence of patterns matched against refs/tags
        tags:
          - v2
          - v1.*
    ```