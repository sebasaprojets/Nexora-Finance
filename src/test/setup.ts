import { useLang } from '@/i18n/lang';

// Os testes verificam os textos em português, independente do idioma da máquina.
useLang.setState({ lang: 'pt' });

// localStorage em memória (o ambiente de teste é Node).
if (typeof globalThis.localStorage === 'undefined') {
  const mem = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  } as Storage;
}
