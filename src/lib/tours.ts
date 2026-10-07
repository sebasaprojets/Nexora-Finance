/**
 * Tutoriais guiados das telas principais.
 * Cada passo aponta para um elemento marcado com `data-tour="<target>"`.
 * Sem `target` (ou se o elemento não estiver visível), o passo aparece centralizado.
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
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    steps: [
      { title: 'Bem-vindo à Nexora 👋', body: 'Este é o seu painel: em poucos segundos você vê quanto tem, quanto ganhou, quanto gastou e quanto está economizando. Vamos fazer um tour rápido.' },
      { target: 'kpis', title: 'Seus números principais', body: 'Saldo, entradas, saídas, economia, investimentos e patrimônio. Cada card mostra a variação em relação ao período anterior e um mini gráfico. Toque ou passe o mouse no “i” para entender o cálculo.' },
      { target: 'period', title: 'Escolha o período', body: 'Troque entre 7 dias, 30 dias, 3 meses, 6 meses, 1 ano ou um intervalo personalizado. Todos os números e gráficos se atualizam.' },
      { target: 'flow-chart', title: 'Fluxo financeiro', body: 'Compare receitas e despesas ao longo do tempo. A linha tracejada é o resultado (o que sobrou). Toque ou passe o mouse sobre o gráfico para ver os valores.' },
      { target: 'add-transaction', title: 'Lançar uma transação', body: 'Use este botão para registrar uma receita, despesa ou transferência em poucos segundos. Atalhos: N (nova), R (receita) e D (despesa).' },
      { target: 'quick-actions', title: 'Ações rápidas', body: 'Atalhos para as tarefas mais comuns, incluindo pagar faturas de cartão.' },
      { target: 'insights', title: 'Nexora Insights', body: 'Dicas automáticas geradas a partir dos seus dados — sempre com números reais, nunca estimativas inventadas.' },
      { target: 'search', title: 'Busca e comandos', body: 'Pressione Ctrl + K (ou ⌘ + K) para buscar transações e navegar por toda a plataforma.' },
      { target: 'hide-values', title: 'Privacidade na tela', body: 'Está em um lugar público? Toque no olho para ocultar todos os valores.' },
    ],
  },
  transactions: {
    id: 'transactions',
    title: 'Transações',
    steps: [
      { title: 'Suas transações', body: 'Aqui ficam todas as receitas, despesas e transferências. Vamos ver como encontrar e organizar seus lançamentos.' },
      { target: 'tx-search', title: 'Busque qualquer coisa', body: 'Procure por descrição, categoria, tag ou observação. A lista filtra enquanto você digita.' },
      { target: 'tx-filters', title: 'Filtros', body: 'Filtre por tipo, período, categoria, conta, método de pagamento e status. Use “Limpar filtros” para voltar à lista completa.' },
      { target: 'tx-summary', title: 'Totais filtrados', body: 'Receitas, despesas e resultado sempre de acordo com os filtros aplicados.' },
      { target: 'tx-list', title: 'Editar, duplicar e excluir', body: 'Clique em uma transação para editar. No menu “⋯” você duplica ou exclui. No computador, marque várias para ações em lote e clique nos títulos das colunas para ordenar.' },
      { target: 'export', title: 'Exportar', body: 'Baixe a lista filtrada em CSV, Excel ou PDF.' },
    ],
  },
  analytics: {
    id: 'analytics',
    title: 'Análises',
    steps: [
      { title: 'Análises financeiras', body: 'Gráficos, tabelas e indicadores calculados com seus dados reais. Cada gráfico responde a uma pergunta sobre o seu dinheiro.' },
      { target: 'analytics-tabs', title: 'Escolha a análise', body: 'Visão geral (com DRE e lucros e perdas), Gastos (para onde vai o dinheiro e heatmap), Receitas, Fluxo de caixa e Comparar períodos.' },
      { target: 'period', title: 'Período e comparação', body: 'Os valores são comparados automaticamente com o período anterior de mesma duração.' },
      { target: 'dre', title: 'Demonstrativo de Resultados', body: 'A DRE mostra receita, custos (gastos fixos), despesas (variáveis) e lucro. Ordene as colunas, filtre linhas, compare com o ano anterior e exporte.' },
    ],
  },
  cards: {
    id: 'cards',
    title: 'Cartões',
    steps: [
      { title: 'Cartões e faturas', body: 'Acompanhe limites, faturas e vencimentos de todos os seus cartões de crédito.' },
      { target: 'cards-list', title: 'Seus cartões', body: 'Toque em um cartão para ver os detalhes. A barra mostra quanto do limite já foi usado.' },
      { target: 'card-actions', title: 'Compras e pagamentos', body: 'Registre uma compra (à vista ou parcelada) e pague a fatura escolhendo a conta de débito. Pagamentos parciais também são aceitos.' },
      { target: 'invoice', title: 'Fatura atual, anterior e próxima', body: 'Veja as compras de cada fatura e o status: 🟢 Paga, 🟡 Aberta, 🔵 Fechada, 🔴 Atrasada.' },
    ],
  },
  budgets: {
    id: 'budgets',
    title: 'Orçamentos',
    steps: [
      { title: 'Orçamentos por categoria', body: 'Defina quanto quer gastar por mês em cada categoria e acompanhe em tempo real.' },
      { target: 'budget-new', title: 'Crie um limite', body: 'Escolha a categoria e o valor. Você recebe alertas ao chegar a 70%, 90% e 100% do limite.' },
      { target: 'budget-list', title: 'Acompanhe o uso', body: 'A cor da barra indica a situação e, no mês atual, a Nexora projeta quanto você vai gastar no ritmo atual.' },
    ],
  },
  goals: {
    id: 'goals',
    title: 'Metas',
    steps: [
      { title: 'Metas financeiras', body: 'Transforme objetivos em números: quanto falta, quanto guardar por mês e quando você chega lá.' },
      { target: 'goal-new', title: 'Nova meta', body: 'Informe o valor, o prazo e quanto já tem guardado.' },
      { target: 'goal-list', title: 'Guarde dinheiro', body: 'Use “Guardar” para registrar aportes (ou resgates). A projeção usa a média dos seus aportes recentes.' },
    ],
  },
  assistant: {
    id: 'assistant',
    title: 'Nexora AI',
    steps: [
      { title: 'Nexora AI', body: 'Seu assistente financeiro. Ele responde usando somente os seus dados e avisa quando não há informação suficiente.' },
      { target: 'ai-input', title: 'Faça uma pergunta', body: 'Ex.: “Quanto gastei com alimentação este mês?”, “Quanto posso gastar hoje?” ou “Quando vence minha fatura?”.' },
    ],
  },
};
