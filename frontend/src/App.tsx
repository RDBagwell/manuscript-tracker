import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import AgentsPage from './pages/AgentsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ManuscriptsPage from './pages/ManuscriptsPage'
import ProfilePage from './pages/ProfilePage'
import QueriesPage from './pages/QueriesPage'
import RegisterPage from './pages/RegisterPage'
import RemindersPage from './pages/RemindersPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/queries" replace />} />
          <Route path="/queries" element={<QueriesPage />} />
          <Route path="/manuscripts" element={<ManuscriptsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
