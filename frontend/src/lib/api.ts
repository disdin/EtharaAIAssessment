import { getApiBaseUrl } from './config'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/** Type-safe narrowing for `catch (err: unknown)` (strict + CI-friendly). */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function formatErrorMessage(status: number, data: unknown): string {
  if (status === 0) {
    return 'Network error — check VITE_API_URL and that the API is running'
  }
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail
    if (Array.isArray(detail)) {
      return detail
        .map((item: { msg?: string; loc?: unknown }) => {
          if (item && typeof item === 'object' && 'msg' in item && typeof item.msg === 'string') {
            return item.msg
          }
          return JSON.stringify(item)
        })
        .join('; ')
    }
    if (typeof detail === 'string') {
      return detail
    }
  }
  return `Request failed (${status})`
}

export type ApiRequestInit = RequestInit & {
  /** When set, sends JSON body and Content-Type: application/json */
  json?: unknown
}

/**
 * Typed fetch against the configured API base.
 * Surfaces 422 validation text, 404/409 `detail`, and network failures.
 */
export async function apiRequest<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const base = getApiBaseUrl()
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(init?.headers)
  const { json, body, ...rest } = init ?? {}
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  let res: Response
  try {
    res = await fetch(url, {
      ...rest,
      headers,
      body: json !== undefined ? JSON.stringify(json) : body,
    })
  } catch (cause) {
    throw new ApiError(formatErrorMessage(0, null), 0, cause)
  }

  if (res.status === 204) {
    return undefined as T
  }

  const text = await res.text()
  const data = text ? tryParseJson(text) : null

  if (!res.ok) {
    throw new ApiError(formatErrorMessage(res.status, data), res.status, data)
  }

  return data as T
}
