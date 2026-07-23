import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function GrupoPrompts({ titulo, lista }) {
  const categorias = [...new Set(lista.map((p) => p.categoria))]

  return (
    <div className="flex flex-col gap-8">
      {titulo && (
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide px-1 -mb-4">
          {titulo}
        </h2>
      )}
      {categorias.map((categoria) => (
        <div key={categoria}>
          <h3 className="text-lg font-semibold text-stone-500 mb-3 px-1">{categoria}</h3>
          <div className="flex flex-col gap-4">
            {lista
              .filter((p) => p.categoria === categoria)
              .map((prompt) => (
                <CardPrompt key={prompt.id} prompt={prompt} />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CardPrompt({ prompt }) {
  const [aberto, setAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(prompt.texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <span className="inline-block text-amber-800 bg-amber-50 text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1 mb-2">
        {prompt.categoria}
      </span>
      <h3 className="text-xl font-semibold text-stone-800 mb-1">{prompt.titulo}</h3>
      {prompt.contexto_uso && (
        <p className="text-stone-500 mb-3 leading-snug">{prompt.contexto_uso}</p>
      )}

      <button
        onClick={() => setAberto((v) => !v)}
        className="text-amber-800 font-medium mb-3"
      >
        {aberto ? 'Esconder o texto completo' : 'Ver o texto completo'}
      </button>

      {aberto && (
        <p className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-3 text-stone-700 whitespace-pre-wrap leading-relaxed">
          {prompt.texto}
        </p>
      )}

      <button
        onClick={copiar}
        className={`w-full text-center rounded-xl py-3 font-semibold transition-colors ${
          copiado ? 'bg-green-700 text-white' : 'bg-stone-900 text-white active:bg-stone-800'
        }`}
      >
        {copiado ? 'Copiado!' : 'Copiar'}
      </button>

      <Link
        to={`/tutor?modo=explicar&conceito=${encodeURIComponent(`O que significa este prompt: "${prompt.titulo}"?`)}`}
        className="block text-center text-amber-800 font-medium mt-3"
      >
        Não entendeu? Pergunte ao Tutor
      </Link>
    </div>
  )
}

export default function Prompts() {
  const [prompts, setPrompts] = useState(null)
  const [erro, setErro] = useState('')
  const [searchParams] = useSearchParams()
  const encontroFiltro = searchParams.get('encontro')

  useEffect(() => {
    supabase
      .from('prompts')
      .select('*')
      .order('categoria', { ascending: true })
      .then(({ data, error }) => {
        if (error) setErro('Não conseguimos carregar os prompts agora.')
        else setPrompts(data)
      })
  }, [])

  if (erro) {
    return <p className="p-6 text-red-700 text-lg">{erro}</p>
  }

  if (!prompts) {
    return <p className="p-6 text-stone-500 text-lg">Carregando...</p>
  }

  const especificos = encontroFiltro
    ? prompts.filter((p) => p.encontro_origem === encontroFiltro)
    : []
  const gerais = encontroFiltro ? prompts.filter((p) => !p.encontro_origem) : prompts

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-1 px-1">Biblioteca de Prompts</h1>
      <p className="text-stone-500 mb-5 px-1">
        Copie e cole em qualquer IA que você usa
      </p>

      {encontroFiltro && (
        <Link to="/prompts" className="text-amber-800 font-medium mb-5 inline-block px-1">
          ← Ver todos os prompts
        </Link>
      )}

      {encontroFiltro && especificos.length === 0 && (
        <p className="text-stone-500 px-1 mb-6">
          Ainda não há prompts feitos especialmente para este encontro. Estes da Biblioteca geral servem bem:
        </p>
      )}

      <div className="flex flex-col gap-10">
        {especificos.length > 0 && <GrupoPrompts titulo="Deste encontro" lista={especificos} />}
        {gerais.length > 0 && (
          <GrupoPrompts titulo={encontroFiltro ? 'Prompts gerais da Biblioteca' : null} lista={gerais} />
        )}
      </div>
    </div>
  )
}
