-- Fase 2 do Memorial 2.0 — novos campos em encontros para a regra cumulativa das leituras.
-- Rode no SQL Editor do Supabase do projeto já existente.

alter table encontros
  add column if not exists ciclo int,
  add column if not exists trecho_em_estudo text,
  add column if not exists complementar boolean not null default false;

-- Só renomeia o valor 'proximo' para 'futuro' (nome usado pelo Memorial) — não mexe em
-- quem já está 'atual' ou 'concluido', preservando o andamento real do grupo.
update encontros set status = 'futuro' where status = 'proximo';
