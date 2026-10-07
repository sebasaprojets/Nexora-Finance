// Gera os ícones PNG do PWA a partir dos SVGs em public/icons (requer Playwright/Chromium).
// Uso: node scripts/generate-icons.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve('public/icons');
const jobs = [
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon.svg', 'apple-touch-icon.png', 180],
  ['maskable.svg', 'icon-maskable-512.png', 512],
  ['badge.svg', 'badge-72.png', 72],
];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
for (const [src, out, size] of jobs) {
  const svg = readFileSync(resolve(dir, src), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: resolve(dir, out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('✓', out);
}
await browser.close();
