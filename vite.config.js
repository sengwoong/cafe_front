import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Railway 루트 배포니까 base는 "/" 고정
  build: {
    outDir: 'dist'
  },
  preview: {
    port: 3000,
    strictPort: true
  },
  server: {
    port: 3000,
    strictPort: true
  }
})
