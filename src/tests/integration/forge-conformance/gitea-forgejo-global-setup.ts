import type { TestProject } from 'vitest/node'
import {
  type RestForgeFixture,
  type RestForgeFlavor,
  startRestForge,
} from './gitea-forgejo-container.ts'

declare module 'vitest' {
  interface ProvidedContext {
    restForgeFixtures: Partial<Record<RestForgeFlavor, RestForgeFixture>>
  }
}

const flavors = (): RestForgeFlavor[] => {
  const selected = process.env.FORGE_CONFORMANCE_TARGET
  if (selected === undefined || selected === '') return ['gitea', 'forgejo']
  if (selected === 'gitea' || selected === 'forgejo') return [selected]
  throw new Error(
    `FORGE_CONFORMANCE_TARGET must be gitea or forgejo, received ${selected}`,
  )
}

export default async ({ provide }: TestProject) => {
  const results = await Promise.allSettled(flavors().map(startRestForge))
  const started = results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  )
  const startupFailures = results.flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : [],
  )
  if (startupFailures.length > 0) {
    await Promise.allSettled(started.map(({ stop }) => stop()))
    throw new AggregateError(startupFailures)
  }

  const fixtures = Object.fromEntries(
    started.map(({ fixture }) => [fixture.flavor, fixture]),
  ) as Partial<Record<RestForgeFlavor, RestForgeFixture>>
  provide('restForgeFixtures', fixtures)

  for (const fixture of Object.values(fixtures)) {
    if (fixture) {
      console.log(
        `${fixture.flavor} ${fixture.version} ready at ${fixture.serverUrl}`,
      )
    }
  }

  return async () => {
    const results = await Promise.allSettled(started.map(({ stop }) => stop()))
    const failures = results.flatMap((result) =>
      result.status === 'rejected' ? [result.reason] : [],
    )
    if (failures.length > 0) throw new AggregateError(failures)
  }
}
