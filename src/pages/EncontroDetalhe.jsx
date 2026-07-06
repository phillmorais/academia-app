import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Markdown from '../components/Markdown'

export default function EncontroDetalhe() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const [encontro, setEncontro] = useState(null)
  const [erro, setErro] = useState('')
  const ehOrganizadora = perfil?.papel === 'organizadora'

  useEffect(() => {
    supabase
      .from('encontros')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErro('Não conseguimos carregar este encontro.')
        else setEncontro(data)
      })
  }, [id])

  if (erro) {
    return <p className="p-6 text-red-700 text-lg">{erro}</p>
  }

  if (!encontro) {
    return <p className="p-6 text-stone-500 text-lg">Carregando...</p>
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <Link to="/encontros" className="text-amber-800 font-medium mb-4 inline-block">
        ← Voltar aos encontros
      </Link>

      <p className="text-stone-500 mb-1">Encontro {encontro.numero}</p>
      <h1 className="text-3xl font-semibold text-stone-900 tracking-tight mb-1">{encontro.livro}</h1>
      {encontro.autor && <p className="text-stone-500 text-lg mb-4">{encontro.autor}</p>}

      {encontro.problema_governanca && (
        <div className="bg-stone-900 rounded-2xl p-6 mb-6">
          <p className="text-amber-400 font-semibold mb-2 tracking-wide">O problema em pauta</p>
          <p className="text-stone-100 text-lg leading-relaxed">{encontro.problema_governanca}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 mb-8">
        <Link
          to={`/prompts?encontro=${encontro.id}`}
          className="text-center bg-white border border-stone-300 rounded-xl py-3.5 font-semibold text-stone-700 active:bg-stone-50"
        >
          Ver prompts deste encontro
        </Link>
        {ehOrganizadora && (
          <Link
            to={`/encontros/${encontro.id}/gerar-prompts`}
            className="text-center bg-white border border-stone-300 rounded-xl py-3.5 font-semibold text-stone-700 active:bg-stone-50"
          >
            Gerar sugestões de prompts com IA
          </Link>
        )}
        <Link
          to={`/registro/${encontro.id}`}
          className="text-center bg-white border border-stone-300 rounded-xl py-3.5 font-semibold text-stone-700 active:bg-stone-50"
        >
          Ver o registro deste encontro
        </Link>
        <Link
          to="/tutor"
          className="text-center bg-stone-900 rounded-xl py-3.5 font-semibold text-white active:bg-stone-800"
        >
          Abrir o Tutor
        </Link>
      </div>

      {encontro.roteiro && (
        <div>
          <h2 className="text-xl font-semibold text-stone-800 mb-3">Roteiro do encontro</h2>
          <Markdown>{encontro.roteiro}</Markdown>
        </div>
      )}
    </div>
  )
}
