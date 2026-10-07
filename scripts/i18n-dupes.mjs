// Mostra textos traduzidos de forma diferente em arquivos de locales distintos (o último carregado vence).
import { createServer } from 'vite';
import { readdirSync } from 'node:fs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const seen = { en: {}, es: {} };
for (const f of readdirSync('src/i18n/locales')) {
  const m = (await server.ssrLoadModule('/src/i18n/locales/' + f)).default;
  for (const l of ['en', 'es']) for (const [k, v] of Object.entries(m[l])) (seen[l][k] ??= {})[f] = v;
}
await server.close();
for (const l of ['en', 'es']) for (const [k, byFile] of Object.entries(seen[l])) {
  const vals = new Set(Object.values(byFile));
  if (vals.size > 1) console.log(l, JSON.stringify(k), JSON.stringify(byFile));
}
