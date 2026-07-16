import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// host: true      — bind 0.0.0.0 so nginx and the host can reach the container.
// port 3000       — kept from CRA so docker-compose and nginx.conf need zero changes.
// strictPort      — fail loudly instead of silently drifting to 3001.
// usePolling      — bind mounts on Docker Desktop (Windows/WSL2) don't reliably
//                   propagate inotify events; polling makes HMR work everywhere.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    // Direct :3000 access (bypassing nginx) stays same-origin too: the dev
    // server proxies API paths to the nginx container. Host-machine Vite
    // (outside Docker) won't resolve 'nginx' — use the nginx port instead.
    proxy: {
      '/api': { target: 'http://nginx' },
      '/sanctum': { target: 'http://nginx' },
    },
  },
  preview: {
    port: 3000,
  },
})
