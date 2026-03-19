import { useCallback, useEffect, useState } from 'react'

import { Alert, Button, Spinner } from '@/components/ui'
import { apiRequest, isApiError } from '@/lib/api'
import type { DashboardSummary, EmployeeAttendanceStat } from '@/types/dashboard'

import '@/pages/DashboardPage.css'

type LoadState = 'loading' | 'error' | 'ready'

async function fetchDashboardData(): Promise<[DashboardSummary, EmployeeAttendanceStat[]]> {
  return Promise.all([
    apiRequest<DashboardSummary>('/api/dashboard/summary'),
    apiRequest<EmployeeAttendanceStat[]>('/api/dashboard/employee-stats'),
  ])
}

export function DashboardPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [rows, setRows] = useState<EmployeeAttendanceStat[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [s, r] = await fetchDashboardData()
        if (!cancelled) {
          setSummary(s)
          setRows(r)
          setState('ready')
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setState('error')
          setError(isApiError(err) ? err.message : 'Could not load dashboard')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = useCallback(() => {
    setState('loading')
    setError(null)
    ;(async () => {
      try {
        const [s, r] = await fetchDashboardData()
        setSummary(s)
        setRows(r)
        setState('ready')
      } catch (err: unknown) {
        setState('error')
        setError(isApiError(err) ? err.message : 'Could not load dashboard')
      }
    })()
  }, [])

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-lead">
        Summary counts and per-employee present vs absent days (bonus dashboard — see docs/SPECIFICATION.md §10). Data comes from MongoDB
        aggregations.
      </p>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Button type="button" variant="secondary" onClick={refresh} disabled={state === 'loading'}>
          Refresh
        </Button>
      </div>

      {state === 'loading' ? <Spinner label="Loading dashboard" /> : null}

      {state === 'error' ? (
        <div className="stack">
          <Alert tone="error">{error ?? 'Failed to load'}</Alert>
          <Button type="button" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : null}

      {state === 'ready' && summary ? (
        <>
          <h2 className="section-heading">Overview</h2>
          <dl className="summary-grid" aria-label="Summary statistics">
            <div className="summary-card">
              <dt>Employees</dt>
              <dd>{summary.employee_count}</dd>
            </div>
            <div className="summary-card">
              <dt>Attendance rows</dt>
              <dd>{summary.attendance_record_count}</dd>
            </div>
            <div className="summary-card">
              <dt>Present marks</dt>
              <dd>{summary.present_marks}</dd>
            </div>
            <div className="summary-card">
              <dt>Absent marks</dt>
              <dd>{summary.absent_marks}</dd>
            </div>
          </dl>

          <h2 className="section-heading">Per employee</h2>
          <p className="attendance-hint" style={{ marginBottom: 'var(--space-4)' }}>
            Days are counted from stored attendance documents (one row per employee per calendar day).
          </p>
          {rows.length === 0 ? (
            <Alert tone="info">No employees yet — add people on the Employees page.</Alert>
          ) : (
            <div className="stats-table-wrap">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th scope="col">Employee ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Department</th>
                    <th scope="col" className="num">
                      Present days
                    </th>
                    <th scope="col" className="num">
                      Absent days
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.employee_id}>
                      <td>{row.employee_id}</td>
                      <td>{row.full_name}</td>
                      <td>{row.department}</td>
                      <td className="num">{row.present_days}</td>
                      <td className="num">{row.absent_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
