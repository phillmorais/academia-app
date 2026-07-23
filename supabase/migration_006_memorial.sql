-- Fase 5.2 do Memorial 2.0 — o Memorial passa a viver dentro do app, como fonte oficial
-- que todas as participantes leem na mesma versão.
-- Rode no SQL Editor do Supabase do projeto já existente.

create table memorial (
  id uuid primary key default gen_random_uuid(),
  versao text not null,
  conteudo text,
  atualizado_em timestamptz default now()
);

alter table memorial enable row level security;

create policy "memorial_select_autenticados" on memorial
  for select to authenticated using (true);

create policy "memorial_escrita_organizadora" on memorial
  for all to authenticated
  using (exists (select 1 from perfis where id = auth.uid() and papel = 'organizadora'))
  with check (exists (select 1 from perfis where id = auth.uid() and papel = 'organizadora'));

-- Conteúdo em branco de propósito — a organizadora cola o texto oficial pela tela do app.
insert into memorial (versao, conteudo) values ('2.0', null);
