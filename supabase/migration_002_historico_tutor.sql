-- Migration 002: histórico de conversas do Tutor (pessoal e compartilhado com o grupo)
-- Rode este arquivo no SQL Editor do Supabase (projeto já existente).

create table tutor_conversas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfis(id) on delete cascade,
  encontro_id uuid references encontros(id) on delete set null,
  modo text not null, -- 'explicar' | 'perguntar' | 'criticar'
  compartilhada boolean not null default false,
  criado_em timestamptz default now()
);

create table tutor_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references tutor_conversas(id) on delete cascade,
  papel text not null, -- 'usuario' | 'tutor'
  texto text not null,
  criado_em timestamptz default now()
);

alter table tutor_conversas enable row level security;
alter table tutor_mensagens enable row level security;

-- cada um vê as próprias conversas + as que outros marcaram como compartilhadas
create policy "tutor_conversas_select" on tutor_conversas
  for select to authenticated
  using (usuario_id = auth.uid() or compartilhada = true);

create policy "tutor_conversas_insert" on tutor_conversas
  for insert to authenticated
  with check (usuario_id = auth.uid());

create policy "tutor_conversas_update_propria" on tutor_conversas
  for update to authenticated
  using (usuario_id = auth.uid());

-- mensagens seguem a mesma visibilidade da conversa a que pertencem
create policy "tutor_mensagens_select" on tutor_mensagens
  for select to authenticated
  using (
    exists (
      select 1 from tutor_conversas c
      where c.id = tutor_mensagens.conversa_id
        and (c.usuario_id = auth.uid() or c.compartilhada = true)
    )
  );

create policy "tutor_mensagens_insert" on tutor_mensagens
  for insert to authenticated
  with check (
    exists (
      select 1 from tutor_conversas c
      where c.id = tutor_mensagens.conversa_id
        and c.usuario_id = auth.uid()
    )
  );
