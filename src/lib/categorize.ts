import type { Category, CategoryKind, Transaction } from '@/types';

/**
 * Categorização automática (inspirada em assistentes como o Pierre):
 * 1) aprende com o histórico do usuário (mesma descrição → categoria mais usada);
 * 2) senão, usa palavras-chave comuns no Brasil.
 */

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const KEYWORDS: Record<string, string[]> = {
  cat_food: ['mercado', 'supermercado', 'ifood', 'i food', 'restaurante', 'padaria', 'lanche', 'pizza', 'hamburguer', 'acougue', 'feira', 'hortifruti', 'cafe', 'almoco', 'jantar', 'rappi', 'atacadao', 'assai', 'carrefour', 'pao de acucar', 'sorvete', 'delivery'],
  cat_transport: ['uber', '99', 'taxi', 'gasolina', 'combustivel', 'posto', 'etanol', 'onibus', 'metro', 'estacionamento', 'pedagio', 'ipva', 'oficina', 'mecanico', 'bilhete unico', 'passagem de onibus'],
  cat_home: ['aluguel', 'condominio', 'luz', 'energia', 'agua', 'internet', 'gas', 'iptu', 'enel', 'sabesp', 'cemig', 'copel', 'claro', 'vivo', 'tim', 'oi fibra', 'diarista', 'faxina', 'moveis'],
  cat_health: ['farmacia', 'drogasil', 'droga raia', 'remedio', 'academia', 'smartfit', 'medico', 'consulta', 'exame', 'plano de saude', 'dentista', 'psicologo', 'hospital', 'unimed'],
  cat_education: ['curso', 'faculdade', 'escola', 'mensalidade escolar', 'livro', 'udemy', 'alura', 'material escolar', 'ingles', 'pos graduacao'],
  cat_leisure: ['cinema', 'bar', 'show', 'viagem', 'hotel', 'airbnb', 'passeio', 'ingresso', 'jogo', 'steam', 'playstation', 'balada', 'festa', 'teatro', 'passagem aerea', 'latam', 'gol', 'azul'],
  cat_subs: ['netflix', 'spotify', 'prime video', 'amazon prime', 'disney', 'youtube premium', 'adobe', 'icloud', 'assinatura', 'hbo', 'max', 'globoplay', 'deezer', 'chatgpt', 'google one', 'apple tv'],
  cat_shopping: ['roupa', 'shopee', 'amazon', 'mercado livre', 'magalu', 'magazine luiza', 'loja', 'presente', 'shein', 'americanas', 'renner', 'zara', 'tenis', 'eletronico', 'celular'],
  cat_salary: ['salario', 'holerite', 'pagamento empresa', 'adiantamento', '13o', 'decimo terceiro', 'ferias', 'plr'],
  cat_freelance: ['freela', 'freelance', 'projeto', 'cliente', 'consultoria', 'servico prestado', 'job'],
  cat_invest_income: ['dividendo', 'rendimento', 'juros', 'proventos', 'jcp', 'cashback'],
  cat_sales: ['venda', 'vendi', 'olx', 'enjoei'],
};

export function suggestCategory(
  description: string,
  kind: CategoryKind,
  categories: Category[],
  history: Transaction[] = [],
): Category | undefined {
  const d = norm(description);
  if (d.length < 2) return undefined;
  const valid = new Map(categories.filter((c) => c.kind === kind).map((c) => [c.id, c]));

  // 1) Histórico: descrições iguais (ou que começam igual) → categoria mais frequente.
  const counts = new Map<string, number>();
  for (const t of history) {
    if (t.type !== kind || !t.categoryId || !valid.has(t.categoryId)) continue;
    const td = norm(t.description);
    if (td === d || (d.length >= 4 && (td.startsWith(d) || d.startsWith(td)))) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }
  const learned = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (learned) return valid.get(learned[0]);

  // 2) Palavras-chave (prioriza a mais longa que aparece na descrição).
  let best: { id: string; len: number } | null = null;
  const padded = ` ${d} `;
  for (const [id, words] of Object.entries(KEYWORDS)) {
    if (!valid.has(id)) continue;
    for (const w of words) if (padded.includes(` ${w} `) || (w.length >= 5 && d.includes(w))) if (!best || w.length > best.len) best = { id, len: w.length };
  }
  if (best) return valid.get(best.id);

  // 3) Categorias personalizadas cujo nome aparece na descrição.
  for (const c of valid.values()) if (padded.includes(` ${norm(c.name)} `)) return c;
  return undefined;
}
