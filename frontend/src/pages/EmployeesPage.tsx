import { type FormEvent, useCallback, useEffect, useState } from 'react'

import { Alert, Button, EmptyState, Input, Spinner } from '@/components/ui'
import { apiRequest, isApiError } from '@/lib/api'
import { fieldErrorsFrom422Body } from '@/lib/parseApiValidation'
import type { Employee, EmployeeCreatePayload } from '@/types/employee'

import '@/pages/EmployeesPage.css'

type ListState = 'loading' | 'error' | 'ready'

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export function EmployeesPage() {
  const [listState, setListState] = useState<ListState>('loading')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [listError, setListError] = useState<string | null>(null)

  const [form, setForm] = useState<EmployeeCreatePayload>({
    employee_id: '',
    full_name: '',
    email: '',
    department: '',
  })
  const [clientErrors, setClientErrors] = useState<Partial<Record<keyof EmployeeCreatePayload, string>>>({})
  const [serverFieldErrors, setServerFieldErrors] = useState<Partial<Record<keyof EmployeeCreatePayload, string>>>(
    {},
  )
  const [formGlobalError, setFormGlobalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadEmployees = useCallback(async () => {
    setListState('loading')
    setListError(null)
    try {
      const data = await apiRequest<Employee[]>('/api/employees')
      setEmployees(data)
      setListState('ready')
    } catch (err: unknown) {
      setListState('error')
      setListError(isApiError(err) ? err.message : 'Could not load employees')
    }
  }, [])

  useEffect(() => {
    void loadEmployees()
  }, [loadEmployees])

  function validateClient(): boolean {
    const next: Partial<Record<keyof EmployeeCreatePayload, string>> = {}
    if (!form.employee_id.trim()) next.employee_id = 'Required'
    if (!form.full_name.trim()) next.full_name = 'Required'
    if (!form.email.trim()) next.email = 'Required'
    else if (!emailOk(form.email.trim())) next.email = 'Enter a valid email'
    if (!form.department.trim()) next.department = 'Required'
    setClientErrors(next)
    return Object.keys(next).length === 0
  }

  async function onCreateSubmit(ev: FormEvent) {
    ev.preventDefault()
    setServerFieldErrors({})
    setFormGlobalError(null)
    if (!validateClient()) return

    setSubmitting(true)
    const payload: EmployeeCreatePayload = {
      employee_id: form.employee_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      department: form.department.trim(),
    }
    try {
      await apiRequest<Employee>('/api/employees', { method: 'POST', json: payload })
      setForm({
        employee_id: '',
        full_name: '',
        email: '',
        department: '',
      })
      setClientErrors({})
      await loadEmployees()
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.status === 422) {
          setServerFieldErrors(fieldErrorsFrom422Body(err.body) as Partial<Record<keyof EmployeeCreatePayload, string>>)
          setFormGlobalError(null)
        } else if (err.status === 409) {
          setFormGlobalError(
            'An employee with this ID or email already exists. Change one of them and try again.',
          )
        } else {
          setFormGlobalError(err.message)
        }
      } else {
        setFormGlobalError('Something went wrong')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await apiRequest<undefined>(`/api/employees/${encodeURIComponent(deleteTarget.employee_id)}`, {
        method: 'DELETE',
      })
      setDeleteTarget(null)
      await loadEmployees()
    } catch (err: unknown) {
      if (isApiError(err)) {
        setDeleteError(err.message)
      } else {
        setDeleteError('Could not delete employee')
      }
    } finally {
      setDeleting(false)
    }
  }

  const fieldError = (key: keyof EmployeeCreatePayload) =>
    clientErrors[key] ?? serverFieldErrors[key]

  return (
    <div className="employees-page">
      <h1 className="page-title">Employees</h1>
      <p className="page-lead">Add people to the directory, review the roster, and remove records. Deleting an employee also removes their attendance history.</p>

      <section className="employees-section" aria-labelledby="add-employee-heading">
        <h2 id="add-employee-heading" className="section-heading">
          Add employee
        </h2>
        <form onSubmit={onCreateSubmit} noValidate>
          <div className="employee-form-grid">
            <Input
              id="employee_id"
              label="Employee ID"
              name="employee_id"
              value={form.employee_id}
              onChange={(ev) => setForm((f) => ({ ...f, employee_id: ev.target.value }))}
              autoComplete="off"
              error={fieldError('employee_id')}
              required
            />
            <Input
              id="full_name"
              label="Full name"
              name="full_name"
              value={form.full_name}
              onChange={(ev) => setForm((f) => ({ ...f, full_name: ev.target.value }))}
              autoComplete="name"
              error={fieldError('full_name')}
              required
            />
            <Input
              id="email"
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(ev) => setForm((f) => ({ ...f, email: ev.target.value }))}
              autoComplete="email"
              error={fieldError('email')}
              required
            />
            <Input
              id="department"
              label="Department"
              name="department"
              value={form.department}
              onChange={(ev) => setForm((f) => ({ ...f, department: ev.target.value }))}
              autoComplete="organization-title"
              error={fieldError('department')}
              required
            />
            {formGlobalError ? (
              <div className="form-global-error span-2" role="alert">
                <Alert tone="error">{formGlobalError}</Alert>
              </div>
            ) : null}
            <div className="employee-form-actions span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save employee'}
              </Button>
            </div>
          </div>
        </form>
      </section>

      <section className="employees-section" aria-labelledby="roster-heading">
        <div className="list-toolbar">
          <h2 id="roster-heading" className="section-heading" style={{ margin: 0 }}>
            Directory
          </h2>
          {listState === 'ready' ? (
            <Button type="button" variant="secondary" onClick={() => void loadEmployees()}>
              Refresh
            </Button>
          ) : null}
        </div>

        {listState === 'loading' ? (
          <Spinner label="Loading employees" />
        ) : null}

        {listState === 'error' ? (
          <div className="stack">
            <Alert tone="error">{listError ?? 'Failed to load'}</Alert>
            <Button type="button" onClick={() => void loadEmployees()}>
              Retry
            </Button>
          </div>
        ) : null}

        {listState === 'ready' && employees.length === 0 ? (
          <EmptyState
            title="No employees yet"
            description="Use the form above to add your first employee. Data is stored in MongoDB and will appear here after you save."
          />
        ) : null}

        {listState === 'ready' && employees.length > 0 ? (
          <div className="table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th scope="col">Employee ID</th>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Department</th>
                  <th scope="col" className="cell-actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((row) => (
                  <tr key={row._id}>
                    <td>{row.employee_id}</td>
                    <td>{row.full_name}</td>
                    <td>{row.email}</td>
                    <td>{row.department}</td>
                    <td className="cell-actions">
                      <Button type="button" variant="danger" onClick={() => setDeleteTarget(row)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {deleteTarget ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!deleting) setDeleteTarget(null)
          }}
          onKeyDown={(ev) => {
            if (ev.key === 'Escape' && !deleting) setDeleteTarget(null)
          }}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="delete-dialog-title">Remove employee?</h2>
            <p>
              <strong>{deleteTarget.full_name}</strong> ({deleteTarget.employee_id}) will be removed. This also deletes
              their attendance history (cascade).
            </p>
            {deleteError ? (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Alert tone="error">{deleteError}</Alert>
              </div>
            ) : null}
            <div className="modal-actions">
              <Button type="button" variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" disabled={deleting} onClick={() => void confirmDelete()}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
