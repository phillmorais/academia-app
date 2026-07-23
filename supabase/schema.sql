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
  problema_governanca text, -- a "pergunta central" do encontro (nome da coluna mantido por estabilidade)
  trecho_em_estudo text, -- ex: "Capítulos 1 a 3"
  ciclo int, -- agrupamento temático do Memorial (1 a 4); null para leituras complementares
  roteiro text,
  conceitos_chave text, -- um conceito por linha, usado como sugestão no Tutor
  complementar boolean not null default false, -- leitura fora da trilha numerada (ex: 2041)
  status text not null default 'futuro', -- 'futuro' | 'atual' | 'concluido'
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

-- Histórico de conversas do Tutor — pessoal por padrão, compartilhável com o grupo
create table tutor_conversas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfis(id) on delete cascade,
  encontro_id uuid references encontros(id) on delete set null,
  modo text not null, -- 'livre' | 'explicar' | 'perguntar' | 'criticar' | 'verificar' | 'conselho'
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

-- Memorial da Academia — fonte oficial de método, somente leitura para participantes
create table memorial (
  id uuid primary key default gen_random_uuid(),
  versao text not null,
  conteudo text,
  atualizado_em timestamptz default now()
);

-- Repertório crescente de perguntas para Conselhos, alimentado pelo grupo e pelo Tutor
create table perguntas_conselho (
  id uuid primary key default gen_random_uuid(),
  pergunta text not null,
  tema text,
  encontro_origem uuid references encontros(id) on delete set null,
  criado_por uuid references perfis(id),
  criado_em timestamptz default now()
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
alter table tutor_conversas enable row level security;
alter table tutor_mensagens enable row level security;
alter table memorial enable row level security;
alter table perguntas_conselho enable row level security;

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

-- tutor_conversas: cada um vê as próprias + as que outros marcaram como compartilhadas
create policy "tutor_conversas_select" on tutor_conversas
  for select to authenticated
  using (usuario_id = auth.uid() or compartilhada = true);

create policy "tutor_conversas_insert" on tutor_conversas
  for insert to authenticated
  with check (usuario_id = auth.uid());

create policy "tutor_conversas_update_propria" on tutor_conversas
  for update to authenticated
  using (usuario_id = auth.uid());

-- tutor_mensagens: segue a mesma visibilidade da conversa a que pertencem
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

-- memorial: leitura para todos autenticados; escrita só para a organizadora
create policy "memorial_select_autenticados" on memorial
  for select to authenticated using (true);

create policy "memorial_escrita_organizadora" on memorial
  for all to authenticated
  using (exists (select 1 from perfis where id = auth.uid() and papel = 'organizadora'))
  with check (exists (select 1 from perfis where id = auth.uid() and papel = 'organizadora'));

-- perguntas_conselho: leitura e escrita (sem exclusão) para todo autenticado
create policy "perguntas_conselho_select_autenticados" on perguntas_conselho
  for select to authenticated using (true);

create policy "perguntas_conselho_escrita_autenticados" on perguntas_conselho
  for insert to authenticated with check (true);

create policy "perguntas_conselho_update_autenticados" on perguntas_conselho
  for update to authenticated using (true);

-- ============================================================
-- CONTEÚDO SEMENTE — ENCONTROS
-- ============================================================

insert into encontros (numero, titulo, livro, autor, problema_governanca, trecho_em_estudo, ciclo, roteiro, complementar, status) values
(1, 'Encontro 1 — Cointeligência', 'Cointeligência', 'Ethan Mollick',
 'Como trabalhar e aprender com a IA sem transferir a ela a responsabilidade humana?',
 'Capítulos 1 a 3', 1,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 false, 'atual'),
(2, 'Encontro 2 — A Era da IA', 'A Era da IA', 'Henry Kissinger, Eric Schmidt e Daniel Huttenlocher',
 'Como a IA modifica conhecimento, poder, organizações e sociedade?',
 null, 1,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 false, 'futuro'),
(3, 'Encontro 3 — A Próxima Onda', 'A Próxima Onda', 'Mustafa Suleyman',
 'Como governar tecnologias de rápida difusão, elevado poder e difícil contenção?',
 null, 1,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 false, 'futuro'),
(4, 'Encontro 4 — O Dilema da Inovação', 'O Dilema da Inovação', 'Clayton Christensen',
 'Por que organizações bem administradas podem falhar diante de uma ruptura?',
 null, 2,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 false, 'futuro'),
(5, 'Encontro 5 — Só os Paranoicos Sobrevivem', 'Só os Paranoicos Sobrevivem', 'Andrew Grove',
 'Como reconhecer e enfrentar um ponto de inflexão estratégica?',
 null, 2,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 false, 'futuro'),
(6, 'Encontro 6 — Administrative Behavior', 'Administrative Behavior', 'Herbert Simon (capítulos selecionados)',
 'Como as organizações realmente tomam decisões sob racionalidade limitada?',
 null, 3,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 false, 'futuro'),
(7, 'Encontro 7 — Rápido e Devagar', 'Rápido e Devagar', 'Daniel Kahneman',
 'Que vieses podem comprometer a análise humana e também o uso da IA?',
 null, 3,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 false, 'futuro'),
(8, 'Encontro 8 — Introdução ao Pensamento Complexo', 'Introdução ao Pensamento Complexo', 'Edgar Morin',
 'Como evitar reduções excessivas diante de problemas interdependentes?',
 null, 4,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 false, 'futuro'),
(9, 'Encontro 9 — O Executivo Eficaz', 'O Executivo Eficaz', 'Peter Drucker (releitura dirigida)',
 'Como transformar conhecimento, prioridades e responsabilidade em ação eficaz?',
 null, 4,
 E'### Problema real\nUm problema concreto de governança ou tomada de decisão é apresentado ao grupo.\n\n### Leitura\nO livro do mês é debatido à luz desse problema.\n\n### Oficina de IA\nExercício prático com IA, usando prompts da Biblioteca.\n\n### Verificação crítica\nO grupo examina o que a IA produziu — premissas, evidências, limites.\n\n### Implicações para a governança\nO que isso muda para o papel do Conselho.\n\n### Síntese do grupo\nRegistro do que foi aprendido, para alimentar o próximo encontro.',
 false, 'futuro'),
(10, 'Leitura complementar — 2041', '2041', 'Kai-Fu Lee',
 'Para que futuros devemos preparar a empresa? Cenários e prospecção como ferramenta do Conselho.',
 null, null,
 null,
 true, 'futuro');

-- ============================================================
-- CONTEÚDO SEMENTE — PROMPTS
-- ============================================================

insert into prompts (titulo, categoria, texto, contexto_uso) values
('Interrogar premissas', 'Construir análises e cenários',
 'Aja como um analista crítico e cético. Vou apresentar uma decisão que estamos considerando. Liste as premissas implícitas por trás dela e, para cada uma, aponte o que precisaria ser verdade para que ela se sustente: [decisão]',
 'Use antes de fechar uma decisão importante.'),
('Separar fato de opinião', 'Pesquisar e verificar',
 'Vou colar um relatório. Separe, item a item, o que é fato verificável do que é opinião, interpretação ou projeção. Marque cada afirmação com uma dessas categorias: [relatório]',
 'Use ao ler relatórios e pareceres.'),
('Red team da estratégia', 'Usar IA em governança',
 'Aja como um advogado do diabo experiente. Vou apresentar uma estratégia. Aponte as três formas mais prováveis de ela falhar e que sinais indicariam, com antecedência, que cada uma está acontecendo: [estratégia]',
 'Use para testar uma proposta antes de aprová-la.'),
('Mapear stakeholders e vieses', 'Usar IA em governança',
 'Para a decisão a seguir, liste os principais interessados afetados, o interesse de cada um, e os vieses que podem estar influenciando a nossa própria análise: [decisão]',
 'Use quando a decisão afeta muitos grupos.'),
('Construir cenários', 'Construir análises e cenários',
 'Construa três cenários (otimista, mais provável e pessimista) para a questão a seguir num horizonte de cinco anos. Para cada um, indique os principais fatores que o separam dos outros: [questão]',
 'Use em discussões de longo prazo.');

-- ============================================================
-- CONTEÚDO SEMENTE — MEMORIAL
-- ============================================================
-- Conteúdo em branco de propósito — a organizadora cola o texto oficial pela tela do app.

insert into memorial (versao, conteudo) values ('2.0', null);
