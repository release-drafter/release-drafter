/**
 * Unit tests for src/wait.ts
 */
import { wait } from '../src/wait.js'

describe('wait.ts', () => {
  it('Throws an invalid number', async () => {
    const input = parseInt('foo', 10)

    expect(isNaN(input)).toBe(true)

    await expect(wait(input)).rejects.toThrow('milliseconds is not a number')
  })

  it('Waits with a valid number', async () => {
    const start = new Date()
    await wait(500)
    const end = new Date()

    const delta = Math.abs(end.getTime() - start.getTime())

    expect(delta).toBeGreaterThan(450)
  })
})
