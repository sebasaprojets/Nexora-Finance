import {
  BarChart3, Bell, Bot, CalendarDays, CreditCard, FileText, Gauge, HandCoins, Landmark, LayoutDashboard, Lock,
  Repeat, Settings, Shapes, ShieldCheck, Target, TrendingUp, User, Wallet, ArrowLeftRight, Crown, LifeBuoy, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  keywords?: string;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Visão geral',
    items: [
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'G', keywords: 'inicio home painel' },
      { to: '/app/analises', label: 'Análises', icon: BarChart3, keywords: 'graficos dre lucros perdas fluxo caixa' },
      { to: '/app/saude', label: 'Saúde financeira', icon: Gauge, keywords: 'score pontuacao' },
      { to: '/app/assistente', label: 'Nexora AI', icon: Bot, keywords: 'assistente ia chat' },
    ],
  },
  {
    label: 'Dinheiro',
    items: [
      { to: '/app/transacoes', label: 'Transações', icon: ArrowLeftRight, shortcut: 'T', keywords: 'lancamentos receitas despesas' },
      { to: '/app/contas', label: 'Contas', icon: Landmark, keywords: 'bancos saldo' },
      { to: '/app/cartoes', label: 'Cartões', icon: CreditCard, keywords: 'fatura credito' },
      { to: '/app/categorias', label: 'Categorias', icon: Shapes },
      { to: '/app/assinaturas', label: 'Assinaturas', icon: Repeat, keywords: 'netflix spotify recorrente' },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { to: '/app/orcamentos', label: 'Orçamentos', icon: Wallet, keywords: 'limite budget' },
      { to: '/app/metas', label: 'Metas', icon: Target, keywords: 'objetivos' },
      { to: '/app/dividas', label: 'Dívidas', icon: HandCoins, keywords: 'emprestimo financiamento' },
      { to: '/app/investimentos', label: 'Investimentos', icon: TrendingUp, keywords: 'acoes fiis renda fixa cripto' },
      { to: '/app/calendario', label: 'Calendário', icon: CalendarDays, keywords: 'vencimentos agenda' },
      { to: '/app/relatorios', label: 'Relatórios', icon: FileText, keywords: 'pdf excel csv exportar' },
    ],
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  { to: '/app/notificacoes', label: 'Notificações', icon: Bell },
  { to: '/app/perfil', label: 'Perfil', icon: User },
  { to: '/app/plano', label: 'Meu plano', icon: Crown, keywords: 'assinatura pro pagamento preco' },
  { to: '/app/ajuda', label: 'Ajuda e suporte', icon: LifeBuoy, keywords: 'suporte whatsapp contato duvidas' },
  { to: '/app/seguranca', label: 'Segurança', icon: ShieldCheck, keywords: 'dispositivos sessoes senha' },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings, keywords: 'tema moeda idioma preferencias' },
  { to: '/app/privacidade', label: 'Privacidade e dados', icon: Lock, keywords: 'lgpd exportar excluir' },
];

export const ALL_NAV = [...NAV_GROUPS.flatMap((g) => g.items), ...ACCOUNT_NAV];
