import { AsyncLocalStorage } from 'node:async_hooks'
import { setTimeout as delay } from 'node:timers/promises'
import { Gitlab } from '@gitbeaker/rest'
import type { Logger, Repository } from '@release-drafter/core'
import type { GitLabAdapterLimits, GitLabAdapterOptions } from './types.ts'

type HeadersRecord = Record<string, string>
type Expanded<T> = { data: T; headers: HeadersRecord; status: number }
type RequestBudget = { used: number; maximum: number }
type RequestContext = {
  budget: RequestBudget
  maxBytes?: number
  headers?: HeadersRecord
  status?: number
}
type RequestOptions = {
  body?: FormData | Record<string, unknown>
  searchParams?: Record<string, unknown>
  signal?: AbortSignal
}
type ResourceOptions = {
  url: string
  headers: Record<string, string>
  authHeaders: Record<string, () => Promise<string>>
}

type GitLabUser = {
  username?: string
  name?: string
  web_url?: string
  bot?: boolean
}
export type GitLabCommit = {
  id?: string
  message?: string
  author_name?: string
  authored_date?: string
  committed_date?: string
  created_at?: string
}
export type GitLabMergeRequest = {
  iid?: number
  project_id?: number
  source_project_id?: number
  target_project_id?: number
  title?: string
  description?: string | null
  state?: string
  merged_at?: string | null
  target_branch?: string
  source_branch?: string
  web_url?: string
  author?: GitLabUser | null
  labels?: Array<string | { name?: string }> | null
  sha?: string
  merge_commit_sha?: string | null
  squash_commit_sha?: string | null
  changes_count?: string
  first_contribution?: boolean
}
export type GitLabDiff = { old_path?: string; new_path?: string }
export type GitLabRelease = {
  name?: string | null
  tag_name?: string
  description?: string | null
  created_at?: string
  released_at?: string | null
  upcoming_release?: boolean | null
  commit?: GitLabCommit | null
  tag_path?: string
  _links?: { self?: string; edit_url?: string }
}
type GitLabTag = { commit?: GitLabCommit | null }
type GitLabComparison = {
  commits?: GitLabCommit[]
  compare_timeout?: boolean
  compare_same_ref?: boolean
}

type GitLabApi = {
  Repositories: {
    compare(
      project: string,
      from: string,
      to: string,
      options?: object,
    ): Promise<GitLabComparison>
  }
  Commits: {
    allMergeRequests(
      project: string,
      sha: string,
      options?: object,
    ): Promise<GitLabMergeRequest[]>
  }
  MergeRequests: {
    allDiffs(
      project: string,
      iid: number,
      options?: object,
    ): Promise<GitLabDiff[]>
    show(
      project: string,
      iid: number,
      options?: object,
    ): Promise<GitLabMergeRequest>
  }
  Tags: {
    show(project: string, tag: string, options?: object): Promise<GitLabTag>
  }
  ProjectReleases: {
    all(project: string, options?: object): Promise<GitLabRelease[]>
    create(project: string, options?: object): Promise<GitLabRelease>
    edit(project: string, tag: string, options?: object): Promise<GitLabRelease>
  }
}

const trimSlash = (value: string) => value.replace(/\/+$/, '')
const snake = (value: string) =>
  value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
const decamelize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(decamelize)
  if (!value || typeof value !== 'object' || value instanceof FormData)
    return value
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      snake(key),
      decamelize(nested),
    ]),
  )
}
const redact = (value: string, token: string) =>
  token ? value.split(token).join('[REDACTED]') : value
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)
const retryable = (status: number) => [429, 502, 503, 504].includes(status)
const requestMetadata = (headers: Headers) => {
  const requestId = headers.get('x-request-id')
  const remaining = headers.get('ratelimit-remaining')
  const reset = headers.get('ratelimit-reset')
  return [
    requestId ? `request id: ${requestId}` : '',
    remaining ? `rate limit remaining: ${remaining}` : '',
    reset ? `rate limit reset: ${reset}` : '',
  ]
    .filter(Boolean)
    .join(', ')
}

const readBoundedBody = async (response: Response, maximum: number) => {
  const advertised = Number(response.headers.get('content-length'))
  if (Number.isFinite(advertised) && advertised > maximum) {
    throw new Error(
      `GitLab response exceeded the ${maximum} byte response-size limit`,
    )
  }
  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximum) {
        await reader.cancel()
        throw new Error(
          `GitLab response exceeded the ${maximum} byte response-size limit`,
        )
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

class GitLabTransport {
  private readonly contexts = new AsyncLocalStorage<RequestContext>()
  private readonly fetch: typeof globalThis.fetch
  private readonly apiUrl: string
  private readonly token: string

  constructor(
    host: string,
    apiUrl: string | undefined,
    options: GitLabAdapterOptions,
    readonly limits: GitLabAdapterLimits,
    readonly logger: Logger,
  ) {
    this.fetch = options.fetch ?? globalThis.fetch
    if (typeof this.fetch !== 'function')
      throw new Error('An injected native fetch implementation is required')
    this.apiUrl = trimSlash(apiUrl ?? `${host}/api/v4`)
    this.token = options.token
  }

  response<T>(
    budget: RequestBudget,
    callback: () => Promise<T>,
    maxBytes?: number,
  ): Promise<Expanded<T>> {
    const context: RequestContext = { budget, maxBytes }
    return this.contexts.run(context, async () => ({
      data: await callback(),
      headers: context.headers ?? {},
      status: context.status ?? 0,
    }))
  }

  requesterFn = (resource: ResourceOptions) => {
    const request =
      (method: string) =>
      async (endpoint: string, options: RequestOptions = {}) => {
        const context = this.contexts.getStore()
        if (!context)
          throw new Error('GitLab request escaped its operation budget')
        const url = new URL(`${this.apiUrl}/${endpoint.replace(/^\/+/, '')}`)
        for (const [key, value] of Object.entries(
          decamelize(options.searchParams ?? {}) as Record<string, unknown>,
        )) {
          if (value === undefined || value === null) continue
          if (Array.isArray(value)) {
            for (const item of value)
              url.searchParams.append(`${key}[]`, String(item))
          } else url.searchParams.set(key, String(value))
        }
        const authHeaders = Object.fromEntries(
          await Promise.all(
            Object.entries(resource.authHeaders).map(async ([key, get]) => [
              key,
              await get(),
            ]),
          ),
        )
        const body =
          options.body === undefined || options.body instanceof FormData
            ? options.body
            : JSON.stringify(decamelize(options.body))
        let lastError: unknown
        for (let attempt = 0; attempt <= this.limits.retries; attempt += 1) {
          context.budget.used += 1
          if (context.budget.used > context.budget.maximum) {
            throw new Error(
              `GitLab request limit of ${context.budget.maximum} was exceeded for one operation`,
            )
          }
          const timeoutSignal = AbortSignal.timeout(this.limits.timeoutMs)
          const signal = options.signal
            ? AbortSignal.any([options.signal, timeoutSignal])
            : timeoutSignal
          try {
            const response = await this.fetch(url, {
              method,
              signal,
              headers: {
                Accept: 'application/json',
                ...resource.headers,
                ...authHeaders,
                ...(body && !(body instanceof FormData)
                  ? { 'Content-Type': 'application/json' }
                  : {}),
              },
              ...(body === undefined ? {} : { body }),
            })
            const maximum = context.maxBytes ?? this.limits.maxResponseBytes
            const bytes = await readBoundedBody(response, maximum)
            const text = new TextDecoder().decode(bytes)
            const metadata = requestMetadata(response.headers)
            if (!response.ok) {
              const safeBody = redact(text, this.token).slice(0, 500)
              const detail = [safeBody, metadata].filter(Boolean).join(' | ')
              const failure = new Error(
                `GitLab ${method} request failed with ${response.status}${detail ? `: ${detail}` : ''}`,
              )
              if (retryable(response.status) && attempt < this.limits.retries) {
                lastError = failure
                const retryAfterHeader = response.headers.get('retry-after')
                const retryAfter = retryAfterHeader?.trim()
                  ? Number(retryAfterHeader) * 1_000
                  : Number.NaN
                const wait =
                  Number.isFinite(retryAfter) && retryAfter >= 0
                    ? Math.min(retryAfter, this.limits.maxRetryDelayMs)
                    : Math.min(
                        this.limits.retryBaseDelayMs * 2 ** attempt,
                        this.limits.maxRetryDelayMs,
                      )
                this.logger.debug(
                  `Retrying GitLab ${method} request after ${wait}ms${metadata ? ` (${metadata})` : ''}`,
                )
                await delay(wait, undefined, { signal: options.signal })
                continue
              }
              throw failure
            }
            const parsed = text ? (JSON.parse(text) as unknown) : null
            context.headers = Object.fromEntries(response.headers.entries())
            context.status = response.status
            return {
              body: parsed,
              headers: context.headers,
              status: response.status,
            }
          } catch (error) {
            const detail = redact(errorMessage(error), this.token)
            if (detail.startsWith('GitLab ')) throw new Error(detail)
            const timedOut = signal.aborted
            lastError = new Error(
              timedOut
                ? `GitLab ${method} request timed out after ${this.limits.timeoutMs}ms`
                : `GitLab ${method} request failed: ${detail}`,
            )
            if (attempt >= this.limits.retries || timedOut) throw lastError
            await delay(
              Math.min(
                this.limits.retryBaseDelayMs * 2 ** attempt,
                this.limits.maxRetryDelayMs,
              ),
            )
          }
        }
        throw lastError
      }
    return {
      get: request('GET'),
      post: request('POST'),
      put: request('PUT'),
      patch: request('PATCH'),
      delete: request('DELETE'),
    }
  }
}

const hasNextPage = (response: Expanded<unknown[]>) => {
  const total = Number(response.headers['x-total'])
  if (Number.isSafeInteger(total) && total > response.data.length) return true
  return (
    Boolean(response.headers['x-next-page']?.trim()) ||
    /rel="next"/.test(response.headers.link ?? '')
  )
}

export class GitLabClient {
  readonly limits: GitLabAdapterLimits
  readonly logger: Logger
  private readonly transport: GitLabTransport
  private readonly api: GitLabApi

  constructor(
    options: GitLabAdapterOptions & { defaults: GitLabAdapterLimits },
    repository: Repository,
  ) {
    if (!options.token.trim())
      throw new Error('GitLab authentication token is required')
    const host = trimSlash(
      options.serverUrl ?? repository.serverUrl ?? 'https://gitlab.com',
    )
    this.logger = options.logger ?? {
      debug() {},
      info() {},
      warning() {},
      error() {},
    }
    this.limits = { ...options.defaults, ...options.limits }
    for (const [name, value] of Object.entries(this.limits)) {
      if (
        !Number.isSafeInteger(value) ||
        value < (name === 'retries' ? 0 : 1)
      ) {
        throw new Error(
          `${name} must be ${name === 'retries' ? 'a non-negative' : 'a positive'} safe integer`,
        )
      }
    }
    this.transport = new GitLabTransport(
      host,
      options.apiUrl,
      options,
      this.limits,
      this.logger,
    )
    this.api = new Gitlab({
      token: options.token,
      host,
      queryTimeout: null,
      requesterFn: this.transport.requesterFn as never,
    }) as unknown as GitLabApi
  }

  budget(): RequestBudget {
    return { used: 0, maximum: this.limits.maxRequestsPerOperation }
  }

  project(repository: Repository) {
    return `${repository.owner}/${repository.name}`
  }

  compare(project: string, from: string, to: string, budget: RequestBudget) {
    return this.transport.response(
      budget,
      () => this.api.Repositories.compare(project, from, to),
      this.limits.maxComparisonBytes,
    )
  }

  associatedMergeRequests(
    project: string,
    sha: string,
    limit: number,
    budget: RequestBudget,
  ) {
    return this.transport
      .response(budget, () =>
        this.api.Commits.allMergeRequests(project, sha, {
          page: 1,
          perPage: limit + 1,
        }),
      )
      .then((response) => {
        if (response.data.length > limit || hasNextPage(response)) {
          throw new Error(
            `GitLab commit ${sha} has more than the ${limit} associated merge-request limit`,
          )
        }
        return response.data
      })
  }

  async paginated<T>(
    fetchPage: (page: number) => Promise<Expanded<T[]>>,
    maximum = this.limits.maxItemsPerList,
  ) {
    const items: T[] = []
    let advertisedTotal: number | undefined
    for (let page = 1; page <= this.limits.maxPages; page += 1) {
      const response = await fetchPage(page)
      const total = Number(response.headers['x-total'])
      if (Number.isSafeInteger(total) && total >= 0) {
        if (advertisedTotal !== undefined && advertisedTotal !== total)
          throw new Error(
            `GitLab pagination total changed from ${advertisedTotal} to ${total}`,
          )
        advertisedTotal = total
        if (total > maximum)
          throw new Error(
            `GitLab pagination advertised ${total} items, above the ${maximum} item limit`,
          )
      }
      if (items.length + response.data.length > maximum)
        throw new Error(`GitLab pagination exceeded the ${maximum} item limit`)
      items.push(...response.data)
      if (advertisedTotal !== undefined) {
        if (items.length > advertisedTotal)
          throw new Error(
            `GitLab pagination received more items than the advertised total of ${advertisedTotal}`,
          )
        if (items.length === advertisedTotal) return items
      } else if (
        !hasNextPage(response) &&
        response.data.length < this.limits.pageSize
      )
        return items
      if (!hasNextPage(response) && response.data.length === 0) return items
    }
    throw new Error(
      `GitLab pagination reached the ${this.limits.maxPages} page limit before proving completion`,
    )
  }

  diffs(project: string, iid: number, budget: RequestBudget) {
    return this.paginated(
      (page) =>
        this.transport.response(budget, () =>
          this.api.MergeRequests.allDiffs(project, iid, {
            page,
            perPage: this.limits.pageSize,
          }),
        ),
      this.limits.maxChangedFiles,
    )
  }

  mergeRequest(project: string, iid: number, budget: RequestBudget) {
    return this.transport.response(budget, () =>
      this.api.MergeRequests.show(project, iid),
    )
  }

  tag(project: string, name: string, budget: RequestBudget) {
    return this.transport.response(budget, () =>
      this.api.Tags.show(project, name),
    )
  }

  releases(project: string, budget: RequestBudget) {
    return this.paginated((page) =>
      this.transport.response(budget, () =>
        this.api.ProjectReleases.all(project, {
          page,
          perPage: this.limits.pageSize,
        }),
      ),
    )
  }

  createRelease(project: string, options: object, budget: RequestBudget) {
    return this.transport.response(budget, () =>
      this.api.ProjectReleases.create(project, options),
    )
  }

  updateRelease(
    project: string,
    tag: string,
    options: object,
    budget: RequestBudget,
  ) {
    return this.transport.response(budget, () =>
      this.api.ProjectReleases.edit(project, tag, options),
    )
  }
}
