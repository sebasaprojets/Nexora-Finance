import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { t } from '@/i18n';

export default function NotFound({ inApp }: { inApp?: boolean }) {
  return (
    <div className={inApp ? 'grid min-h-[60vh] place-items-center' : 'grid min-h-dvh place-items-center px-5'}>
      <div className="text-center">
        <Compass className="mx-auto size-12 text-primary" aria-hidden />
        <p className="tabular mt-4 font-display text-6xl font-semibold tracking-tight">404</p>
        <h1 className="mt-2 text-lg font-medium">{t('Página não encontrada')}</h1>
        <p className="mt-1 text-sm text-fg-subtle">{t('O endereço pode ter mudado ou não existe.')}</p>
        <Link to={inApp ? '/app' : '/'} className="mt-6 inline-block">
          <Button>{inApp ? t('Voltar ao dashboard') : t('Ir para o início')}</Button>
        </Link>
      </div>
    </div>
  );
}
