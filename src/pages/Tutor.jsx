import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { MODOS, rotuloModo } from '../lib/tutorModos'
import { escolherEncontroDestaque } from '../lib/encontros'
import MensagemMarkdown from '../components/MensagemMarkdown'
import BotaoCopiar from '../components/BotaoCopiar'
import CampoAutoAjustavel from '../components/CampoAutoAjustavel'

function BotaoSalvarConselho({ texto, encontroId, usuarioId }) {
  const [estado, setEstado] = useState('parado') // 'parado' | 'salvando' | 'salvo'

  async function salvar() {
    setEstado('salvando')
    const { error } = await supabase.from('perguntas_conselho').insert({
      pergunta: texto,
      encontro_origem: encontroId ?? null,
      criado_por: usuarioId,
    })
    setEstado(error ? 'parado' : 'salvo')
  }

  return (
    <button onClick={salvar} disabled={estado !== 'parado'} className="text-amber-800 font-medium text-sm">
      {estado === 'salvo' ? 'Salvo no repertório!' : estado === 'salvando' ? 'Salvando...' : 'Salvar no Repertório do Conselho'}
    </button>
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

      const { data: todos } = await supabase.from('encontros').select('*').order('numero', { ascending: true })
      const atual = escolherEncontroDestaque(todos)
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
          conversaId: idConversa ?? null,
          encontroId: encontroParaContexto?.id ?? null,
          contexto: encontroParaContexto
            ? {
                livro: encontroParaContexto.livro,
                autor: encontroParaContexto.autor,
                problema: encontroParaContexto.problema_governanca,
                trecho: encontroParaContexto.trecho_em_estudo,
              }
            : null,
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.erro)
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

    if (chave === 'perguntar' && !mensagemInicial) {
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

  async function enviarMensagem(e) {
    e.preventDefault()
    if (!entrada.trim() || enviando) return
    const texto = entrada.trim()
    setEntrada('')

    if (!conversaId) {
      await iniciarConversa('livre', encontroAtual, texto)
    } else {
      await enviarTexto(texto)
    }
  }

  async function alternarCompartilhamento() {
    const novoValor = !compartilhada
    setCompartilhada(novoValor)
    if (conversaId) {
      await supabase.from('tutor_conversas').update({ compartilhada: novoValor }).eq('id', conversaId)
    }
  }

  async function pedirResumo() {
    if (enviando) return
    await enviarTexto('Pode fazer um resumo curto do que conversamos até agora?')
  }

  function novaConversa() {
    setModo(null)
    setMensagens([])
    setErro('')
    setConversaId(null)
    setCompartilhada(false)
    navigate('/tutor', { replace: true })
    supabase
      .from('encontros')
      .select('*')
      .order('numero', { ascending: true })
      .then(({ data }) => setEncontroAtual(escolherEncontroDestaque(data)))
  }

  const conceitosSugeridos = (encontroAtual?.conceitos_chave || '')
    .split('\n')
    .map((c) => c.trim())
    .filter(Boolean)

  const sugestoes = [
    ...conceitosSugeridos.map((conceito) => ({
      chave: `conceito-${conceito}`,
      rotulo: conceito,
      aoTocar: () => iniciarConversa('explicar', encontroAtual, `Me explique com calma o conceito: ${conceito}`),
    })),
    ...(conceitosSugeridos.length === 0
      ? [
          {
            chave: 'explicar',
            rotulo: 'Me explique um conceito com calma',
            aoTocar: () =>
              iniciarConversa('explicar', encontroAtual, 'Quero entender melhor um conceito do encontro atual.'),
          },
        ]
      : []),
    {
      chave: 'perguntar',
      rotulo: 'Me faça perguntas sobre o problema deste mês',
      aoTocar: () => iniciarConversa('perguntar', encontroAtual),
    },
    {
      chave: 'criticar',
      rotulo: 'Quero testar uma ideia minha',
      aoTocar: () => iniciarConversa('criticar', encontroAtual, 'Quero testar um raciocínio meu com você.'),
    },
    {
      chave: 'verificar',
      rotulo: 'Vamos verificar esta resposta',
      aoTocar: () => iniciarConversa('verificar', encontroAtual, 'Quero verificar uma resposta que recebi de outra IA.'),
    },
    {
      chave: 'conselho',
      rotulo: 'Perguntas para o Conselho',
      aoTocar: () =>
        iniciarConversa(
          'conselho',
          encontroAtual,
          'Quero saber que perguntas um Conselho deveria fazer sobre uma situação que vou descrever.'
        ),
    },
  ]

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] max-w-2xl mx-auto">
      <div className="px-4 pt-6 pb-3 border-b border-stone-200">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold text-stone-900">{modo ? rotuloModo(modo) : 'Tutor'}</h1>
          <div className="flex items-center gap-4">
            <Link to="/tutor/historico" className="text-amber-800 font-medium text-sm">
              Conversas anteriores
            </Link>
            {mensagens.length > 0 && (
              <button onClick={pedirResumo} disabled={enviando} className="text-amber-800 font-medium text-sm">
                Resumir conversa
              </button>
            )}
            {mensagens.length > 0 && (
              <button onClick={novaConversa} className="text-amber-800 font-medium text-sm">
                Nova conversa
              </button>
            )}
          </div>
        </div>
        {mensagens.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-stone-500">
            <input type="checkbox" checked={compartilhada} onChange={alternarCompartilhamento} />
            Compartilhar esta conversa com o grupo
          </label>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {mensagens.length === 0 && (
          <div>
            <p className="text-stone-500 leading-relaxed mb-3">
              Pergunte o que quiser sobre o encontro atual, ou toque numa sugestão:
            </p>
            <div className="flex flex-wrap gap-2">
              {sugestoes.map((s) => (
                <button
                  key={s.chave}
                  onClick={s.aoTocar}
                  className="bg-white border border-stone-300 rounded-full px-4 py-2 text-stone-700 font-medium active:bg-stone-50"
                >
                  {s.rotulo}
                </button>
              ))}
            </div>
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
                <div className="mt-2 pt-2 border-t border-stone-100 flex flex-wrap items-center gap-4">
                  <BotaoCopiar texto={m.texto} className="text-amber-800" />
                  {modo === 'conselho' && (
                    <BotaoSalvarConselho
                      texto={m.texto}
                      encontroId={encontroAtual?.id}
                      usuarioId={usuario.id}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

        {enviando && <p className="text-stone-400 self-start px-1">O Tutor está pensando...</p>}
        {erro && <p className="text-red-700 px-1">{erro}</p>}
        <div ref={fimDaLista} />
      </div>

      <form onSubmit={enviarMensagem} className="p-4 border-t border-stone-200 flex flex-col gap-2">
        <div className="flex gap-3 items-end">
          <CampoAutoAjustavel
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                enviarMensagem(e)
              }
            }}
            placeholder="Escreva aqui..."
            minRows={1}
            className="flex-1 text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20 max-h-40 overflow-y-auto"
          />
          <button
            type="submit"
            disabled={enviando || !entrada.trim()}
            className="bg-stone-900 text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
        <p className="text-stone-400 text-xs px-1">
          Caso sensível? Anonimize antes de perguntar — não insira informação confidencial sem autorização e proteção adequadas.
        </p>
      </form>
    </div>
  )
}
