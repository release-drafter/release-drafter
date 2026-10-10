import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

describe('forge conformance workflow policy', () => {
  it('runs on pull requests without credentials or suppressed failures', () => {
    const contents = readFileSync('.github/workflows/ci.yml', 'utf8')
    const workflow = parse(contents)
    expect(workflow.permissions).toEqual({ contents: 'read' })
    expect(contents).not.toContain('pull_request_target')
    expect(contents).not.toMatch(/secrets\./u)
    expect(contents).not.toMatch(/continue-on-error:\s*true/u)
  })
})
