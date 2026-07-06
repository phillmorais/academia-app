import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

function formatarData(data) {
  if (!data) return null
  const [ano, mes, dia] = data.split('-')
  return `${dia} de ${MESES[Number(mes) - 1]} de ${ano}`
}

function CardEncontro({ encontro, destaque }) {
  if (destaque) {
    return (
      <Link to={`/encontros/${encontro.id}`} className="block rounded-2xl bg-stone-900 p-6">
        <span className="inline-block text-amber-400 text-sm font-semibold tracking-wide mb-3">
          ENCONTRO DE HOJE
        </span>
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <span className="text-stone-400 text-base">Encontro {encontro.numero}</span>
          {encontro.data && (
            <span className="text-stone-400 text-base">{formatarData(encontro.data)}</span>
          )}
        </div>
        <h2 className="font-semibold text-white text-2xl tracking-tight mb-1">{encontro.livro}</h2>
        {encontro.autor && <p className="text-stone-400 mb-3">{encontro.autor}</p>}
        {encontro.problema_governanca && (
          <p className="text-stone-200 leading-snug">{encontro.problema_governanca}</p>
        )}
      </Link>
    )
  }

  return (
    <Link
      to={`/encontros/${encontro.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 active:bg-stone-50"
    >
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-stone-500 text-base">Encontro {encontro.numero}</span>
        {encontro.data && (
          <span className="text-stone-500 text-base">{formatarData(encontro.data)}</span>
        )}
      </div>
      <h2 className="font-semibold text-stone-800 text-xl mb-1">{encontro.livro}</h2>
      {encontro.autor && <p className="text-stone-500 mb-3">{encontro.autor}</p>}
      {encontro.problema_governanca && (
        <p className="text-stone-600 leading-snug">{encontro.problema_governanca}</p>
      )}
    </Link>
  )
}

export default function Encontros() {
  const [encontros, setEncontros] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('encontros')
      .select('*')
      .order('numero', { ascending: true })
      .then(({ data, error }) => {
        if (error) setErro('Não conseguimos carregar os encontros agora.')
        else setEncontros(data)
      })
  }, [])

  if (erro) {
    return <p className="p-6 text-red-700 text-lg">{erro}</p>
  }

  if (!encontros) {
    return <p className="p-6 text-stone-500 text-lg">Carregando...</p>
  }

  const atual = encontros.find((e) => e.status === 'atual')
  const restante = encontros.filter((e) => e.id !== atual?.id)

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight mb-5 px-1">
        Encontros da Academia
      </h1>
      <div className="flex flex-col gap-4">
        {atual && <CardEncontro encontro={atual} destaque />}
        {restante.map((encontro) => (
          <CardEncontro key={encontro.id} encontro={encontro} />
        ))}
      </div>
    </div>
  )
}
