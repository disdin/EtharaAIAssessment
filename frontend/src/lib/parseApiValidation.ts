/** Map FastAPI/Pydantic 422 `detail` array entries to field keys (last `loc` segment). */
export function fieldErrorsFrom422Body(body: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!body || typeof body !== 'object' || !('detail' in body)) {
    return out
  }
  const detail = (body as { detail: unknown }).detail
  if (!Array.isArray(detail)) {
    return out
  }
  for (const item of detail) {
    if (!item || typeof item !== 'object') continue
    const loc = (item as { loc?: unknown }).loc
    const msg = (item as { msg?: string }).msg
    if (!Array.isArray(loc) || typeof msg !== 'string') continue
    const key = loc[loc.length - 1]
    if (typeof key === 'string') {
      out[key] = msg
    }
  }
  return out
}
