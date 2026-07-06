import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function formatarData(data) {
  if (!data) return null
  const [ano, mes, dia] = data.split('-')
  return `${dia} de ${MESES[Number(mes) - 1]} de ${ano}`
}

const ATALHOS = [
  {
    para: '/encontros',
    titulo: 'Ver a trilha de encontros',
    descricao: 'A lista completa, com o livro e o problema de cada mês.',
  },
  {
    para: '/prompts',
    titulo: 'Copiar um prompt pronto',
    descricao: 'Frases prontas para colar na IA que você já usa.',
  },
  {
    para: '/tutor',
    titulo: 'Conversar com o Tutor',
    descricao: 'Para entender um conceito, refletir ou testar uma ideia.',
  },
  {
    para: '/registro',
    titulo: 'Ler o registro de um encontro',
    descricao: 'A memória destilada do que já foi conversado.',
  },
]

function FormularioProximoEncontro({ encontro, aoCancelar, aoSalvar }) {
  const [data, setData] = useState(encontro.data || '')
  const [livro, setLivro] = useState(encontro.livro || '')
  const [autor, setAutor] = useState(encontro.autor || '')
  const [problema, setProblema] = useState(encontro.problema_governanca || '')
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    const { data: atualizado, error } = await supabase
      .from('encontros')
      .update({ data: data || null, livro, autor, problema_governanca: problema })
      .eq('id', encontro.id)
      .select()
      .single()
    setSalvando(false)
    if (!error) aoSalvar(atualizado)
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
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
        <label className="block text-stone-700 mb-2 font-medium">Problema de governança</label>
        <textarea
          value={problema}
          onChange={(e) => setProblema(e.target.value)}
          rows={4}
          className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={salvando}
          className="flex-1 bg-stone-900 text-white rounded-xl py-3.5 font-semibold active:bg-stone-800 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={aoCancelar}
          className="flex-1 bg-white border border-stone-300 text-stone-700 rounded-xl py-3.5 font-semibold active:bg-stone-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function Inicio() {
  const { perfil } = useAuth()
  const [proximoEncontro, setProximoEncontro] = useState(null)
  const [editando, setEditando] = useState(false)
  const [erro, setErro] = useState('')

  const ehOrganizadora = perfil?.papel === 'organizadora'

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data, error } = await supabase
      .from('encontros')
      .select('*')
      .neq('status', 'concluido')
      .order('numero', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) setErro('Não conseguimos carregar o próximo encontro agora.')
    else setProximoEncontro(data)
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight mb-6 px-1">Academia</h1>

      <section className="mb-9">
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3 px-1">
          Próximo encontro
        </h2>

        {erro && <p className="text-red-700 px-1">{erro}</p>}

        {proximoEncontro && !editando && (
          <div className="bg-stone-900 rounded-2xl p-6">
            {proximoEncontro.data && (
              <p className="text-amber-400 font-semibold mb-2 tracking-wide">
                {formatarData(proximoEncontro.data)}
              </p>
            )}
            <p className="text-stone-400 text-base mb-1">Encontro {proximoEncontro.numero}</p>
            <h3 className="text-2xl font-semibold text-white tracking-tight mb-1">
              {proximoEncontro.livro}
            </h3>
            {proximoEncontro.autor && (
              <p className="text-stone-400 mb-4">{proximoEncontro.autor}</p>
            )}
            {proximoEncontro.problema_governanca && (
              <p className="text-stone-200 leading-relaxed mb-5 border-l-2 border-amber-400/50 pl-4">
                {proximoEncontro.problema_governanca}
              </p>
            )}
            <div className="flex gap-5 flex-wrap items-center">
              <Link to={`/encontros/${proximoEncontro.id}`} className="text-white font-semibold">
                Ver detalhes →
              </Link>
              {ehOrganizadora && (
                <button onClick={() => setEditando(true)} className="text-stone-400 font-medium">
                  Editar
                </button>
              )}
            </div>
          </div>
        )}

        {proximoEncontro && editando && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            <FormularioProximoEncontro
              encontro={proximoEncontro}
              aoCancelar={() => setEditando(false)}
              aoSalvar={(atualizado) => {
                setProximoEncontro(atualizado)
                setEditando(false)
              }}
            />
          </div>
        )}

        {!proximoEncontro && !erro && (
          <p className="text-stone-500 px-1">Nenhum encontro agendado no momento.</p>
        )}
      </section>

      <section className="mb-9">
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3 px-1">
          Primeiros passos
        </h2>
        <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100">
          {[
            'Antes do encontro, dê uma olhada no livro e no problema do mês, aqui em cima.',
            <>Durante o encontro, use os <strong>Prompts</strong> prontos — é só copiar e colar na IA que você já usa.</>,
            <>Para estudar sozinha(o), abra o <strong>Tutor</strong>: ele explica, pergunta ou testa suas ideias.</>,
            <>Depois do encontro, o <strong>Registro</strong> guarda a memória do grupo — vale sempre voltar lá.</>,
          ].map((texto, i) => (
            <div key={i} className="flex gap-4 p-5">
              <span className="text-2xl font-bold text-stone-200 leading-none tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-stone-700 leading-relaxed pt-0.5">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-9">
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3 px-1">
          Como pedir bem para a IA
        </h2>
        <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100">
          {[
            {
              rotulo: 'Um papel',
              texto: 'Diga que papel ela deve assumir.',
              exemplo: '"Aja como um consultor experiente em governança."',
            },
            {
              rotulo: 'A situação',
              texto: 'Conte o contexto e o material que ela precisa conhecer.',
            },
            {
              rotulo: 'O pedido',
              texto: 'Diga com clareza o que você quer dela.',
            },
            {
              rotulo: 'O formato',
              texto: 'Diga como quer a resposta — lista, resumo, com calma...',
            },
            {
              rotulo: 'Os limites',
              texto: 'Diga o que ela não deve fazer.',
              exemplo: '"Não invente, e me faça pensar em vez de dar a resposta pronta."',
            },
          ].map((item) => (
            <div key={item.rotulo} className="p-5">
              <p className="text-amber-800 font-semibold text-sm uppercase tracking-wide mb-1">
                {item.rotulo}
              </p>
              <p className="text-stone-700 leading-relaxed">{item.texto}</p>
              {item.exemplo && (
                <p className="text-stone-500 italic leading-relaxed mt-1">{item.exemplo}</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-stone-500 leading-relaxed mt-3 px-1">
          Os prompts prontos da <Link to="/prompts" className="text-amber-800 font-semibold">Biblioteca</Link> já
          seguem esse formato — é só copiar e adaptar.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3 px-1">
          O que você pode fazer aqui
        </h2>
        <div className="flex flex-col gap-3">
          {ATALHOS.map((atalho) => (
            <Link
              key={atalho.para}
              to={atalho.para}
              className="flex items-center justify-between gap-3 bg-white border border-stone-200 rounded-2xl p-5 active:bg-stone-50"
            >
              <div>
                <p className="text-lg font-semibold text-stone-800 mb-1">{atalho.titulo}</p>
                <p className="text-stone-500 leading-snug">{atalho.descricao}</p>
              </div>
              <span className="text-stone-300 text-2xl shrink-0">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
