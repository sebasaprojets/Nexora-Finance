# Nexora Finance

> **Inteligência financeira em um só lugar.**

Plataforma financeira SaaS (web + PWA) para controlar, organizar, analisar e melhorar a vida financeira: dashboard, transações, contas, cartões e faturas, orçamentos, metas, dívidas, investimentos, assinaturas, análises (DRE, lucros e perdas, fluxo de caixa, heatmap, comparação de períodos), relatórios em PDF/Excel/CSV, calendário, notificações, assistente **Nexora AI** e score de saúde financeira.

## Começando

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção (com Service Worker)
npm run preview    # serve o build
npm test           # testes do motor financeiro (Vitest)
```

Na tela de login, use **“Explorar com conta demonstração”** para entrar com 12 meses de dados fictícios — ou crie uma conta e passe pelo onboarding (começando do zero ou com dados de exemplo).

## Stack

| Camada | Escolha |
|---|---|
| UI | React 19 + TypeScript, Vite 8 |
| Estilo | Tailwind CSS v4 com design tokens (CSS variables) — dark/light/sistema |
| Movimento | Framer Motion (respeita `prefers-reduced-motion` e preferência do usuário) |
| Gráficos | Recharts + sparklines SVG; paleta categórica validada para daltonismo |
| Estado | Zustand (workspace por usuário, configurações, UI, toasts) |
| Formulários | React Hook Form + Zod |
| Listas grandes | @tanstack/react-virtual (milhares de transações) |
| Exportação | CSV nativo, `write-excel-file` (.xlsx real), jsPDF + autotable — carregados sob demanda |
| PWA | vite-plugin-pwa (injectManifest) + Service Worker próprio com push e offline |
| Ícones | Lucide |

## Arquitetura

```text
src/
├── components/
│   ├── ui/           # Design system: Button, Field/Input/Select, Card, Modal, Tabs, Segmented,
│   │                 # Dropdown, Tooltip, Badge, Progress, Switch, Skeleton, Toaster, Sparkline…
│   ├── charts/       # FlowChart, Donut, BarList, HeatmapCalendar, tooltip/legenda padrão
│   ├── analytics/    # Seções da página de Análises (visão, gastos, receitas, fluxo, comparar)
│   ├── layout/       # Sidebar, Topbar, BottomNav (+ FAB), CommandPalette, InstallPrompt
│   ├── transactions/ # TransactionModal (lançamento rápido), TransactionRow
│   ├── landing/      # DashboardPreview, Magnetic
│   └── common/       # StatCard, PageHeader, PeriodFilter, ExportMenu, ScoreGauge…
├── pages/            # public/ (landing, legal), auth/ (login, cadastro, onboarding), app/ (módulos)
├── layouts/          # AppLayout (shell autenticado), AuthLayout
├── lib/              # Lógica pura e testável:
│   ├── finance.ts    #   motor financeiro (saldos, períodos, faturas, orçamentos, metas, DRE…)
│   ├── score.ts      #   score de saúde financeira 0–1000 (explicável)
│   ├── insights.ts   #   insights gerados a partir dos dados
│   ├── assistant.ts  #   Nexora AI (intenções → respostas com números reais)
│   ├── reports.ts    #   relatórios exportáveis
│   ├── calendar.ts   #   eventos financeiros do mês
│   └── export.ts, format.ts, dates.ts, …
├── services/         # auth (PBKDF2 local, interface pronta p/ Supabase), storage, notifications, SW
├── store/            # Zustand: finance (workspace), auth, settings, ui, toast
├── hooks/            # useMoney, usePeriod, useShortcuts, useTheme, useMediaQuery…
├── data/             # categorias padrão + gerador de dados mock determinístico
├── types/            # Modelo de domínio (espelha supabase/schema.sql)
├── styles/           # tokens e base CSS
└── sw.ts             # Service Worker (precache, offline, push, notificationclick)
```

**Princípio central:** nenhum número da interface é fixo. Tudo é derivado das transações e entidades do usuário pelo `lib/finance.ts` — inclusive insights e respostas da IA, que avisam quando não há dados.

### Regras de negócio importantes
- **Transferências** (inclusive pagamento de fatura e aportes) não contam como receita/despesa.
- **Compras no cartão** contam como despesa na data da compra, mas só saem do caixa quando a fatura é paga (fluxo de caixa).
- **Faturas** são derivadas: compras a partir do dia de fechamento vão para a fatura seguinte; status Paga / Aberta / Fechada / Atrasada.
- **DRE simplificada:** Custos = categorias de natureza *fixa*; Despesas = *variáveis*.
- **Orçamentos:** alertas em 70% (atenção), 90% (alerta) e 100% (ultrapassado).

## Backend e dados

Hoje a Nexora roda em **modo local** (dados no `localStorage`, por usuário). O esquema completo para produção — `users, accounts, transactions, categories, cards, invoices, budgets, goals, debts, investments, subscriptions, notifications, financial_reports, sessions, settings` + `push_subscriptions` — está em [`supabase/schema.sql`](supabase/schema.sql), com **Row Level Security** em todas as tabelas. Veja [`supabase/README.md`](supabase/README.md) para ligar Supabase Auth, Web Push (VAPID), rate limiting e um LLM opcional no servidor.

Os dados mock (`src/data/mock.ts`) seguem o tipo `FinanceData`; trocar pelo backend é substituir `load/save` em `src/store/finance.ts`.

## Segurança e privacidade
- Senhas locais com PBKDF2-SHA256 (210k iterações) + salt; bloqueio após 5 tentativas; mensagens que não revelam se o e-mail existe.
- Sessões com expiração (“lembrar acesso” = 30 dias; senão termina ao fechar o navegador), lista de **dispositivos conectados** e encerramento de sessões.
- Sanitização de entradas, proteção contra *CSV injection* nas exportações, anexos limitados a imagem/PDF de até 1,5 MB.
- Nunca armazena número completo de cartão, CVV ou senha bancária. Nenhuma chave secreta no frontend (`.env.example`).
- LGPD: exportação completa dos dados (JSON), exclusão de dados financeiros e da conta, política de privacidade e termos (modelos — revisar com assessoria jurídica).

## Acessibilidade e UX
Navegação por teclado, foco visível, diálogos com foco preso, ARIA em gráficos/tabelas/abas, “pular para o conteúdo”, contraste em dark/light, ícone + texto em todo status (nunca só cor), movimento reduzido.

**Atalhos:** `Ctrl/⌘ + K` paleta de comandos · `N` nova transação · `R` nova receita · `D` nova despesa · `G` dashboard · `T` transações · `Esc` fecha modais.

## Design system
Tokens em `src/styles/index.css` (cores de superfície, texto, marca, estados, séries de gráfico, heatmap, sombras, raios) mapeados para utilitários Tailwind — mesma nomenclatura pensada para virar *variables* no Figma. Tipografia: Sora (display) + Inter (texto), números tabulares em tabelas.

## Próximos passos sugeridos
1. Conectar Supabase (auth real, sincronização multi-dispositivo, sessões no servidor).
2. Edge Function de Web Push agendado (faturas, orçamentos, metas) com a chave VAPID privada.
3. Importação de extratos (OFX/CSV) e Open Finance.
4. Internacionalização (en-US, es-ES) e conversão de moedas.
