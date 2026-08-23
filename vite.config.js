import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 服务器部署用根路径；如仍需发布到 GitHub Pages 子路径，
  // 构建时设置环境变量 BASE_PATH=/nonogram-game/
  base: process.env.BASE_PATH || '/',
  build: {
    rollupOptions: {
      output: {
        // React 依赖单独成包：主包变化时 vendor 仍可命中长期缓存
        manualChunks(id) {
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'react';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
