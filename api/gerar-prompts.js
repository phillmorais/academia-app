import { createClient } from '@supabase/supabase-js'
import { COMPETENCIAS } from '../src/lib/competencias.js'

const MODELO = 'claude-sonnet-5'
const QUANTIDADE_SUGESTOES = 4

function montarPrompt(encontro, quantidade) {
  return `Você ajuda a preparar o material da Academia, um grupo de estudo sobre o uso da Inteligência Artificial como parceira intelectual na governança e na tomada de decisões em Conselhos de Administração.

Gere exatamente ${quantidade} sugestões de prompts prontos para o encontro abaixo:
- Livro: ${encontro.livro || 'não definido'}
- Autor: ${encontro.autor || 'não definido'}
- Pergunta central em pauta: ${encontro.problema_governanca || 'não definida'}

Cada prompt deve seguir a estrutura de um bom pedido à IA:
- Um papel claro que a IA deve assumir (ex: "Aja como um...")
- Um pedido claro, ligado à pergunta central acima
- Um placeholder entre colchetes (ex: [decisão], [relatório], [estratégia]) onde a pessoa vai colar o material dela
- Limites claros sobre o que a IA não deve fazer

Quem vai usar esses prompts são conselheiras e executivas experientes, mas sem intimidade com IA — evite jargão técnico no texto do prompt.

Cada prompt deve ser classificado em exatamente uma destas competências (a Academia organiza os prompts por competência transferível entre ferramentas, não por tipo de análise): ${COMPETENCIAS.map((c) => `"${c}"`).join(', ')}.

Responda APENAS com um array JSON válido, sem nenhum texto antes ou depois, neste formato exato:
[{"titulo": "...", "categoria": "uma das competências listadas acima, exatamente como escrita", "texto": "o prompt completo", "contexto_uso": "uma frase curta dizendo quando usar"}]`
}

function extrairJson(texto) {
  try {
    return JSON.parse(texto.trim())
  } catch {
    const inicio = texto.indexOf('[')
    const fim = texto.lastIndexOf(']')
    if (inicio === -1 || fim === -1) return null
    try {
      return JSON.parse(texto.slice(inicio, fim + 1))
    } catch {
      return null
    }
  }
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

  const { data: perfil } = await supabase.from('perfis').select('papel').eq('id', user.id).single()

  if (perfil?.papel !== 'organizadora') {
    res.status(403).json({ erro: 'Só a organizadora pode gerar sugestões de prompts.' })
    return
  }

  const { encontroId } = req.body || {}
  if (!encontroId) {
    res.status(400).json({ erro: 'Encontro não informado.' })
    return
  }

  const { data: encontro, error: erroEncontro } = await supabase
    .from('encontros')
    .select('livro, autor, problema_governanca')
    .eq('id', encontroId)
    .single()

  if (erroEncontro || !encontro) {
    res.status(404).json({ erro: 'Encontro não encontrado.' })
    return
  }

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
        max_tokens: 3072,
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: montarPrompt(encontro, QUANTIDADE_SUGESTOES) }],
      }),
    })

    if (!respostaClaude.ok) {
      const detalhe = await respostaClaude.text()
      console.error('Erro na API do Claude:', detalhe)
      res.status(502).json({ erro: 'Não conseguimos gerar sugestões agora. Tente novamente.' })
      return
    }

    const dados = await respostaClaude.json()
    const texto = dados.content?.find((bloco) => bloco.type === 'text')?.text
    const sugestoes = texto && extrairJson(texto)

    if (!sugestoes || !Array.isArray(sugestoes)) {
      console.error('Resposta sem JSON válido:', texto)
      res.status(502).json({ erro: 'A resposta veio num formato inesperado. Tente novamente.' })
      return
    }

    res.status(200).json({ sugestoes })
  } catch (erro) {
    console.error('Erro ao gerar sugestões de prompts:', erro)
    res.status(500).json({ erro: 'Algo deu errado ao gerar as sugestões. Tente novamente.' })
  }
}
