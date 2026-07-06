import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { MODOS, rotuloModo } from '../lib/tutorModos'

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
    supabase
      .from('encontros')
      .select('*')
      .eq('status', 'atual')
      .maybeSingle()
      .then(({ data }) => setEncontroAtual(data))
  }, [])

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function salvarMensagem(idConversa, papel, texto) {
    if (!idConversa) return
    await supabase.from('tutor_mensagens').insert({ conversa_id: idConversa, papel, texto })
  }

  async function enviarParaTutor(modoEscolhido, historico, idConversa) {
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
          encontroId: encontroAtual?.id ?? null,
          contexto: encontroAtual
            ? {
                livro: encontroAtual.livro,
                autor: encontroAtual.autor,
                problema: encontroAtual.problema_governanca,
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

  async function escolherModo(chave) {
    setModo(chave)
    setMensagens([])
    setErro('')
    setCompartilhada(false)

    const { data: conversa } = await supabase
      .from('tutor_conversas')
      .insert({
        usuario_id: usuario.id,
        encontro_id: encontroAtual?.id ?? null,
        modo: chave,
      })
      .select()
      .single()

    setConversaId(conversa?.id ?? null)

    if (chave === 'perguntar') {
      const primeira = { papel: 'usuario', texto: 'Podemos começar.' }
      setMensagens([primeira])
      enviarParaTutor(chave, [primeira], conversa?.id)
    }
  }

  async function enviarMensagem(e) {
    e.preventDefault()
    if (!entrada.trim() || enviando) return

    const nova = { papel: 'usuario', texto: entrada.trim() }
    const historico = [...mensagens, nova]
    setMensagens(historico)
    setEntrada('')
    await salvarMensagem(conversaId, 'usuario', nova.texto)
    await enviarParaTutor(modo, historico, conversaId)
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
  }

  if (!modo) {
    return <TelaEscolha aoEscolher={escolherModo} />
  }

  const aguardandoPrimeiraEntrada = modo !== 'perguntar' && mensagens.length === 0

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
          <p className="text-stone-500 leading-relaxed">
            {modo === 'explicar'
              ? 'Escreva abaixo o conceito que você quer entender melhor.'
              : 'Escreva abaixo a ideia ou o argumento que você quer colocar à prova.'}
          </p>
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
              {m.texto}
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
