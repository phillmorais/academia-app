import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RotaProtegida from './components/RotaProtegida'
import Login from './pages/Login'
import Encontros from './pages/Encontros'
import EncontroDetalhe from './pages/EncontroDetalhe'
import Prompts from './pages/Prompts'
import RegistroLista from './pages/RegistroLista'
import RegistroDetalhe from './pages/RegistroDetalhe'
import Tutor from './pages/Tutor'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RotaProtegida />}>
            <Route path="/" element={<Encontros />} />
            <Route path="/encontros/:id" element={<EncontroDetalhe />} />
            <Route path="/prompts" element={<Prompts />} />
            <Route path="/registro" element={<RegistroLista />} />
            <Route path="/registro/:id" element={<RegistroDetalhe />} />
            <Route path="/tutor" element={<Tutor />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
