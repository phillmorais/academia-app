import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { escolherEncontroDestaque, rotuloDestaque } from '../lib/encontros'

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

function formatarData(data) {
  if (!data) return null
  const [ano, mes, dia] = data.split('-')
  return `${dia} de ${MESES[Number(mes) - 1]} de ${ano}`
}

const TITULOS_CICLO = {
  1: 'Ciclo 1 — Utilização e impacto inicial da IA',
  2: 'Ciclo 2 — Ruptura e estratégia',
  3: 'Ciclo 3 — Decisão',
  4: 'Ciclo 4 — Complexidade e gestão',
}

function CardLeituraComplementar({ encontro }) {
  return (
    <Link
      to={`/encontros/${encontro.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-5 active:bg-stone-50"
    >
      <span className="text-stone-500 text-base">Leitura complementar</span>
      <h2 className="font-semibold text-stone-800 text-xl mb-1">{encontro.livro}</h2>
      {encontro.autor && <p className="text-stone-500 mb-3">{encontro.autor}</p>}
      {encontro.problema_governanca && (
        <p className="text-stone-600 leading-snug">{encontro.problema_governanca}</p>
      )}
    </Link>
  )
}

function CardEncontro({ encontro, destaque }) {
  if (destaque) {
    return (
      <Link to={`/encontros/${encontro.id}`} className="block rounded-2xl bg-stone-900 p-6">
        <span className="inline-block text-amber-400 text-sm font-semibold tracking-wide mb-3">
          {rotuloDestaque(encontro.data)}
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
  const { perfil } = useAuth()
  const [encontros, setEncontros] = useState(null)
  const [erro, setErro] = useState('')
  const ehOrganizadora = perfil?.papel === 'organizadora'

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

  const destaque = escolherEncontroDestaque(encontros)
  const complementares = encontros.filter((e) => e.complementar)
  const restante = encontros.filter((e) => e.id !== destaque?.id && !e.complementar)

  const ciclos = [...new Set(restante.map((e) => e.ciclo).filter((c) => c != null))].sort((a, b) => a - b)
  const semCiclo = restante.filter((e) => e.ciclo == null)

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5 px-1">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">
          Encontros da Academia
        </h1>
        {ehOrganizadora && (
          <Link to="/encontros/novo" className="text-amber-800 font-semibold">
            + Novo
          </Link>
        )}
      </div>

      {destaque && (
        <div className="mb-8">
          <CardEncontro encontro={destaque} destaque />
        </div>
      )}

      <div className="flex flex-col gap-8">
        {ciclos.map((ciclo) => (
          <div key={ciclo}>
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3 px-1">
              {TITULOS_CICLO[ciclo] || `Ciclo ${ciclo}`}
            </h2>
            <div className="flex flex-col gap-4">
              {restante
                .filter((e) => e.ciclo === ciclo)
                .map((encontro) => (
                  <CardEncontro key={encontro.id} encontro={encontro} />
                ))}
            </div>
          </div>
        ))}

        {semCiclo.length > 0 && (
          <div className="flex flex-col gap-4">
            {semCiclo.map((encontro) => (
              <CardEncontro key={encontro.id} encontro={encontro} />
            ))}
          </div>
        )}

        {complementares.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3 px-1">
              Leituras complementares
            </h2>
            <div className="flex flex-col gap-4">
              {complementares.map((encontro) => (
                <CardLeituraComplementar key={encontro.id} encontro={encontro} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
