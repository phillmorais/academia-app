import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { escolherEncontroDestaque } from '../lib/encontros'
import { montarTextoContexto } from '../lib/contextoAcademia'

// Resolve o problema do Memorial (seção 13): cada participante levando o contexto da
// Academia manualmente para uma IA à parte. Sempre reflete o encontro atual real do
// grupo, não o encontro que a pessoa esteja olhando na tela.
export default function BotaoCopiarContexto({ className = '' }) {
  const [estado, setEstado] = useState('parado') // 'parado' | 'carregando' | 'copiado'

  async function copiar() {
    setEstado('carregando')
    const { data } = await supabase.from('encontros').select('*').order('numero', { ascending: true })
    const atual = escolherEncontroDestaque(data || [])
    const texto = montarTextoContexto(data, atual)

    try {
      await navigator.clipboard.writeText(texto)
      setEstado('copiado')
      setTimeout(() => setEstado('parado'), 2000)
    } catch {
      setEstado('parado')
    }
  }

  return (
    <button onClick={copiar} disabled={estado === 'carregando'} className={className}>
      {estado === 'copiado' ? 'Contexto copiado!' : estado === 'carregando' ? 'Preparando...' : 'Copiar contexto da Academia'}
    </button>
  )
}
