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
      { to: '/app', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'G', keywords: 'inicio home painel overview panel' },
      { to: '/app/analises', label: 'Análises', icon: BarChart3, keywords: 'graficos dre lucros perdas fluxo caixa analytics charts profit loss cash flow income statement graficos ganancias perdidas flujo estado de resultados' },
      { to: '/app/saude', label: 'Saúde financeira', icon: Gauge, keywords: 'score pontuacao health salud puntuacion' },
      { to: '/app/assistente', label: 'Nexora AI', icon: Bot, keywords: 'assistente ia chat assistant ai asistente' },
    ],
  },
  {
    label: 'Dinheiro',
    items: [
      { to: '/app/transacoes', label: 'Transações', icon: ArrowLeftRight, shortcut: 'T', keywords: 'lancamentos receitas despesas transactions income expenses transacciones ingresos gastos' },
      { to: '/app/contas', label: 'Contas', icon: Landmark, keywords: 'bancos saldo accounts banks balance cuentas' },
      { to: '/app/cartoes', label: 'Cartões', icon: CreditCard, keywords: 'fatura credito cards bill credit tarjetas resumen' },
      { to: '/app/categorias', label: 'Categorias', icon: Shapes, keywords: 'categories categorias' },
      { to: '/app/assinaturas', label: 'Assinaturas', icon: Repeat, keywords: 'netflix spotify recorrente subscriptions recurring suscripciones recurrente' },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { to: '/app/orcamentos', label: 'Orçamentos', icon: Wallet, keywords: 'limite budget limit presupuesto' },
      { to: '/app/metas', label: 'Metas', icon: Target, keywords: 'objetivos goals metas' },
      { to: '/app/dividas', label: 'Dívidas', icon: HandCoins, keywords: 'emprestimo financiamento debts loan financing deudas prestamo' },
      { to: '/app/investimentos', label: 'Investimentos', icon: TrendingUp, keywords: 'acoes fiis renda fixa cripto investments stocks fixed income crypto inversiones acciones' },
      { to: '/app/calendario', label: 'Calendário', icon: CalendarDays, keywords: 'vencimentos agenda calendar due dates calendario vencimientos' },
      { to: '/app/relatorios', label: 'Relatórios', icon: FileText, keywords: 'pdf excel csv exportar reports export informes' },
    ],
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  { to: '/app/notificacoes', label: 'Notificações', icon: Bell, keywords: 'alertas notifications alerts notificaciones' },
  { to: '/app/perfil', label: 'Perfil', icon: User, keywords: 'profile account perfil' },
  { to: '/app/plano', label: 'Meu plano', icon: Crown, keywords: 'assinatura pro pagamento preco plan billing payment price suscripcion pago precio' },
  { to: '/app/ajuda', label: 'Ajuda e suporte', icon: LifeBuoy, keywords: 'suporte whatsapp contato duvidas help support contact ayuda soporte contacto' },
  { to: '/app/seguranca', label: 'Segurança', icon: ShieldCheck, keywords: 'dispositivos sessoes senha security devices sessions password seguridad sesiones contrasena' },
  { to: '/app/configuracoes', label: 'Configurações', icon: Settings, keywords: 'tema moeda idioma preferencias settings theme currency language configuracion moneda' },
  { to: '/app/privacidade', label: 'Privacidade e dados', icon: Lock, keywords: 'lgpd exportar excluir privacy data export delete privacidad datos eliminar' },
];

export const ALL_NAV = [...NAV_GROUPS.flatMap((g) => g.items), ...ACCOUNT_NAV];
