import { useRef, useState } from 'react';
import { isPaidPro, limitsEnabled, trialActive } from '@/lib/plans';
import { Link, useNavigate } from 'react-router-dom';
import { Camera, ChevronRight, Crown, Lock, LogOut, Settings, ShieldCheck, Bell } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/store/auth';
import { useFinance } from '@/store/finance';
import { toast } from '@/store/toast';
import { formatDate, toISODate } from '@/lib/dates';
import { sanitizeText } from '@/lib/sanitize';
import { t } from '@/i18n';

const OBJECTIVES: Record<string, string> = {
  organize: 'Organizar minhas finanças',
  save: 'Economizar dinheiro',
  debt_free: 'Sair das dívidas',
  invest: 'Investir',
  emergency_fund: 'Criar reserva',
  purchase: 'Comprar algo',
  business: 'Controlar minha empresa',
};

/** Redimensiona a imagem para 256px (JPEG) antes de salvar. */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 256;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function Profile() {
  const user = useAuth((s) => s.user)!;
  const updateUser = useAuth((s) => s.updateUser);
  const signOut = useAuth((s) => s.signOut);
  const onboarding = useFinance((s) => s.onboarding);
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const file = useRef<HTMLInputElement>(null);

  const onPhoto = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error(t('Envie uma imagem'));
    if (f.size > 5 * 1024 * 1024) return toast.error(t('Imagem muito grande (máx. 5 MB)'));
    updateUser({ avatarUrl: await resizeImage(f) });
    toast.success(t('Foto atualizada'));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('Perfil')} />
      <Card className="holo mb-4 p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative">
            <Avatar name={user.name} src={user.avatarUrl} className="size-24 text-2xl" />
            <button onClick={() => file.current?.click()} className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-2 border-bg bg-primary text-primary-fg" aria-label={t('Alterar foto')}>
              <Camera className="size-4" />
            </button>
            <input ref={file} type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} tabIndex={-1} />
          </div>
          <div className="text-center sm:text-left">
            <h2 className="font-display text-xl font-semibold">{user.name}</h2>
            <p className="text-sm text-fg-subtle">{user.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link to="/app/plano" aria-label={t('Ver meu plano')}><Badge tone="primary"><Crown aria-hidden /> {!limitsEnabled ? t('Beta · tudo liberado') : isPaidPro(user) ? t('Plano Pro') : trialActive(user.id) ? t('Teste do Pro') : user.provider === 'demo' ? t('Modo demonstração') : t('Plano Grátis')}</Badge></Link>
              <Badge>{t('Cliente desde {data}', { data: formatDate(toISODate(new Date(user.createdAt))) })}</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <CardHeader title={t('Dados pessoais')} />
        <CardBody>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = sanitizeText(name, 80);
              if (n.length < 2) return toast.error(t('Nome muito curto'));
              updateUser({ name: n });
              toast.success(t('Perfil atualizado'));
            }}
          >
            <Field label={t('Nome')}>{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}</Field>
            <Field label={t('E-mail')} hint={t('Para alterar o e-mail, contate o suporte.')}>{(p) => <Input {...p} value={user.email} readOnly disabled />}</Field>
            {onboarding && (
              <Field label={t('Objetivos financeiros')}>{(p) => <Input {...p} value={(onboarding.objectives ?? [onboarding.objective]).map((o) => t(OBJECTIVES[o] ?? o)).join(', ')} readOnly disabled />}</Field>
            )}
            <div className="flex items-end sm:col-span-2">
              <Button type="submit" disabled={name === user.name}>{t('Salvar alterações')}</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <ul className="divide-y divide-border">
          {[
            { to: '/app/configuracoes', icon: Settings, label: 'Configurações', desc: 'Tema, moeda, idioma e preferências' },
            { to: '/app/notificacoes', icon: Bell, label: 'Notificações', desc: 'Central e preferências de alertas' },
            { to: '/app/seguranca', icon: ShieldCheck, label: 'Segurança', desc: 'Senha e dispositivos conectados' },
            { to: '/app/privacidade', icon: Lock, label: 'Privacidade e dados', desc: 'Exportação e exclusão (LGPD)' },
          ].map((i) => (
            <li key={i.to}>
              <Link to={i.to} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-2">
                <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-fg-muted"><i.icon className="size-4" aria-hidden /></span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{t(i.label)}</span>
                  <span className="block text-xs text-fg-subtle">{t(i.desc)}</span>
                </span>
                <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <button onClick={() => { signOut(); navigate('/entrar'); }} className="flex w-full items-center gap-3 px-5 py-4 text-left text-danger transition-colors hover:bg-danger-soft">
              <span className="grid size-9 place-items-center rounded-xl bg-danger-soft"><LogOut className="size-4" aria-hidden /></span>
              <span className="text-sm font-medium">{t('Sair da conta')}</span>
            </button>
          </li>
        </ul>
      </Card>
    </div>
  );
}
