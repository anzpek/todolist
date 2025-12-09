import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    // 번들 분석 모드에서만 visualizer 활성화
    mode === 'analyze' && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  server: {
    port: 4000,
    host: true,
    strictPort: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 라이브러리 분리
          react: ['react', 'react-dom'],
          // Firebase 서비스 분리  
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // 날짜 유틸리티 분리
          date: ['date-fns'],
          // 아이콘 라이브러리 분리
          icons: ['lucide-react']
        }
      }
    },
    // 청크 크기 경고 제한 증가 (기본 500kb)
    chunkSizeWarningLimit: 1000,
    // 소스맵 생성 (개발 디버깅용)
    sourcemap: false,
    // 압축 최적화 (esbuild 사용)
    minify: 'esbuild',
    target: 'esnext'
  },
  // 의존성 사전 번들링 최적화
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'date-fns',
      'lucide-react',
      'zustand'
    ]
  }
}))
