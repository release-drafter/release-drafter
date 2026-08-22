import { array, number, object, string, union, enum as zenum } from 'zod'

export const supportedPullRequestActions = [
  'opened',
  'edited',
  'synchronize',
  'reopened',
  'labeled',
  'unlabeled',
  'ready_for_review',
] as const

const labelSchema = union([string(), object({ name: string() })])
const pullRequestEventSchema = object({
  action: zenum(supportedPullRequestActions),
  number: number().int().positive(),
  pull_request: object({
    title: string().min(1),
    labels: array(labelSchema),
    base: object({ ref: string().min(1) }),
  }),
})

export type CheckPullRequest = {
  number: number
  title: string
  labels: string[]
  baseRef: string
}

/** Validate and normalize the current pull request webhook payload. */
export const parsePullRequestEvent = (
  eventName: string,
  payload: unknown,
): CheckPullRequest => {
  if (eventName !== 'pull_request' && eventName !== 'pull_request_target') {
    throw new Error(
      `Unsupported event '${eventName || '[undefined]'}'. Expected 'pull_request' or 'pull_request_target'.`,
    )
  }

  const result = pullRequestEventSchema.safeParse(payload)
  if (!result.success) {
    const action =
      typeof payload === 'object' && payload !== null && 'action' in payload
        ? String(payload.action)
        : '[undefined]'
    if (
      action !== '[undefined]' &&
      !supportedPullRequestActions.includes(
        action as (typeof supportedPullRequestActions)[number],
      )
    ) {
      throw new Error(
        `Unsupported pull request action '${action}'. Supported actions: ${supportedPullRequestActions.join(', ')}.`,
      )
    }
    throw new Error(`Malformed pull request event: ${result.error.message}`)
  }

  return {
    number: result.data.number,
    title: result.data.pull_request.title,
    labels: result.data.pull_request.labels.map((label) =>
      typeof label === 'string' ? label : label.name,
    ),
    baseRef: result.data.pull_request.base.ref,
  }
}
