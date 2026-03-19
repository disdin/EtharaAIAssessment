import './ui.css'

export type SpinnerProps = {
  label?: string
}

/** Visible loading indicator (README §8.3). */
export function Spinner({ label = 'Loading' }: SpinnerProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="hrms-spinner-wrap">
      <span className="hrms-spinner" />
      <span className="visually-hidden">{label}</span>
    </div>
  )
}
