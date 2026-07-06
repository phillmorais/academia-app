# Plataforma da Academia

Casa digital de um grupo de estudo sobre IA na governança de Conselhos de Administração. React + Vite + Supabase + Vercel, sem TypeScript.

## Como rodar localmente

```bash
npm install
npm run dev
```

Antes de rodar, copie `.env.example` para `.env` e preencha com os valores do seu projeto Supabase (veja abaixo). Sem essas variáveis o app carrega mas não consegue logar nem ler dados.

O Tutor (`/api/tutor.js`) só funciona rodando via `vercel dev` (ele lê as variáveis de servidor `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `ANTHROPIC_API_KEY`). Com `npm run dev` puro, as outras telas funcionam normalmente.

## Passo a passo para colocar no ar

### 1. Criar o projeto no Supabase

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e rode. Isso cria as tabelas, as políticas de segurança (RLS) e o conteúdo semente (os 6 primeiros encontros e 5 prompts).
3. Se o projeto já existia antes da tela de histórico do Tutor, rode também [`supabase/migration_002_historico_tutor.sql`](supabase/migration_002_historico_tutor.sql) — cria as tabelas `tutor_conversas` e `tutor_mensagens` (projetos novos já recebem isso direto do `schema.sql`).
4. Em **Project Settings > API**, copie a **Project URL** e a **anon public key** (também chamada de "Publishable key" em painéis mais novos). Você vai usar os dois valores duas vezes: nas variáveis `VITE_SUPABASE_*` (frontend) e `SUPABASE_*` (servidor, na Vercel).

### 2. Criar as 10 contas dos participantes

As pessoas não se cadastram — a organizadora cria as contas prontas:

1. No painel do Supabase, vá em **Authentication > Users > Add user** e crie uma conta por pessoa (e-mail + senha). Marque "Auto Confirm User" para não depender de e-mail de confirmação.
2. Um perfil em `perfis` é criado automaticamente para cada conta nova (via trigger). Depois, edite a tabela `perfis` (aba **Table Editor**) para colocar o `nome` de cada pessoa e, para a organizadora, `papel = 'organizadora'`.
3. Entregue e-mail e senha para cada pessoa por um canal seguro (não por e-mail em texto puro, idealmente).
4. Redefinição de senha por e-mail já funciona por padrão no Supabase Auth — nenhuma configuração extra é necessária além de conferir, em **Authentication > URL Configuration**, que a "Site URL" aponta para o domínio final do app na Vercel.

### 3. Deploy na Vercel

1. Suba este repositório para o GitHub e importe o projeto na [Vercel](https://vercel.com).
2. Em **Settings > Environment Variables**, configure:
   - `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (mesmos valores do passo 1, usados pelo frontend)
   - `SUPABASE_URL` e `SUPABASE_ANON_KEY` (os mesmos valores, sem o prefixo `VITE_`, usados só pela função do Tutor)
   - `ANTHROPIC_API_KEY` (chave da API do Claude — nunca use prefixo `VITE_` nela)
3. Faça o deploy. O framework é detectado automaticamente como Vite; a função `/api/tutor.js` é publicada junto, sem configuração adicional.

### 4. Ajustar o encontro "de hoje"

Na tabela `encontros` (Table Editor do Supabase), o encontro com `status = 'atual'` aparece destacado na tela inicial e é o contexto usado pelo Tutor. Antes de cada encontro presencial, mude o `status` do encontro anterior para `'concluido'` e o do próximo para `'atual'`.

## Estrutura

- `src/pages` — as telas (Login, Início, Encontros, Detalhe do Encontro, Prompts, Registro, Tutor e histórico do Tutor)
- `src/context/AuthContext.jsx` — sessão e perfil do usuário
- `src/lib/supabaseClient.js` — cliente Supabase do frontend
- `api/tutor.js` — única parte do sistema que fala com a API do Claude; valida a sessão do Supabase antes de responder
- `supabase/schema.sql` — tabelas, RLS e conteúdo semente

## Conversas do Tutor

As conversas com o Tutor ficam salvas em `tutor_conversas` e `tutor_mensagens`, por padrão visíveis só para quem conversou. A pessoa pode marcar uma conversa como "compartilhar com o grupo" (campo `compartilhada`); a partir daí, ela aparece na aba "Do grupo" do histórico do Tutor para todo mundo, e o próprio Tutor passa a poder citar essas reflexões (sem citar nomes de forma indiscreta) quando conversa com outra pessoa sobre o mesmo encontro.

## Fora do escopo desta versão

Transcrição/upload de áudio, destilação automática do registro, notificações e analytics. O fluxo de registro é manual: grave o encontro, destile a transcrição em qualquer IA usando o prompt de destilação (fornecido à parte) e cole o resultado na tela Registro.
