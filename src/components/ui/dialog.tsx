import * as React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, title, children }: DialogProps) {
  if (!open) return null
  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[560px] bg-white rounded-lg shadow-lg border border-garage-border p-0 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-garage-border bg-gray-50 rounded-t-xl">
          {title && <h2 className="text-lg font-semibold text-garage-text">{title}</h2>}
          <button
            onClick={() => onOpenChange(false)}
            className="btn-ghost p-1.5"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </>,
    document.body
  )
}
