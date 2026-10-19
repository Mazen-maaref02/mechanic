import toast from 'react-hot-toast'
import { Toaster as HotToaster } from 'react-hot-toast'

export { toast }

/** Toast notifications rendering well on light backgrounds. */
export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#16181b',
          color: '#ffffff',
          borderRadius: '12px',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#ea7c23', secondary: '#ffffff' } },
        ariaProps: { role: 'status', 'aria-live': 'polite' },
      }}
    />
  )
}

/** Stable helper so pages can call toast.success/toast.error. */
export function useToastMsg() {
  return toast
}
