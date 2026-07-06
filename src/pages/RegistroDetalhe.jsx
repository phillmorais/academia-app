import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Markdown from '../components/Markdown'

export default function RegistroDetalhe() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const [encontro, setEncontro] = useState(null)
  const [registro, setRegistro] = useState(null)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregar()
  }, [id])

  async function carregar() {
    const [{ data: dadosEncontro, error: erroEncontro }, { data: dadosRegistro, error: erroRegistro }] =
      await Promise.all([
        supabase.from('encontros').select('*').eq('id', id).single(),
        supabase.from('registros').select('*').eq('encontro_id', id).maybeSingle(),
      ])

    if (erroEncontro || erroRegistro) {
      setErro('Não conseguimos carregar o registro agora.')
      return
    }
    setEncontro(dadosEncontro)
    setRegistro(dadosRegistro)
    setTexto(dadosRegistro?.conteudo ?? '')
  }

  async function salvar() {
    setSalvando(true)
    const payload = {
      encontro_id: id,
      conteudo: texto,
      atualizado_por: usuario.id,
      atualizado_em: new Date().toISOString(),
    }

    const { data, error } = registro
      ? await supabase.from('registros').update(payload).eq('id', registro.id).select().single()
      : await supabase.from('registros').insert(payload).select().single()

    setSalvando(false)
    if (error) {
      setErro('Não conseguimos salvar o registro agora.')
      return
    }
    setRegistro(data)
    setEditando(false)
  }

  if (erro) {
    return <p className="p-6 text-red-700 text-lg">{erro}</p>
  }

  if (!encontro) {
    return <p className="p-6 text-stone-500 text-lg">Carregando...</p>
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <Link to="/registro" className="text-amber-800 font-medium mb-4 inline-block">
        ← Voltar aos registros
      </Link>

      <p className="text-stone-500 mb-1">Encontro {encontro.numero}</p>
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">{encontro.livro}</h1>

      {editando ? (
        <div className="flex flex-col gap-4">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={14}
            placeholder="Cole aqui o texto destilado do encontro..."
            className="w-full text-lg px-4 py-3.5 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20 leading-relaxed"
          />
          <div className="flex gap-3">
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex-1 bg-amber-800 text-white rounded-xl py-3.5 font-semibold active:bg-amber-900 disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => {
                setTexto(registro?.conteudo ?? '')
                setEditando(false)
              }}
              className="flex-1 bg-white border border-stone-300 text-stone-700 rounded-xl py-3.5 font-semibold active:bg-stone-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setEditando(true)}
            className="w-full mb-6 bg-white border border-stone-300 text-stone-700 rounded-xl py-3.5 font-semibold active:bg-stone-50"
          >
            {registro?.conteudo ? 'Editar registro' : 'Adicionar registro'}
          </button>

          {registro?.conteudo ? (
            <Markdown>{registro.conteudo}</Markdown>
          ) : (
            <p className="text-stone-500">
              Este encontro ainda não tem um registro. Depois de destilar a conversa, cole o texto aqui.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
