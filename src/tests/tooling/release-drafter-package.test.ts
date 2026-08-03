import { resolve } from 'node:path'
import { beforeAll } from 'vitest'
import { buildReleaseDrafterPackage } from './release-drafter-build.ts'

const repositoryRoot = resolve(import.meta.dirname, '../../..')

beforeAll(() => {
  buildReleaseDrafterPackage(repositoryRoot, {
    ...process.env,
    NO_COLOR: '1',
  })
}, 120_000)

await import('./release-drafter-build.contract.ts')
await import('./cli-package.consumer.contract.ts')
await import('./programmatic-facade.consumer.contract.ts')
