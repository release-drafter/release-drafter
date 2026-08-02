import { describe, expect, it } from 'vitest'
import { CORE_PACKAGE_NAME } from './index.ts'

describe('@release-drafter/core workspace skeleton', () => {
  it('exposes the package identity used by workspace boundary tooling', () => {
    expect(CORE_PACKAGE_NAME).toBe('@release-drafter/core')
  })
})
