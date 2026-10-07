/**
 * Tutoriais guiados.
 * Cada passo aponta para um elemento marcado com `data-tour="<target>"`.
 * Sem `target` (ou se o elemento não estiver visível), o passo aparece centralizado.
 *
 * As telas escolhem a versão do tutorial conforme o estado do usuário:
 * quem ainda não cadastrou nada vê o roteiro "como começar" (`*-empty` / `welcome`);
 * quem já tem dados vê o roteiro que explica os números e gráficos.
 */

export interface TourStep {
  target?: string;
  title: string;
  body: string;
}

export interface Tour {
  id: string;
  title: string;
  steps: TourStep[];
}

export const TOURS: Record<string, Tour> = {
  // ---------------------------------------------------------------------------
  // Primeiro acesso (sem dados)
  // ---------------------------------------------------------------------------
  welcome: {
    id: 'welcome',
    title: 'Primeiros passos',
    steps: [
      {
        title: 'Bem-vindo à Nexora 👋',
        body: 'Em poucos minutos você vai ter uma visão completa do seu dinheiro. Vamos te mostrar por onde começar — leva menos de 1 minuto.',
      },
      {
        target: 'getting-started',
        title: 'Seu roteiro de início',
        body: 'Siga esta lista na ordem: 1) crie sua conta (banco ou carteira), 2) registre sua renda, 3) registre suas despesas. Depois, se quiser, adicione cartões, um orçamento e uma meta. Cada item é marcado sozinho quando você concluir.',
      },
      {
        target: 'gs-account',
        title: '1. Comece pelas contas',
        body: 'Cadastre onde seu dinheiro está: conta corrente, conta digital, poupança ou dinheiro em espécie, com o saldo atual. É a base para calcular seu saldo total.',
      },
      {
        target: 'gs-income',
        title: '2. Registre sua renda',
        body: 'Lance seu salário e outras entradas (freelas, vendas). Marque “Mensal” em Mais detalhes para receitas que se repetem — elas aparecem no calendário.',
      },
      {
        target: 'add-transaction',
        title: 'Lançar em segundos',
        body: 'Este é o botão que você vai usar no dia a dia: toque nele para registrar uma receita, despesa ou transferência. No computador, os atalhos N, R e D também funcionam.',
      },
      {
        target: 'nav',
        title: 'Navegue pela plataforma',
        body: 'Aqui ficam Transações, Análises, Cartões, Metas, Orçamentos e o seu Perfil. Tudo se atualiza automaticamente com o que você registrar.',
      },
      {
        target: 'help',
        title: 'Ajuda quando precisar',
        body: 'Toque em “Como usar” (o ícone de chapéu) em qualquer tela para ver o tutorial dela de novo. Pronto — comece pelo item 1 da lista!',
      },
    ],
  },
  'transactions-empty': {
    id: 'transactions-empty',
    title: 'Transações',
    steps: [
      { title: 'Aqui ficam suas movimentações', body: 'Toda receita, despesa e transferência que você registrar aparece nesta lista, com busca, filtros e exportação.' },
      { target: 'tx-empty', title: 'Registre a primeira', body: 'Comece pela sua renda (salário) e depois pelas despesas do dia a dia. Quanto mais completo, mais precisos ficam os gráficos e alertas.' },
      { target: 'add-transaction', title: 'Atalho rápido', body: 'Use este botão a qualquer momento para lançar algo novo.' },
    ],
  },
  'cards-empty': {
    id: 'cards-empty',
    title: 'Cartões',
    steps: [
      { title: 'Cartões de crédito', body: 'Cadastre seus cartões para acompanhar limite, faturas e vencimentos — a Nexora te avisa antes da fatura vencer.' },
      { target: 'card-new', title: 'Adicione um cartão', body: 'Informe banco, bandeira, os 4 últimos dígitos, limite e os dias de fechamento e vencimento. Nunca pedimos o número completo nem o CVV.' },
    ],
  },
  'budgets-empty': {
    id: 'budgets-empty',
    title: 'Orçamentos',
    steps: [
      { title: 'Controle por categoria', body: 'Defina quanto quer gastar por mês em cada categoria — por exemplo, R$ 800 em Alimentação.' },
      { target: 'budget-new', title: 'Crie seu primeiro orçamento', body: 'Escolha a categoria e o limite. Você recebe alertas ao chegar a 70%, 90% e 100%.' },
    ],
  },
  'goals-empty': {
    id: 'goals-empty',
    title: 'Metas',
    steps: [
      { title: 'Transforme planos em números', body: 'Viagem, carro, reserva de emergência… crie uma meta e a Nexora calcula quanto guardar por mês e quando você chega lá.' },
      { target: 'goal-new', title: 'Crie sua primeira meta', body: 'Informe o valor, o prazo e quanto você já tem guardado.' },
    ],
  },

  // ---------------------------------------------------------------------------
  // Com dados
  // ---------------------------------------------------------------------------
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    steps: [
      { title: 'Seu painel está pronto 🎉', body: 'Com seus lançamentos, o dashboard mostra em segundos quanto você tem, quanto entrou, quanto saiu e quanto está economizando. Vamos conhecer cada parte.' },
      { target: 'kpis', title: 'Seus números principais', body: 'Saldo, entradas, saídas, economia, investimentos e patrimônio. Cada card compara com o período anterior e tem um mini gráfico. Toque ou passe o mouse no “i” para entender o cálculo.' },
      { target: 'period', title: 'Escolha o período', body: 'Troque entre 7 dias, 30 dias, 3 meses, 6 meses, 1 ano ou datas personalizadas. Todos os números e gráficos se atualizam.' },
      { target: 'flow-chart', title: 'Fluxo financeiro', body: 'Receitas (verde) e despesas (laranja) ao longo do tempo. A linha tracejada é o resultado — o que sobrou. Toque no gráfico para ver os valores de cada dia ou semana.' },
      { target: 'quick-actions', title: 'Ações rápidas', body: 'Atalhos para lançar receitas, despesas, transferências e pagar faturas.' },
      { target: 'insights', title: 'Nexora Insights', body: 'Dicas geradas a partir dos seus números reais — por exemplo, quanto você gastou a mais ou a menos que no período anterior.' },
      { target: 'search', title: 'Busca e comandos', body: 'Pressione Ctrl + K (ou ⌘ + K) para buscar transações e ir para qualquer tela.' },
      { target: 'hide-values', title: 'Privacidade na tela', body: 'Em um lugar público? Toque no olho para ocultar todos os valores.' },
    ],
  },
  transactions: {
    id: 'transactions',
    title: 'Transações',
    steps: [
      { title: 'Suas transações', body: 'Aqui ficam todas as receitas, despesas e transferências. Vamos ver como encontrar e organizar seus lançamentos.' },
      { target: 'tx-search', title: 'Busque qualquer coisa', body: 'Procure por descrição, categoria, tag ou observação. A lista filtra enquanto você digita.' },
      { target: 'tx-filters', title: 'Filtros', body: 'Filtre por tipo e, em “Filtros”, por período, categoria, conta, método de pagamento e status.' },
      { target: 'tx-summary', title: 'Totais filtrados', body: 'Receitas, despesas e resultado sempre de acordo com os filtros aplicados.' },
      { target: 'tx-list', title: 'Editar, duplicar e excluir', body: 'Toque em uma transação para editar. No menu “⋯” você duplica ou exclui. No computador, marque várias para ações em lote e clique nos títulos das colunas para ordenar.' },
      { target: 'export', title: 'Exportar', body: 'Baixe a lista filtrada em CSV, Excel ou PDF.' },
    ],
  },
  analytics: {
    id: 'analytics',
    title: 'Análises',
    steps: [
      { title: 'Análises financeiras', body: 'Gráficos, tabelas e indicadores calculados com seus dados. Cada gráfico responde a uma pergunta sobre o seu dinheiro.' },
      { target: 'analytics-tabs', title: 'Escolha a análise', body: 'Visão geral (DRE, lucros e perdas), Gastos (para onde vai o dinheiro e calendário de gastos), Receitas, Fluxo de caixa e Comparar períodos.' },
      { target: 'period', title: 'Período e comparação', body: 'Os valores são comparados automaticamente com o período anterior de mesma duração.' },
      { target: 'dre', title: 'Demonstrativo de Resultados', body: 'Mostra receita, custos (gastos fixos), despesas (variáveis) e lucro. Ordene as colunas, filtre linhas, compare com o ano anterior e exporte.' },
    ],
  },
  cards: {
    id: 'cards',
    title: 'Cartões',
    steps: [
      { title: 'Cartões e faturas', body: 'Acompanhe limites, faturas e vencimentos de todos os seus cartões.' },
      { target: 'cards-list', title: 'Seus cartões', body: 'Toque em um cartão para ver os detalhes. A barra mostra quanto do limite já foi usado.' },
      { target: 'card-actions', title: 'Compras e pagamentos', body: 'Registre uma compra (à vista ou parcelada) e pague a fatura escolhendo a conta de débito. Pagamentos parciais também são aceitos.' },
      { target: 'invoice', title: 'Fatura atual, anterior e próxima', body: 'Veja as compras de cada fatura e o status: 🟢 Paga, 🟡 Aberta, 🔵 Fechada, 🔴 Atrasada.' },
    ],
  },
  budgets: {
    id: 'budgets',
    title: 'Orçamentos',
    steps: [
      { title: 'Seus orçamentos', body: 'Acompanhe em tempo real quanto já gastou de cada limite neste mês.' },
      { target: 'budget-list', title: 'Acompanhe o uso', body: 'A cor da barra indica a situação (verde, amarelo, laranja, vermelho) e, no mês atual, a Nexora projeta quanto você vai gastar no ritmo atual.' },
      { target: 'budget-new', title: 'Novos limites', body: 'Crie orçamentos para outras categorias quando quiser.' },
    ],
  },
  goals: {
    id: 'goals',
    title: 'Metas',
    steps: [
      { title: 'Suas metas', body: 'Veja quanto falta, quanto guardar por mês e quando você chega lá.' },
      { target: 'goal-list', title: 'Guarde dinheiro', body: 'Use “Guardar” para registrar aportes (ou resgates). A projeção usa a média dos seus aportes recentes.' },
      { target: 'goal-new', title: 'Nova meta', body: 'Crie quantas metas quiser.' },
    ],
  },
  assistant: {
    id: 'assistant',
    title: 'Nexora AI',
    steps: [
      { title: 'Nexora AI', body: 'Seu assistente financeiro. Ele responde usando somente os seus dados e avisa quando ainda não há informação suficiente.' },
      { target: 'ai-input', title: 'Faça uma pergunta', body: 'Ex.: “Quanto gastei com alimentação este mês?”, “Quanto posso gastar hoje?” ou “Quando vence minha fatura?”.' },
    ],
  },
};
