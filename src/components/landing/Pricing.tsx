import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FREE_FEATURES, PRICES, PRO_FEATURES, billingEnabled, brl, founderOffer } from '@/lib/plans';
import { cloudEnabled } from '@/services/cloud';
import { BUSINESS, whatsappLink } from '@/config/business';
import { sanitizeText } from '@/lib/sanitize';

/** Seção de planos da página inicial + inscrição no beta de fundadores. */
export function Pricing() {
  return (
    <section id="planos" className="cv-auto scroll-mt-20 px-5 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">Planos</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Comece grátis. Evolua quando quiser.</h2>
          <p className="mt-4 text-fg-muted">Sem fidelidade e sem letras miúdas. Pague com Pix ou cartão e cancele pelo próprio app.</p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="card p-7">
            <p className="font-display text-lg font-semibold">Grátis</p>
            <p className="mt-2 font-display text-4xl font-semibold">R$ 0</p>
            <p className="text-sm text-fg-subtle">para sempre</p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {FREE_FEATURES.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden /> {f}</li>)}
            </ul>
            <Link to="/cadastro" className="mt-7 block"><Button variant="secondary" size="lg" className="w-full">Criar conta grátis</Button></Link>
          </div>

          <div className="card relative overflow-hidden border-primary/50 p-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_circle_at_100%_0%,rgba(123,109,255,0.2),transparent_60%)]" aria-hidden />
            <div className="relative">
              <p className="flex items-center gap-2 font-display text-lg font-semibold"><Crown className="size-5 text-primary" aria-hidden /> Pro</p>
              <p className="mt-2 font-display text-4xl font-semibold">{brl(PRICES.monthly)}<span className="text-base font-normal text-fg-subtle">/mês</span></p>
              <p className="text-sm text-fg-subtle">ou {brl(PRICES.yearly)}/ano (equivale a {brl(PRICES.yearly / 12)}/mês)</p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {PRO_FEATURES.map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> {f}</li>)}
              </ul>
              <Link to="/cadastro" className="mt-7 block">
                <Button size="lg" className="w-full" rightIcon={<ArrowRight className="size-4" />}>{billingEnabled ? 'Começar e assinar' : 'Testar o Pro grátis no beta'}</Button>
              </Link>
            </div>
          </div>
        </div>

        {founderOffer && <FounderBeta />}
      </div>
    </section>
  );
}

function FounderBeta() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const wa = whatsappLink();
  const canForm = cloudEnabled || !!wa || !!BUSINESS.supportEmail;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = sanitizeText(name, 80);
    const c = sanitizeText(contact, 120);
    if (!n || c.length < 5 || !consent) return;
    const text = `Olá! Quero entrar no beta de fundadores da Nexora. Nome: ${n}. Contato: ${c}.`;
    if (cloudEnabled) {
      setState('sending');
      try {
        const { supabase } = await import('@/services/cloud');
        const { error } = await (await supabase()).from('waitlist').insert({ name: n, contact: c, source: 'landing' });
        if (error) throw error;
        setState('done');
      } catch {
        setState('error');
      }
      return;
    }
    if (wa) window.open(whatsappLink(text)!, '_blank', 'noopener');
    else window.location.href = `mailto:${BUSINESS.supportEmail}?subject=${encodeURIComponent('Beta de fundadores Nexora')}&body=${encodeURIComponent(text)}`;
    setState('done');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-6 grid gap-6 rounded-[28px] border border-border bg-bg-elevated p-7 md:grid-cols-[1.1fr_1fr] md:items-center"
    >
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="size-4" aria-hidden /> Beta de fundadores · vagas limitadas</p>
        <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">Use o Pro de graça agora e garanta {brl(PRICES.founder)}/mês para sempre.</h3>
        <p className="mt-2 text-sm text-fg-muted">Em troca, só pedimos sua opinião sincera depois de alguns dias de uso. Sem cartão de crédito para entrar.</p>
      </div>
      {state === 'done' ? (
        <div role="status" className="rounded-2xl border border-success/30 bg-success-soft p-5 text-sm">
          <p className="font-medium text-success">Pronto, você está na lista! 🎉</p>
          <p className="mt-1 text-fg-muted">Vamos falar com você em breve. Enquanto isso, já pode criar sua conta.</p>
          <Link to="/cadastro" className="mt-3 inline-block font-medium text-primary hover:underline">Criar minha conta →</Link>
        </div>
      ) : canForm ? (
        <form onSubmit={submit} className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} placeholder="Seu nome" aria-label="Seu nome" className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-base outline-none focus:border-primary sm:text-sm" />
          <input value={contact} onChange={(e) => setContact(e.target.value)} required maxLength={120} placeholder="WhatsApp ou e-mail" aria-label="WhatsApp ou e-mail" className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-base outline-none focus:border-primary sm:text-sm" />
          <label className="flex items-start gap-2 text-xs text-fg-subtle">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-0.5 accent-[var(--primary)]" />
            <span>Aceito ser contatado sobre o beta. Uso seus dados só para isso — veja a <Link to="/privacidade" className="underline">Política de privacidade</Link>.</span>
          </label>
          {state === 'error' && <p role="alert" className="text-xs text-danger">Não foi possível enviar agora. Tente de novo em instantes.</p>}
          <Button type="submit" size="lg" className="w-full" loading={state === 'sending'} disabled={!consent}>Quero ser fundador</Button>
        </form>
      ) : (
        <Link to="/cadastro"><Button size="lg" className="w-full" rightIcon={<ArrowRight className="size-4" />}>Criar conta e participar</Button></Link>
      )}
    </motion.div>
  );
}
