import { useEffect, useState } from 'react'

import { Alert, Button, Spinner } from '../components/ui'
import { apiRequest, isApiError } from '../lib/api'
import { getApiBaseUrl } from '../lib/config'

type HealthState =
  | { status: 'loading' }
  | { status: 'ok'; payload: { status: string } }
  | { status: 'error'; message: string }

export function HomePage() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const payload = await apiRequest<{ status: string }>('/health')
        if (!cancelled) {
          setHealth({ status: 'ok', payload })
        }
      } catch (err: unknown) {
        if (!cancelled) {
          let message = 'Unexpected error'
          if (isApiError(err)) {
            message = err.message
          }
          setHealth({ status: 'error', message })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <h1 className="page-title">Admin overview</h1>
      <p className="page-lead">
        Internal HR tool for employees and attendance. Use the navigation above; full workflows ship in Steps
        6–7.
      </p>

      <section className="stack" aria-labelledby="api-status-heading">
        <h2 id="api-status-heading" className="section-title">
          API connection
        </h2>
        <p className="muted small">
          Base URL: <code className="inline-code">{getApiBaseUrl()}</code> — set <code className="inline-code">VITE_API_URL</code> in{' '}
          <code className="inline-code">.env</code> to point at your FastAPI server.
        </p>

        {health.status === 'loading' ? <Spinner label="Checking API health" /> : null}
        {health.status === 'ok' ? (
          <Alert tone="success">
            Backend reachable — <strong>/health</strong> returned <code className="inline-code">{health.payload.status}</code>
          </Alert>
        ) : null}
        {health.status === 'error' ? <Alert tone="error">{health.message}</Alert> : null}

        <div className="row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setHealth({ status: 'loading' })
              void apiRequest<{ status: string }>('/health')
                .then((payload) => setHealth({ status: 'ok', payload }))
                .catch((err: unknown) => {
                  let message = 'Unexpected error'
                  if (isApiError(err)) {
                    message = err.message
                  }
                  setHealth({ status: 'error', message })
                })
            }}
          >
            Retry health check
          </Button>
        </div>
      </section>
    </div>
  )
}
