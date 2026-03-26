import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
	],
	server: {
		host: '0.0.0.0',
		allowedHosts: ['power-drainage-thumbs-venice.trycloudflare.com'],
		port: 5173,
		watch: {
			// Requis pour le hot-reload dans Docker
			usePolling: true, 
			ignored: ['**/Dockerfile', '**/.dockerignore']
		}
	},
})
