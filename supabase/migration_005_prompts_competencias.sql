-- Fase 4 do Memorial 2.0 — recategoriza os prompts semente pelas 6 competências
-- transferíveis do Memorial, em vez de "tipo de análise".
-- Rode no SQL Editor do Supabase do projeto já existente.

update prompts set categoria = 'Construir análises e cenários' where titulo = 'Interrogar premissas';
update prompts set categoria = 'Pesquisar e verificar' where titulo = 'Separar fato de opinião';
update prompts set categoria = 'Usar IA em governança' where titulo = 'Red team da estratégia';
update prompts set categoria = 'Usar IA em governança' where titulo = 'Mapear stakeholders e vieses';
update prompts set categoria = 'Construir análises e cenários' where titulo = 'Construir cenários';
