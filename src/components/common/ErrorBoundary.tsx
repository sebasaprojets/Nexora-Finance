import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { t } from '@/i18n';

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
          <h1 className="mt-4 font-display text-xl font-semibold">{t('Algo deu errado')}</h1>
          <p className="mt-2 text-sm text-fg-subtle">{t('Seus dados estão seguros. Recarregue a página para continuar.')}</p>
          <button className="mt-6 h-10 rounded-xl bg-primary px-5 text-sm font-medium text-primary-fg" onClick={() => location.reload()}>
            {t('Recarregar')}
          </button>
        </div>
      </div>
    );
  }
}
