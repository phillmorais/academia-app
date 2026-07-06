import { useState } from 'react'

export default function BotaoCopiar({ texto, className = '' }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <button onClick={copiar} className={`text-sm font-medium ${className}`}>
      {copiado ? 'Copiado!' : 'Copiar'}
    </button>
  )
}
