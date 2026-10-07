# Backend (Supabase)

Sem configuração, o app roda em **modo local** (dados no navegador). Com
`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, entra no **modo nuvem**:

- **Login real** (Supabase Auth: e-mail/senha, confirmação de e-mail, recuperação de senha, Google opcional) — `src/services/cloudAuth.ts`.
- **Dados sincronizados** entre aparelhos: um documento JSON por usuário em `user_workspaces`, com cópia offline no aparelho — `src/store/finance.ts` + `src/services/cloud.ts`.
- **Cobrança** pelo Mercado Pago: Edge Functions `billing` e `mp-webhook` em `functions/`.

👉 Passo a passo completo em [`docs/LANCAMENTO.md`](../docs/LANCAMENTO.md).

| Arquivo | Para quê |
| --- | --- |
| `setup.sql` | **Rode este** no SQL Editor: perfis, workspaces, lista de espera, exclusão de conta (LGPD) e proteção do plano. |
| `schema.sql` | Modelo relacional completo (tabela por entidade) para uma evolução futura. |
| `functions/billing` | Cria a assinatura no Mercado Pago e cancela. |
| `functions/mp-webhook` | Recebe as notificações do Mercado Pago e ativa/desativa o Pro. |

Outras evoluções:
1. **Web Push**: gere chaves VAPID (`npx web-push generate-vapid-keys`). A pública vai em `VITE_VAPID_PUBLIC_KEY`; a **privada fica só no servidor** (Edge Function) que envia pushes para `push_subscriptions` em jobs agendados (faturas vencendo, orçamentos, metas).
2. **Rate limiting**: aplique no backend (Supabase Auth já limita logins; para Edge Functions use um limitador por IP/usuário, ex. Upstash Ratelimit).
3. **Anexos**: bucket privado `attachments` com política por `auth.uid()`.
4. **Nexora AI com LLM** (opcional): Edge Function que recebe a pergunta + resumo dos dados e chama o modelo com a chave guardada como secret. Nunca exponha a chave no frontend.
