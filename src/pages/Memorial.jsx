import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Markdown from '../components/Markdown'
import CampoAutoAjustavel from '../components/CampoAutoAjustavel'

export default function Memorial() {
  const { perfil } = useAuth()
  const [memorial, setMemorial] = useState(null)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState(false)
  const [versao, setVersao] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const ehOrganizadora = perfil?.papel === 'organizadora'

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data, error } = await supabase.from('memorial').select('*').order('atualizado_em', { ascending: false }).limit(1).maybeSingle()
    if (error) {
      setErro('Não conseguimos carregar o Memorial agora.')
      return
    }
    setMemorial(data)
    setVersao(data?.versao || '')
    setConteudo(data?.conteudo || '')
  }

  async function salvar() {
    setSalvando(true)
    const payload = { versao, conteudo, atualizado_em: new Date().toISOString() }

    const { data, error } = memorial
      ? await supabase.from('memorial').update(payload).eq('id', memorial.id).select().single()
      : await supabase.from('memorial').insert(payload).select().single()

    setSalvando(false)
    if (error) {
      setErro('Não conseguimos salvar o Memorial agora.')
      return
    }
    setMemorial(data)
    setEditando(false)
  }

  if (erro) {
    return <p className="p-6 text-red-700 text-lg">{erro}</p>
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <Link to="/" className="text-amber-800 font-medium mb-4 inline-block">
        ← Voltar ao início
      </Link>

      <div className="flex items-center justify-between mb-1 px-1">
        <h1 className="text-2xl font-semibold text-stone-900 tracking-tight">Memorial da Academia</h1>
      </div>
      {memorial?.versao && <p className="text-stone-500 mb-6 px-1">Versão {memorial.versao}</p>}

      {editando ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-stone-700 mb-2 font-medium">Versão</label>
            <input
              value={versao}
              onChange={(e) => setVersao(e.target.value)}
              className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </div>
          <div>
            <label className="block text-stone-700 mb-2 font-medium">Conteúdo (markdown)</label>
            <CampoAutoAjustavel
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              minRows={14}
              placeholder="Cole aqui o texto oficial do Memorial..."
              className="w-full text-lg px-4 py-3.5 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20 leading-relaxed"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex-1 bg-stone-900 text-white rounded-xl py-3.5 font-semibold active:bg-stone-800 disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => {
                setVersao(memorial?.versao || '')
                setConteudo(memorial?.conteudo || '')
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
          {ehOrganizadora && (
            <button
              onClick={() => setEditando(true)}
              className="w-full mb-6 bg-white border border-stone-300 text-stone-700 rounded-xl py-3.5 font-semibold active:bg-stone-50"
            >
              {memorial?.conteudo ? 'Editar Memorial' : 'Adicionar conteúdo do Memorial'}
            </button>
          )}

          {memorial?.conteudo ? (
            <Markdown>{memorial.conteudo}</Markdown>
          ) : (
            <p className="text-stone-500">
              O conteúdo do Memorial ainda não foi adicionado.
              {ehOrganizadora ? ' Use o botão acima para colar o texto oficial.' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
