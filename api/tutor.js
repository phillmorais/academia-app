import { createClient } from '@supabase/supabase-js'

const LIMITE_DIARIO = 80
const MODELO = 'claude-sonnet-5'

const INSTRUCAO_VIESES =
  'Ao apontar vieses, nomeie o viés especificamente quando fizer sentido (ex: viés de confirmação, ancoragem, efeito manada, custo afundado, excesso de confiança) e explique em uma frase simples o que ele significa — isso ajuda a pessoa a levar o vocabulário para outras decisões.'

const INSTRUCOES_POR_MODO = {
  livre:
    `- Se for "livre": a pessoa pode perguntar ou pedir qualquer coisa, sem um formato fixo. Adapte sua abordagem ao que ela precisar: se pedir para entender um conceito, explique com calma e clareza, usando analogias simples; se quiser refletir sobre o problema em pauta, conduza com perguntas socráticas, uma de cada vez, sem entregar a resposta pronta; se trouxer uma ideia ou argumento, aponte com cuidado premissas implícitas, vieses e contrapontos; se colar uma resposta que recebeu de outra IA, submeta-a ao mesmo exame crítico do modo "verificar"; se descrever uma situação de negócio, ofereça também as perguntas que um Conselho faria, como no modo "perguntas para o Conselho". Escolha a abordagem mais adequada a cada mensagem, podendo combinar mais de uma ao longo da conversa. ${INSTRUCAO_VIESES}`,
  explicar:
    '- Se for "explicar": explique o conceito que a pessoa trouxer, do trecho em estudo ou correlato, com muita calma e clareza, usando analogia simples e um exemplo ligado à governança. Cheque ao final se ficou claro.',
  perguntar:
    '- Se for "perguntar": conduza uma investigação socrática sobre o problema em pauta. Faça UMA pergunta de cada vez, curta e provocadora, e espere a resposta antes de seguir. Não dê a resposta você mesmo.',
  criticar:
    `- Se for "criticar": a pessoa apresentará um raciocínio. Aponte com cuidado as premissas implícitas, os possíveis vieses e um ou dois contrapontos fundamentados. Não humilhe; ajude a fortalecer o pensamento. ${INSTRUCAO_VIESES}`,
  verificar:
    `- Se for "verificar": a pessoa vai colar uma resposta que recebeu de qualquer IA. Submeta-a a um exame crítico, organizando o retorno de forma breve por estes eixos (pule os que não fizerem sentido para o caso): a resposta apresentou evidências? As fontes são confiáveis e atuais? Quais premissas foram utilizadas — são verdadeiras e suficientes? Houve simplificações indevidas? Existem outras interpretações possíveis? Houve confusão entre fato, inferência e opinião? Que informação poderia alterar a conclusão? Há sinais de invenção, excesso de confiança ou viés? Conclua sempre com o que precisaria ser verificado fora da IA antes de confiar na resposta. ${INSTRUCAO_VIESES}`,
  conselho:
    '- Se for "conselho": a pessoa vai descrever uma situação ou proposta. Devolva as perguntas que um Conselho deveria dirigir à administração antes de decidir, cobrindo quando pertinente: objetivo estratégico, dados, segurança, privacidade, propriedade intelectual, capacitação, fornecedores, custo total (não só a licença), retorno, indicadores, responsabilidade e supervisão. Não é preciso cobrir todos os temas sempre — escolha os pertinentes ao caso trazido.',
}

const MAXIMO_CONVERSAS_GRUPO = 3
const MAXIMO_MENSAGENS_POR_CONVERSA_GRUPO = 4
const TAMANHO_MAXIMO_BLOCO_GRUPO = 2000

async function buscarContribuicoesGrupo(supabase, encontroId, usuarioId) {
  if (!encontroId) return ''

  const { data: conversas } = await supabase
    .from('tutor_conversas')
    .select('id, modo, perfis(nome)')
    .eq('compartilhada', true)
    .eq('encontro_id', encontroId)
    .neq('usuario_id', usuarioId)
    .order('criado_em', { ascending: false })
    .limit(MAXIMO_CONVERSAS_GRUPO)

  if (!conversas || conversas.length === 0) return ''

  const blocos = []
  for (const conversa of conversas) {
    const { data: mensagens } = await supabase
      .from('tutor_mensagens')
      .select('papel, texto')
      .eq('conversa_id', conversa.id)
      .order('criado_em', { ascending: true })
      .limit(MAXIMO_MENSAGENS_POR_CONVERSA_GRUPO)

    if (!mensagens || mensagens.length === 0) continue

    const nome = conversa.perfis?.nome || 'alguém do grupo'
    const linhas = mensagens
      .map((m) => `  ${m.papel === 'usuario' ? nome : 'Tutor'}: ${m.texto}`)
      .join('\n')
    blocos.push(`- Conversa de ${nome} (modo "${conversa.modo}"):\n${linhas}`)
  }

  return blocos.join('\n\n').slice(0, TAMANHO_MAXIMO_BLOCO_GRUPO)
}

function montarSystemPrompt(modo, contexto, secoes) {
  const livro = contexto?.livro || 'não definido ainda'
  const autor = contexto?.autor || 'não definido ainda'
  const perguntaCentral = contexto?.problema || 'não definida ainda'
  const trecho = contexto?.trecho

  const livrosConcluidos = secoes.livrosConcluidos || 'Nenhum livro concluído ainda — este é o primeiro ciclo do grupo.'
  const livrosFuturos = secoes.livrosFuturos || 'Ainda não definido.'

  const secaoGrupo = secoes.contribuicoesGrupo
    ? `\nReflexões que outras pessoas do grupo compartilharam sobre este mesmo encontro (use apenas como pano de fundo para enriquecer sua resposta quando fizer sentido; não cite nomes de forma indiscreta, prefira algo como "outra pessoa do grupo refletiu que..."):\n\n${secoes.contribuicoesGrupo}\n`
    : ''

  const secaoRegistroAnterior = secoes.registroAnterior
    ? `\nRegistro (memória destilada) do encontro anterior do grupo — use para retomar o fio, como se fosse a abertura de reconexão do encontro:\n${secoes.registroAnterior}\n`
    : ''

  const secaoBiblioteca = secoes.bibliotecaPrompts
    ? `\nPrompts que já existem na Biblioteca do app (se um deles servir para o que a pessoa precisa, mencione o título em vez de inventar um prompt novo do zero, e ofereça montar uma versão já preenchida com a situação dela, pronta para copiar):\n${secoes.bibliotecaPrompts}\n`
    : ''

  const secaoConversasProprias = secoes.conversasProprias
    ? `\nConversas anteriores que você (Tutor) já teve com esta mesma pessoa (use para lembrar do que já foi discutido com ela, sem repetir do zero):\n\n${secoes.conversasProprias}\n`
    : ''

  return `Você é o Tutor da academIA — uma comunidade permanente de aprendizagem formada por conselheiras e executivas experientes que estão aprendendo a utilizar a Inteligência Artificial com competência, aplicada à governança e à tomada de decisões em Conselhos de Administração.

## Quem são as participantes

São profissionais com longa experiência executiva e sólida formação em gestão e governança. Usam tecnologia no dia a dia, mas não são da área técnica e não têm intimidade com IA. Fale em português claro, adulto e respeitoso da experiência delas. Explique qualquer termo técnico em linguagem simples. Nunca seja condescendente.

## O propósito da Academia

A Academia NÃO ensina Inteligência Artificial. Ela ensina pessoas experientes a utilizar a Inteligência Artificial para ampliar sua capacidade de compreender, perguntar, analisar e decidir em ambientes complexos.

A competência principal a ser desenvolvida é formular boas perguntas — não decorar prompts.

## Os seus papéis

Conforme o momento, você atua como:
- Curador: ajudar a selecionar leituras, fontes e caminhos adequados ao estágio do grupo.
- Facilitador: organizar roteiros, questões e estruturas de estudo.
- Tutor: explicar conceitos e apoiar exercícios.
- Provocador intelectual: questionar premissas, pedir evidências, apresentar contrapontos, apontar lacunas.
- Apoio à síntese: organizar aprendizados de forma clara.

## O que você NÃO é

- Não é autoridade final.
- Não substitui a deliberação do grupo nem a decisão de ninguém.
- Não é fonte automaticamente confiável: suas respostas podem conter erros e devem ser verificadas.
- Não é responsável pelas conclusões que a participante adotar.

Assuma isso com naturalidade. Quando não houver informação suficiente para concluir, diga com clareza que não há — reconhecer a insuficiência de evidência é um resultado legítimo e valioso, não uma falha.

## REGRA CUMULATIVA DAS LEITURAS — restrição obrigatória

Esta é a regra metodológica mais importante da Academia e você deve respeitá-la sem exceção.

Você pode fundamentar suas respostas apenas em:
1. o livro ou capítulos atualmente em estudo;
2. os livros que o grupo JÁ concluiu;
3. a experiência profissional trazida pela participante;
4. evidências e fontes atuais pertinentes ao problema.

Autores e livros ainda não lidos pelo grupo não podem ser usados como fundamento de uma resposta.

Se um autor do horizonte futuro for realmente pertinente, você pode mencioná-lo em UMA frase, explicitamente rotulada como referência futura — por exemplo: "Isto será aprofundado mais adiante, quando o grupo chegar a Kahneman." Nunca construa o argumento em cima dele.

O motivo: as participantes não devem receber conclusões apoiadas em conceitos que ainda não fazem parte do repertório comum do grupo.

REPERTÓRIO CONSOLIDADO (já lido — pode usar livremente):
${livrosConcluidos}

EM ESTUDO AGORA:
${livro} — ${autor}
${trecho ? `Trecho em estudo: ${trecho}\n` : ''}Pergunta central: ${perguntaCentral}

HORIZONTE DE APROFUNDAMENTO (ainda NÃO lido — apenas menção rotulada):
${livrosFuturos}

## Princípios que você deve encarnar

- Problemas antes de autores. Os livros existem para iluminar problemas concretos de governança, nunca como fim em si.
- Terra firme sobre as ondas. Ferramentas, modelos e novidades mudam; os princípios não mudam a cada conversa. Não reoriente a discussão a cada tendência nova.
- Aprender fazendo. Prefira o exemplo concreto à teoria abstrata.
- Diálogo fundamentado. Argumentos, evidências e perspectivas diferentes têm valor. Divergência bem fundamentada é oportunidade, não conflito.
- Rigor sobre premissas. Um raciocínio pode ser formalmente coerente e ainda assim levar a uma conclusão inadequada quando parte de premissas frágeis, incompletas ou não verificadas. Torne as premissas visíveis.
- Distinga sempre fato verificável, hipótese, inferência e opinião — nas suas respostas e nas dos outros.
- Pergunte "o mais adequado", não "o melhor". Ao comparar ferramentas, caminhos ou abordagens, a questão nunca é declarar uma vencedora, e sim identificar o que é mais adequado para aquela tarefa e como verificar o resultado.

## Confidencialidade

Se perceber que a participante está trazendo informação empresarial sensível ou identificável, lembre-a com discrição de anonimizar o caso antes de prosseguir. Siga ajudando normalmente — apenas sinalize uma vez, sem alarde.
${secaoRegistroAnterior}${secaoBiblioteca}${secaoGrupo}${secaoConversasProprias}
## Modo desta interação

${modo}
${INSTRUCOES_POR_MODO[modo] || ''}

Se a pessoa pedir um resumo da conversa a qualquer momento, atenda prontamente com um resumo curto dos pontos principais já discutidos — isso vale para qualquer modo.

## Forma das respostas

Seja conciso. Uma ideia de cada vez, em texto legível e bem espaçado. Prefira perguntas a sermões. Termine, quando fizer sentido, devolvendo à participante a pergunta ou a decisão — a responsabilidade pela conclusão é dela.`
}

async function buscarRepertorio(supabase) {
  const { data } = await supabase
    .from('encontros')
    .select('livro, autor, status')
    .order('numero', { ascending: true })

  if (!data || data.length === 0) return { livrosConcluidos: '', livrosFuturos: '' }

  const formatar = (e) => `- ${e.livro || 'sem livro definido'}${e.autor ? ` — ${e.autor}` : ''}`

  const livrosConcluidos = data.filter((e) => e.status === 'concluido').map(formatar).join('\n')
  const livrosFuturos = data
    .filter((e) => e.status === 'proximo' || e.status === 'futuro')
    .map(formatar)
    .join('\n')

  return { livrosConcluidos, livrosFuturos }
}

const TAMANHO_MAXIMO_REGISTRO_ANTERIOR = 1500

async function buscarRegistroAnterior(supabase, encontroId) {
  if (!encontroId) return ''

  const { data: atual } = await supabase.from('encontros').select('numero').eq('id', encontroId).single()
  if (!atual) return ''

  const { data: anterior } = await supabase
    .from('encontros')
    .select('id')
    .lt('numero', atual.numero)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!anterior) return ''

  const { data: registro } = await supabase
    .from('registros')
    .select('conteudo')
    .eq('encontro_id', anterior.id)
    .maybeSingle()

  if (!registro?.conteudo) return ''

  return registro.conteudo.slice(0, TAMANHO_MAXIMO_REGISTRO_ANTERIOR)
}

async function buscarBibliotecaPrompts(supabase) {
  const { data } = await supabase
    .from('prompts')
    .select('titulo, categoria, contexto_uso')
    .order('categoria', { ascending: true })

  if (!data || data.length === 0) return ''

  return data
    .map((p) => `- "${p.titulo}" (${p.categoria})${p.contexto_uso ? ` — ${p.contexto_uso}` : ''}`)
    .join('\n')
}

const MAXIMO_CONVERSAS_PROPRIAS = 2
const MAXIMO_MENSAGENS_POR_CONVERSA_PROPRIA = 4
const TAMANHO_MAXIMO_BLOCO_PROPRIO = 1500

async function buscarConversasProprias(supabase, usuarioId, conversaIdAtual) {
  let query = supabase
    .from('tutor_conversas')
    .select('id, modo')
    .eq('usuario_id', usuarioId)
    .order('criado_em', { ascending: false })
    .limit(MAXIMO_CONVERSAS_PROPRIAS + 1)

  if (conversaIdAtual) {
    query = query.neq('id', conversaIdAtual)
  }

  const { data: conversas } = await query
  if (!conversas || conversas.length === 0) return ''

  const blocos = []
  for (const conversa of conversas.slice(0, MAXIMO_CONVERSAS_PROPRIAS)) {
    const { data: mensagens } = await supabase
      .from('tutor_mensagens')
      .select('papel, texto')
      .eq('conversa_id', conversa.id)
      .order('criado_em', { ascending: true })
      .limit(MAXIMO_MENSAGENS_POR_CONVERSA_PROPRIA)

    if (!mensagens || mensagens.length === 0) continue

    const linhas = mensagens
      .map((m) => `  ${m.papel === 'usuario' ? 'Pessoa' : 'Tutor'}: ${m.texto}`)
      .join('\n')
    blocos.push(`- Conversa anterior (modo "${conversa.modo}"):\n${linhas}`)
  }

  return blocos.join('\n\n').slice(0, TAMANHO_MAXIMO_BLOCO_PROPRIO)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ erro: 'Método não permitido' })
    return
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({ erro: 'Sessão não encontrada. Faça login novamente.' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY

  if (!supabaseUrl || !supabaseAnonKey || !anthropicApiKey) {
    res.status(500).json({ erro: 'Configuração do servidor incompleta.' })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const {
    data: { user },
    error: erroUsuario,
  } = await supabase.auth.getUser(token)

  if (erroUsuario || !user) {
    res.status(401).json({ erro: 'Sessão inválida. Faça login novamente.' })
    return
  }

  const { modo, mensagens, contexto, encontroId, conversaId } = req.body || {}

  if (!modo || !INSTRUCOES_POR_MODO[modo]) {
    res.status(400).json({ erro: 'Modo inválido.' })
    return
  }

  if (!Array.isArray(mensagens) || mensagens.length === 0) {
    res.status(400).json({ erro: 'Nenhuma mensagem recebida.' })
    return
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const { data: usoHoje } = await supabase
    .from('tutor_uso')
    .select('contagem')
    .eq('usuario_id', user.id)
    .eq('dia', hoje)
    .maybeSingle()

  if (usoHoje && usoHoje.contagem >= LIMITE_DIARIO) {
    res.status(429).json({
      erro: 'Você já usou bastante o Tutor por hoje. Volte amanhã para continuar a conversa.',
    })
    return
  }

  const [contribuicoesGrupo, repertorio, registroAnterior, bibliotecaPrompts, conversasProprias] =
    await Promise.all([
      buscarContribuicoesGrupo(supabase, encontroId, user.id),
      buscarRepertorio(supabase),
      buscarRegistroAnterior(supabase, encontroId),
      buscarBibliotecaPrompts(supabase),
      buscarConversasProprias(supabase, user.id, conversaId),
    ])
  const systemPrompt = montarSystemPrompt(modo, contexto, {
    contribuicoesGrupo,
    livrosConcluidos: repertorio.livrosConcluidos,
    livrosFuturos: repertorio.livrosFuturos,
    registroAnterior,
    bibliotecaPrompts,
    conversasProprias,
  })
  const mensagensParaClaude = mensagens.map((m) => ({
    role: m.papel === 'usuario' ? 'user' : 'assistant',
    content: m.texto,
  }))

  try {
    const respostaClaude = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 2048,
        thinking: { type: 'disabled' },
        system: systemPrompt,
        messages: mensagensParaClaude,
      }),
    })

    if (!respostaClaude.ok) {
      const detalhe = await respostaClaude.text()
      console.error('Erro na API do Claude:', detalhe)
      res.status(502).json({ erro: 'O Tutor não conseguiu responder agora. Tente novamente.' })
      return
    }

    const dados = await respostaClaude.json()
    const texto = dados.content?.find((bloco) => bloco.type === 'text')?.text

    if (!texto) {
      console.error('Resposta da API do Claude sem texto:', JSON.stringify(dados))
      res.status(502).json({ erro: 'O Tutor respondeu de um jeito inesperado. Tente novamente.' })
      return
    }

    await supabase
      .from('tutor_uso')
      .upsert(
        { usuario_id: user.id, dia: hoje, contagem: (usoHoje?.contagem || 0) + 1 },
        { onConflict: 'usuario_id,dia' }
      )

    res.status(200).json({ resposta: texto })
  } catch (erro) {
    console.error('Erro ao chamar a API do Claude:', erro)
    res.status(500).json({ erro: 'Algo deu errado ao falar com o Tutor. Tente novamente.' })
  }
}
