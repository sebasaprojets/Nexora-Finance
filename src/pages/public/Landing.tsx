import { useState } from 'react';
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

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

const ALL_IN_ONE = [
  { icon: TrendingUp, title: 'Receitas', desc: 'Salário, freelas e vendas com evolução por origem.', color: '#1baf7a' },
  { icon: TrendingDown, title: 'Despesas', desc: 'Categorias, ranking e para onde vai cada real.', color: '#eb6834' },
  { icon: BarChart3, title: 'Investimentos', desc: 'Carteira, rentabilidade, proventos e distribuição.', color: '#9085e9' },
  { icon: Landmark, title: 'Contas', desc: 'Saldos, entradas, saídas e histórico por conta.', color: '#2a78d6' },
  { icon: CreditCard, title: 'Cartões', desc: 'Faturas, limites, vencimentos e parcelamentos.', color: '#e87ba4' },
  { icon: Target, title: 'Metas', desc: 'Quanto guardar por mês e quando você chega lá.', color: '#0891b2' },
  { icon: Wallet, title: 'Orçamento', desc: 'Limites por categoria com alertas em 70%, 90% e 100%.', color: '#eda100' },
  { icon: FileText, title: 'Relatórios', desc: 'DRE, fluxo de caixa e exportação PDF, Excel e CSV.', color: '#1baf7a' },
];

const FAQ = [
  { q: 'A Nexora é gratuita?', a: 'Sim, você pode começar gratuitamente com todas as funcionalidades essenciais. Planos Pro e Business adicionam recursos avançados.' },
  { q: 'Preciso conectar minha conta bancária?', a: 'Não. Você registra suas movimentações em segundos — e pode importar ou conectar bancos quando a integração estiver disponível no seu plano.' },
  { q: 'Meus dados estão seguros?', a: 'Sim. Usamos criptografia em trânsito (HTTPS) e em repouso, sessões controladas por dispositivo e nunca armazenamos senhas bancárias, número completo de cartão ou CVV.' },
  { q: 'Funciona no celular?', a: 'Sim. A Nexora é um app instalável (PWA): funciona no navegador, pode ser adicionada à tela inicial, envia notificações e tem modo offline básico.' },
  { q: 'O score da Nexora é um score de crédito?', a: 'Não. É um indicador educativo de saúde financeira calculado com os seus dados, sem relação com birôs de crédito.' },
  { q: 'A Nexora recomenda investimentos?', a: 'Não. As informações de investimentos são educativas e não constituem recomendação nem garantia de retorno.' },
];

const TESTIMONIALS = [
  { name: 'Mariana, 29', role: 'Designer', text: 'Pela primeira vez sei exatamente para onde vai meu salário. O alerta de orçamento me salvou no fim do mês.' },
  { name: 'Rafael, 35', role: 'Engenheiro', text: 'O plano de quitação mostrou que eu pagaria 4 meses antes com R$ 200 extras. Simples e direto.' },
  { name: 'Juliana, 41', role: 'Empreendedora', text: 'A DRE e o fluxo de caixa deixaram claro o lucro real da minha empresa. Uso todos os dias.' },
];

function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    ['#recursos', 'Recursos'],
    ['#funcionalidades', 'Funcionalidades'],
    ['#seguranca', 'Segurança'],
    ['#faq', 'FAQ'],
  ];
  return (
    <header className="glass fixed inset-x-0 top-0 z-50 border-x-0 border-t-0">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5" aria-label="Principal">
        <Link to="/" aria-label="Nexora — início"><Logo /></Link>
        <ul className="ml-6 hidden gap-6 text-sm text-fg-muted md:flex">
          {links.map(([h, l]) => <li key={h}><a href={h} className="transition-colors hover:text-fg">{l}</a></li>)}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link to="/entrar" className="hidden h-10 items-center rounded-xl px-4 text-sm font-medium text-fg-muted hover:text-fg sm:inline-flex">Entrar</Link>
          <Link to="/cadastro" className="hidden sm:inline-flex"><Button>Começar agora</Button></Link>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
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
                <Link to="/entrar"><Button variant="secondary" className="w-full">Entrar</Button></Link>
                <Link to="/cadastro"><Button className="w-full">Começar agora</Button></Link>
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
  return (
    <div className="overflow-x-clip">
      <Nav />
      <main>
        {/* HERO */}
        <section className="relative px-5 pt-32 pb-20 sm:pt-40">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" aria-hidden />
          <div className="pointer-events-none absolute top-0 left-1/2 size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7b6dff]/15 blur-[140px]" aria-hidden />
          <div className="relative mx-auto max-w-4xl text-center">
            <motion.a href="#funcionalidades" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass mx-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-fg-muted">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg">Novo</span>
              Nexora AI responde sobre suas finanças <ArrowRight className="size-3" aria-hidden />
            </motion.a>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="mt-6 font-display text-[40px] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Controle seu dinheiro.{' '}
              <span className="bg-gradient-to-r from-[#8f83ff] via-[#a99fff] to-[#22d3ee] bg-clip-text text-transparent">Construa seu futuro.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.7 }} className="mx-auto mt-6 max-w-2xl text-base text-fg-muted text-balance sm:text-lg">
              Uma plataforma inteligente para organizar, acompanhar e melhorar sua vida financeira em um único lugar.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.7 }} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic>
                <Link to="/cadastro"><Button size="lg" className="h-13 px-7" rightIcon={<ArrowRight className="size-4" />}>Começar agora</Button></Link>
              </Magnetic>
              <a href="#recursos"><Button size="lg" variant="secondary" className="h-13 px-7">Conhecer a Nexora</Button></a>
            </motion.div>
            <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-fg-subtle">
              {['Grátis para começar', 'Sem cartão de crédito', 'Funciona no celular e no computador'].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Check className="size-3.5 text-success" aria-hidden />{t}</li>
              ))}
            </motion.ul>
          </div>
          <div className="relative mt-16 sm:mt-20">
            <DashboardPreview />
          </div>
        </section>

        {/* TUDO EM UM SÓ LUGAR */}
        <section id="recursos" className="scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium text-primary">Visão completa</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-5xl">Tudo sobre suas finanças em um só lugar</h2>
              <p className="mt-4 text-fg-muted">Pare de alternar entre planilhas, apps de banco e anotações. A Nexora reúne tudo e transforma em respostas.</p>
            </motion.div>
            <div className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {ALL_IN_ONE.map((f, i) => (
                <motion.div key={f.title} {...reveal} transition={{ ...reveal.transition, delay: i * 0.05 }} whileHover={{ y: -4 }} className="card group relative overflow-hidden p-4 sm:p-6">
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
        <section className="border-y border-border bg-bg-elevated/50 px-5 py-20">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 md:grid-cols-4 md:gap-10">
            {[
              ['5 s', 'para registrar uma despesa no celular'],
              ['13', 'perguntas respondidas no seu dashboard'],
              ['0–1000', 'score de saúde financeira explicado'],
              ['3', 'formatos de exportação: PDF, Excel e CSV'],
            ].map(([v, l], i) => (
              <motion.div key={l} {...reveal} transition={{ ...reveal.transition, delay: i * 0.06 }} className="text-center md:text-left">
                <p className="tabular font-display text-4xl font-semibold tracking-tight sm:text-5xl">{v}</p>
                <p className="mt-2 text-sm text-fg-muted">{l}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FUNCIONALIDADES */}
        <section id="funcionalidades" className="scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-7xl space-y-24">
            {[
              {
                tag: 'Análises financeiras',
                title: 'Cada gráfico responde uma pergunta.',
                text: 'Receitas x despesas, lucros e perdas, DRE simplificada, fluxo de caixa, heatmap diário e comparação de períodos — tudo calculado com os seus dados reais.',
                bullets: ['DRE com comparação e exportação', 'Para onde vai meu dinheiro, com detalhamento por categoria', 'Indicadores: taxa de economia, reserva, dívida/renda'],
                icon: BarChart3,
              },
              {
                tag: 'Nexora AI',
                title: 'Pergunte. A Nexora responde com números.',
                text: '“Quanto posso gastar hoje?” “Qual foi minha maior despesa?” O assistente usa somente os seus dados — e avisa quando não há informação suficiente.',
                bullets: ['Respostas com fatos e atalhos', 'Nunca inventa valores', 'Privacidade: cálculos no seu dispositivo'],
                icon: Bot,
              },
              {
                tag: 'Sempre com você',
                title: 'App no celular, notificações no tempo certo.',
                text: 'Instale a Nexora na tela inicial, receba alertas de fatura, orçamento e metas, e lance uma despesa em segundos pelo botão “+”.',
                bullets: ['PWA instalável com modo offline', 'Push no desktop e no celular', 'Atalhos de teclado e Ctrl + K'],
                icon: Smartphone,
              },
            ].map((f, i) => (
              <motion.div key={f.tag} {...reveal} className={cn('grid items-center gap-10 lg:grid-cols-2', i % 2 && 'lg:[&>*:first-child]:order-2')}>
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
                      {[['Receita', 'R$ 30.000', '+11,1%'], ['Custos', 'R$ 8.500', '+7,6%'], ['Despesas', 'R$ 13.000', '+4,0%'], ['Lucro líquido', 'R$ 8.500', '+28,8%']].map(([a, b, c], k) => (
                        <div key={a} className={cn('flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm', k === 3 && 'border-primary/40 bg-primary-soft font-semibold')}>
                          <span>{a}</span><span className="tabular">{b}</span><span className="tabular text-success">{c}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {i === 1 && (
                    <div className="space-y-3 text-sm">
                      <div className="ml-auto w-fit rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-primary-fg">Quanto posso gastar hoje?</div>
                      <div className="w-[90%] rounded-2xl rounded-tl-md border border-border bg-surface px-4 py-3 text-fg-muted">
                        Você pode gastar cerca de <strong className="text-fg">R$ 87,40 por dia</strong> até o fim do mês, mantendo 20% da renda guardados e as contas previstas pagas.
                      </div>
                      <div className="ml-auto w-fit rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-primary-fg">E minha maior despesa?</div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="grid grid-cols-2 gap-3">
                      {[[Bell, 'Fatura vence amanhã'], [Wallet, 'Alimentação: 90% do orçamento'], [Target, 'Meta atingida 🎉'], [Command, 'Ctrl + K']].map(([I, t]) => {
                        const Icon = I as typeof Bell;
                        return (
                          <div key={t as string} className="rounded-xl border border-border bg-surface p-4 text-sm">
                            <Icon className="size-5 text-primary" />
                            <p className="mt-3 font-medium">{t as string}</p>
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
        <section id="seguranca" className="scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-7xl rounded-[32px] border border-border bg-bg-elevated p-8 sm:p-14">
            <motion.div {...reveal} className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="size-4" aria-hidden /> Segurança e privacidade</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Seu dinheiro é sério. Sua privacidade também.</h2>
              <p className="mt-4 text-fg-muted">Construída com boas práticas de segurança e em conformidade com a LGPD. Você controla seus dados — inclusive para exportar ou excluir quando quiser.</p>
            </motion.div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [Lock, 'Criptografia', 'HTTPS em trânsito e dados protegidos em repouso.'],
                [Fingerprint, 'Sessões sob controle', 'Veja dispositivos conectados e encerre acessos.'],
                [ServerCog, 'Sem dados bancários', 'Nunca pedimos senha do banco, CVV ou número completo do cartão.'],
                [PiggyBank, 'LGPD', 'Exportação e exclusão dos seus dados a qualquer momento.'],
              ].map(([I, t, d]) => {
                const Icon = I as typeof Lock;
                return (
                  <motion.div key={t as string} {...reveal} className="rounded-2xl border border-border bg-surface p-5">
                    <Icon className="size-5 text-primary" aria-hidden />
                    <h3 className="mt-4 font-semibold">{t as string}</h3>
                    <p className="mt-1 text-sm text-fg-muted">{d as string}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* DEPOIMENTOS */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-7xl">
            <motion.h2 {...reveal} className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">Feita para o dia a dia</motion.h2>
            <p className="mt-3 text-center text-xs text-fg-subtle">Depoimentos ilustrativos de perfis de uso.</p>
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

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 px-5 py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
            <div className="mt-10">{FAQ.map((f) => <FaqItem key={f.q} {...f} />)}</div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-24">
          <motion.div {...reveal} className="relative mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-border bg-[#0d0f16] px-6 py-16 text-center text-white sm:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_50%_0%,rgba(123,109,255,0.35),transparent_60%)]" aria-hidden />
            <div className="relative">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">Comece hoje a construir seu futuro.</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/70">Crie sua conta em menos de um minuto ou explore com dados de demonstração.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Magnetic><Link to="/cadastro"><Button size="lg" rightIcon={<ArrowRight className="size-4" />}>Começar agora</Button></Link></Magnetic>
                <Link to="/entrar"><Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">Ver demonstração</Button></Link>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-12">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-fg-subtle">Inteligência financeira em um só lugar.</p>
          </div>
          {[
            ['Produto', [['#recursos', 'Recursos'], ['#funcionalidades', 'Funcionalidades'], ['#seguranca', 'Segurança'], ['#faq', 'FAQ']]],
            ['Conta', [['/entrar', 'Entrar'], ['/cadastro', 'Criar conta'], ['/recuperar-senha', 'Recuperar senha']]],
            ['Legal', [['/privacidade', 'Política de privacidade'], ['/termos', 'Termos de uso']]],
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
          <p>© {new Date().getFullYear()} Nexora Finance. Todos os direitos reservados.</p>
          <p>A Nexora não é uma instituição financeira e não oferece recomendação de investimentos.</p>
        </div>
      </footer>
    </div>
  );
}
