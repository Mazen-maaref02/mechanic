import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
  size?: 'sm' | 'default'
}

export function Button({ className, variant = 'primary', size = 'default', children, ...props }: ButtonProps) {
  const base = 'btn outline-none'
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    link: 'text-garage-orange underline underline-offset-4 hover:text-garage-orange-hover px-0 py-0',
  }
  const sizes = {
    sm: 'btn-sm',
    default: '',
  }
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}
