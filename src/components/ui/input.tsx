import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  const inputId = id || props.name
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-garage-text mb-1" htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        className={cn('input', error && 'border-red-500 focus:ring-red-500', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ className, label, error, id, ...props }: TextareaProps) {
  const inputId = id || props.name
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-garage-text mb-1" htmlFor={inputId}>{label}</label>}
      <textarea
        id={inputId}
        className={cn('textarea', error && 'border-red-500 focus:ring-red-500', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export function Select({ className, label, error, id, ...props }: SelectProps) {
  const inputId = id || props.name
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-garage-text mb-1" htmlFor={inputId}>{label}</label>}
      <select id={inputId} className={cn('input', error && 'border-red-500 focus:ring-red-500', className)} {...props} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
