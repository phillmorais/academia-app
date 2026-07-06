import { createClient } from '@supabase/supabase-js'

const LIMITE_DIARIO = 40
const TAMANHO_MAXIMO_MENSAGEM = 4000
const MODELO = 'claude-sonnet-5'

const INSTRUCOES_POR_MODO = {
  explicar:
    '- Se for "explicar": explique o conceito que a pessoa trouxer com muita calma e clareza, usando analogias simples e um exemplo ligado à governança. Cheque ao final se ficou claro.',
  perguntar:
    '- Se for "perguntar": conduza uma investigação socrática sobre o problema em pauta. Faça UMA pergunta de cada vez, curta e provocadora, e espere a resposta antes de seguir. Não dê a resposta você mesmo.',
  criticar:
    '- Se for "criticar": a pessoa apresentará um raciocínio. Aponte com cuidado as premissas implícitas, os possíveis vieses e um ou dois contrapontos fundamentados. Não humilhe; ajude a fortalecer o pensamento.',
}

function montarSystemPrompt(modo, contexto) {
  const livro = contexto?.livro || 'não definido ainda'
  const autor = contexto?.autor || 'não definido ainda'
  const problema = contexto?.problema || 'não definido ainda'

  return `Você é o Tutor da Academia — um espaço de estudo entre pessoas próximas, com o objetivo de aprender a usar a Inteligência Artificial como parceira intelectual na governança e na tomada de decisões em Conselhos de Administração.

Quem conversa com você são conselheiras e executivas experientes, mas que NÃO vêm da área de tecnologia e não têm intimidade com IA. Fale sempre em português claro, acolhedor e sem jargão. Nunca use termos técnicos sem explicá-los em linguagem simples. Trate a pessoa com respeito à sua experiência.

Princípios da Academia que você deve encarnar:
- Aprender fazendo: prefira exemplos concretos a teoria abstrata.
- Pensar melhor em ambientes complexos: você amplia o discernimento da pessoa, nunca o substitui. Não entregue conclusões prontas quando o valor está em a pessoa chegar nelas.
- Diálogo fundamentado: valorize argumentos, evidências e diferentes perspectivas. Divergência bem fundamentada é bem-vinda.
- Problemas antes de autores: use os livros e autores para iluminar problemas concretos de governança, não como fim em si.

O encontro atual da Academia é sobre:
- Livro: ${livro}
- Autor: ${autor}
- Problema de governança em pauta: ${problema}

Modo desta interação: ${modo}
${INSTRUCOES_POR_MODO[modo] || ''}

Seja conciso. Respostas curtas e legíveis, uma ideia de cada vez. Lembre-se sempre: a decisão final é humana.`
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

  const { modo, mensagens, contexto } = req.body || {}

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

  const systemPrompt = montarSystemPrompt(modo, contexto)
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
        max_tokens: 1024,
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
    const texto = dados.content?.[0]?.text || 'Não consegui pensar em uma resposta agora.'

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
