import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Sidebar, Navbar } from './Sidebar'
import { LoadingState } from '../ui/LoadingState'
import type { UserRole } from '../../types'

interface ProtectedLayoutProps {
  requiredRole?: UserRole
}

export function ProtectedRoute({ requiredRole }: ProtectedLayoutProps) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Checking session..." />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && profile?.role !== requiredRole && profile?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}