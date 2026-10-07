import type { Category, CategoryKind, Transaction } from '@/types';

/**
 * Categorização automática (inspirada em assistentes como o Pierre):
 * 1) aprende com o histórico do usuário (mesma descrição → categoria mais usada);
 * 2) senão, usa palavras-chave comuns (português, inglês e espanhol).
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
  cat_food: [
    'mercado', 'supermercado', 'ifood', 'i food', 'restaurante', 'padaria', 'lanche', 'pizza', 'hamburguer', 'acougue', 'feira', 'hortifruti', 'cafe', 'almoco', 'jantar', 'rappi', 'atacadao', 'assai', 'carrefour', 'pao de acucar', 'sorvete', 'delivery',
    // EN
    'grocery', 'groceries', 'grocery store', 'supermarket', 'restaurant', 'bakery', 'snack', 'burger', 'hamburger', 'butcher', 'coffee', 'lunch', 'dinner', 'breakfast', 'food', 'takeout', 'take out', 'ice cream', 'doordash', 'uber eats', 'grubhub', 'starbucks', 'mcdonalds', 'walmart', 'costco', 'whole foods', 'trader joes',
    // ES
    'super', 'mercadona', 'panaderia', 'carniceria', 'verduleria', 'comida', 'almuerzo', 'cena', 'desayuno', 'helado', 'hamburguesa', 'pedidosya', 'pedidos ya', 'didi food', 'oxxo', 'soriana', 'chedraui', 'jumbo', 'lider', 'exito',
  ],
  cat_transport: [
    'uber', '99', 'taxi', 'gasolina', 'combustivel', 'posto', 'etanol', 'onibus', 'metro', 'estacionamento', 'pedagio', 'ipva', 'oficina', 'mecanico', 'bilhete unico', 'passagem de onibus',
    // EN
    'lyft', 'cab', 'gas station', 'fuel', 'gasoline', 'petrol', 'bus', 'subway', 'train', 'parking', 'toll', 'car repair', 'mechanic', 'bus fare', 'transit',
    // ES
    'cabify', 'didi', 'nafta', 'combustible', 'gasolinera', 'autobus', 'colectivo', 'camion', 'subte', 'estacionamiento', 'parqueadero', 'peaje', 'taller', 'pasaje', 'tren',
  ],
  cat_home: [
    'aluguel', 'condominio', 'luz', 'energia', 'agua', 'internet', 'gas', 'iptu', 'enel', 'sabesp', 'cemig', 'copel', 'claro', 'vivo', 'tim', 'oi fibra', 'diarista', 'faxina', 'moveis',
    // EN
    'rent', 'hoa', 'electricity', 'electric bill', 'power bill', 'water bill', 'utilities', 'utility', 'property tax', 'cleaning', 'housekeeper', 'furniture', 'ikea', 'comcast', 'verizon', 'at t',
    // ES
    'alquiler', 'arriendo', 'renta', 'expensas', 'administracion', 'electricidad', 'factura de luz', 'servicios', 'limpieza', 'muebles', 'impuesto predial', 'movistar',
  ],
  cat_health: [
    'farmacia', 'drogasil', 'droga raia', 'remedio', 'academia', 'smartfit', 'medico', 'consulta', 'exame', 'plano de saude', 'dentista', 'psicologo', 'hospital', 'unimed',
    // EN
    'pharmacy', 'drugstore', 'medicine', 'gym', 'doctor', 'appointment', 'checkup', 'health insurance', 'dentist', 'therapist', 'therapy', 'cvs', 'walgreens',
    // ES
    'medicina', 'medicamento', 'gimnasio', 'gym', 'cita medica', 'examen', 'seguro medico', 'seguro de salud', 'psicologa', 'terapia', 'clinica',
  ],
  cat_education: [
    'curso', 'faculdade', 'escola', 'mensalidade escolar', 'livro', 'udemy', 'alura', 'material escolar', 'ingles', 'pos graduacao',
    // EN
    'course', 'college', 'university', 'school', 'tuition', 'book', 'books', 'school supplies', 'english class', 'coursera',
    // ES
    'universidad', 'colegio', 'escuela', 'matricula', 'colegiatura', 'libro', 'libros', 'utiles escolares', 'clases de ingles', 'posgrado',
  ],
  cat_leisure: [
    'cinema', 'bar', 'show', 'viagem', 'hotel', 'airbnb', 'passeio', 'ingresso', 'jogo', 'steam', 'playstation', 'balada', 'festa', 'teatro', 'passagem aerea', 'latam', 'gol', 'azul',
    // EN
    'movies', 'movie', 'concert', 'trip', 'travel', 'vacation', 'ticket', 'tickets', 'game', 'games', 'party', 'club', 'theater', 'flight', 'airline', 'pub',
    // ES
    'cine', 'concierto', 'viaje', 'vacaciones', 'paseo', 'entrada', 'entradas', 'juego', 'boliche', 'discoteca', 'fiesta', 'vuelo', 'boleto de avion', 'pasaje aereo',
  ],
  cat_subs: [
    'netflix', 'spotify', 'prime video', 'amazon prime', 'disney', 'youtube premium', 'adobe', 'icloud', 'assinatura', 'hbo', 'max', 'globoplay', 'deezer', 'chatgpt', 'google one', 'apple tv',
    // EN
    'subscription', 'membership', 'hulu', 'paramount',
    // ES
    'suscripcion', 'membresia',
  ],
  cat_shopping: [
    'roupa', 'shopee', 'amazon', 'mercado livre', 'magalu', 'magazine luiza', 'loja', 'presente', 'shein', 'americanas', 'renner', 'zara', 'tenis', 'eletronico', 'celular',
    // EN
    'clothes', 'clothing', 'store', 'shop', 'shopping', 'gift', 'shoes', 'sneakers', 'electronics', 'phone', 'cell phone', 'target', 'best buy', 'ebay',
    // ES
    'ropa', 'mercado libre', 'tienda', 'regalo', 'zapatos', 'zapatillas', 'electronica', 'celular', 'movil', 'liverpool', 'falabella',
  ],
  cat_salary: [
    'salario', 'holerite', 'pagamento empresa', 'adiantamento', '13o', 'decimo terceiro', 'ferias', 'plr',
    // EN
    'salary', 'paycheck', 'payroll', 'wage', 'wages', 'pay day', 'payday', 'bonus',
    // ES
    'sueldo', 'nomina', 'quincena', 'aguinaldo', 'adelanto', 'vacaciones pagadas',
  ],
  cat_freelance: [
    'freela', 'freelance', 'projeto', 'cliente', 'consultoria', 'servico prestado', 'job',
    // EN
    'freelancing', 'gig', 'project', 'client', 'consulting', 'side job', 'side hustle', 'contract work',
    // ES
    'proyecto', 'cliente', 'trabajo independiente', 'chamba', 'changa', 'honorarios',
  ],
  cat_invest_income: [
    'dividendo', 'rendimento', 'juros', 'proventos', 'jcp', 'cashback',
    // EN
    'dividend', 'dividends', 'interest', 'yield', 'returns', 'cash back',
    // ES
    'dividendos', 'rendimiento', 'rendimientos', 'intereses',
  ],
  cat_sales: [
    'venda', 'vendi', 'olx', 'enjoei',
    // EN
    'sale', 'sold', 'sales', 'marketplace',
    // ES
    'venta', 'vendido', 'ventas',
  ],
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
