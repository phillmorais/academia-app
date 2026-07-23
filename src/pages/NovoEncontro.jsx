import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import CampoAutoAjustavel from '../components/CampoAutoAjustavel'

export default function NovoEncontro() {
  const navigate = useNavigate()
  const [numero, setNumero] = useState('')
  const [data, setData] = useState('')
  const [livro, setLivro] = useState('')
  const [autor, setAutor] = useState('')
  const [problema, setProblema] = useState('')
  const [conceitosChave, setConceitosChave] = useState('')
  const [roteiro, setRoteiro] = useState('')
  const [ciclo, setCiclo] = useState('')
  const [trechoEmEstudo, setTrechoEmEstudo] = useState('')
  const [complementar, setComplementar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('encontros')
      .select('numero')
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: ultimo }) => setNumero(String((ultimo?.numero || 0) + 1)))
  }, [])

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)

    const { data: criado, error } = await supabase
      .from('encontros')
      .insert({
        numero: Number(numero),
        titulo: `Encontro ${numero}${livro ? ` — ${livro}` : ''}`,
        data: data || null,
        livro,
        autor,
        problema_governanca: problema,
        conceitos_chave: conceitosChave || null,
        roteiro: roteiro || null,
        ciclo: ciclo ? Number(ciclo) : null,
        trecho_em_estudo: trechoEmEstudo || null,
        complementar,
        status: 'futuro',
      })
      .select()
      .single()

    setSalvando(false)

    if (error) {
      setErro('Não conseguimos criar o encontro agora. Confira os dados e tente de novo.')
      return
    }

    navigate(`/encontros/${criado.id}`)
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <Link to="/encontros" className="text-amber-800 font-medium mb-4 inline-block">
        ← Voltar aos encontros
      </Link>

      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight mb-6 px-1">
        Novo encontro
      </h1>

      <form onSubmit={salvar} className="flex flex-col gap-4">
        <div>
          <label className="block text-stone-700 mb-2 font-medium">Número do encontro</label>
          <input
            type="number"
            required
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
        <div>
          <label className="block text-stone-700 mb-2 font-medium">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
        <div>
          <label className="block text-stone-700 mb-2 font-medium">Livro</label>
          <input
            required
            value={livro}
            onChange={(e) => setLivro(e.target.value)}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
        <div>
          <label className="block text-stone-700 mb-2 font-medium">Autor</label>
          <input
            value={autor}
            onChange={(e) => setAutor(e.target.value)}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
        <div>
          <label className="block text-stone-700 mb-2 font-medium">Pergunta central</label>
          <CampoAutoAjustavel
            value={problema}
            onChange={(e) => setProblema(e.target.value)}
            minRows={4}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
        <div>
          <label className="block text-stone-700 mb-2 font-medium">
            Trecho em estudo <span className="text-stone-400 font-normal">(opcional, ex: "Capítulos 1 a 3")</span>
          </label>
          <input
            value={trechoEmEstudo}
            onChange={(e) => setTrechoEmEstudo(e.target.value)}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
        <div>
          <label className="block text-stone-700 mb-2 font-medium">
            Ciclo <span className="text-stone-400 font-normal">(opcional)</span>
          </label>
          <select
            value={ciclo}
            onChange={(e) => setCiclo(e.target.value)}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          >
            <option value="">— nenhum —</option>
            <option value="1">Ciclo 1 — Utilização e impacto inicial da IA</option>
            <option value="2">Ciclo 2 — Ruptura e estratégia</option>
            <option value="3">Ciclo 3 — Decisão</option>
            <option value="4">Ciclo 4 — Complexidade e gestão</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-stone-700">
          <input type="checkbox" checked={complementar} onChange={(e) => setComplementar(e.target.checked)} />
          Leitura complementar (não entra na trilha numerada)
        </label>
        <div>
          <label className="block text-stone-700 mb-2 font-medium">
            Conceitos-chave <span className="text-stone-400 font-normal">(um por linha — viram sugestões no Tutor)</span>
          </label>
          <CampoAutoAjustavel
            value={conceitosChave}
            onChange={(e) => setConceitosChave(e.target.value)}
            minRows={4}
            placeholder={'Fronteira irregular\nCointeligência\nAs quatro regras de Mollick'}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
        <div>
          <label className="block text-stone-700 mb-2 font-medium">
            Roteiro do encontro <span className="text-stone-400 font-normal">(opcional, pode completar depois)</span>
          </label>
          <CampoAutoAjustavel
            value={roteiro}
            onChange={(e) => setRoteiro(e.target.value)}
            minRows={6}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>

        {erro && <p className="text-red-700">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="bg-stone-900 text-white rounded-xl py-3.5 font-semibold active:bg-stone-800 disabled:opacity-60"
        >
          {salvando ? 'Criando...' : 'Criar encontro'}
        </button>
      </form>
    </div>
  )
}
