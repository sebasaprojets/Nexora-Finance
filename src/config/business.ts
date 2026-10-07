/**
 * Dados do negócio exibidos no app (rodapé, termos, suporte).
 * Preencha pelas variáveis do GitHub (Settings → Secrets and variables → Actions → Variables)
 * ou no `.env.local` — sem precisar mexer no código. Ver docs/LANCAMENTO.md.
 */
const env = import.meta.env;

export const BUSINESS = {
  brand: 'Nexora Finance',
  /** Razão social ou nome do MEI (ex.: "Fulano de Tal 12345678000190"). */
  legalName: (env.VITE_COMPANY_NAME as string | undefined) ?? '',
  cnpj: (env.VITE_COMPANY_CNPJ as string | undefined) ?? '',
  city: (env.VITE_COMPANY_CITY as string | undefined) ?? '',
  supportEmail: (env.VITE_SUPPORT_EMAIL as string | undefined) ?? '',
  /** Só números, com DDI e DDD (ex.: 5511999998888). */
  whatsapp: ((env.VITE_SUPPORT_WHATSAPP as string | undefined) ?? '').replace(/\D/g, ''),
};

export const whatsappLink = (text = 'Olá! Preciso de ajuda com a Nexora.') =>
  BUSINESS.whatsapp ? `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}` : null;

export const hasSupport = () => !!(BUSINESS.supportEmail || BUSINESS.whatsapp);
