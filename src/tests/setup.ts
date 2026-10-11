import { expect } from 'vite-plus/test'
import './setup-common.ts'

// Only Action tests need GitHub context, input, and configuration mocks.
// Keep these imports out of pure unit and tooling tests to reduce worker setup.
// oxlint-disable-next-line vitest/no-standalone-expect -- Read setup metadata before test collection.
const testPath = expect.getState().testPath?.replaceAll('\\', '/') ?? ''
if (
  /\/(?:src\/tests\/(?:autolabeler|check-pr|drafter)|packages\/gh-actions\/src)\//.test(
    testPath,
  )
) {
  await import('./setup-actions.ts')
}
