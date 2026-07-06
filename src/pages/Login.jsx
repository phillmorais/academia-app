import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, carregando, entrar, redefinirSenha } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [modoRecuperar, setModoRecuperar] = useState(false)
  const [mensagemRecuperar, setMensagemRecuperar] = useState('')

  if (!carregando && session) {
    return <Navigate to="/" replace />
  }

  async function aoEnviar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await entrar(email, senha)
    setEnviando(false)
    if (error) {
      setErro('E-mail ou senha não conferem. Tente novamente.')
    }
  }

  async function aoRecuperar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await redefinirSenha(email)
    setEnviando(false)
    if (error) {
      setErro('Não foi possível enviar o e-mail. Confira o endereço digitado.')
    } else {
      setMensagemRecuperar('Pronto! Enviamos um e-mail com as instruções para trocar sua senha.')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-[#faf8f4]">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-stone-800 text-center mb-2">Academia</h1>
        <p className="text-stone-500 text-center mb-10">Entre para acessar o grupo de estudo</p>

        {!modoRecuperar ? (
          <form onSubmit={aoEnviar} className="flex flex-col gap-5">
            <div>
              <label htmlFor="email" className="block text-stone-700 mb-2 font-medium">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-lg px-4 py-3.5 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                placeholder="seuemail@exemplo.com"
              />
            </div>
            <div>
              <label htmlFor="senha" className="block text-stone-700 mb-2 font-medium">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full text-lg px-4 py-3.5 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                placeholder="Sua senha"
              />
            </div>

            {erro && <p className="text-red-700 text-base">{erro}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="w-full text-lg font-semibold bg-amber-800 text-white py-3.5 rounded-xl active:bg-amber-900 disabled:opacity-60 transition-colors"
            >
              {enviando ? 'Entrando...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => {
                setModoRecuperar(true)
                setErro('')
              }}
              className="text-stone-500 underline text-base mt-2 self-center"
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form onSubmit={aoRecuperar} className="flex flex-col gap-5">
            <p className="text-stone-600">
              Digite o e-mail da sua conta. Vamos te enviar um link para escolher uma nova senha.
            </p>
            <div>
              <label htmlFor="email-recuperar" className="block text-stone-700 mb-2 font-medium">
                E-mail
              </label>
              <input
                id="email-recuperar"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-lg px-4 py-3.5 rounded-xl border border-stone-300 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                placeholder="seuemail@exemplo.com"
              />
            </div>

            {erro && <p className="text-red-700 text-base">{erro}</p>}
            {mensagemRecuperar && <p className="text-green-700 text-base">{mensagemRecuperar}</p>}

            <button
              type="submit"
              disabled={enviando}
              className="w-full text-lg font-semibold bg-amber-800 text-white py-3.5 rounded-xl active:bg-amber-900 disabled:opacity-60 transition-colors"
            >
              {enviando ? 'Enviando...' : 'Enviar e-mail'}
            </button>

            <button
              type="button"
              onClick={() => {
                setModoRecuperar(false)
                setErro('')
                setMensagemRecuperar('')
              }}
              className="text-stone-500 underline text-base mt-2 self-center"
            >
              Voltar para o login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
