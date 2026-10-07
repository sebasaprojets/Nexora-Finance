import type { Session as SbSession, User as SbUser } from '@supabase/supabase-js';
import type { User } from '@/types';
import { sanitizeText } from '@/lib/sanitize';
import { appUrl, onAuthEvent, resetClient, setAccessToken, supabase } from './cloud';
import { readJSON, removeKey, writeJSON } from './storage';
import { AuthError, type Session } from './authTypes';
import { t } from '@/i18n';

/**
 * Autenticação real com Supabase Auth (modo nuvem): a conta funciona em
 * qualquer aparelho, senhas ficam no servidor (bcrypt) e o Supabase aplica
 * limite de tentativas. Usada por `authService` quando o Supabase está configurado.
 */

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  onboarded: boolean;
  plan: User['plan'];
  plan_status: string | null;
  plan_renews_at: string | null;
  founder: boolean;
  created_at: string;
}

/** Cache local dos nomes (para o botão "Entrar com Face ID" saber de quem é a conta). */
const KNOWN = 'cloud:known';
const remember = (u: User) => writeJSON(KNOWN, { ...readJSON<Record<string, string>>(KNOWN, {}), [u.id]: u.name });
export const knownName = (id: string) => readJSON<Record<string, string>>(KNOWN, {})[id] ?? null;

const STASH = (id: string) => `biometric:session:${id}`;

function toSession(s: SbSession): Session {
  return {
    token: s.access_token,
    userId: s.user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date((s.expires_at ?? Date.now() / 1000 + 3600) * 1000).toISOString(),
    remember: true,
  };
}

async function loadProfile(u: SbUser): Promise<User> {
  const sb = await supabase();
  const { data } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle<Profile>();
  const meta = u.user_metadata ?? {};
  const provider = (u.app_metadata?.provider as string) === 'google' ? 'google' : (u.app_metadata?.provider as string) === 'apple' ? 'apple' : 'password';
  const user: User = {
    id: u.id,
    email: u.email ?? '',
    name: data?.name || (meta.name as string) || (meta.full_name as string) || (u.email ?? '').split('@')[0],
    avatarUrl: data?.avatar_url ?? (meta.avatar_url as string | undefined) ?? undefined,
    plan: data?.plan ?? 'free',
    planStatus: data?.plan_status ?? undefined,
    planRenewsAt: data?.plan_renews_at ?? undefined,
    founder: data?.founder ?? false,
    createdAt: data?.created_at ?? u.created_at,
    onboarded: data?.onboarded ?? false,
    provider,
  };
  remember(user);
  return user;
}

function mapError(message: string): AuthError {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return new AuthError(t('E-mail ou senha incorretos.'), 'invalid_credentials');
  if (m.includes('email not confirmed')) return new AuthError(t('Confirme seu e-mail pelo link que enviamos antes de entrar.'), 'confirm_email');
  if (m.includes('already registered') || m.includes('already been registered')) return new AuthError(t('Este e-mail já está cadastrado.'), 'email_in_use');
  if (m.includes('rate limit') || m.includes('too many')) return new AuthError(t('Muitas tentativas. Aguarde um pouco e tente novamente.'), 'rate_limited');
  if (m.includes('password')) return new AuthError(t('Senha fraca: use pelo menos 8 caracteres, com letras e números.'), 'unknown');
  if (m.includes('fetch') || m.includes('network')) return new AuthError(t('Sem conexão com o servidor. Verifique sua internet.'), 'unknown');
  return new AuthError(t('Não foi possível concluir. Tente novamente.'), 'unknown');
}

async function result(s: SbSession | null) {
  if (!s) throw new AuthError(t('Sessão não iniciada.'), 'unknown');
  setAccessToken(s.access_token);
  return { session: toSession(s), user: await loadProfile(s.user) };
}

export const cloudAuth = {
  async restore() {
    const sb = await supabase();
    const { data } = await sb.auth.getSession();
    return data.session ? result(data.session) : null;
  },

  /** Avisa quando a sessão muda fora do fluxo normal (expirou, saiu em outra aba, voltou do Google). */
  onChange(cb: (r: Awaited<ReturnType<typeof result>> | null) => void) {
    return onAuthEvent((event, s) => {
      if (event === 'SIGNED_OUT') cb(null);
      else if (event === 'SIGNED_IN' && s) setTimeout(() => void result(s).then(cb).catch(() => {}), 0);
    });
  },

  async signIn(email: string, password: string) {
    const sb = await supabase();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw mapError(error.message);
    return result(data.session);
  },

  async signUp(name: string, email: string, password: string) {
    const sb = await supabase();
    const { data, error } = await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: sanitizeText(name, 80) }, emailRedirectTo: appUrl('onboarding') },
    });
    if (error) throw mapError(error.message);
    // Supabase devolve usuário sem identidades quando o e-mail já existe (proteção contra enumeração).
    if (data.user && !data.user.identities?.length) throw new AuthError(t('Este e-mail já está cadastrado.'), 'email_in_use');
    if (!data.session) throw new AuthError(t('Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar a conta.'), 'confirm_email');
    return result(data.session);
  },

  async signInWithProvider(provider: 'google' | 'apple'): Promise<never> {
    const sb = await supabase();
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: appUrl('app') } });
    if (error) throw mapError(error.message);
    return new Promise<never>(() => {}); // o navegador vai para o Google/Apple
  },

  async requestPasswordReset(email: string) {
    const sb = await supabase();
    await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: appUrl('redefinir-senha') });
    return { email: email.trim().toLowerCase() };
  },

  /** Define a nova senha (após abrir o link de recuperação, ou na tela de segurança). */
  async setPassword(password: string) {
    const sb = await supabase();
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw mapError(error.message);
  },

  async changePassword(current: string, next: string) {
    const sb = await supabase();
    const email = (await sb.auth.getUser()).data.user?.email;
    if (!email) throw new AuthError(t('Sessão expirada. Entre novamente.'), 'unknown');
    const check = await sb.auth.signInWithPassword({ email, password: current });
    if (check.error) throw new AuthError(t('Senha atual incorreta.'), 'invalid_credentials');
    await this.setPassword(next);
  },

  async updateProfile(id: string, patch: Partial<User>) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = sanitizeText(patch.name, 80);
    if ('avatarUrl' in patch) row.avatar_url = patch.avatarUrl ?? null;
    if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
    if (!Object.keys(row).length) return;
    const sb = await supabase();
    const { error } = await sb.from('profiles').update(row).eq('id', id);
    if (error) throw mapError(error.message);
    if (row.name) remember({ id, name: row.name as string } as User);
  },

  /** Recarrega o plano (após o pagamento ser confirmado pelo webhook). */
  async refreshProfile() {
    const sb = await supabase();
    const { data } = await sb.auth.getUser();
    return data.user ? loadProfile(data.user) : null;
  },

  async deleteAccount(id: string) {
    const sb = await supabase();
    const { error } = await sb.rpc('delete_my_account');
    if (error) throw mapError(error.message);
    removeKey(STASH(id));
    await sb.auth.signOut({ scope: 'local' }).catch(() => {});
  },

  /**
   * Sair. Se o Face ID estiver ativo para a conta, guardamos a sessão neste
   * aparelho (sem revogar) para que o próximo acesso seja só com o rosto/digital.
   */
  async signOut(userId: string | undefined, keepForBiometric: boolean) {
    const sb = await supabase();
    const { data } = await sb.auth.getSession();
    setAccessToken(null);
    if (keepForBiometric && userId && data.session) {
      writeJSON(STASH(userId), { access_token: data.session.access_token, refresh_token: data.session.refresh_token });
      sb.auth.stopAutoRefresh();
      try {
        localStorage.removeItem('nexora:sb-auth');
      } catch {
        /* ignore */
      }
      // Recria o cliente na próxima chamada, sem a sessão em memória.
      resetClient();
      return;
    }
    if (userId) removeKey(STASH(userId));
    await sb.auth.signOut({ scope: 'local' }).catch(() => {});
  },

  async signInWithBiometric(userId: string) {
    const stash = readJSON<{ access_token: string; refresh_token: string } | null>(STASH(userId), null);
    if (!stash) throw new AuthError(t('Entre com e-mail e senha uma vez neste aparelho para reativar o Face ID.'), 'not_found');
    const sb = await supabase();
    const { data, error } = await sb.auth.setSession(stash);
    removeKey(STASH(userId));
    if (error || !data.session) throw new AuthError(t('Sua sessão expirou. Entre com e-mail e senha.'), 'invalid_credentials');
    return result(data.session);
  },

  forgetBiometric(userId: string) {
    removeKey(STASH(userId));
  },
};
