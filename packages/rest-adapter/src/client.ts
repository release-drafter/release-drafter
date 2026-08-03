import type { Logger, Repository } from '@release-drafter/core'
import type {
  Fetch,
  RestAdapterLimits,
  RestAdapterOptions,
  RestForgeProfile,
} from './types.ts'

export const defaultRestAdapterLimits: RestAdapterLimits = {
  timeoutMs: 10_000,
  maxResponseBytes: 2 * 1024 * 1024,
  maxComparisonBytes: 10 * 1024 * 1024,
  maxComparisonCommits: 5_000,
  maxPages: 20,
  pageSize: 50,
  maxItemsPerList: 1_000,
  maxChangedFiles: 5_000,
  maxRequestsPerOperation: 500,
  concurrency: 4,
}

export class RequestBudget {
  private used = 0

  constructor(private readonly maximum: number) {}

  take() {
    this.used += 1
    if (this.used > this.maximum) {
      throw new Error(
        `REST request limit of ${this.maximum} was exceeded for one operation`,
      )
    }
  }
}

const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const deriveApiUrl = (
  profile: RestForgeProfile,
  options: RestAdapterOptions,
  repository: Repository,
) => {
  if (options.apiUrl) return withoutTrailingSlash(options.apiUrl)
  const serverUrl = options.serverUrl ?? repository.serverUrl
  return `${withoutTrailingSlash(serverUrl)}${profile.apiPath}`
}

const redact = (value: string, token: string) => {
  if (!token) return value
  return value.split(token).join('[REDACTED]')
}

const asErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

const readBoundedBody = async (response: Response, maximum: number) => {
  const advertisedLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(advertisedLength) && advertisedLength > maximum) {
    throw new Error(
      `REST response exceeded the ${maximum} byte response-size limit`,
    )
  }
  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maximum) {
        await reader.cancel()
        throw new Error(
          `REST response exceeded the ${maximum} byte response-size limit`,
        )
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

export class RestClient {
  readonly limits: RestAdapterLimits
  readonly logger: Logger
  private readonly fetch: Fetch
  private readonly token: string

  constructor(
    private readonly profile: RestForgeProfile,
    private readonly options: RestAdapterOptions,
  ) {
    if (!options.token.trim())
      throw new Error('REST authentication token is required')
    this.fetch = options.fetch ?? globalThis.fetch
    if (typeof this.fetch !== 'function') {
      throw new Error('An injected native fetch implementation is required')
    }
    this.token = options.token
    this.logger = options.logger ?? {
      debug() {},
      info() {},
      warning() {},
      error() {},
    }
    this.limits = { ...defaultRestAdapterLimits, ...options.limits }
    for (const [name, value] of Object.entries(this.limits)) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`${name} must be a positive safe integer`)
      }
    }
  }

  newBudget() {
    return new RequestBudget(this.limits.maxRequestsPerOperation)
  }

  url(repository: Repository, path: string) {
    return `${deriveApiUrl(this.profile, this.options, repository)}${path}`
  }

  async requestJson<T>(params: {
    repository: Repository
    path: string
    budget: RequestBudget
    method?: 'GET' | 'POST' | 'PATCH'
    query?: Record<string, string | number | boolean | undefined>
    body?: unknown
    maxBytes?: number
    notFound?: 'return-undefined' | 'throw'
  }): Promise<{ data: T; headers: Headers } | undefined> {
    params.budget.take()
    const url = new URL(this.url(params.repository, params.path))
    for (const [name, value] of Object.entries(params.query ?? {})) {
      if (value !== undefined) url.searchParams.set(name, String(value))
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.limits.timeoutMs)
    const method = params.method ?? 'GET'
    const maxBytes = params.maxBytes ?? this.limits.maxResponseBytes
    try {
      const response = await this.fetch(url, {
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Authorization: this.profile.authHeader(this.token),
          ...(params.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        ...(params.body === undefined
          ? {}
          : { body: JSON.stringify(params.body) }),
      })
      const bytes = await readBoundedBody(response, maxBytes)
      const text = new TextDecoder().decode(bytes)
      if (response.status === 404 && params.notFound === 'return-undefined') {
        return undefined
      }
      if (!response.ok) {
        const safeBody = redact(text.slice(0, 500), this.token)
        throw new Error(
          `REST ${method} request failed with ${response.status}${safeBody ? `: ${safeBody}` : ''}`,
        )
      }
      if (!text) return { data: undefined as T, headers: response.headers }
      try {
        return { data: JSON.parse(text) as T, headers: response.headers }
      } catch (error) {
        throw new Error(
          `REST ${method} response was not valid JSON: ${redact(asErrorMessage(error), this.token)}`,
        )
      }
    } catch (error) {
      const timedOut = controller.signal.aborted
      const detail = redact(asErrorMessage(error), this.token)
      if (detail.startsWith('REST ')) throw new Error(detail)
      throw new Error(
        timedOut
          ? `REST ${method} request timed out after ${this.limits.timeoutMs}ms`
          : `REST ${method} request failed: ${detail}`,
      )
    } finally {
      clearTimeout(timeout)
    }
  }

  async paginate<T>(params: {
    repository: Repository
    path: string
    budget: RequestBudget
    query?: Record<string, string | number | boolean | undefined>
    maxItems?: number
  }): Promise<T[]> {
    const maximum = params.maxItems ?? this.limits.maxItemsPerList
    const items: T[] = []
    const pagination = this.profile.response.pagination
    for (let page = 1; page <= this.limits.maxPages; page += 1) {
      const response = await this.requestJson<T[]>({
        repository: params.repository,
        path: params.path,
        budget: params.budget,
        query: {
          ...params.query,
          [pagination.pageParameter]: page,
          [pagination.limitParameter]: this.limits.pageSize,
        },
      })
      if (!response || !Array.isArray(response.data)) {
        throw new Error('REST paginated response was not an array')
      }
      if (items.length + response.data.length > maximum) {
        throw new Error(`REST pagination exceeded the ${maximum} item limit`)
      }
      items.push(...response.data)
      const totalHeader = response.headers.get(pagination.totalCountHeader)
      const total = totalHeader === null ? undefined : Number(totalHeader)
      if (
        typeof total === 'number' &&
        Number.isSafeInteger(total) &&
        total > maximum
      ) {
        throw new Error(
          `REST pagination advertised ${total} items, above the ${maximum} item limit`,
        )
      }
      if (
        response.data.length < this.limits.pageSize ||
        (typeof total === 'number' &&
          Number.isSafeInteger(total) &&
          items.length >= total)
      ) {
        return items
      }
    }
    throw new Error(
      `REST pagination reached the ${this.limits.maxPages} page limit before proving completion`,
    )
  }
}

export const mapConcurrent = async <Input, Output>(
  inputs: readonly Input[],
  concurrency: number,
  callback: (input: Input, index: number) => Promise<Output>,
): Promise<Output[]> => {
  const outputs = new Array<Output>(inputs.length)
  let next = 0
  const workers = Array.from(
    { length: Math.min(concurrency, inputs.length) },
    async () => {
      while (next < inputs.length) {
        const index = next
        next += 1
        outputs[index] = await callback(inputs[index] as Input, index)
      }
    },
  )
  await Promise.all(workers)
  return outputs
}
