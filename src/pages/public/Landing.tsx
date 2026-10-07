import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, BarChart3, Bell, Bot, Check, ChevronDown, Command, CreditCard, FileText, Fingerprint, Landmark, Lock, Menu, PiggyBank, Quote, ServerCog, ShieldCheck, Smartphone, Target, TrendingDown, TrendingUp, Wallet, X,
} from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/Button';
import { Magnetic } from '@/components/landing/Magnetic';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { cn } from '@/lib/cn';
import { BUSINESS } from '@/config/business';
import { Pricing } from '@/components/landing/Pricing';
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher';
import { useLandingText } from '@/i18n/landing';
import { LANGS, useLang } from '@/i18n/lang';

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const ALL_IN_ONE_STYLE = [
  { icon: TrendingUp, color: '#1baf7a' },
  { icon: TrendingDown, color: '#eb6834' },
  { icon: BarChart3, color: '#9085e9' },
  { icon: Landmark, color: '#2a78d6' },
  { icon: CreditCard, color: '#e87ba4' },
  { icon: Target, color: '#0891b2' },
  { icon: Wallet, color: '#eda100' },
  { icon: FileText, color: '#1baf7a' },
];
const FEATURE_ICONS = [BarChart3, Bot, Smartphone];
const SECURITY_ICONS = [Lock, Fingerprint, ServerCog, PiggyBank];
const ALERT_ICONS = [Bell, Wallet, Target, Command];

/** Depoimentos REAIS (com autorização por escrito). Vazio = a seção não aparece. */
const TESTIMONIALS: { name: string; role: string; text: string }[] = [];

function Nav() {
  const [open, setOpen] = useState(false);
  const t = useLandingText().nav;
  const links = [
    ['#recursos', t.features],
    ['#funcionalidades', t.functions],
    ['#seguranca', t.security],
    ['#planos', t.plans],
    ['#faq', t.faq],
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5" aria-label="Principal">
        <Link to="/" aria-label="Nexora — início"><Logo /></Link>
        <ul className="ml-6 hidden gap-6 text-sm text-fg-muted md:flex">
          {links.map(([h, l]) => <li key={h}><a href={h} className="transition-colors hover:text-fg">{l}</a></li>)}
        </ul>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link to="/entrar" className="hidden h-10 items-center rounded-xl px-4 text-sm font-medium text-fg-muted hover:text-fg sm:inline-flex">{t.login}</Link>
          <Link to="/cadastro" className="hidden sm:inline-flex"><Button>{t.start}</Button></Link>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? t.closeMenu : t.openMenu} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-border md:hidden">
            <ul className="space-y-1 p-4">
              {links.map(([h, l]) => <li key={h}><a href={h} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-surface-2">{l}</a></li>)}
              <li className="grid grid-cols-2 gap-2 pt-2">
                <Link to="/entrar"><Button variant="secondary" className="w-full">{t.login}</Button></Link>
                <Link to="/cadastro"><Button className="w-full">{t.start}</Button></Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-5 text-left font-medium">
        {q}
        <ChevronDown className={cn('size-5 shrink-0 text-fg-subtle transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pb-5 text-sm leading-relaxed text-fg-muted">
            {a}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Landing() {
  const t = useLandingText();
  const lang = useLang((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = LANGS.find((l) => l.code === lang)!.html;
  }, [lang]);
  return (
    <div className="overflow-x-clip">
      <Nav />
      <main>
        {/* HERO */}
        <section className="relative px-5 pt-[calc(env(safe-area-inset-top)+8rem)] pb-20 sm:pt-40">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          <div className="pointer-events-none absolute top-0 left-1/2 size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7b6dff]/15 blur-[140px]" aria-hidden />
          <div className="relative mx-auto max-w-4xl text-center">
            <motion.a href="#funcionalidades" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-fg-muted">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg">{t.hero.badge}</span>
              {t.hero.badgeText} <ArrowRight className="size-3" aria-hidden />
            </motion.a>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="mt-6 font-display text-[40px] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {t.hero.title1}{' '}
              <span className="bg-gradient-to-r from-[#8f83ff] via-[#a99fff] to-[#22d3ee] bg-clip-text text-transparent">{t.hero.title2}</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.7 }} className="mx-auto mt-6 max-w-2xl text-base text-fg-muted text-balance sm:text-lg">
              {t.hero.subtitle}
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.7 }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic>
                <Link to="/cadastro"><Button size="lg" className="h-13 px-7" rightIcon={<ArrowRight className="size-4" />}>{t.hero.cta}</Button></Link>
              </Magnetic>
              <a href="#recursos"><Button size="lg" variant="secondary" className="h-13 px-7">{t.hero.secondary}</Button></a>
            </motion.div>
            <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-fg-subtle">
              {t.hero.checks.map((c) => (
                <li key={c} className="flex items-center gap-1.5"><Check className="size-3.5 text-success" aria-hidden />{c}</li>
              ))}
            </motion.ul>
          </div>
          <div className="relative mt-16 sm:mt-20">
            <DashboardPreview />
          </div>
        </section>

        {/* TUDO EM UM SÓ LUGAR */}
        <section id="recursos" className="cv-auto scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium text-primary">{t.all.tag}</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t.all.title}</h2>
              <p className="mt-4 text-fg-muted">{t.all.text}</p>
            </motion.div>
            <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {t.all.items.map(([title, desc], i) => ({ ...ALL_IN_ONE_STYLE[i], title, desc })).map((f, i) => (
                <motion.div key={i} {...reveal} transition={{ ...reveal.transition, delay: i * 0.05 }} whileHover={{ y: -4 }} className="card group relative overflow-hidden p-4 sm:p-6">
                  <div className="absolute -top-12 -right-12 size-32 rounded-full opacity-0 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: f.color }} aria-hidden />
                  <span className="grid size-11 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${f.color} 16%, transparent)`, color: f.color }}>
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display font-semibold sm:mt-5 sm:text-lg">{f.title}</h3>
                  <p className="mt-1.5 text-xs text-fg-muted sm:text-sm">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFÍCIOS */}
        <section className="cv-auto border-y border-border bg-bg-elevated/50 px-5 py-20">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
            {t.stats.map(([v, l], i) => (
              <motion.div key={l} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }} className="text-center md:text-left">
                <p className="tabular font-display text-4xl font-semibold tracking-tight sm:text-5xl">{v}</p>
                <p className="mt-2 text-sm text-fg-muted">{l}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FUNCIONALIDADES */}
        <section id="funcionalidades" className="cv-auto scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-7xl space-y-24">
            {t.features.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] })).map((f, i) => (
              <motion.div key={i} {...reveal} className={cn('grid items-center gap-10 lg:grid-cols-2', i % 2 && 'lg:[&>*:first-child]:order-2')}>
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-primary"><f.icon className="size-4" aria-hidden /> {f.tag}</p>
                  <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{f.title}</h3>
                  <p className="mt-4 text-fg-muted">{f.text}</p>
                  <ul className="mt-6 space-y-2.5">
                    {f.bullets.map((b) => <li key={b} className="flex items-center gap-2.5 text-sm"><span className="grid size-5 place-items-center rounded-full bg-primary-soft text-primary"><Check className="size-3" aria-hidden /></span>{b}</li>)}
                  </ul>
                </div>
                <div className="card holo relative overflow-hidden p-6 sm:p-8" aria-hidden>
                  {i === 0 && (
                    <div className="space-y-3">
                      {t.dre.map(([a, b, c], k) => (
                        <div key={k} className={cn('flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm', k === 3 && 'border-primary/40 bg-primary-soft font-semibold')}>
                          <span>{a}</span><span className="tabular">{b}</span><span className="tabular text-success">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {i === 1 && (
                    <div className="space-y-3 text-sm">
                      <div className="ml-auto w-fit rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-primary-fg">{t.chat.q1}</div>
                      <div className="w-[90%] rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-3 text-fg-muted">
                        {t.chat.a1a}<strong className="text-fg">{t.chat.a1b}</strong>{t.chat.a1c}
                      </div>
                      <div className="ml-auto w-fit rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-primary-fg">{t.chat.q2}</div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="grid grid-cols-2 gap-3">
                      {t.alerts.map((label, k) => {
                        const Icon = ALERT_ICONS[k];
                        return (
                          <div key={k} className="rounded-xl border border-border bg-surface p-4 text-sm">
                            <Icon className="size-5 text-primary" />
                            <p className="mt-3 font-medium">{label}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* SEGURANÇA */}
        <section id="seguranca" className="cv-auto scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-border bg-bg-elevated p-8 sm:p-14">
            <motion.div {...reveal} className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="size-4" aria-hidden /> {t.security.tag}</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.security.title}</h2>
              <p className="mt-4 text-fg-muted">{t.security.text}</p>
            </motion.div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {t.security.items.map(([title, d], k) => {
                const Icon = SECURITY_ICONS[k];
                return (
                  <motion.div key={k} {...reveal} className="rounded-2xl border border-border bg-surface p-5">
                    <Icon className="size-5 text-primary" aria-hidden />
                    <h3 className="mt-4 font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-fg-muted">{d}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PLANOS + BETA DE FUNDADORES */}
        <Pricing />

        {/* DEPOIMENTOS */}
        {TESTIMONIALS.length > 0 && (
        <section className="cv-auto px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <motion.h2 {...reveal} className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.testimonials}</motion.h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <motion.figure key={t.name} {...reveal} transition={{ ...reveal.transition, delay: i * 0.08 }} className="card p-6">
                  <Quote className="size-6 text-primary/60" aria-hidden />
                  <blockquote className="mt-4 text-[15px] leading-relaxed">“{t.text}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#7b6dff] to-[#22d3ee] text-sm font-semibold text-white" aria-hidden>{t.name[0]}</span>
                    <span><span className="block text-sm font-medium">{t.name}</span><span className="block text-xs text-fg-subtle">{t.role}</span></span>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* FAQ */}
        <section id="faq" className="cv-auto scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t.faqTitle}</h2>
            <div className="mt-10">{t.faq.map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}</div>
          </div>
        </section>

        {/* CTA */}
        <section className="cv-auto px-5 pb-24">
          <motion.div {...reveal} className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-border bg-[#0d0f16] px-6 py-16 text-center text-white sm:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_50%_0%,rgba(123,109,255,0.35),transparent_60%)]" aria-hidden />
            <div className="relative">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{t.cta.title}</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/70">{t.cta.text}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Magnetic><Link to="/cadastro"><Button size="lg" rightIcon={<ArrowRight className="size-4" />}>{t.cta.start}</Button></Link></Magnetic>
                <Link to="/entrar"><Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">{t.cta.demo}</Button></Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-12">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-fg-subtle">{t.footer.tagline}</p>
            <LanguageSwitcher className="mt-4 -ml-2.5" />
          </div>
          {[
            [t.footer.product, [['#recursos', t.nav.features], ['#funcionalidades', t.nav.functions], ['#planos', t.nav.plans], ['#faq', t.nav.faq]]],
            [t.footer.account, [['/entrar', t.footer.login], ['/cadastro', t.footer.signup], ['/recuperar-senha', t.footer.recover]]],
            [t.footer.legal, [['/privacidade', t.footer.privacy], ['/termos', t.footer.terms]]],
          ].map(([title, links]) => (
            <div key={title as string}>
              <p className="text-sm font-semibold">{title as string}</p>
              <ul className="mt-3 space-y-2 text-sm text-fg-subtle">
                {(links as string[][]).map(([h, l]) => <li key={h}>{h.startsWith('#') ? <a href={h} className="hover:text-fg">{l}</a> : <Link to={h} className="hover:text-fg">{l}</Link>}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-10 flex max-w-7xl flex-col justify-between gap-2 border-t border-border pt-6 text-xs text-fg-subtle sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BUSINESS.legalName || 'Nexora Finance'}
            {BUSINESS.cnpj && ` · CNPJ ${BUSINESS.cnpj}`}
            {' · '}{t.footer.rights}
            {BUSINESS.supportEmail && <> · <a href={`mailto:${BUSINESS.supportEmail}`} className="hover:text-fg">{BUSINESS.supportEmail}</a></>}
          </p>
          <p>{t.footer.disclaimer}</p>
        </div>
      </footer>
    </div>
  );
}
