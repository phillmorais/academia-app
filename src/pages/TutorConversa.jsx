import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { rotuloModo } from '../lib/tutorModos'
import MensagemMarkdown from '../components/MensagemMarkdown'

export default function TutorConversa() {
  const { id } = useParams()
  const [conversa, setConversa] = useState(null)
  const [mensagens, setMensagens] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('tutor_conversas').select('*, encontros(livro), perfis(nome)').eq('id', id).single(),
      supabase.from('tutor_mensagens').select('*').eq('conversa_id', id).order('criado_em', { ascending: true }),
    ]).then(([conversaResp, mensagensResp]) => {
      if (conversaResp.error || mensagensResp.error) {
        setErro('Não conseguimos carregar esta conversa agora.')
        return
      }
      setConversa(conversaResp.data)
      setMensagens(mensagensResp.data.filter((m) => m.texto !== 'Podemos começar.'))
    })
  }, [id])

  if (erro) {
    return <p className="p-6 text-red-700 text-lg">{erro}</p>
  }

  if (!conversa || !mensagens) {
    return <p className="p-6 text-stone-500 text-lg">Carregando...</p>
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <Link to="/tutor/historico" className="text-amber-800 font-medium mb-4 inline-block">
        ← Voltar às conversas
      </Link>

      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight mb-1">
        {rotuloModo(conversa.modo)}
      </h1>
      <p className="text-stone-500 mb-6">
        {conversa.encontros?.livro && `${conversa.encontros.livro} · `}
        {conversa.perfis?.nome && `por ${conversa.perfis.nome}`}
      </p>

      <div className="flex flex-col gap-4">
        {mensagens.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
              m.papel === 'usuario'
                ? 'self-end bg-stone-900 text-white'
                : 'self-start bg-white border border-stone-200 text-stone-700'
            }`}
          >
            {m.papel === 'tutor' ? <MensagemMarkdown>{m.texto}</MensagemMarkdown> : m.texto}
          </div>
        ))}
      </div>
    </div>
  )
}
