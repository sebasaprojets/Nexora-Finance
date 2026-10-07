import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Eraser, FileText, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { useAuth } from '@/store/auth';
import { useFinance } from '@/store/finance';
import { useSettings } from '@/store/settings';
import { toast } from '@/store/toast';
import { authService } from '@/services/auth';
import { disableBiometric } from '@/services/biometric';
import { today } from '@/lib/dates';
import { t } from '@/i18n';

export default function PrivacyData() {
  const user = useAuth((s) => s.user)!;
  const signOut = useAuth((s) => s.signOut);
  const exportAll = useFinance((s) => s.exportAll);
  const clearAll = useFinance((s) => s.clearAll);
  const deleteWorkspace = useFinance((s) => s.deleteWorkspace);
  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const confirmWord = t('EXCLUIR');

  const download = () => {
    const { passwordHash: _a, ...safeUser } = user as typeof user & { passwordHash?: string };
    const payload = { exportedAt: new Date().toISOString(), format: 'nexora-export-v1', user: safeUser, settings: useSettings.getState(), data: exportAll() };
    const blob = new Blob([JSON.stringify(payload, (_k, v) => (typeof v === 'function' ? undefined : v), 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nexora-meus-dados-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast.success(t('Exportação concluída'), { description: t('Arquivo JSON com todos os seus dados.') });
  };

  const deleteAccount = async () => {
    const cloud = authService.isCloudUser(user.id);
    try {
      await authService.deleteUser(user.id);
    } catch {
      toast.error(t('Não foi possível excluir a conta'), { description: t('Verifique sua conexão e tente novamente.') });
      return;
    }
    deleteWorkspace();
    disableBiometric(user.id);
    signOut();
    toast.success(t('Conta excluída'), { description: cloud ? t('Sua conta e todos os seus dados foram apagados dos nossos servidores.') : t('Seus dados foram removidos deste dispositivo.') });
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t('Privacidade e dados')} description={t('Seus dados pertencem a você. Controle total, conforme a LGPD (Lei 13.709/2018).')} />

      <Card>
        <CardHeader title={t('Como tratamos seus dados')} icon={<ShieldCheck />} />
        <CardBody className="space-y-2 text-sm text-fg-muted">
          <p>• <strong className="text-fg">{t('Finalidade:')}</strong> {t('usamos seus dados apenas para oferecer as funcionalidades da Nexora (controle, análises e alertas).')}</p>
          <p>• <strong className="text-fg">{t('Minimização:')}</strong> {t('não coletamos senhas bancárias, número completo de cartão nem CVV.')}</p>
          <p>• <strong className="text-fg">{t('Armazenamento:')}</strong> {t('no modo local, os dados ficam somente neste navegador. Com backend, ficam criptografados em repouso e em trânsito (HTTPS).')}</p>
          <p>• <strong className="text-fg">{t('Sem venda de dados:')}</strong> {t('não compartilhamos nem vendemos suas informações para terceiros.')}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/privacidade" className="inline-flex items-center gap-1.5 text-primary hover:underline"><FileText className="size-4" /> {t('Política de privacidade')}</Link>
            <Link to="/termos" className="inline-flex items-center gap-1.5 text-primary hover:underline"><FileText className="size-4" /> {t('Termos de uso')}</Link>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('Portabilidade')} icon={<Download />} description={t('Direito de acesso e portabilidade (art. 18, LGPD)')} />
        <CardBody>
          <p className="mb-4 text-sm text-fg-muted">{t('Baixe uma cópia completa dos seus dados em formato aberto (JSON): perfil, contas, transações, cartões, metas, orçamentos, dívidas, investimentos, assinaturas e notificações.')}</p>
          <Button leftIcon={<Download className="size-4" />} onClick={download}>{t('Exportar meus dados')}</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('Apagar dados financeiros')} icon={<Eraser />} />
        <CardBody>
          <p className="mb-4 text-sm text-fg-muted">{t('Remove todas as transações, contas, cartões, metas e demais registros, mantendo sua conta ativa.')}</p>
          <Button variant="secondary" onClick={() => setConfirmClear(true)}>{t('Apagar dados financeiros')}</Button>
        </CardBody>
      </Card>

      <Card className="border-danger/30">
        <CardHeader title={t('Excluir conta')} icon={<Lock />} description={t('Direito à eliminação dos dados (art. 18, VI)')} />
        <CardBody>
          <p className="mb-4 text-sm text-fg-muted">{t('Exclui permanentemente sua conta e todos os dados associados. Esta ação não pode ser desfeita.')}</p>
          <Button variant="danger" leftIcon={<Trash2 className="size-4" />} onClick={() => setDeleteOpen(true)}>{t('Excluir minha conta')}</Button>
        </CardBody>
      </Card>

      <ConfirmDialog open={confirmClear} onClose={() => setConfirmClear(false)} title={t('Apagar todos os dados financeiros?')} description={t('Recomendamos exportar seus dados antes. Esta ação não pode ser desfeita.')} confirmLabel={t('Apagar')} onConfirm={() => { clearAll(); toast.success(t('Dados financeiros apagados')); }} />
      <Modal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setTyped(''); }}
        title={t('Excluir conta permanentemente')}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setDeleteOpen(false)}>{t('Cancelar')}</Button><Button variant="danger" disabled={typed !== confirmWord} onClick={deleteAccount}>{t('Excluir conta')}</Button></>}
      >
        <p className="mb-4 text-sm text-fg-muted">{t('Todos os seus dados serão removidos. Para confirmar, digite')} <strong className="text-fg">{confirmWord}</strong>.</p>
        <Field label={t('Confirmação')}>{(p) => <Input {...p} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" data-autofocus />}</Field>
      </Modal>
    </div>
  );
}
