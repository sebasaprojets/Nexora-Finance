import { forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input, type InputProps } from '@/components/ui/Field';
import { t } from '@/i18n';

export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(props, ref) {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={ref}
      type={show ? 'text' : 'password'}
      leftIcon={<Lock />}
      rightSlot={
        <button type="button" onClick={() => setShow((s) => !s)} className="grid size-8 place-items-center rounded-lg text-fg-subtle hover:text-fg" aria-label={show ? t('Ocultar senha') : t('Mostrar senha')} aria-pressed={show}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
      {...props}
    />
  );
});

/** Força da senha (0–4) — feedback visual no cadastro. */
export function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, score);
}

export function StrengthMeter({ value }: { value: string }) {
  const s = passwordStrength(value);
  const labels = [t('Muito fraca'), t('Fraca'), t('Razoável'), t('Boa'), t('Forte')];
  const colors = ['var(--danger)', 'var(--danger)', 'var(--warning)', 'var(--series-net)', 'var(--success)'];
  if (!value) return null;
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1 flex-1 rounded-full bg-surface-3 transition-colors" style={i < s ? { background: colors[s] } : undefined} />
        ))}
      </div>
      <p className="mt-1 text-xs text-fg-subtle">{t('Força da senha: {nivel}', { nivel: labels[s] })}</p>
    </div>
  );
}
