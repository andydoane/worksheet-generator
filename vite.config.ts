import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/worksheet-generator/' : '/',
  build:{rollupOptions:{input:{main:new URL('./index.html',import.meta.url).pathname,review:new URL('./review.html',import.meta.url).pathname}}},
}));
