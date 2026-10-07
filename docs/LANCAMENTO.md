# Guia de lançamento da Nexora Finance

Passo a passo para colocar a Nexora no ar com contas reais, pagamento e tudo
pronto para vender. Siga na ordem. Cada etapa diz **onde clicar** e **o que copiar**.

> 🔐 **Regra de ouro:** chaves que começam com `service_role`, o *Access Token* do
> Mercado Pago e o *segredo do webhook* são **secretos**. Eles vão só no Supabase
> (etapa 3), **nunca** no GitHub, no código ou em mensagens.

---

## Etapa 0 — Formalização

### Começando sem CNPJ (pessoa física)
Dá para começar só com CPF, principalmente no beta e nas primeiras vendas:
- Conta do **Mercado Pago no seu CPF** — recebe Pix e cartão normalmente.
- Em **GitHub → Variables**, preencha `VITE_COMPANY_NAME` com seu **nome completo** e deixe
  `VITE_COMPANY_CNPJ` vazio. **Não publique seu CPF** no site.
- Declare o que receber: rendimentos de pessoas físicas entram no **Carnê-Leão** (mensal,
  pelo app/portal da Receita) e no Imposto de Renda anual. A alíquota segue a tabela
  progressiva do IR (até 27,5%), por isso vale formalizar quando as vendas crescerem.

### Quando formalizar
- **MEI**: verifique com um contador se existe ocupação permitida para o seu caso —
  desenvolvimento e licenciamento de software, em geral, **não** podem ser MEI.
- **ME no Simples Nacional**: o caminho mais comum para software; com contador, o imposto
  pode ficar em torno de 6% do faturamento (depende do enquadramento).
- **Inova Simples**: regime especial gratuito para startups abrirem CNPJ de forma
  simplificada — pergunte ao contador se a Nexora se encaixa.

### Em qualquer caso
- [ ] E-mail de suporte e WhatsApp (pode ser o Business no seu número).
- [ ] Ler e ajustar os **Termos** e a **Política de Privacidade** (`/termos` e `/privacidade`) —
  eles usam automaticamente o nome configurado na etapa 4.

## Etapa 1 — Criar o banco de dados (Supabase, grátis)

1. Crie uma conta em [supabase.com](https://supabase.com) → **New project**.
   - Região: **South America (São Paulo)**.
   - Guarde a senha do banco num lugar seguro.
2. Menu **SQL Editor** → **New query** → cole todo o conteúdo de
   [`supabase/setup.sql`](../supabase/setup.sql) → **Run**. Deve aparecer *Success*.
3. Menu **Authentication → URL Configuration**:
   - **Site URL:** `https://sebasaprojets.github.io/Nexora-Finance/` (ou seu domínio).
   - **Redirect URLs:** adicione `https://sebasaprojets.github.io/Nexora-Finance/**`.
4. Menu **Authentication → Email Templates** (opcional): traduza os e-mails para português.
5. Menu **Project Settings → API**: copie
   - **Project URL** (ex.: `https://abcd1234.supabase.co`)
   - **anon public key** (começa com `eyJ...`) — essa é pública, pode ir no GitHub.

> Dica: em **Authentication → Providers → Email**, deixe *Confirm email* ligado
> (o app já mostra a tela “Confirme seu e-mail”).

## Etapa 2 — Ligar a nuvem no site (GitHub)

No repositório: **Settings → Secrets and variables → Actions → aba Variables → New repository variable**.
Crie:

| Nome | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL da etapa 1 |
| `VITE_SUPABASE_ANON_KEY` | anon public key da etapa 1 |

Depois vá em **Actions → Deploy (GitHub Pages) → Run workflow**. Em ~1 minuto o site
passa a ter **login real**: a conta funciona em qualquer celular ou computador e os
dados ficam salvos na nuvem (ícone de nuvem no topo do app).

> Quem já tinha conta só no aparelho: basta criar a conta de novo **com o mesmo
> e-mail, no mesmo aparelho** — os dados antigos são importados automaticamente.

## Etapa 3 — Pagamentos (Mercado Pago)

1. Crie/acesse sua conta em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
   → **Suas integrações → Criar aplicação** (tipo: *Assinaturas*).
2. Em **Credenciais de produção**, copie o **Access Token** (`APP_USR-...`). **Secreto!**
3. Instale a CLI do Supabase no computador ([guia](https://supabase.com/docs/guides/cli)) e rode, na pasta do projeto:

   ```bash
   supabase login
   supabase link --project-ref SEU_PROJECT_REF   # o código no Project URL
   supabase secrets set MP_ACCESS_TOKEN=APP_USR-... \
     APP_URL=https://sebasaprojets.github.io/Nexora-Finance \
     PRICE_PRO_MONTHLY=14.90 PRICE_PRO_YEARLY=119 PRICE_FOUNDER_MONTHLY=9.90
   supabase functions deploy billing
   supabase functions deploy mp-webhook --no-verify-jwt
   ```

4. No Mercado Pago, em **Suas integrações → sua aplicação → Webhooks → Configurar notificações**:
   - URL de produção: `https://SEU_PROJECT_REF.supabase.co/functions/v1/mp-webhook`
   - Eventos: **Planos e assinaturas**.
   - Copie a **assinatura secreta** gerada e rode:
     `supabase secrets set MP_WEBHOOK_SECRET=...`
5. No GitHub (Variables), crie `VITE_BILLING` = `on` e rode o deploy de novo.
6. **Teste com um cartão de teste** do Mercado Pago (credenciais de teste) antes de
   divulgar. Depois que pagar, a página *Meu plano* mostra “Você é Nexora Pro”.

**Como funciona:** o app chama a função `billing`, que cria a assinatura no Mercado Pago
com o preço definido no servidor e devolve o link de pagamento. Quando o pagamento é
aprovado, o Mercado Pago avisa a função `mp-webhook`, que confere a assinatura digital
e ativa o Pro no perfil. Ninguém consegue “se dar” o Pro pelo navegador (o banco bloqueia).

**Fundadores:** para dar o preço de fundador a alguém, no Supabase abra
**Table Editor → profiles**, ache a pessoa e marque `founder = true` antes dela assinar.
Os inscritos do formulário da página inicial ficam em **Table Editor → waitlist**.

### Enquanto o pagamento não estiver pronto
Deixe `VITE_BILLING` vazio. Os **limites do plano Grátis já valem** e, quando o cliente
chega num limite, ele pode ativar o **teste grátis do Pro por 14 dias** (uma vez por conta).
Depois do teste, a página *Meu plano* mostra “pagamento online em breve” e o botão do
seu WhatsApp para ativar o Pro manualmente.

Quer liberar tudo para todo mundo durante o beta? Crie a variável `VITE_PLAN_LIMITS` = `off`.

### Limites do plano Grátis
Definidos em `src/lib/plans.ts` (`FREE_LIMITS`) — mude os números lá se quiser.

| Recurso | Grátis | Pro |
| --- | --- | --- |
| Transações | Ilimitadas | Ilimitadas |
| Contas bancárias | 2 | Ilimitadas |
| Cartões de crédito | 1 | Ilimitados |
| Metas | 2 | Ilimitadas |
| Orçamentos | 3 | Ilimitados |
| Investimentos (ativos) | 3 | Ilimitados |
| Assinaturas acompanhadas | 5 | Ilimitadas |
| Dívidas | 2 | Ilimitadas |
| Categorias personalizadas | 3 | Ilimitadas |
| Perguntas à Nexora AI | 20 por mês | Ilimitadas |
| Relatórios PDF/Excel | — (CSV liberado) | ✓ |
| Comparar períodos (Análises) | — | ✓ |
| Comprovantes anexados | — | ✓ |

Quem passar do limite não perde nada: os dados continuam lá, só não dá para criar novos itens.
O teste grátis e a contagem da IA ficam salvos no aparelho da pessoa.

## Etapa 4 — Seus dados no site

Ainda em **GitHub → Variables**:

| Nome | Exemplo |
| --- | --- |
| `VITE_COMPANY_NAME` | `Seu Nome 12345678000190` (razão social do MEI) |
| `VITE_COMPANY_CNPJ` | `12.345.678/0001-90` |
| `VITE_COMPANY_CITY` | `São Paulo/SP` |
| `VITE_SUPPORT_EMAIL` | `contato@seudominio.com.br` |
| `VITE_SUPPORT_WHATSAPP` | `5511999998888` (só números, com 55 e DDD) |
| `VITE_PRICE_PRO_MONTHLY` | `14.90` (igual ao do servidor) |
| `VITE_PRICE_PRO_YEARLY` | `119` |
| `VITE_PRICE_FOUNDER_MONTHLY` | `9.90` |

Isso preenche o rodapé, os Termos, a Política de Privacidade, a página **Ajuda e suporte**
e o botão de WhatsApp.

## Etapa 5 — Domínio próprio (opcional, ~R$ 40/ano)

1. Compre em [registro.br](https://registro.br) (ex.: `nexorafinance.com.br`).
2. No registro.br, em **DNS**, crie um registro `CNAME` `www` → `sebasaprojets.github.io`
   e os registros `A` do domínio raiz para os IPs do GitHub Pages
   (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`).
3. GitHub → **Settings → Pages → Custom domain** → digite o domínio → *Enforce HTTPS*.
4. GitHub → Variables: crie `BASE_PATH` = `/`.
5. Atualize a **Site URL / Redirect URLs** do Supabase e o `APP_URL` das funções para o novo domínio.

## Etapa 6 — Login com Google (opcional)

1. Siga o guia do Supabase: **Authentication → Providers → Google** (precisa criar um
   “OAuth Client” no Google Cloud Console e colar Client ID/Secret no Supabase).
2. GitHub → Variables: `VITE_AUTH_GOOGLE` = `on` → deploy.

---

## Checklist final antes de divulgar

- [ ] Criei uma conta de teste no celular e entrei com ela no computador (dados aparecem nos dois).
- [ ] “Esqueci minha senha” envia o e-mail e a troca funciona.
- [ ] Pagamento de teste ativou o Pro e o cancelamento funcionou.
- [ ] Rodapé mostra meu nome (ou empresa) e contato; Termos e Privacidade com meus dados.
- [ ] WhatsApp de suporte responde.
- [ ] Testei no iPhone (Safari) e no Android (Chrome), inclusive “Adicionar à tela de início”.

## Mensagens para os primeiros clientes

**Amigos e conhecidos (WhatsApp, uma pessoa por vez):**
> Oi, [nome]! Tudo bem? Estou lançando a **Nexora**, um app que organiza suas finanças
> num só lugar — contas, cartões, faturas, metas e gastos — e avisa antes das contas vencerem.
> Estou escolhendo um grupo pequeno para testar **de graça** e me dar uma opinião sincera.
> Quem participar garante preço de fundador para sempre. Topa? Leva 2 minutos: [link]

**Para quem vive reclamando da fatura:**
> [nome], lembrei de você! Sabe aquela sensação de chegar no fim do mês sem saber para
> onde foi o dinheiro? A **Nexora** mostra em que você mais gasta, avisa quando um gasto
> foge do padrão e calcula quanto guardar por mês para bater suas metas. Quer testar grátis? [link]

**Autônomos e pequenos empreendedores:**
> Oi, [nome]! Você separa o dinheiro da empresa do pessoal? A **Nexora** mostra receitas,
> despesas, fluxo de caixa e uma DRE simples, tudo pelo celular. Estou liberando acesso
> antecipado para alguns empreendedores — posso te mandar o link?

**Follow-up (3–5 dias depois):**
> E aí, [nome], conseguiu usar a Nexora? Me conta com sinceridade: o que você mais gostou
> e o que faltou? Sua resposta vai direto para a próxima versão. 🙏

**Pedindo depoimento (só para quem elogiou):**
> Que bom que está te ajudando! Posso usar essa sua frase na página da Nexora, com seu
> primeiro nome e profissão? Se preferir, deixo anônimo.

> ⚠️ Use na página **apenas depoimentos reais e autorizados** (adicione em
> `TESTIMONIALS` em `src/pages/public/Landing.tsx`). Depoimentos inventados são
> propaganda enganosa pelo Código de Defesa do Consumidor e pelo CONAR.

## Preço sugerido

| Plano | Preço |
| --- | --- |
| Grátis | R$ 0 — transações ilimitadas, 2 contas, 1 cartão, 2 metas, 3 orçamentos, IA 20/mês, CSV |
| Pro mensal | R$ 14,90 |
| Pro anual | R$ 119 (≈ R$ 9,92/mês) |
| Fundador (beta) | R$ 9,90/mês para sempre |

Referência de mercado: Mobills e Organizze cobram entre R$ 10 e R$ 25 por mês.
