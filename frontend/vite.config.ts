import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
	plugins: [
	  react(),
	  tailwindcss(),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'), // I have added the '.' in the alias ;)
		},
	},
	server: { // Server bloc
		host: true,        // Listen on 0.0.0.0 for access from outside the container
		port: 5173,        // Vite default port
		watch: {
			usePolling: true // Enable polling for Docker hot-reload
		}
	}
})