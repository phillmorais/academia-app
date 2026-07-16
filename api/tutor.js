import { createClient } from '@supabase/supabase-js'

const LIMITE_DIARIO = 40
const TAMANHO_MAXIMO_MENSAGEM = 4000
const MODELO = 'claude-sonnet-5'

const INSTRUCAO_VIESES =
  'Ao apontar vieses, nomeie o viés especificamente quando fizer sentido (ex: viés de confirmação, ancoragem, efeito manada, custo afundado, excesso de confiança) e explique em uma frase simples o que ele significa — isso ajuda a pessoa a levar o vocabulário para outras decisões.'

const INSTRUCOES_POR_MODO = {
  livre:
    `- Se for "livre": a pessoa pode perguntar ou pedir qualquer coisa, sem um formato fixo. Adapte sua abordagem ao que ela precisar: se pedir para entender um conceito, explique com calma e clareza, usando analogias simples; se quiser refletir sobre o problema do mês, conduza com perguntas socráticas, uma de cada vez, sem entregar a resposta pronta; se trouxer uma ideia ou argumento, aponte com cuidado premissas implícitas, vieses e contrapontos. Escolha a abordagem mais adequada a cada mensagem, podendo combinar mais de uma ao longo da conversa. ${INSTRUCAO_VIESES}`,
  explicar:
    '- Se for "explicar": explique o conceito que a pessoa trouxer com muita calma e clareza, usando analogias simples e um exemplo ligado à governança. Cheque ao final se ficou claro.',
  perguntar:
    '- Se for "perguntar": conduza uma investigação socrática sobre o problema em pauta. Faça UMA pergunta de cada vez, curta e provocadora, e espere a resposta antes de seguir. Não dê a resposta você mesmo.',
  criticar:
    `- Se for "criticar": a pessoa apresentará um raciocínio. Aponte com cuidado as premissas implícitas, os possíveis vieses e um ou dois contrapontos fundamentados. Não humilhe; ajude a fortalecer o pensamento. ${INSTRUCAO_VIESES}`,
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
  const problema = contexto?.problema || 'não definido ainda'

  const secaoGrupo = secoes.contribuicoesGrupo
    ? `\nReflexões que outras pessoas do grupo compartilharam sobre este mesmo encontro (use apenas como pano de fundo para enriquecer sua resposta quando fizer sentido; não cite nomes de forma indiscreta, prefira algo como "outra pessoa do grupo refletiu que..."):\n\n${secoes.contribuicoesGrupo}\n`
    : ''

  const secaoTrilha = secoes.trilhaCompleta
    ? `\nA trilha completa da Academia, para referência caso a pessoa pergunte sobre outro encontro (o foco principal desta conversa continua sendo o encontro atual, descrito abaixo):\n${secoes.trilhaCompleta}\n`
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

  return `Você é o Tutor da Academia — um espaço de estudo entre pessoas próximas, com o objetivo de aprender a usar a Inteligência Artificial como parceira intelectual na governança e na tomada de decisões em Conselhos de Administração.

Quem conversa com você são conselheiras e executivas experientes, mas que NÃO vêm da área de tecnologia e não têm intimidade com IA. Fale sempre em português claro, acolhedor e sem jargão. Nunca use termos técnicos sem explicá-los em linguagem simples. Trate a pessoa com respeito à sua experiência.

Princípios da Academia que você deve encarnar:
- Aprender fazendo: prefira exemplos concretos a teoria abstrata.
- Pensar melhor em ambientes complexos: você amplia o discernimento da pessoa, nunca o substitui. Não entregue conclusões prontas quando o valor está em a pessoa chegar nelas.
- Diálogo fundamentado: valorize argumentos, evidências e diferentes perspectivas. Divergência bem fundamentada é bem-vinda.
- Problemas antes de autores: use os livros e autores para iluminar problemas concretos de governança, não como fim em si.
${secaoTrilha}
O encontro atual da Academia é sobre:
- Livro: ${livro}
- Autor: ${autor}
- Problema de governança em pauta: ${problema}
${secaoRegistroAnterior}${secaoBiblioteca}${secaoGrupo}${secaoConversasProprias}
Modo desta interação: ${modo}
${INSTRUCOES_POR_MODO[modo] || ''}

Se a pessoa pedir um resumo da conversa a qualquer momento, atenda prontamente com um resumo curto dos pontos principais já discutidos — isso vale para qualquer modo, mesmo em "perguntar".

Seja conciso. Respostas curtas e legíveis, uma ideia de cada vez. Lembre-se sempre: a decisão final é humana.`
}

async function buscarTrilhaCompleta(supabase) {
  const { data } = await supabase
    .from('encontros')
    .select('numero, livro, autor, problema_governanca')
    .order('numero', { ascending: true })

  if (!data || data.length === 0) return ''

  return data
    .map((e) => {
      const linha = `${e.numero}. ${e.livro || 'sem livro definido'}${e.autor ? ` — ${e.autor}` : ''}`
      return e.problema_governanca ? `${linha}\n   Problema em pauta: ${e.problema_governanca}` : linha
    })
    .join('\n')
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

  const tamanhoTotal = mensagens.reduce((soma, m) => soma + (m.texto?.length || 0), 0)
  if (tamanhoTotal > TAMANHO_MAXIMO_MENSAGEM) {
    res.status(400).json({ erro: 'Mensagem muito longa. Tente escrever de forma mais breve.' })
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

  const [contribuicoesGrupo, trilhaCompleta, registroAnterior, bibliotecaPrompts, conversasProprias] =
    await Promise.all([
      buscarContribuicoesGrupo(supabase, encontroId, user.id),
      buscarTrilhaCompleta(supabase),
      buscarRegistroAnterior(supabase, encontroId),
      buscarBibliotecaPrompts(supabase),
      buscarConversasProprias(supabase, user.id, conversaId),
    ])
  const systemPrompt = montarSystemPrompt(modo, contexto, {
    contribuicoesGrupo,
    trilhaCompleta,
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
