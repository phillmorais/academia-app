import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RotaProtegida from './components/RotaProtegida'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Encontros from './pages/Encontros'
import NovoEncontro from './pages/NovoEncontro'
import EncontroDetalhe from './pages/EncontroDetalhe'
import GerarPrompts from './pages/GerarPrompts'
import Prompts from './pages/Prompts'
import RegistroLista from './pages/RegistroLista'
import RegistroDetalhe from './pages/RegistroDetalhe'
import Tutor from './pages/Tutor'
import TutorHistorico from './pages/TutorHistorico'
import TutorConversa from './pages/TutorConversa'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/encontros" element={<Encontros />} />
            <Route path="/encontros/novo" element={<NovoEncontro />} />
            <Route path="/encontros/:id" element={<EncontroDetalhe />} />
            <Route path="/encontros/:id/gerar-prompts" element={<GerarPrompts />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/registro" element={<RegistroLista />} />
            <Route path="/registro/:id" element={<RegistroDetalhe />} />
            <Route path="/tutor" element={<Tutor />} />
            <Route path="/tutor/historico" element={<TutorHistorico />} />
            <Route path="/tutor/historico/:id" element={<TutorConversa />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
