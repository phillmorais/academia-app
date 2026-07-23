-- Fase 5.3 do Memorial 2.0 — repertório crescente de perguntas para Conselhos.
-- Rode no SQL Editor do Supabase do projeto já existente.

create table perguntas_conselho (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  tema text,
  encontro_origem uuid references encontros(id) on delete set null,
  criado_por uuid references perfis(id),
  criado_em timestamptz default now()
);

alter table perguntas_conselho enable row level security;

create policy "perguntas_conselho_select_autenticados" on perguntas_conselho
  for select to authenticated using (true);

create policy "perguntas_conselho_escrita_autenticados" on perguntas_conselho
  for insert to authenticated with check (true);

create policy "perguntas_conselho_update_autenticados" on perguntas_conselho
  for update to authenticated using (true);
