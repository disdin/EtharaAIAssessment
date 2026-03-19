/** API base URL from Vite env (README §8.5). */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim()
  const fallback = 'http://127.0.0.1:8000'
  return (raw || fallback).replace(/\/$/, '')
}
