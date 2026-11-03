import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/worksheet-generator/' : '/',
  build:{rollupOptions:{input:{main:resolve(process.cwd(),'index.html'),review:resolve(process.cwd(),'review.html')}}},
}));
