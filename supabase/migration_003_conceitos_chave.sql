-- Migration 003: conceitos-chave do encontro, usados como sugestões no Tutor
-- Rode este arquivo no SQL Editor do Supabase (projeto já existente).

alter table encontros add column conceitos_chave text;
