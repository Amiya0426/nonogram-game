import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 服务器部署用根路径；如仍需发布到 GitHub Pages 子路径，
  // 构建时设置环境变量 BASE_PATH=/nonogram-game/
  base: process.env.BASE_PATH || '/',
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
