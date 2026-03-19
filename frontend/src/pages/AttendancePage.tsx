import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Alert, Button, EmptyState, Input, Select, Spinner } from '@/components/ui'
import { apiRequest, isApiError } from '@/lib/api'
import { fieldErrorsFrom422Body } from '@/lib/parseApiValidation'
import type { AttendanceMarkPayload, AttendanceRecord } from '@/types/attendance'
import type { Employee } from '@/types/employee'

import '@/pages/AttendancePage.css'

function todayISODate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type HistoryState = 'idle' | 'loading' | 'error' | 'ready'

export function AttendancePage() {
  const [searchParams] = useSearchParams()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeesState, setEmployeesState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [employeesError, setEmployeesError] = useState<string | null>(null)

  const [markEmployeeId, setMarkEmployeeId] = useState('')
  const [markDate, setMarkDate] = useState(todayISODate)
  const [markStatus, setMarkStatus] = useState<'present' | 'absent'>('present')
  const [markClientErrors, setMarkClientErrors] = useState<Partial<Record<keyof AttendanceMarkPayload, string>>>({})
  const [markServerErrors, setMarkServerErrors] = useState<Partial<Record<keyof AttendanceMarkPayload, string>>>({})
  const [markGlobalError, setMarkGlobalError] = useState<string | null>(null)
  const [markSuccess, setMarkSuccess] = useState<string | null>(null)
  const [markSubmitting, setMarkSubmitting] = useState(false)

  const [historyEmployeeId, setHistoryEmployeeId] = useState('')
  const [historyExactDate, setHistoryExactDate] = useState('')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')
  const [rangeClientError, setRangeClientError] = useState<string | null>(null)
  const [historyState, setHistoryState] = useState<HistoryState>('idle')
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  const loadEmployees = useCallback(async () => {
    setEmployeesState('loading')
    setEmployeesError(null)
    try {
      const data = await apiRequest<Employee[]>('/api/employees')
      setEmployees(data)
      setEmployeesState('ready')
    } catch (err: unknown) {
      setEmployeesState('error')
      setEmployeesError(isApiError(err) ? err.message : 'Could not load employees')
    }
  }, [])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  const preselect = searchParams.get('employee')
  useEffect(() => {
    if (!preselect || employees.length === 0) return
    const exists = employees.some((x) => x.employee_id === preselect)
    if (exists) {
      setMarkEmployeeId(preselect)
      setHistoryEmployeeId(preselect)
    }
  }, [preselect, employees])

  const historyQueryString = useMemo(() => {
    const q = new URLSearchParams()
    if (historyExactDate) {
      q.set('date', historyExactDate)
    } else {
      if (historyFrom) q.set('from', historyFrom)
      if (historyTo) q.set('to', historyTo)
    }
    const s = q.toString()
    return s ? `?${s}` : ''
  }, [historyExactDate, historyFrom, historyTo])

  const fetchHistory = useCallback(async () => {
    if (!historyEmployeeId) {
      setHistoryState('idle')
      setHistoryRecords([])
      setHistoryError(null)
      setRangeClientError(null)
      return
    }
    if (!historyExactDate && historyFrom && historyTo && historyFrom > historyTo) {
      setRangeClientError("Start date must be on or before end date (or clear one of the filters).")
      setHistoryState('idle')
      setHistoryRecords([])
      return
    }
    setRangeClientError(null)
    setHistoryState('loading')
    setHistoryError(null)
    try {
      const data = await apiRequest<AttendanceRecord[]>(
        `/api/employees/${encodeURIComponent(historyEmployeeId)}/attendance${historyQueryString}`,
      )
      setHistoryRecords(data)
      setHistoryState('ready')
    } catch (err: unknown) {
      setHistoryState('error')
      setHistoryError(isApiError(err) ? err.message : 'Could not load attendance')
    }
  }, [historyEmployeeId, historyQueryString, historyExactDate, historyFrom, historyTo])

  useEffect(() => {
    void fetchHistory()
  }, [fetchHistory])

  function validateMark(): boolean {
    const next: Partial<Record<keyof AttendanceMarkPayload, string>> = {}
    if (!markEmployeeId) next.employee_id = 'Select an employee'
    if (!markDate) next.date = 'Pick a date'
    setMarkClientErrors(next)
    return Object.keys(next).length === 0
  }

  async function onMarkSubmit(ev: FormEvent) {
    ev.preventDefault()
    setMarkServerErrors({})
    setMarkGlobalError(null)
    setMarkSuccess(null)
    if (!validateMark()) return

    setMarkSubmitting(true)
    const payload: AttendanceMarkPayload = {
      employee_id: markEmployeeId,
      date: markDate,
      status: markStatus,
    }
    try {
      await apiRequest<AttendanceRecord>('/api/attendance', { method: 'POST', json: payload })
      setMarkSuccess(
        'Attendance saved. If a record already existed for that day, it was updated (upsert).',
      )
      if (historyEmployeeId === markEmployeeId) {
        void fetchHistory()
      }
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.status === 422) {
          setMarkServerErrors(
            fieldErrorsFrom422Body(err.body) as Partial<Record<keyof AttendanceMarkPayload, string>>,
          )
        } else if (err.status === 404) {
          setMarkGlobalError('Employee not found. Refresh the list or pick another person.')
        } else if (err.status === 409) {
          setMarkGlobalError('This day is already marked and cannot be changed (server rejected duplicate).')
        } else {
          setMarkGlobalError(err.message)
        }
      } else {
        setMarkGlobalError('Something went wrong')
      }
    } finally {
      setMarkSubmitting(false)
    }
  }

  const markFieldError = (key: keyof AttendanceMarkPayload) =>
    markClientErrors[key] ?? markServerErrors[key]

  const employeeOptions = (
    <>
      <option value="">Select employee…</option>
      {employees.map((e) => (
        <option key={e._id} value={e.employee_id}>
          {e.employee_id} — {e.full_name}
        </option>
      ))}
    </>
  )

  return (
    <div className="attendance-page">
      <h1 className="page-title">Attendance</h1>
      <p className="page-lead">
        Record daily presence, then review history per person. Optional URL:{' '}
        <code className="inline-code">/attendance?employee=E-1001</code> preselects an employee.
      </p>

      {employeesState === 'loading' ? <Spinner label="Loading employees" /> : null}
      {employeesState === 'error' ? (
        <div className="stack" style={{ marginBottom: 'var(--space-6)' }}>
          <Alert tone="error">{employeesError ?? 'Failed to load employees'}</Alert>
          <Button type="button" onClick={() => void loadEmployees()}>
            Retry
          </Button>
        </div>
      ) : null}

      {employeesState === 'ready' && employees.length === 0 ? (
        <Alert tone="info">
          No employees yet —{' '}
          <Link to="/employees">add employees</Link> before you can mark attendance.
        </Alert>
      ) : null}

      {employeesState === 'ready' && employees.length > 0 ? (
        <>
          <section className="attendance-section" aria-labelledby="mark-heading">
            <h2 id="mark-heading" className="section-heading">
              Mark attendance
            </h2>
            <p className="attendance-hint">
              One row per employee per calendar day. Submitting again for the same day updates the status
              (upsert).
            </p>
            <form className="attendance-form" onSubmit={onMarkSubmit} noValidate>
              <Select
                id="mark_employee_id"
                label="Employee"
                name="employee_id"
                value={markEmployeeId}
                onChange={(ev) => setMarkEmployeeId(ev.target.value)}
                error={markFieldError('employee_id')}
                required
              >
                {employeeOptions}
              </Select>
              <Input
                id="mark_date"
                label="Date"
                name="date"
                type="date"
                value={markDate}
                onChange={(ev) => setMarkDate(ev.target.value)}
                error={markFieldError('date')}
                required
              />
              <Select
                id="mark_status"
                label="Status"
                name="status"
                value={markStatus}
                onChange={(ev) => setMarkStatus(ev.target.value as 'present' | 'absent')}
                error={markFieldError('status')}
                required
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </Select>
              {markGlobalError ? <Alert tone="error">{markGlobalError}</Alert> : null}
              {markSuccess ? <Alert tone="success">{markSuccess}</Alert> : null}
              <div className="attendance-form-actions">
                <Button type="submit" disabled={markSubmitting}>
                  {markSubmitting ? 'Saving…' : 'Save attendance'}
                </Button>
              </div>
            </form>
          </section>

          <section className="attendance-section" aria-labelledby="history-heading">
            <h2 id="history-heading" className="section-heading">
              Attendance history
            </h2>
            <p className="attendance-hint" style={{ marginBottom: 'var(--space-3)' }}>
              Use <strong>On date</strong> for a single day, or <strong>From / To</strong> for a range — not both at once.
            </p>
            <div className="filter-row">
              <Select
                id="history_employee_id"
                label="Employee"
                name="history_employee_id"
                value={historyEmployeeId}
                onChange={(ev) => setHistoryEmployeeId(ev.target.value)}
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={`h-${e._id}`} value={e.employee_id}>
                    {e.employee_id} — {e.full_name}
                  </option>
                ))}
              </Select>
              <Input
                id="history_on_date"
                label="On date (optional)"
                name="on_date"
                type="date"
                value={historyExactDate}
                onChange={(ev) => {
                  setHistoryExactDate(ev.target.value)
                  setHistoryFrom('')
                  setHistoryTo('')
                }}
              />
              <Input
                id="history_from"
                label="From (optional)"
                name="from"
                type="date"
                value={historyFrom}
                disabled={Boolean(historyExactDate)}
                onChange={(ev) => {
                  setHistoryFrom(ev.target.value)
                  setHistoryExactDate('')
                }}
              />
              <Input
                id="history_to"
                label="To (optional)"
                name="to"
                type="date"
                value={historyTo}
                disabled={Boolean(historyExactDate)}
                onChange={(ev) => {
                  setHistoryTo(ev.target.value)
                  setHistoryExactDate('')
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void fetchHistory()}
                disabled={!historyEmployeeId}
              >
                Refresh
              </Button>
            </div>
            {rangeClientError ? <Alert tone="error">{rangeClientError}</Alert> : null}

            {!historyEmployeeId ? (
              <p className="attendance-hint">Choose an employee to load their attendance records.</p>
            ) : null}

            {historyEmployeeId && historyState === 'loading' ? <Spinner label="Loading attendance" /> : null}

            {historyEmployeeId && historyState === 'error' ? (
              <div className="stack">
                <Alert tone="error">{historyError ?? 'Failed to load'}</Alert>
                <Button type="button" onClick={() => void fetchHistory()}>
                  Retry
                </Button>
              </div>
            ) : null}

            {historyEmployeeId && historyState === 'ready' && historyRecords.length === 0 ? (
              <EmptyState
                title="No attendance recorded yet"
                description="Mark attendance above, clear filters, or try another date / range."
              />
            ) : null}

            {historyEmployeeId && historyState === 'ready' && historyRecords.length > 0 ? (
              <div className="attendance-table-wrap">
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last updated (UTC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRecords.map((row) => (
                      <tr key={row._id}>
                        <td>{row.date}</td>
                        <td>
                          <span
                            className={`status-pill status-pill--${row.status === 'present' ? 'present' : 'absent'}`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td>{new Date(row.updated_at).toLocaleString(undefined, { timeZone: 'UTC' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  )
}
