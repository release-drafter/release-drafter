# @release-drafter/core

Private forge-neutral implementation workspace. It is not published and its API
is not yet stable.

The package owns normalized release, commit, and pull-request DTOs;
configuration schemas and merge behavior; category evaluation; changelog and
version rendering; release orchestration; and dry-run write protection.
Runtimes provide an explicit `Logger`, `Repository`, and `ForgeAdapter`.
Forge clients, Actions Toolkit modules, environment lookup, and forge response
types do not belong in this package. Every adapter operation receives its target
`Repository` explicitly, so adapters remain stateless across repositories and
the core never relies on ambient forge context. The adapter also declares
whether its forge supports draft releases. Core uses that capability to make
`publish: false` calculation-only on forges without drafts and to update an
existing published release with the generated tag when `publish: true`.
