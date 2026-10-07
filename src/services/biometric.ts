import { readJSON, writeJSON } from './storage';

/**
 * Entrar com Face ID / Touch ID / digital / Windows Hello (WebAuthn — chaves de acesso).
 *
 * A biometria nunca sai do aparelho: o sistema operacional confirma o rosto/dedo
 * e libera uma chave criptográfica guardada no próprio dispositivo.
 * No modo local, a confirmação do autenticador do aparelho libera a sessão.
 * Com backend, o servidor deve gerar o desafio e validar a assinatura (ex.: SimpleWebAuthn).
 */

interface StoredCredential {
  credentialId: string; // base64url
  userId: string;
  createdAt: string;
}

const KEY = 'biometric:credentials';

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const challenge = () => crypto.getRandomValues(new Uint8Array(32));

const list = () => readJSON<StoredCredential[]>(KEY, []);

/** Nome amigável do método no aparelho atual. */
export function biometricLabel(): string {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'Face ID';
  if (/Macintosh/.test(ua)) return 'Touch ID';
  if (/Android/.test(ua)) return 'biometria';
  if (/Windows/.test(ua)) return 'Windows Hello';
  return 'biometria';
}

/** O aparelho tem autenticador biométrico/PIN de plataforma disponível? */
export async function biometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !window.isSecureContext) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function biometricEnabledFor(userId: string) {
  return list().some((c) => c.userId === userId);
}

/** Usuários com biometria ativa neste aparelho. */
export function biometricUsers(): string[] {
  return [...new Set(list().map((c) => c.userId))];
}

export async function enableBiometric(user: { id: string; email: string; name: string }) {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: 'Nexora Finance', id: location.hostname },
      user: { id: new TextEncoder().encode(user.id), name: user.email, displayName: user.name },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60_000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('Cadastro cancelado');
  const entry: StoredCredential = { credentialId: b64url(cred.rawId), userId: user.id, createdAt: new Date().toISOString() };
  writeJSON(KEY, [...list().filter((c) => c.userId !== user.id), entry]);
}

/** Pede Face ID/digital e devolve o id do usuário autenticado. */
export async function authenticateBiometric(): Promise<string> {
  const creds = list();
  if (!creds.length) throw new Error('Nenhuma biometria cadastrada neste aparelho');
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      rpId: location.hostname,
      allowCredentials: creds.map((c) => ({ type: 'public-key' as const, id: fromB64url(c.credentialId), transports: ['internal' as const, 'hybrid' as const] })),
      userVerification: 'required',
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Autenticação cancelada');
  const id = b64url(assertion.rawId);
  const match = creds.find((c) => c.credentialId === id);
  if (!match) throw new Error('Credencial não reconhecida');
  return match.userId;
}

export function disableBiometric(userId: string) {
  writeJSON(KEY, list().filter((c) => c.userId !== userId));
}

const PROMPT_KEY = (userId: string) => `biometric:prompted:${userId}`;
export const biometricPrompted = (userId: string) => readJSON<boolean>(PROMPT_KEY(userId), false);
export const setBiometricPrompted = (userId: string) => writeJSON(PROMPT_KEY(userId), true);
