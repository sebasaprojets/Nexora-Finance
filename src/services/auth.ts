import type { User } from '@/types';
import { uid } from '@/lib/id';
import { sanitizeText } from '@/lib/sanitize';
import { readJSON, removeKey, writeJSON } from './storage';
import { AuthError, type Session } from './authTypes';
import { cloudEnabled } from './cloud';
import { cloudAuth, knownName } from './cloudAuth';
import { biometricEnabledFor } from './biometric';

/**
 * Serviço de autenticação.
 *
 * MODO LOCAL (padrão, sem backend): contas ficam no navegador, com senha
 * derivada via PBKDF2 (SHA-256, 210k iterações) + salt aleatório. Serve para
 * desenvolvimento e demonstração — não substitui um backend.
 *
 * MODO BACKEND: implemente a mesma interface `AuthService` com Supabase Auth
 * (`supabase.auth.signInWithPassword`, `signInWithOAuth({ provider: 'google' })`, etc.).
 * Rate limiting, bloqueio de força bruta e sessões devem ser aplicados no servidor.
 */

export { AuthError, type Session } from './authTypes';

interface StoredUser extends User {
  passwordHash?: string;
  salt?: string;
}

const USERS_KEY = 'auth:users';
const SESSION_KEY = 'auth:session';
const ATTEMPTS_KEY = 'auth:attempts';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hashPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 210_000, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(bits);
}

function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

const users = () => readJSON<StoredUser[]>(USERS_KEY, []);
const saveUsers = (list: StoredUser[]) => writeJSON(USERS_KEY, list);
const publicUser = ({ passwordHash: _p, salt: _s, ...u }: StoredUser): User => u;

function checkRateLimit(email: string) {
  const attempts = readJSON<Record<string, { count: number; until?: number }>>(ATTEMPTS_KEY, {});
  const a = attempts[email];
  if (a?.until && a.until > Date.now()) {
    const s = Math.ceil((a.until - Date.now()) / 1000);
    throw new AuthError(`Muitas tentativas. Tente novamente em ${s}s.`, 'rate_limited');
  }
}

function registerFailure(email: string) {
  const attempts = readJSON<Record<string, { count: number; until?: number }>>(ATTEMPTS_KEY, {});
  const a = attempts[email] ?? { count: 0 };
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) {
    a.until = Date.now() + LOCK_MS;
    a.count = 0;
  }
  attempts[email] = a;
  writeJSON(ATTEMPTS_KEY, attempts);
}

function clearFailures(email: string) {
  const attempts = readJSON<Record<string, { count: number; until?: number }>>(ATTEMPTS_KEY, {});
  delete attempts[email];
  writeJSON(ATTEMPTS_KEY, attempts);
}

function createSession(userId: string, remember: boolean): Session {
  const now = Date.now();
  const session: Session = {
    token: randomToken(),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (remember ? 30 : 1) * 86_400_000).toISOString(),
    remember,
  };
  // "Lembrar acesso" → localStorage; caso contrário a sessão termina ao fechar o navegador.
  removeKey(SESSION_KEY);
  removeKey(SESSION_KEY, sessionStorage);
  writeJSON(SESSION_KEY, session, remember ? localStorage : sessionStorage);
  return session;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const authService = {
  getSession(): { session: Session; user: User } | null {
    const session = readJSON<Session | null>(SESSION_KEY, null) ?? readJSON<Session | null>(SESSION_KEY, null, sessionStorage);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.signOut();
      return null;
    }
    const user = users().find((u) => u.id === session.userId);
    if (!user) return null;
    // A demonstração é sempre genérica (corrige sessões antigas com outro nome).
    const pub = publicUser(user);
    return { session, user: user.provider === 'demo' ? { ...pub, name: 'Visitante', avatarUrl: undefined } : pub };
  },

  /** Restaura a sessão ao abrir o app (demo local ou conta na nuvem). */
  async restore(): Promise<{ session: Session; user: User } | null> {
    const local = this.getSession();
    if (local || !cloudEnabled) return local;
    try {
      return await cloudAuth.restore();
    } catch {
      return null;
    }
  },

  async signIn(email: string, password: string, remember: boolean) {
    if (cloudEnabled) return cloudAuth.signIn(email, password);
    const normalized = email.trim().toLowerCase();
    checkRateLimit(normalized);
    await delay(450);
    const user = users().find((u) => u.email === normalized && u.provider === 'password');
    if (!user?.salt || !user.passwordHash || (await hashPassword(password, user.salt)) !== user.passwordHash) {
      registerFailure(normalized);
      // Mensagem genérica: não revela se o e-mail existe.
      throw new AuthError('E-mail ou senha incorretos.', 'invalid_credentials');
    }
    clearFailures(normalized);
    return { session: createSession(user.id, remember), user: publicUser(user) };
  },

  async signUp(name: string, email: string, password: string) {
    if (cloudEnabled) return cloudAuth.signUp(name, email, password);
    const normalized = email.trim().toLowerCase();
    await delay(500);
    const list = users();
    if (list.some((u) => u.email === normalized)) throw new AuthError('Este e-mail já está cadastrado.', 'email_in_use');
    const salt = randomToken(16);
    const user: StoredUser = {
      id: uid('usr'),
      name: sanitizeText(name, 80),
      email: normalized,
      plan: 'free',
      createdAt: new Date().toISOString(),
      onboarded: false,
      provider: 'password',
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    saveUsers([...list, user]);
    return { session: createSession(user.id, true), user: publicUser(user) };
  },

  /** OAuth simulado no modo local. Com Supabase: `supabase.auth.signInWithOAuth({ provider })`. */
  async signInWithProvider(provider: 'google' | 'apple') {
    if (cloudEnabled) return cloudAuth.signInWithProvider(provider);
    await delay(600);
    const email = `voce@${provider === 'google' ? 'gmail.com' : 'icloud.com'}`;
    const list = users();
    let user = list.find((u) => u.email === email && u.provider === provider);
    if (!user) {
      user = {
        id: uid('usr'),
        name: provider === 'google' ? 'Usuário Google' : 'Usuário Apple',
        email,
        plan: 'free',
        createdAt: new Date().toISOString(),
        onboarded: false,
        provider,
      };
      saveUsers([...list, user]);
    }
    return { session: createSession(user.id, true), user: publicUser(user) };
  },

  async signInDemo() {
    await delay(350);
    const list = users();
    // Conta de demonstração genérica (igual para qualquer visitante, sem dados pessoais).
    const demo: StoredUser = {
      id: 'usr_demo',
      name: 'Visitante',
      email: 'demo@nexora.app',
      plan: 'pro',
      createdAt: '2025-01-12T10:00:00.000Z',
      onboarded: true,
      provider: 'demo',
    };
    const user = { ...(list.find((u) => u.provider === 'demo') ?? {}), ...demo, avatarUrl: undefined };
    saveUsers([...list.filter((u) => u.provider !== 'demo'), user]);
    return { session: createSession(user.id, true), user: publicUser(user) };
  },

  /** Sessão após Face ID/biometria confirmada pelo aparelho (ver services/biometric.ts). */
  async signInWithBiometric(userId: string) {
    if (cloudEnabled && !users().some((u) => u.id === userId)) return cloudAuth.signInWithBiometric(userId);
    const user = users().find((u) => u.id === userId);
    if (!user) throw new AuthError('Conta não encontrada neste aparelho.', 'not_found');
    return { session: createSession(user.id, true), user: publicUser(user) };
  },

  /** Nome exibido no botão de login biométrico. */
  displayName(userId: string): string | null {
    if (cloudEnabled && knownName(userId)) return knownName(userId);
    const u = users().find((x) => x.id === userId);
    return u ? u.name : null;
  },

  async requestPasswordReset(email: string) {
    if (cloudEnabled) return cloudAuth.requestPasswordReset(email);
    await delay(700);
    // Sempre responde com sucesso para não revelar quais e-mails existem.
    return { email: email.trim().toLowerCase() };
  },

  /** Conta criada antes da nuvem, só neste aparelho, com o mesmo e-mail (para importar os dados). */
  legacyUserId(email: string): string | null {
    return users().find((u) => u.provider === 'password' && u.email === email.trim().toLowerCase())?.id ?? null;
  },

  updateUser(id: string, patch: Partial<User>, current?: User) {
    if (this.isCloudUser(id) && current) {
      void cloudAuth.updateProfile(id, patch).catch(() => {});
      return { ...current, ...patch, id: current.id, email: current.email };
    }
    const list = users();
    const idx = list.findIndex((u) => u.id === id);
    if (idx < 0) throw new AuthError('Usuário não encontrado.', 'not_found');
    list[idx] = { ...list[idx], ...patch, id: list[idx].id, email: list[idx].email };
    saveUsers(list);
    return publicUser(list[idx]);
  },

  async changePassword(id: string, current: string, next: string) {
    if (cloudEnabled && !users().some((u) => u.id === id)) return cloudAuth.changePassword(current, next);
    const list = users();
    const user = list.find((u) => u.id === id);
    if (!user?.salt || !user.passwordHash) throw new AuthError('Conta sem senha local (login social ou demo).', 'unknown');
    if ((await hashPassword(current, user.salt)) !== user.passwordHash) throw new AuthError('Senha atual incorreta.', 'invalid_credentials');
    user.salt = randomToken(16);
    user.passwordHash = await hashPassword(next, user.salt);
    saveUsers(list);
  },

  async deleteUser(id: string) {
    if (cloudEnabled && !users().some((u) => u.id === id)) await cloudAuth.deleteAccount(id);
    saveUsers(users().filter((u) => u.id !== id));
    await this.signOut();
  },

  /** A conta é da nuvem (e não a demonstração local)? */
  isCloudUser(id: string) {
    return cloudEnabled && !users().some((u) => u.id === id);
  },

  async signOut(userId?: string) {
    const local = readJSON<Session | null>(SESSION_KEY, null) ?? readJSON<Session | null>(SESSION_KEY, null, sessionStorage);
    removeKey(SESSION_KEY);
    removeKey(SESSION_KEY, sessionStorage);
    if (cloudEnabled && !local) await cloudAuth.signOut(userId, !!userId && biometricEnabledFor(userId)).catch(() => {});
  },
};
