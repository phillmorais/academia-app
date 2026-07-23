import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { rotuloModo } from '../lib/tutorModos'

function formatarQuando(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function CardConversa({ conversa, mostrarAutor }) {
  return (
    <Link
      to={`/tutor/historico/${conversa.id}`}
      className="block bg-white border border-stone-200 rounded-2xl p-5 active:bg-stone-50"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-stone-400 text-sm">{formatarQuando(conversa.criado_em)}</p>
        {conversa.compartilhada && (
          <span className="inline-block text-amber-800 bg-amber-50 text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1">
            Compartilhada
          </span>
        )}
      </div>
      <p className="text-lg font-semibold text-stone-800 mb-1">{rotuloModo(conversa.modo)}</p>
      {conversa.encontros?.livro && (
        <p className="text-stone-500 mb-1">{conversa.encontros.livro}</p>
      )}
      {mostrarAutor && conversa.perfis?.nome && (
        <p className="text-stone-400 text-sm">por {conversa.perfis.nome}</p>
      )}
    </Link>
  )
}

export default function TutorHistorico() {
  const { usuario } = useAuth()
  const [aba, setAba] = useState('minhas')
  const [minhas, setMinhas] = useState(null)
  const [doGrupo, setDoGrupo] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!usuario) return

    supabase
      .from('tutor_conversas')
      .select('*, encontros(livro)')
      .eq('usuario_id', usuario.id)
      .order('criado_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro('Não conseguimos carregar suas conversas agora.')
        else setMinhas(data)
      })

    supabase
      .from('tutor_conversas')
      .select('*, encontros(livro), perfis(nome)')
      .eq('compartilhada', true)
      .neq('usuario_id', usuario.id)
      .order('criado_em', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErro('Não conseguimos carregar as conversas do grupo agora.')
        else setDoGrupo(data)
      })
  }, [usuario])

  const lista = aba === 'minhas' ? minhas : doGrupo

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <Link to="/tutor" className="text-amber-800 font-medium mb-4 inline-block">
        ← Voltar ao Tutor
      </Link>

      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight mb-5 px-1">
        Conversas anteriores
      </h1>

      <div className="flex gap-2 mb-5 bg-stone-100 rounded-xl p-1">
        <button
          onClick={() => setAba('minhas')}
          className={`flex-1 py-2.5 rounded-lg font-semibold transition-colors ${
            aba === 'minhas' ? 'bg-white text-stone-900' : 'text-stone-500'
          }`}
        >
          Minhas
        </button>
        <button
          onClick={() => setAba('grupo')}
          className={`flex-1 py-2.5 rounded-lg font-semibold transition-colors ${
            aba === 'grupo' ? 'bg-white text-stone-900' : 'text-stone-500'
          }`}
        >
          Do grupo
        </button>
      </div>

      {erro && <p className="text-red-700 px-1 mb-4">{erro}</p>}

      {!lista && <p className="text-stone-500 px-1">Carregando...</p>}

      {lista && lista.length === 0 && (
        <p className="text-stone-500 px-1">
          {aba === 'minhas'
            ? 'Você ainda não teve nenhuma conversa com o Tutor.'
            : 'Ninguém compartilhou uma conversa com o grupo ainda.'}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {lista?.map((conversa) => (
          <CardConversa key={conversa.id} conversa={conversa} mostrarAutor={aba === 'grupo'} />
        ))}
      </div>
    </div>
  )
}
