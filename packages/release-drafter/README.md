# release-drafter

Forge-neutral programmatic facade for Release Drafter.

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

Importing this package does not start a CLI, read environment variables, or
perform network requests. CLI entrypoints, package publication, and concrete
forge adapters are separate concerns.
