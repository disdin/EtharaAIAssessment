import type { SelectHTMLAttributes } from 'react'

import './ui.css'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  id: string
  label: string
  error?: string
}

export function Select({ id, label, error, className = '', children, ...props }: SelectProps) {
  const err = Boolean(error)
  return (
    <div className="hrms-field">
      <label className="hrms-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={`hrms-select ${err ? 'hrms-select--error' : ''} ${className}`.trim()}
        aria-invalid={err}
        aria-describedby={err ? `${id}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {err ? (
        <p id={`${id}-error`} className="hrms-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
