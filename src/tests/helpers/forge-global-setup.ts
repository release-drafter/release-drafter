import type { TestProject } from 'vitest/node'
import {
  type ForgeFlavor,
  type ForgeInfo,
  startForge,
} from './forge-container.ts'

/**
 * Boots one Gitea and one Forgejo for the whole container test run and hands
 * their connection details to the workers through `provide`.
 *
 * Global setup — rather than a `beforeAll` in the suite — means the servers are
 * started once no matter how many files use them, the two boots overlap, and
 * teardown is guaranteed by the returned function even if a suite throws.
 *
 * @see https://node.testcontainers.org/quickstart/global-setup/
 */

const FLAVORS: ForgeFlavor[] = ['gitea', 'forgejo']

declare module 'vitest' {
  interface ProvidedContext {
    forges: Record<ForgeFlavor, ForgeInfo>
  }
}

export default async ({ provide }: TestProject) => {
  const started = await Promise.all(FLAVORS.map((flavor) => startForge(flavor)))

  provide(
    'forges',
    Object.fromEntries(
      started.map(({ info }) => [info.flavor, info]),
    ) as Record<ForgeFlavor, ForgeInfo>,
  )

  for (const { info } of started) {
    console.log(`${info.flavor} ${info.version} ready at ${info.apiUrl}`)
  }

  return async () => {
    await Promise.all(started.map(({ stop }) => stop()))
  }
}
