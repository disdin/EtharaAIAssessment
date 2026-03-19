import type { ButtonHTMLAttributes } from 'react'

import './ui.css'

type Variant = 'primary' | 'secondary' | 'danger'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const v = `hrms-btn hrms-btn--${variant}`
  return <button type={type} className={`${v} ${className}`.trim()} {...props} />
}
