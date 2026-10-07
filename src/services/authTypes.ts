export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  remember: boolean;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'invalid_credentials' | 'email_in_use' | 'rate_limited' | 'not_found' | 'confirm_email' | 'unknown',
  ) {
    super(message);
  }
}
