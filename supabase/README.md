# Backend (Supabase)

O frontend roda hoje em **modo local** (dados no navegador). Para produção:

1. Crie um projeto no Supabase e rode `schema.sql` no SQL Editor.
2. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (a anon key é pública por design; a segurança vem das políticas RLS).
3. Implemente `AuthService` (`src/services/auth.ts`) com Supabase Auth (e-mail/senha, Google e Apple via OAuth) e troque `load/save` de `src/store/finance.ts` por chamadas às tabelas.
4. **Web Push**: gere chaves VAPID (`npx web-push generate-vapid-keys`). A pública vai em `VITE_VAPID_PUBLIC_KEY`; a **privada fica só no servidor** (Edge Function) que envia pushes para `push_subscriptions` em jobs agendados (faturas vencendo, orçamentos, metas).
5. **Rate limiting**: aplique no backend (Supabase Auth já limita logins; para Edge Functions use um limitador por IP/usuário, ex. Upstash Ratelimit).
6. **Anexos**: bucket privado `attachments` com política por `auth.uid()`.
7. **Nexora AI com LLM** (opcional): Edge Function que recebe a pergunta + resumo dos dados e chama o modelo com a chave guardada como secret. Nunca exponha a chave no frontend.
