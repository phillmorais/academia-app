import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Conta() {
  const { usuario, perfil } = useAuth()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function trocarSenha(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (novaSenha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não conferem.')
      return
    }

    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvando(false)

    if (error) {
      setErro('Não conseguimos trocar sua senha agora. Tente novamente.')
      return
    }
    setNovaSenha('')
    setConfirmarSenha('')
    setSucesso('Senha alterada com sucesso.')
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto">
      <Link to="/" className="text-amber-800 font-medium mb-4 inline-block">
        ← Voltar ao início
      </Link>

      <h1 className="text-2xl font-semibold text-stone-900 tracking-tight mb-6 px-1">Minha conta</h1>

      <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-8">
        <p className="text-stone-500 text-sm mb-1">Nome</p>
        <p className="text-lg text-stone-800 mb-4">{perfil?.nome || '—'}</p>
        <p className="text-stone-500 text-sm mb-1">E-mail</p>
        <p className="text-lg text-stone-800">{usuario?.email}</p>
      </div>

      <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wide mb-3 px-1">Trocar senha</h2>
      <form onSubmit={trocarSenha} className="flex flex-col gap-4 bg-white border border-stone-200 rounded-2xl p-5">
        <div>
          <label className="block text-stone-700 mb-2 font-medium">Nova senha</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
        <div>
          <label className="block text-stone-700 mb-2 font-medium">Confirmar nova senha</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className="w-full text-lg px-4 py-3 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>

        {erro && <p className="text-red-700">{erro}</p>}
        {sucesso && <p className="text-green-700">{sucesso}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="bg-stone-900 text-white rounded-xl py-3.5 font-semibold active:bg-stone-800 disabled:opacity-60"
        >
          {salvando ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  )
}
