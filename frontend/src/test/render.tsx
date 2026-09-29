import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { AuthProvider } from '../auth/AuthContext'
import { ToastProvider } from '../components/Toasts'

/**
 * Mounts the whole app — real routes, RequireAuth, Layout, providers —
 * at `path`, exactly as main.tsx does minus the browser router.
 */
export function renderApp(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}
