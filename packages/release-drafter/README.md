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

Importing this package does not read environment variables or perform network
requests.
