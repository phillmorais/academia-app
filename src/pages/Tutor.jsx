import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { MODOS, rotuloModo } from '../lib/tutorModos'
import MensagemMarkdown from '../components/MensagemMarkdown'
import BotaoCopiar from '../components/BotaoCopiar'

function TelaEscolha({ aoEscolher }) {
  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 px-1">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Tutor</h1>
        <Link to="/tutor/historico" className="text-amber-800 font-medium">
          Conversas anteriores
        </Link>
      </div>
      <p className="text-stone-500 mb-6 px-1">O que você quer fazer agora?</p>
      <div className="flex flex-col gap-4">
        {MODOS.map((modo) => (
          <button
            key={modo.chave}
            onClick={() => aoEscolher(modo.chave)}
            className="text-left bg-white border border-stone-200 rounded-2xl p-5 active:bg-stone-50"
          >
            <p className="text-xl font-semibold text-stone-800 mb-1">{modo.titulo}</p>
            <p className="text-stone-500 leading-snug">{modo.descricao}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Tutor() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [encontroAtual, setEncontroAtual] = useState(null)
  const [modo, setModo] = useState(null)
  const [conversaId, setConversaId] = useState(null)
  const [compartilhada, setCompartilhada] = useState(false)
  const [mensagens, setMensagens] = useState([])
  const [entrada, setEntrada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fimDaLista = useRef(null)

  useEffect(() => {
    ;(async () => {
      const continuarId = searchParams.get('continuar')

      if (continuarId) {
        const [{ data: conversa }, { data: msgs }] = await Promise.all([
          supabase.from('tutor_conversas').select('*').eq('id', continuarId).single(),
          supabase
            .from('tutor_mensagens')
            .select('*')
            .eq('conversa_id', continuarId)
            .order('criado_em', { ascending: true }),
        ])

        if (conversa) {
          let encontro = null
          if (conversa.encontro_id) {
            const resp = await supabase.from('encontros').select('*').eq('id', conversa.encontro_id).single()
            encontro = resp.data
          }
          setEncontroAtual(encontro)
          setModo(conversa.modo)
          setConversaId(conversa.id)
          setCompartilhada(conversa.compartilhada)
          setMensagens((msgs || []).map((m) => ({ papel: m.papel, texto: m.texto })))
        }
        return
      }

      const { data: atual } = await supabase.from('encontros').select('*').eq('status', 'atual').maybeSingle()
      setEncontroAtual(atual)

      const modoDeepLink = searchParams.get('modo')
      const conceitoDeepLink = searchParams.get('conceito')
      if (modoDeepLink && MODOS.some((m) => m.chave === modoDeepLink)) {
        iniciarConversa(modoDeepLink, atual, conceitoDeepLink || undefined)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function salvarMensagem(idConversa, papel, texto) {
    if (!idConversa) return
    await supabase.from('tutor_mensagens').insert({ conversa_id: idConversa, papel, texto })
  }

  async function enviarParaTutor(modoEscolhido, historico, idConversa, encontroParaContexto) {
    setEnviando(true)
    setErro('')
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const resposta = await fetch('/api/tutor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          modo: modoEscolhido,
          mensagens: historico,
          encontroId: encontroParaContexto?.id ?? null,
          contexto: encontroParaContexto
            ? {
                livro: encontroParaContexto.livro,
                autor: encontroParaContexto.autor,
                problema: encontroParaContexto.problema_governanca,
              }
            : null,
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.depuracao ? `${dados.erro} [${dados.depuracao}]` : dados.erro)
      }

      setMensagens((atual) => [...atual, { papel: 'tutor', texto: dados.resposta }])
      await salvarMensagem(idConversa, 'tutor', dados.resposta)
    } catch (e) {
      setErro(e.message || 'O Tutor não respondeu agora. Tente novamente em instantes.')
    } finally {
      setEnviando(false)
    }
  }

  async function enviarTexto(texto, opcoes = {}) {
    const modoUsado = opcoes.modoUsado ?? modo
    const idConversaUsada = 'idConversaUsada' in opcoes ? opcoes.idConversaUsada : conversaId
    const encontroUsado = 'encontroUsado' in opcoes ? opcoes.encontroUsado : encontroAtual
    const baseHistorico = opcoes.baseHistorico ?? mensagens

    const nova = { papel: 'usuario', texto }
    const historico = [...baseHistorico, nova]
    setMensagens(historico)
    await salvarMensagem(idConversaUsada, 'usuario', nova.texto)
    await enviarParaTutor(modoUsado, historico, idConversaUsada, encontroUsado)
  }

  async function iniciarConversa(chave, encontroParaContexto, mensagemInicial) {
    setModo(chave)
    setMensagens([])
    setErro('')
    setCompartilhada(false)

    const { data: conversa } = await supabase
      .from('tutor_conversas')
      .insert({
        usuario_id: usuario.id,
        encontro_id: encontroParaContexto?.id ?? null,
        modo: chave,
      })
      .select()
      .single()

    setConversaId(conversa?.id ?? null)

    if (chave === 'perguntar') {
      const primeira = { papel: 'usuario', texto: 'Podemos começar.' }
      setMensagens([primeira])
      enviarParaTutor(chave, [primeira], conversa?.id, encontroParaContexto)
    } else if (mensagemInicial) {
      enviarTexto(mensagemInicial, {
        modoUsado: chave,
        idConversaUsada: conversa?.id,
        encontroUsado: encontroParaContexto,
        baseHistorico: [],
      })
    }
  }

  function escolherModo(chave) {
    iniciarConversa(chave, encontroAtual)
  }

  function escolherConceito(conceito) {
    enviarTexto(conceito)
  }

  async function enviarMensagem(e) {
    e.preventDefault()
    if (!entrada.trim() || enviando) return
    const texto = entrada.trim()
    setEntrada('')
    await enviarTexto(texto)
  }

  async function alternarCompartilhamento() {
    const novoValor = !compartilhada
    setCompartilhada(novoValor)
    if (conversaId) {
      await supabase.from('tutor_conversas').update({ compartilhada: novoValor }).eq('id', conversaId)
    }
  }

  function trocarDeModo() {
    setModo(null)
    setMensagens([])
    setErro('')
    setConversaId(null)
    setCompartilhada(false)
    navigate('/tutor', { replace: true })
    supabase
      .from('encontros')
      .select('*')
      .eq('status', 'atual')
      .maybeSingle()
      .then(({ data }) => setEncontroAtual(data))
  }

  if (!modo) {
    return <TelaEscolha aoEscolher={escolherModo} />
  }

  const aguardandoPrimeiraEntrada = modo !== 'perguntar' && mensagens.length === 0
  const conceitosSugeridos =
    modo === 'explicar'
      ? (encontroAtual?.conceitos_chave || '')
          .split('\n')
          .map((c) => c.trim())
          .filter(Boolean)
      : []

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] max-w-2xl mx-auto">
      <div className="px-4 pt-6 pb-3 border-b border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold text-stone-900">{rotuloModo(modo)}</h1>
          <button onClick={trocarDeModo} className="text-amber-800 font-medium">
            Trocar
          </button>
        </div>
        {mensagens.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-stone-500">
            <input type="checkbox" checked={compartilhada} onChange={alternarCompartilhamento} />
            Compartilhar esta conversa com o grupo
          </label>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {aguardandoPrimeiraEntrada && (
          <div>
            <p className="text-stone-500 leading-relaxed mb-3">
              {modo === 'explicar'
                ? 'Escreva abaixo o conceito que você quer entender melhor.'
                : 'Escreva abaixo a ideia ou o argumento que você quer colocar à prova.'}
            </p>
            {conceitosSugeridos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {conceitosSugeridos.map((conceito) => (
                  <button
                    key={conceito}
                    onClick={() => escolherConceito(conceito)}
                    className="bg-white border border-stone-300 rounded-full px-4 py-2 text-stone-700 font-medium active:bg-stone-50"
                  >
                    {conceito}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {mensagens
          .filter((m) => !(modo === 'perguntar' && m.texto === 'Podemos começar.'))
          .map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                m.papel === 'usuario'
                  ? 'self-end bg-stone-900 text-white'
                  : 'self-start bg-white border border-stone-200 text-stone-700'
              }`}
            >
              {m.papel === 'tutor' ? <MensagemMarkdown>{m.texto}</MensagemMarkdown> : m.texto}
              {m.papel === 'tutor' && (
                <div className="mt-2 pt-2 border-t border-stone-100">
                  <BotaoCopiar texto={m.texto} className="text-amber-800" />
                </div>
              )}
            </div>
          ))}

        {enviando && <p className="text-stone-400 self-start px-1">O Tutor está pensando...</p>}
        {erro && <p className="text-red-700 px-1">{erro}</p>}
        <div ref={fimDaLista} />
      </div>

      <form onSubmit={enviarMensagem} className="p-4 border-t border-stone-200 flex gap-3">
        <input
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          placeholder="Escreva aqui..."
          className="flex-1 text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
        />
        <button
          type="submit"
          disabled={enviando || !entrada.trim()}
          className="bg-stone-900 text-white px-5 rounded-xl font-semibold disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
