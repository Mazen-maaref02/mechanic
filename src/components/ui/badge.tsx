import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    secondary: 'bg-garage-blue-light text-garage-blue border-garage-blue/20',
    success: 'bg-garage-success-light text-garage-success border-garage-success/20',
    warning: 'bg-garage-warning-light text-garage-warning border-garage-warning/20',
    danger: 'bg-garage-danger-light text-garage-danger border-garage-danger/20',
    info: 'bg-garage-info-light text-garage-blue border-garage-blue/20',
  }
  return (
    <span className={cn('badge', variants[variant], className)} {...props}>
      {children}
    </span>
  )
}
