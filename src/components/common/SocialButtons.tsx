import { useState } from 'react';
import { cloudEnabled } from '@/services/cloud';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM13.9 4.9c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.4-.6 3.1-1.5z" />
    </svg>
  );
}

export function SocialButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();
  const go = async (provider: 'google' | 'apple' | 'demo') => {
    setLoading(provider);
    try {
      const r = provider === 'demo' ? await authService.signInDemo() : await authService.signInWithProvider(provider);
      setAuth(r);
      navigate(r.user.onboarded ? '/app' : '/onboarding');
    } catch (e) {
      toast.error('Não foi possível entrar', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(null);
    }
  };
  // Login social só aparece quando configurado no Supabase (Authentication → Providers).
  const google = cloudEnabled && import.meta.env.VITE_AUTH_GOOGLE === 'on';
  const apple = cloudEnabled && import.meta.env.VITE_AUTH_APPLE === 'on';
  return (
    <div className="space-y-3">
      {(google || apple) && (
        <div className={google && apple ? 'grid grid-cols-2 gap-3' : 'grid'}>
          {google && (
            <Button variant="secondary" loading={loading === 'google'} leftIcon={<GoogleIcon />} onClick={() => go('google')}>
              {apple ? 'Google' : 'Continuar com Google'}
            </Button>
          )}
          {apple && (
            <Button variant="secondary" loading={loading === 'apple'} leftIcon={<AppleIcon />} onClick={() => go('apple')}>
              {google ? 'Apple' : 'Continuar com Apple'}
            </Button>
          )}
        </div>
      )}
      <Button variant="soft" className="w-full" loading={loading === 'demo'} onClick={() => go('demo')}>
        Explorar com conta demonstração
      </Button>
    </div>
  );
}

export function Divider({ label = 'ou' }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-fg-subtle">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
