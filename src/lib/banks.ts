/**
 * Instituições financeiras com logo oficial (arquivos em /public/banks, do pacote MIT "react-bancos").
 * As marcas pertencem às respectivas instituições; usadas apenas para identificar contas e cartões.
 */

export type BankKind = 'bank' | 'broker' | 'wallet' | 'crypto' | 'brand' | 'card';

export interface BankInfo {
  slug: string;
  name: string;
  compe: string | null;
  color: string;
  kind: BankKind;
  aliases: string[];
}

export const BANKS: BankInfo[] = [
  {
    "slug": "nubank",
    "name": "Nubank",
    "compe": "260",
    "color": "#820ad1",
    "kind": "bank",
    "aliases": [
      "nubank",
      "nu pagamentos",
      "nu"
    ]
  },
  {
    "slug": "itau",
    "name": "Itaú Unibanco",
    "compe": "341",
    "color": "#fe6100",
    "kind": "bank",
    "aliases": [
      "itau",
      "itau unibanco"
    ]
  },
  {
    "slug": "itaupersonnalite",
    "name": "Itaú Personnalité",
    "compe": null,
    "color": "#0c2b52",
    "kind": "bank",
    "aliases": [
      "itau personnalite",
      "personnalite"
    ]
  },
  {
    "slug": "bradesco",
    "name": "Bradesco",
    "compe": "237",
    "color": "#cf2032",
    "kind": "bank",
    "aliases": [
      "bradesco"
    ]
  },
  {
    "slug": "santander",
    "name": "Santander",
    "compe": "033",
    "color": "#fe0000",
    "kind": "bank",
    "aliases": [
      "santander"
    ]
  },
  {
    "slug": "bancodobrasil",
    "name": "Banco do Brasil",
    "compe": "001",
    "color": "#fee60e",
    "kind": "bank",
    "aliases": [
      "banco do brasil",
      "bb"
    ]
  },
  {
    "slug": "caixa",
    "name": "Caixa Econômica Federal",
    "compe": "104",
    "color": "#ececfb",
    "kind": "bank",
    "aliases": [
      "caixa",
      "caixa economica",
      "caixa economica federal",
      "cef"
    ]
  },
  {
    "slug": "inter",
    "name": "Banco Inter",
    "compe": "077",
    "color": "#ff7a00",
    "kind": "bank",
    "aliases": [
      "inter",
      "banco inter"
    ]
  },
  {
    "slug": "c6bank",
    "name": "C6 Bank",
    "compe": "336",
    "color": "#000000",
    "kind": "bank",
    "aliases": [
      "c6",
      "c6 bank"
    ]
  },
  {
    "slug": "btgpactual",
    "name": "BTG Pactual",
    "compe": "208",
    "color": "#001e61",
    "kind": "bank",
    "aliases": [
      "btg",
      "btg pactual"
    ]
  },
  {
    "slug": "xp",
    "name": "XP",
    "compe": "348",
    "color": "#000000",
    "kind": "broker",
    "aliases": [
      "xp",
      "xp investimentos",
      "xp inc"
    ]
  },
  {
    "slug": "rico",
    "name": "Rico",
    "compe": null,
    "color": "#010042",
    "kind": "broker",
    "aliases": [
      "rico"
    ]
  },
  {
    "slug": "picpay",
    "name": "PicPay",
    "compe": "380",
    "color": "#11c76f",
    "kind": "wallet",
    "aliases": [
      "picpay"
    ]
  },
  {
    "slug": "mercadopago",
    "name": "Mercado Pago",
    "compe": "323",
    "color": "#00bcff",
    "kind": "wallet",
    "aliases": [
      "mercado pago"
    ]
  },
  {
    "slug": "pagbank",
    "name": "PagBank",
    "compe": "290",
    "color": "#1bb99a",
    "kind": "wallet",
    "aliases": [
      "pagbank",
      "pagseguro"
    ]
  },
  {
    "slug": "neon",
    "name": "Neon",
    "compe": "735",
    "color": "#00a8ef",
    "kind": "bank",
    "aliases": [
      "neon"
    ]
  },
  {
    "slug": "next",
    "name": "Next",
    "compe": null,
    "color": "#1e3c3c",
    "kind": "bank",
    "aliases": [
      "next"
    ]
  },
  {
    "slug": "original",
    "name": "Banco Original",
    "compe": "212",
    "color": "#18ad47",
    "kind": "bank",
    "aliases": [
      "original",
      "banco original"
    ]
  },
  {
    "slug": "safra",
    "name": "Banco Safra",
    "compe": "422",
    "color": "#00003c",
    "kind": "bank",
    "aliases": [
      "safra"
    ]
  },
  {
    "slug": "sicoob",
    "name": "Sicoob",
    "compe": "756",
    "color": "#003641",
    "kind": "bank",
    "aliases": [
      "sicoob"
    ]
  },
  {
    "slug": "sicredi",
    "name": "Sicredi",
    "compe": "748",
    "color": "#3fa110",
    "kind": "bank",
    "aliases": [
      "sicredi"
    ]
  },
  {
    "slug": "banrisul",
    "name": "Banrisul",
    "compe": "041",
    "color": "#010050",
    "kind": "bank",
    "aliases": [
      "banrisul"
    ]
  },
  {
    "slug": "bv",
    "name": "Banco BV",
    "compe": "655",
    "color": "#5776d0",
    "kind": "bank",
    "aliases": [
      "bv",
      "banco bv",
      "banco votorantim"
    ]
  },
  {
    "slug": "pan",
    "name": "Banco Pan",
    "compe": "623",
    "color": "#363636",
    "kind": "bank",
    "aliases": [
      "pan",
      "banco pan"
    ]
  },
  {
    "slug": "agibank",
    "name": "Agibank",
    "compe": "121",
    "color": "#266bff",
    "kind": "bank",
    "aliases": [
      "agibank"
    ]
  },
  {
    "slug": "willbank",
    "name": "Will Bank",
    "compe": null,
    "color": "#ffd900",
    "kind": "bank",
    "aliases": [
      "will bank",
      "willbank"
    ]
  },
  {
    "slug": "digio",
    "name": "Digio",
    "compe": "335",
    "color": "#23292e",
    "kind": "bank",
    "aliases": [
      "digio"
    ]
  },
  {
    "slug": "nomad",
    "name": "Nomad",
    "compe": null,
    "color": "#ffce04",
    "kind": "bank",
    "aliases": [
      "nomad"
    ]
  },
  {
    "slug": "wise",
    "name": "Wise",
    "compe": null,
    "color": "#9fe870",
    "kind": "bank",
    "aliases": [
      "wise"
    ]
  },
  {
    "slug": "revolut",
    "name": "Revolut",
    "compe": null,
    "color": "#000000",
    "kind": "bank",
    "aliases": [
      "revolut"
    ]
  },
  {
    "slug": "n26",
    "name": "N26",
    "compe": null,
    "color": "#ffffff",
    "kind": "bank",
    "aliases": [
      "n26"
    ]
  },
  {
    "slug": "avenue",
    "name": "Avenue",
    "compe": null,
    "color": "#002820",
    "kind": "broker",
    "aliases": [
      "avenue"
    ]
  },
  {
    "slug": "toro",
    "name": "Toro Investimentos",
    "compe": "352",
    "color": "#000000",
    "kind": "broker",
    "aliases": [
      "toro",
      "toro investimentos"
    ]
  },
  {
    "slug": "warren",
    "name": "Warren Investimentos",
    "compe": "371",
    "color": "#e24324",
    "kind": "broker",
    "aliases": [
      "warren"
    ]
  },
  {
    "slug": "mercadobitcoin",
    "name": "Mercado Bitcoin",
    "compe": null,
    "color": "#ffffff",
    "kind": "crypto",
    "aliases": [
      "mercado bitcoin"
    ]
  },
  {
    "slug": "binance",
    "name": "Binance",
    "compe": null,
    "color": "#ffffff",
    "kind": "crypto",
    "aliases": [
      "binance"
    ]
  },
  {
    "slug": "infinitepay",
    "name": "InfinitePay",
    "compe": null,
    "color": "#171527",
    "kind": "wallet",
    "aliases": [
      "infinitepay",
      "infinite pay"
    ]
  },
  {
    "slug": "stone",
    "name": "Stone",
    "compe": "197",
    "color": "#0db14b",
    "kind": "bank",
    "aliases": [
      "stone"
    ]
  },
  {
    "slug": "ton",
    "name": "Ton",
    "compe": null,
    "color": "#0dea4a",
    "kind": "wallet",
    "aliases": [
      "ton"
    ]
  },
  {
    "slug": "cora",
    "name": "Cora",
    "compe": "403",
    "color": "#fe3e6d",
    "kind": "bank",
    "aliases": [
      "cora"
    ]
  },
  {
    "slug": "recargapay",
    "name": "RecargaPay",
    "compe": null,
    "color": "#053e6e",
    "kind": "wallet",
    "aliases": [
      "recargapay"
    ]
  },
  {
    "slug": "99pay",
    "name": "99Pay",
    "compe": null,
    "color": "#fedf00",
    "kind": "wallet",
    "aliases": [
      "99pay",
      "99 pay"
    ]
  },
  {
    "slug": "bmg",
    "name": "Banco BMG",
    "compe": "318",
    "color": "#f26321",
    "kind": "bank",
    "aliases": [
      "bmg",
      "banco bmg"
    ]
  },
  {
    "slug": "daycoval",
    "name": "Banco Daycoval",
    "compe": "707",
    "color": "#001c55",
    "kind": "bank",
    "aliases": [
      "daycoval"
    ]
  },
  {
    "slug": "brb",
    "name": "BRB — Banco de Brasília",
    "compe": "070",
    "color": "#173e7d",
    "kind": "bank",
    "aliases": [
      "brb"
    ]
  },
  {
    "slug": "banese",
    "name": "Banese",
    "compe": "047",
    "color": "#00622a",
    "kind": "bank",
    "aliases": [
      "banese"
    ]
  },
  {
    "slug": "ailos",
    "name": "Ailos",
    "compe": "085",
    "color": "#ffffff",
    "kind": "bank",
    "aliases": [
      "ailos"
    ]
  },
  {
    "slug": "cresol",
    "name": "Cresol",
    "compe": "133",
    "color": "#ef8124",
    "kind": "bank",
    "aliases": [
      "cresol"
    ]
  },
  {
    "slug": "unicred",
    "name": "Unicred",
    "compe": "136",
    "color": "#004a35",
    "kind": "bank",
    "aliases": [
      "unicred"
    ]
  },
  {
    "slug": "iugu",
    "name": "iugu",
    "compe": "401",
    "color": "#1b1b1b",
    "kind": "wallet",
    "aliases": [
      "iugu"
    ]
  },
  {
    "slug": "visa",
    "name": "Visa",
    "compe": null,
    "color": "#ffffff",
    "kind": "brand",
    "aliases": [
      "visa"
    ]
  },
  {
    "slug": "mastercard",
    "name": "Mastercard",
    "compe": null,
    "color": "#ffffff",
    "kind": "brand",
    "aliases": [
      "mastercard"
    ]
  },
  {
    "slug": "amex",
    "name": "American Express",
    "compe": null,
    "color": "#006fcf",
    "kind": "brand",
    "aliases": [
      "amex",
      "american express"
    ]
  },
  {
    "slug": "hipercard",
    "name": "Hipercard",
    "compe": null,
    "color": "#ffffff",
    "kind": "brand",
    "aliases": [
      "hipercard"
    ]
  },
  {
    "slug": "dinersclub",
    "name": "Diners Club",
    "compe": null,
    "color": "#ffffff",
    "kind": "brand",
    "aliases": [
      "diners",
      "diners club"
    ]
  },
  {
    "slug": "nubankultravioleta",
    "name": "Nubank Ultravioleta",
    "compe": null,
    "color": "#2b0a4d",
    "kind": "card",
    "aliases": [
      "ultravioleta"
    ]
  }
];

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const BY_SLUG = new Map(BANKS.map((b) => [b.slug, b]));

export const bankBySlug = (slug?: string | null) => (slug ? BY_SLUG.get(slug) : undefined);

/** Instituições (sem bandeiras/cartões) para seletores, as mais populares primeiro. */
export const SELECTABLE_BANKS = BANKS.filter((b) => b.kind !== 'brand' && b.kind !== 'card');

/** Reconhece o banco a partir de textos livres (instituição, nome da conta ou do cartão). */
export function findBank(...texts: (string | undefined | null)[]): BankInfo | undefined {
  // Variante premium tem prioridade (ex.: "Itaú Personnalité" antes de "Itaú").
  const candidates = [...BANKS].filter((b) => b.kind !== 'brand').sort((a, b) => Math.max(...b.aliases.map((x) => x.length)) - Math.max(...a.aliases.map((x) => x.length)));
  for (const t of texts) {
    if (!t) continue;
    const n = ` ${norm(t)} `;
    for (const b of candidates) if (b.aliases.some((a) => n.includes(` ${a} `))) return b;
  }
  return undefined;
}

export const bankLogoUrl = (slug: string) => `${import.meta.env.BASE_URL}banks/${slug}.svg`;
