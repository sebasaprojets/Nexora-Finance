import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Ponto de integração com monitoramento (Sentry etc.).
    console.error('[Nexora] Erro inesperado', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-sm">
          <AlertTriangle className="mx-auto size-10 text-warning" aria-hidden />
          <h1 className="mt-4 font-display text-xl font-semibold">Algo deu errado</h1>
          <p className="mt-2 text-sm text-fg-subtle">Seus dados estão seguros. Recarregue a página para continuar.</p>
          <button className="mt-6 h-10 rounded-xl bg-primary px-5 text-sm font-medium text-primary-fg" onClick={() => location.reload()}>
            Recarregar
          </button>
        </div>
      </div>
    );
  }
}
