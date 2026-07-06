import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BottomNav from './BottomNav'

export default function RotaProtegida() {
  const { session, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center text-stone-500">
        Carregando...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex-1 pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
