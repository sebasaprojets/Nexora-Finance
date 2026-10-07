/** Sanitização de entradas livres do usuário antes de persistir. */
export function sanitizeText(input: string, max = 200): string {
  return input
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function sanitizeTags(tags: string[]): string[] {
  return [...new Set(tags.map((t) => sanitizeText(t, 24).toLowerCase()).filter(Boolean))].slice(0, 10);
}

export function isSafeEmail(email: string) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email);
}
