// Lista textos passados para t('...') que ainda não têm tradução em inglês/espanhol.
// Uso: node scripts/i18n-check.mjs [arquivos ou pastas...]   (padrão: src)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['src'];
const files = [];
const walk = (p) => {
  if (statSync(p).isDirectory()) for (const f of readdirSync(p)) walk(join(p, f));
  else if (/\.(ts|tsx)$/.test(p) && !p.includes('/i18n/') && !p.endsWith('.test.ts')) files.push(p);
};
targets.forEach(walk);

// t('...') ou t("...") — também pega t(`...`) sem ${} (template sem variáveis).
const RE = /\bt\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`)/g;
const unescape = (s) => s.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
const keys = new Map();
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(RE)) {
    const k = unescape(m[1] ?? m[2] ?? m[3]);
    if (!keys.has(k)) keys.set(k, f);
  }
}

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const { __dicts } = await server.ssrLoadModule('/src/i18n/index.ts');
await server.close();

let missing = 0;
for (const [k, f] of keys) {
  const lacks = ['en', 'es'].filter((l) => !(k in __dicts[l]));
  if (lacks.length) {
    missing++;
    console.log(`[${lacks.join(',')}] ${f}: ${JSON.stringify(k)}`);
  }
}
console.log(`\n${keys.size} textos verificados em ${files.length} arquivos — ${missing} sem tradução.`);
process.exitCode = missing ? 1 : 0;
