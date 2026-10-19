import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

/**
 * Affiche un message lisible au lieu d'une page blanche en cas d'erreur inattendue.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-garage-bg">
          <div className="max-w-md text-center card p-6">
            <h1 className="text-lg font-bold text-garage-text mb-2">Une erreur est survenue</h1>
            <p className="text-sm text-garage-text-muted mb-4 break-all font-mono">{this.state.message}</p>
            <p className="text-xs text-garage-text-muted mb-4">
              Vérifiez votre configuration Supabase (<code>.env</code>) ou rechargez la page.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => { window.location.href = '/' }}
            >
              Recharger l&apos;application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
