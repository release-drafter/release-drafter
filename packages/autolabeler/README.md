# @release-drafter/autolabeler

Private reusable autolabeler workspace. It is not published and its API is not
yet stable.

The package exports the configuration schema, regex compilation, and pure
`matchLabels` evaluation for files, branch, title, and body rules. Matching is
add-only, ordered, and deduplicated. GitHub event validation, changed-file
fetching, label writes, Action logging, dry-run messages, and outputs remain in
the root Action wrapper.
