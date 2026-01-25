import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/ss': {
          target: 'https://api.semanticscholar.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ss/, ''),
        },
        '/api/pdf-proxy/plos': {
          target: 'https://journals.plos.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/pdf-proxy\/plos/, ''),
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
