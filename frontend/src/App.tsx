import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import StudentList from './pages/StudentList'
import StudentProfile from './pages/StudentProfile'
import StudentAnalytics from './pages/StudentAnalytics'
import FaceRecognition from './pages/FaceRecognition'
import StudentForm from './pages/StudentForm'
import StudentDataEditor from './pages/StudentDataEditor'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students" element={<StudentList />} />
              <Route path="/students/:studentId" element={<StudentProfile />} />
              <Route path="/students/:studentId/analytics" element={<StudentAnalytics />} />
              <Route path="/face-recognition" element={<FaceRecognition />} />
            </Route>

            <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
              <Route path="/admin/students/new" element={<StudentForm />} />
              <Route path="/admin/students/:studentId/edit" element={<StudentForm />} />
              <Route path="/students/:studentId/data" element={<StudentDataEditor />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}