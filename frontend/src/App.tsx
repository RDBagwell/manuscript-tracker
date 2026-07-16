import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import AgentsPage from './pages/AgentsPage'
import LoginPage from './pages/LoginPage'
import ManuscriptsPage from './pages/ManuscriptsPage'
import QueriesPage from './pages/QueriesPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/queries" replace />} />
          <Route path="/queries" element={<QueriesPage />} />
          <Route path="/manuscripts" element={<ManuscriptsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
