import type { InputHTMLAttributes } from 'react'

import './ui.css'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  error?: string
}

export function Input({ id, label, error, className = '', ...props }: InputProps) {
  const err = Boolean(error)
  return (
    <div className="hrms-field">
      <label className="hrms-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`hrms-input ${err ? 'hrms-input--error' : ''} ${className}`.trim()}
        aria-invalid={err}
        aria-describedby={err ? `${id}-error` : undefined}
        {...props}
      />
      {err ? (
        <p id={`${id}-error`} className="hrms-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
