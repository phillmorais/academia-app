import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import CampoAutoAjustavel from '../components/CampoAutoAjustavel'

function CartaoSugestao({ sugestao, encontroId, onAlterar }) {
  const [adicionado, setAdicionado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function adicionar() {
    setSalvando(true)
    const { error } = await supabase.from('prompts').insert({
      titulo: sugestao.titulo,
      categoria: sugestao.categoria,
      texto: sugestao.texto,
      contexto_uso: sugestao.contexto_uso,
      encontro_origem: encontroId,
    })
    setSalvando(false)
    if (!error) setAdicionado(true)
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <input
        value={sugestao.titulo}
        onChange={(e) => onAlterar({ ...sugestao, titulo: e.target.value })}
        className="w-full text-lg font-semibold text-stone-800 mb-2 border-b border-stone-200 pb-1 focus:outline-none focus:border-amber-700"
      />
      <input
        value={sugestao.categoria}
        onChange={(e) => onAlterar({ ...sugestao, categoria: e.target.value })}
        className="w-full text-sm text-stone-500 mb-3 border-b border-stone-200 pb-1 focus:outline-none focus:border-amber-700"
      />
      <CampoAutoAjustavel
        value={sugestao.texto}
        onChange={(e) => onAlterar({ ...sugestao, texto: e.target.value })}
        minRows={4}
        className="w-full text-stone-700 leading-relaxed mb-3 p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-700"
      />
      <input
        value={sugestao.contexto_uso}
        onChange={(e) => onAlterar({ ...sugestao, contexto_uso: e.target.value })}
        placeholder="Quando usar este prompt"
        className="w-full text-stone-500 mb-4 p-2 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-700"
      />

      <button
        onClick={adicionar}
        disabled={salvando || adicionado}
        className={`w-full rounded-xl py-3 font-semibold transition-colors ${
          adicionado ? 'bg-green-700 text-white' : 'bg-stone-900 text-white active:bg-stone-800'
        } disabled:opacity-60`}
      >
        {adicionado ? 'Adicionado à Biblioteca ✓' : salvando ? 'Adicionando...' : 'Adicionar à Biblioteca'}
      </button>
    </div>
  )
}

export default function GerarPrompts() {
  const { id } = useParams()
  const [encontro, setEncontro] = useState(null)
  const [sugestoes, setSugestoes] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.from('encontros').select('*').eq('id', id).single().then(({ data }) => setEncontro(data))
  }, [id])

  async function gerar() {
    setCarregando(true)
    setErro('')
    setSugestoes(null)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const resposta = await fetch('/api/gerar-prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ encontroId: id }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Não conseguimos gerar sugestões agora.')
      }

      setSugestoes(dados.sugestoes)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  function alterarSugestao(indice, novaSugestao) {
    setSugestoes((atual) => atual.map((s, i) => (i === indice ? novaSugestao : s)))
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <Link to={`/encontros/${id}`} className="text-amber-800 font-medium mb-4 inline-block">
        ← Voltar ao encontro
      </Link>

      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight mb-1 px-1">
        Sugestões de prompts
      </h1>
      {encontro && (
        <p className="text-stone-500 mb-6 px-1">
          Geradas a partir de {encontro.livro} — revise e edite antes de adicionar à Biblioteca.
        </p>
      )}

      {!sugestoes && !carregando && (
        <button
          onClick={gerar}
          className="w-full bg-stone-900 text-white rounded-xl py-3.5 font-semibold active:bg-stone-800 mb-6"
        >
          Gerar sugestões com IA
        </button>
      )}

      {carregando && <p className="text-stone-500 px-1">Gerando sugestões...</p>}
      {erro && <p className="text-red-700 px-1 mb-4">{erro}</p>}

      {sugestoes && (
        <>
          <div className="flex flex-col gap-4 mb-6">
            {sugestoes.map((sugestao, i) => (
              <CartaoSugestao
                key={i}
                sugestao={sugestao}
                encontroId={id}
                onAlterar={(nova) => alterarSugestao(i, nova)}
              />
            ))}
          </div>
          <button
            onClick={gerar}
            className="w-full bg-white border border-stone-300 text-stone-700 rounded-xl py-3.5 font-semibold active:bg-stone-50"
          >
            Gerar outras sugestões
          </button>
        </>
      )}
    </div>
  )
}
