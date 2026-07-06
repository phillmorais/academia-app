-- Plataforma da Academia — schema completo (tabelas, RLS, seed)
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma única vez.

-- ============================================================
-- TABELAS
-- ============================================================

create table perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  papel text not null default 'participante', -- 'participante' | 'organizadora'
  criado_em timestamptz default now()
);

create table encontros (
  id uuid primary key default gen_random_uuid(),
  numero int not null,
  data date,
  titulo text not null,
  livro text,
  autor text,
  problema_governanca text,
  roteiro text,
  status text not null default 'proximo', -- 'proximo' | 'atual' | 'concluido'
  criado_em timestamptz default now()
);

create table prompts (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  categoria text not null,
  texto text not null,
  contexto_uso text,
  encontro_origem uuid references encontros(id) on delete set null,
  criado_em timestamptz default now()
);

create table registros (
  id uuid primary key default gen_random_uuid(),
  encontro_id uuid not null references encontros(id) on delete cascade,
  conteudo text,
  atualizado_por uuid references perfis(id),
  atualizado_em timestamptz default now()
);

-- Controle simples de uso diário do Tutor (higiene de custo/abuso, não persiste conversas)
create table tutor_uso (
  usuario_id uuid not null references perfis(id) on delete cascade,
  dia date not null default current_date,
  contagem int not null default 0,
  primary key (usuario_id, dia)
);

-- ============================================================
-- CRIA AUTOMATICAMENTE UM PERFIL QUANDO UMA CONTA É CRIADA
-- ============================================================

create function public.lidar_com_novo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute procedure public.lidar_com_novo_usuario();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table perfis enable row level security;
alter table encontros enable row level security;
alter table prompts enable row level security;
alter table registros enable row level security;
alter table tutor_uso enable row level security;

-- perfis: todo autenticado pode ler nomes; cada um só edita o próprio perfil
create policy "perfis_select_autenticados" on perfis
  for select to authenticated using (true);

create policy "perfis_update_proprio" on perfis
  for update to authenticated using (id = auth.uid());

-- encontros: leitura para todos autenticados; escrita só para a organizadora
create policy "encontros_select_autenticados" on encontros
  for select to authenticated using (true);

create policy "encontros_escrita_organizadora" on encontros
  for all to authenticated
  using (exists (select 1 from perfis where id = auth.uid() and papel = 'organizadora'))
  with check (exists (select 1 from perfis where id = auth.uid() and papel = 'organizadora'));

-- prompts: leitura e escrita para todo autenticado
create policy "prompts_select_autenticados" on prompts
  for select to authenticated using (true);

create policy "prompts_escrita_autenticados" on prompts
  for insert to authenticated with check (true);

create policy "prompts_update_autenticados" on prompts
  for update to authenticated using (true);

-- registros: leitura e escrita para todo autenticado
create policy "registros_select_autenticados" on registros
  for select to authenticated using (true);

create policy "registros_escrita_autenticados" on registros
  for insert to authenticated with check (true);

create policy "registros_update_autenticados" on registros
  for update to authenticated using (true);

-- tutor_uso: cada um só vê e atualiza a própria contagem
create policy "tutor_uso_proprio_select" on tutor_uso
  for select to authenticated using (usuario_id = auth.uid());

create policy "tutor_uso_proprio_insert" on tutor_uso
  for insert to authenticated with check (usuario_id = auth.uid());

create policy "tutor_uso_proprio_update" on tutor_uso
  for update to authenticated using (usuario_id = auth.uid());

-- ============================================================
-- CONTEÚDO SEMENTE — ENCONTROS
-- ============================================================

insert into encontros (numero, titulo, livro, autor, problema_governanca, roteiro, status) values
(1, 'Encontro 1 — Cointeligência', 'Cointeligência', 'Ethan Mollick',
 'Como começar a usar a IA como parceira de pensamento, e não como truque? Quando confiar e quando verificar o que ela responde?',
 E'### Abertura e reconexão (10 min)\nRetomar o registro do encontro anterior.\n\n### O problema em pauta (15 min)\nApresentar o problema de governança do mês.\n\n### O autor entra em cena (25 min)\nO que o livro do mês ilumina sobre esse problema.\n\n### Mãos à obra com a IA (40 min)\nExercício prático usando prompts da Biblioteca.\n\n### Deliberação humana (20 min)\nO que a IA produziu — o que aceitamos, o que questionamos.\n\n### Fechamento e registro (10 min)\nIniciar a gravação de áudio; combinar quem destila e posta o registro.',
 'atual'),
(2, 'Encontro 2 — A Era da IA', 'A Era da IA', 'Henry Kissinger, Eric Schmidt e Daniel Huttenlocher',
 'O que a IA muda na natureza do conhecimento e da estratégia? Qual o papel do Conselho quando as máquinas passam a participar do raciocínio?',
 E'### Abertura e reconexão (10 min)\nRetomar o registro do encontro anterior.\n\n### O problema em pauta (15 min)\nApresentar o problema de governança do mês.\n\n### O autor entra em cena (25 min)\nO que o livro do mês ilumina sobre esse problema.\n\n### Mãos à obra com a IA (40 min)\nExercício prático usando prompts da Biblioteca.\n\n### Deliberação humana (20 min)\nO que a IA produziu — o que aceitamos, o que questionamos.\n\n### Fechamento e registro (10 min)\nIniciar a gravação de áudio; combinar quem destila e posta o registro.',
 'proximo'),
(3, 'Encontro 3 — A Próxima Onda', 'A Próxima Onda', 'Mustafa Suleyman',
 'Como um Conselho antecipa e governa uma onda tecnológica difícil de conter? Risco, contenção e responsabilidade.',
 E'### Abertura e reconexão (10 min)\nRetomar o registro do encontro anterior.\n\n### O problema em pauta (15 min)\nApresentar o problema de governança do mês.\n\n### O autor entra em cena (25 min)\nO que o livro do mês ilumina sobre esse problema.\n\n### Mãos à obra com a IA (40 min)\nExercício prático usando prompts da Biblioteca.\n\n### Deliberação humana (20 min)\nO que a IA produziu — o que aceitamos, o que questionamos.\n\n### Fechamento e registro (10 min)\nIniciar a gravação de áudio; combinar quem destila e posta o registro.',
 'proximo'),
(4, 'Encontro 4 — O Dilema da Inovação', 'O Dilema da Inovação', 'Clayton Christensen',
 'Por que empresas bem administradas falham diante da ruptura? Como o Conselho enxerga a ameaça disruptiva ao próprio negócio?',
 E'### Abertura e reconexão (10 min)\nRetomar o registro do encontro anterior.\n\n### O problema em pauta (15 min)\nApresentar o problema de governança do mês.\n\n### O autor entra em cena (25 min)\nO que o livro do mês ilumina sobre esse problema.\n\n### Mãos à obra com a IA (40 min)\nExercício prático usando prompts da Biblioteca.\n\n### Deliberação humana (20 min)\nO que a IA produziu — o que aceitamos, o que questionamos.\n\n### Fechamento e registro (10 min)\nIniciar a gravação de áudio; combinar quem destila e posta o registro.',
 'proximo'),
(5, 'Encontro 5 — Só os Paranoicos Sobrevivem', 'Só os Paranoicos Sobrevivem', 'Andrew Grove',
 'Como reconhecer um ponto de inflexão estratégico — o momento em que os fundamentos do negócio mudam?',
 E'### Abertura e reconexão (10 min)\nRetomar o registro do encontro anterior.\n\n### O problema em pauta (15 min)\nApresentar o problema de governança do mês.\n\n### O autor entra em cena (25 min)\nO que o livro do mês ilumina sobre esse problema.\n\n### Mãos à obra com a IA (40 min)\nExercício prático usando prompts da Biblioteca.\n\n### Deliberação humana (20 min)\nO que a IA produziu — o que aceitamos, o que questionamos.\n\n### Fechamento e registro (10 min)\nIniciar a gravação de áudio; combinar quem destila e posta o registro.',
 'proximo'),
(6, 'Encontro 6 — 2041', '2041', 'Kai-Fu Lee',
 'Para que futuros devemos preparar a empresa? O uso de cenários e prospecção como ferramenta do Conselho.',
 E'### Abertura e reconexão (10 min)\nRetomar o registro do encontro anterior.\n\n### O problema em pauta (15 min)\nApresentar o problema de governança do mês.\n\n### O autor entra em cena (25 min)\nO que o livro do mês ilumina sobre esse problema.\n\n### Mãos à obra com a IA (40 min)\nExercício prático usando prompts da Biblioteca.\n\n### Deliberação humana (20 min)\nO que a IA produziu — o que aceitamos, o que questionamos.\n\n### Fechamento e registro (10 min)\nIniciar a gravação de áudio; combinar quem destila e posta o registro.',
 'proximo');

-- ============================================================
-- CONTEÚDO SEMENTE — PROMPTS
-- ============================================================

insert into prompts (titulo, categoria, texto, contexto_uso) values
('Interrogar premissas', 'Análise crítica',
 'Aja como um analista crítico e cético. Vou apresentar uma decisão que estamos considerando. Liste as premissas implícitas por trás dela e, para cada uma, aponte o que precisaria ser verdade para que ela se sustente: [decisão]',
 'Use antes de fechar uma decisão importante.'),
('Separar fato de opinião', 'Análise crítica',
 'Vou colar um relatório. Separe, item a item, o que é fato verificável do que é opinião, interpretação ou projeção. Marque cada afirmação com uma dessas categorias: [relatório]',
 'Use ao ler relatórios e pareceres.'),
('Red team da estratégia', 'Decisão',
 'Aja como um advogado do diabo experiente. Vou apresentar uma estratégia. Aponte as três formas mais prováveis de ela falhar e que sinais indicariam, com antecedência, que cada uma está acontecendo: [estratégia]',
 'Use para testar uma proposta antes de aprová-la.'),
('Mapear stakeholders e vieses', 'Decisão',
 'Para a decisão a seguir, liste os principais interessados afetados, o interesse de cada um, e os vieses que podem estar influenciando a nossa própria análise: [decisão]',
 'Use quando a decisão afeta muitos grupos.'),
('Construir cenários', 'Prospecção',
 'Construa três cenários (otimista, mais provável e pessimista) para a questão a seguir num horizonte de cinco anos. Para cada um, indique os principais fatores que o separam dos outros: [questão]',
 'Use em discussões de longo prazo.');
