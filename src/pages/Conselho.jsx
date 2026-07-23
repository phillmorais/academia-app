import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import CampoAutoAjustavel from '../components/CampoAutoAjustavel'

function CardPergunta({ item }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      {item.tema && (
        <span className="inline-block text-amber-800 bg-amber-50 text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1 mb-2">
          {item.tema}
        </span>
      )}
      <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{item.pergunta}</p>
      {item.encontros?.livro && <p className="text-stone-400 text-sm mt-2">De: {item.encontros.livro}</p>}
    </div>
  )
}

export default function Conselho() {
  const { usuario } = useAuth()
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState('')
  const [tema, setTema] = useState('')
  const [pergunta, setPergunta] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data, error } = await supabase
      .from('perguntas_conselho')
      .select('*, encontros(livro)')
      .order('criado_em', { ascending: false })

    if (error) setErro('Não conseguimos carregar o repertório agora.')
    else setLista(data)
  }

  async function adicionar(e) {
    e.preventDefault()
    if (!pergunta.trim()) return
    setSalvando(true)
    const { error } = await supabase.from('perguntas_conselho').insert({
      pergunta: pergunta.trim(),
      tema: tema.trim() || null,
      criado_por: usuario.id,
    })
    setSalvando(false)
    if (!error) {
      setTema('')
      setPergunta('')
      carregar()
    }
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <Link to="/" className="text-amber-800 font-medium mb-4 inline-block">
        ← Voltar ao início
      </Link>

      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight mb-1 px-1">
        Perguntas para o Conselho
      </h1>
      <p className="text-stone-500 mb-6 px-1">
        Perguntas que um Conselho deveria fazer à administração antes de decidir — alimentado pelo grupo e pelo Tutor.
      </p>

      <form onSubmit={adicionar} className="flex flex-col gap-3 bg-white border border-stone-200 rounded-2xl p-5 mb-8">
        <input
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Tema (opcional)"
          className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
        />
        <CampoAutoAjustavel
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          minRows={2}
          placeholder="Escreva a pergunta..."
          className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
        />
        <button
          type="submit"
          disabled={salvando || !pergunta.trim()}
          className="bg-stone-900 text-white rounded-xl py-3 font-semibold active:bg-stone-800 disabled:opacity-60"
        >
          {salvando ? 'Adicionando...' : 'Adicionar ao repertório'}
        </button>
      </form>

      {erro && <p className="text-red-700 px-1 mb-4">{erro}</p>}
      {!lista && !erro && <p className="text-stone-500 px-1">Carregando...</p>}
      {lista && lista.length === 0 && (
        <p className="text-stone-500 px-1">Ainda não há perguntas no repertório.</p>
      )}

      <div className="flex flex-col gap-4">
        {lista?.map((item) => (
          <CardPergunta key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
