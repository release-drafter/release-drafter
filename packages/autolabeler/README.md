# @release-drafter/autolabeler

This private workspace package contains reusable Autolabeler logic. The package
is not published.

The package exports the configuration schema and the pure `matchLabels`
function. It compiles regular expressions for file, branch, title, and body
rules. `matchLabels` returns matching labels in configuration order and removes
duplicates.

The GitHub Action runtime validates event payloads, fetches changed files,
writes labels, logs messages, handles dry runs, and sets outputs. Those tasks do
not belong in this package.
