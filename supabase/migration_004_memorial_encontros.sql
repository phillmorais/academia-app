-- Fase 2 do Memorial 2.0 — novos campos em encontros para a regra cumulativa das leituras.
-- Rode no SQL Editor do Supabase do projeto já existente.

alter table encontros
  add column if not exists ciclo int,
  add column if not exists trecho_em_estudo text,
  add column if not exists complementar boolean not null default false;

-- Só renomeia o valor 'proximo' para 'futuro' (nome usado pelo Memorial) — não mexe em
-- quem já está 'atual' ou 'concluido', preservando o andamento real do grupo.
update encontros set status = 'futuro' where status = 'proximo';

-- ============================================================
-- FASE 3 — bibliografia nova (4 ciclos, 9 livros + 1 complementar)
-- ============================================================
-- Os encontros 1 a 5 já são os mesmos livros do Memorial — só ganham ciclo, a pergunta
-- central na redação oficial e o roteiro padrão novo. Nenhum "status" é alterado aqui.

update encontros set
  ciclo = 1,
  trecho_em_estudo = 'Capítulos 1 a 3',
  problema_governanca = 'Como trabalhar e aprender com a IA sem transferir a ela a responsabilidade humana?',
  roteiro = E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.'
where numero = 1;

update encontros set
  ciclo = 1,
  problema_governanca = 'Como a IA modifica conhecimento, poder, organizações e sociedade?',
  roteiro = E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.'
where numero = 2;

update encontros set
  ciclo = 1,
  problema_governanca = 'Como governar tecnologias de rápida difusão, elevado poder e difícil contenção?',
  roteiro = E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.'
where numero = 3;

update encontros set
  ciclo = 2,
  problema_governanca = 'Por que organizações bem administradas podem falhar diante de uma ruptura?',
  roteiro = E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.'
where numero = 4;

update encontros set
  ciclo = 2,
  problema_governanca = 'Como reconhecer e enfrentar um ponto de inflexão estratégica?',
  roteiro = E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.'
where numero = 5;

-- 2041 deixa de ser encontro numerado e vira leitura complementar (cenários futuros).
-- Renumerado para não colidir com os novos encontros 6-9 inseridos abaixo. O guard
-- "and livro = '2041'" evita mexer em outro encontro caso o numero 6 já tenha mudado.
update encontros set
  numero = 10,
  complementar = true,
  ciclo = null
where numero = 6 and livro = '2041';

-- Encontros novos dos ciclos 3 e 4.
insert into encontros (numero, titulo, livro, autor, problema_governanca, ciclo, roteiro, status) values
(6, 'Encontro 6 — Administrative Behavior', 'Administrative Behavior', 'Herbert Simon (capítulos selecionados)',
 'Como as organizações realmente tomam decisões sob racionalidade limitada?', 3,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 'futuro'),
(7, 'Encontro 7 — Rápido e Devagar', 'Rápido e Devagar', 'Daniel Kahneman',
 'Que vieses podem comprometer a análise humana e também o uso da IA?', 3,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 'futuro'),
(8, 'Encontro 8 — Introdução ao Pensamento Complexo', 'Introdução ao Pensamento Complexo', 'Edgar Morin',
 'Como evitar reduções excessivas diante de problemas interdependentes?', 4,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 'futuro'),
(9, 'Encontro 9 — O Executivo Eficaz', 'O Executivo Eficaz', 'Peter Drucker (releitura dirigida)',
 'Como transformar conhecimento, prioridades e responsabilidade em ação eficaz?', 4,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 'futuro');
