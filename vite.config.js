import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { CONTENT_SECURITY_POLICY, PREVIEW_HEADERS } from './src/config/security.js';

export default defineConfig({
  plugins: [react(), {
    name: 'production-content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY }, injectTo: 'head-prepend' }];
    },
  }],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1', headers: PREVIEW_HEADERS },
  build: { rollupOptions: { output: { manualChunks: { three: ['three'], rapier: ['@dimforge/rapier3d-compat'] } } } },
});
