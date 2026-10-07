import type { Category } from '@/types';

/** Categorias padrão criadas para todo novo usuário (editáveis). */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_food', name: 'Alimentação', icon: 'utensils', color: '#eb6834', kind: 'expense', nature: 'variable', monthlyLimit: 1300, system: true },
  { id: 'cat_home', name: 'Moradia', icon: 'house', color: '#2a78d6', kind: 'expense', nature: 'fixed', monthlyLimit: 2800, system: true },
  { id: 'cat_transport', name: 'Transporte', icon: 'car', color: '#eda100', kind: 'expense', nature: 'variable', monthlyLimit: 600, system: true },
  { id: 'cat_health', name: 'Saúde', icon: 'heart-pulse', color: '#e34948', kind: 'expense', nature: 'fixed', system: true },
  { id: 'cat_education', name: 'Educação', icon: 'graduation-cap', color: '#4a3aa7', kind: 'expense', nature: 'fixed', system: true },
  { id: 'cat_leisure', name: 'Lazer', icon: 'party-popper', color: '#e87ba4', kind: 'expense', nature: 'variable', monthlyLimit: 400, system: true },
  { id: 'cat_subs', name: 'Assinaturas', icon: 'repeat', color: '#1baf7a', kind: 'expense', nature: 'fixed', system: true },
  { id: 'cat_shopping', name: 'Compras', icon: 'shopping-bag', color: '#008300', kind: 'expense', nature: 'variable', monthlyLimit: 500, system: true },
  { id: 'cat_other_exp', name: 'Outros', icon: 'ellipsis', color: '#898781', kind: 'expense', nature: 'variable', system: true },
  { id: 'cat_salary', name: 'Salário', icon: 'briefcase', color: '#1baf7a', kind: 'income', system: true },
  { id: 'cat_freelance', name: 'Freelance', icon: 'laptop', color: '#2a78d6', kind: 'income', system: true },
  { id: 'cat_invest_income', name: 'Investimentos', icon: 'trending-up', color: '#4a3aa7', kind: 'income', system: true },
  { id: 'cat_sales', name: 'Vendas', icon: 'store', color: '#eda100', kind: 'income', system: true },
  { id: 'cat_other_inc', name: 'Outros', icon: 'plus-circle', color: '#898781', kind: 'income', system: true },
];
