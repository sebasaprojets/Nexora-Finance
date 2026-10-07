import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import { create } from 'zustand';

/**
 * Modo nuvem (Supabase). Ativado quando `VITE_SUPABASE_URL` e
 * `VITE_SUPABASE_ANON_KEY` existem no build; sem elas a Nexora roda em modo
 * local (dados só no navegador). A anon key é pública por design — quem
 * protege os dados são as políticas RLS de `supabase/setup.sql`.
 */
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
export const cloudEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Endereço público do app (com subpasta), usado nos links de e-mail e OAuth. */
export const appUrl = (path = '') => `${window.location.origin}${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;
const listeners = new Set<AuthListener>();
/** Ouve mudanças de sessão (sobrevive à recriação do cliente). */
export const onAuthEvent = (l: AuthListener) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let clientPromise: Promise<SupabaseClient> | null = null;

/** Cliente Supabase carregado sob demanda (não pesa no modo local nem na landing). */
export function supabase(): Promise<SupabaseClient> {
  if (!cloudEnabled) return Promise.reject(new Error('Supabase não configurado'));
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'nexora:sb-auth' },
    });
    client.auth.onAuthStateChange((e, s) => {
      accessToken = s?.access_token ?? null;
      for (const l of listeners) l(e, s);
    });
    return client;
  });
  return clientPromise;
}

/** Descarta o cliente atual (usado ao sair mantendo a sessão para o Face ID). */
export function resetClient() {
  clientPromise = null;
}

/** Último access token conhecido (para gravações síncronas ao fechar a página). */
let accessToken: string | null = null;
export const currentAccessToken = () => accessToken;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

// ---------------------------------------------------------------------------
// Estado da sincronização (exibido na barra superior e no perfil)
// ---------------------------------------------------------------------------

export type SyncState = 'local' | 'syncing' | 'saved' | 'offline' | 'error';
export const useSyncStatus = create<{ state: SyncState; at?: string; set: (s: SyncState) => void }>((set) => ({
  state: 'local',
  set: (state) => set({ state, at: state === 'saved' ? new Date().toISOString() : undefined }),
}));

// ---------------------------------------------------------------------------
// Workspace (dados financeiros) — um documento JSON por usuário
// ---------------------------------------------------------------------------

export async function pullWorkspace<T>(userId: string): Promise<{ data: T; updatedAt: string } | null> {
  const sb = await supabase();
  const { data, error } = await sb.from('user_workspaces').select('data, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? { data: data.data as T, updatedAt: data.updated_at as string } : null;
}

/**
 * Grava o workspace. Usa `fetch` direto (com `keepalive`) para funcionar
 * também quando a página está sendo fechada.
 */
export async function pushWorkspace(userId: string, data: unknown, updatedAt: string, opts: { keepalive?: boolean } = {}) {
  if (!accessToken) {
    const sb = await supabase();
    accessToken = (await sb.auth.getSession()).data.session?.access_token ?? null;
  }
  if (!accessToken) throw new Error('Sessão expirada');
  const body = JSON.stringify({ user_id: userId, data, updated_at: updatedAt });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_workspaces?on_conflict=user_id`, {
    method: 'POST',
    keepalive: !!opts.keepalive && body.length < 60_000,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body,
  });
  if (!res.ok) throw new Error(`Falha ao salvar (${res.status})`);
}
