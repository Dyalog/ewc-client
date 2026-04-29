import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
		// minify: false,
		target: 'es2022',
		rollupOptions: {
			output: {
				manualChunks: () => 'index',
			},
		},
	},
})
