import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function RegistroLista() {
  const [encontros, setEncontros] = useState(null)
  const [encontrosComRegistro, setEncontrosComRegistro] = useState(new Set())
  const [erro, setErro] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('encontros').select('*').order('numero', { ascending: true }),
      supabase.from('registros').select('encontro_id, conteudo'),
    ]).then(([respEncontros, respRegistros]) => {
      if (respEncontros.error || respRegistros.error) {
        setErro('Não conseguimos carregar os encontros agora.')
        return
      }
      setEncontros(respEncontros.data)
      setEncontrosComRegistro(
        new Set(respRegistros.data.filter((r) => r.conteudo?.trim()).map((r) => r.encontro_id))
      )
    })
  }, [])

  if (erro) {
    return <p className="p-6 text-red-700 text-lg">{erro}</p>
  }

  if (!encontros) {
    return <p className="p-6 text-stone-500 text-lg">Carregando...</p>
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-800 mb-1 px-1">Registro dos encontros</h1>
      <p className="text-stone-500 mb-5 px-1">Escolha um encontro para ver ou atualizar a memória do grupo</p>

      <div className="flex flex-col gap-3">
        {encontros.map((encontro) => {
          const temRegistro = encontrosComRegistro.has(encontro.id)
          return (
            <Link
              key={encontro.id}
              to={`/registro/${encontro.id}`}
              className="block bg-white border border-stone-200 rounded-2xl p-5 active:bg-stone-50"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-stone-500 text-base">Encontro {encontro.numero}</p>
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    temRegistro ? 'text-green-700' : 'text-stone-400'
                  }`}
                >
                  {temRegistro ? 'Registro pronto' : 'Sem registro ainda'}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-stone-800">{encontro.livro}</h2>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
