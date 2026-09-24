import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { PREVIEW_HEADERS, contentSecurityPolicy, realtimeOrigins } from './src/config/security.js';

export default defineConfig(({ mode }) => {
  // The build's own policy allows only the configured Supabase project (none when multiplayer is not configured).
  const { VITE_SUPABASE_URL } = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), {
      name: 'production-content-security-policy',
      apply: 'build',
      transformIndexHtml() {
        return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy(realtimeOrigins(VITE_SUPABASE_URL)) }, injectTo: 'head-prepend' }];
      },
    }],
    server: { host: '127.0.0.1' },
    preview: { host: '127.0.0.1', headers: PREVIEW_HEADERS },
    build: { rollupOptions: { output: { manualChunks: { three: ['three'], rapier: ['@dimforge/rapier3d-compat'], supabase: ['@supabase/supabase-js'] } } } },
  };
});
