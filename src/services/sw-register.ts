import { toast } from '@/store/toast';

/** Registra o Service Worker (somente em produção) e avisa quando há atualização. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh() {
        toast.info('Nova versão disponível', {
          description: 'Atualize para ter as últimas melhorias.',
          duration: 0,
          action: { label: 'Atualizar agora', onClick: () => update(true) },
        });
      },
      onOfflineReady() {
        toast.success('Pronto para uso offline');
      },
    });
  });
}
