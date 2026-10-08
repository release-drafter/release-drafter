import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const workflow = parse(readFileSync('.github/workflows/release.yml', 'utf8'))

describe('release workflow policy', () => {
  it('discovers releases on main pushes without secrets or a release environment', () => {
    expect(workflow.on.push).toEqual({ branches: ['main'] })
    expect(workflow.on.pull_request).toBeUndefined()
    expect(workflow.on.pull_request_target).toBeUndefined()
    expect(workflow.permissions).toEqual({ contents: 'read' })
    const discover = workflow.jobs.discover
    expect(discover.environment).toBeUndefined()
    expect(discover.permissions).toEqual({
      contents: 'read',
      'pull-requests': 'read',
    })
    expect(discover.if).toContain("github.event_name == 'push'")
    expect(discover.if).toContain("github.ref == 'refs/heads/main'")
    expect(discover.if).toContain(
      "github.repository == 'release-drafter/release-drafter'",
    )
    expect(JSON.stringify(discover)).not.toContain('secrets.')
    expect(JSON.stringify(discover)).toContain('release-candidate.ts')
    expect(workflow.concurrency['cancel-in-progress']).toBe(false)
  })

  it('uses trusted main code and a verified merge commit for publication and tags', () => {
    const publish = workflow.jobs.publish
    expect(publish.needs).toBe('discover')
    expect(publish.if).toBe("needs.discover.outputs.candidate != ''")
    expect(publish.environment).toBe('releaser')
    const checkout = publish.steps.find((step: { uses?: string }) =>
      step.uses?.startsWith('actions/checkout@'),
    )
    expect(checkout.with).toEqual({
      ref: `\${{ github.sha }}`,
      'persist-credentials': false,
    })
    const release = publish.steps.find(
      (step: { name?: string }) => step.name === 'Publish with Release Drafter',
    )
    const sha = `\${{ fromJSON(needs.discover.outputs.candidate).sha }}`
    expect(release.with).toMatchObject({
      version: `\${{ fromJSON(needs.discover.outputs.candidate).version }}`,
      commitish: sha,
      publish: true,
    })
    expect(release.if).toBe(
      '!fromJSON(needs.discover.outputs.candidate).published',
    )
    const tagSteps = publish.steps.filter((step: { name?: string }) =>
      ['Update major tag', 'Create major tag'].includes(step.name ?? ''),
    )
    expect(tagSteps).toHaveLength(2)
    for (const step of tagSteps) expect(step.with.sha).toBe(sha)
  })

  it('authorizes publication at an older release commit without granting preparation workflow access', () => {
    const tokenStep = (job: { steps: { uses?: string; with?: unknown }[] }) =>
      job.steps.find((step) =>
        step.uses?.startsWith('actions/create-github-app-token@'),
      )
    expect(tokenStep(workflow.jobs.publish)?.with).toMatchObject({
      'permission-contents': 'write',
      'permission-pull-requests': 'write',
      'permission-workflows': 'write',
    })
    expect(tokenStep(workflow.jobs.prepare)?.with).not.toHaveProperty(
      'permission-workflows',
    )
    const release = workflow.jobs.publish.steps.find(
      (step: { name?: string }) => step.name === 'Publish with Release Drafter',
    )
    expect(release.with.token).toBe(`\${{ steps.app-token.outputs.token }}`)
  })

  it('excludes release PRs from the changelog and tracks publication state', () => {
    const createPr = workflow.jobs.prepare.steps.find(
      (step: { uses?: string }) =>
        step.uses?.startsWith('peter-evans/create-pull-request@'),
    )
    expect(createPr.with.labels.trim().split('\n')).toEqual([
      'autorelease: pending',
      'skip-changelog',
    ])
    const config = parse(readFileSync('.github/release-drafter.yml', 'utf8'))
    expect(config.categories).toContainEqual({
      type: 'pre-exclude',
      when: { label: 'skip-changelog' },
    })
    const steps = workflow.jobs.publish.steps
    const labelStep = steps.find(
      (step: { name?: string }) => step.name === 'Mark release PR as tagged',
    )
    expect(steps.indexOf(labelStep)).toBe(steps.length - 1)
    expect(labelStep.with.script).toContain("labels: ['autorelease: tagged']")
    expect(labelStep.with.script).toContain("name: 'autorelease: pending'")
    expect(labelStep.with['github-token']).toBe(
      `\${{ steps.app-token.outputs.token }}`,
    )
  })

  it('serializes publication and draft updates', () => {
    const draft = parse(readFileSync('.github/workflows/draft.yml', 'utf8'))
    expect(workflow.jobs.publish.concurrency).toEqual({
      group: 'release-drafter-writes',
      'cancel-in-progress': false,
    })
    expect(draft.jobs.update_release_draft.concurrency).toEqual(
      workflow.jobs.publish.concurrency,
    )
  })
})
