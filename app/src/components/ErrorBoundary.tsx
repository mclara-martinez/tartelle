import { Component, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Sin boundary, cualquier excepción de render deja la app en pantalla blanca
// (crítico en las tablets de cocina). El fallback ofrece reintentar sin recargar
// y recargar completo como plan B.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--color-bg)] px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-[var(--color-warning-text)]" />
        <div>
          <p className="text-lg font-semibold text-[var(--color-text-primary)]">Algo salió mal</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Ocurrió un error inesperado. Puedes reintentar o recargar la página.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => this.setState({ error: null })}
            className="min-h-[48px] px-5 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors duration-200"
          >
            Reintentar
          </button>
          <button
            onClick={() => window.location.reload()}
            className="min-h-[48px] px-5 rounded-lg border border-[var(--color-border)] bg-white text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-warm)] transition-colors duration-200 flex items-center gap-1.5"
          >
            <RotateCw className="h-4 w-4" />
            Recargar
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] max-w-md break-words">
          {this.state.error.message}
        </p>
      </div>
    )
  }
}
