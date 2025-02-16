import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.ELECTRON === 'true' ? './' : '/',
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      ...(process.env.ELECTRON !== 'true' ? [
        { find: 'electron', replacement: resolve(__dirname, 'src/mocks/electron.ts') }
      ] : [])
    ]
  },
  server: {
    port: 5555,
    strictPort: false,
    host: '127.0.0.1',
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: '127.0.0.1',
      port: 5555
    },
    watch: {
      usePolling: false
    },
    headers: {
      'Content-Security-Policy': "default-src 'self'; connect-src 'self' http://localhost:11434 https://sql.js.org; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:;"
    }
  },
  preview: {
    port: 5555,
    strictPort: false
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      external: process.env.ELECTRON === 'true' ? ['electron'] : [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react', 'react-markdown', 'uuid'],
        }
      }
    },
    target: 'esnext',
    minify: 'esbuild'
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    },
    exclude: ['electron', 'electron-is-dev']
  },
  define: {
    'process.env.ELECTRON': JSON.stringify(process.env.ELECTRON),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    ...(process.env.ELECTRON !== 'true' && {
      'process.platform': JSON.stringify(process.platform),
      '__dirname': JSON.stringify(''),
      // Prevent direct usage of require
      'require': 'undefined',
      'path.join': '(...args) => args.join("/")'
    })
  }
});