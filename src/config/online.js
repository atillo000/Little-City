// Multiplayer via Supabase Realtime, configured at build time (Vercel project settings or a git-ignored .env.local):
//   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon / publishable key>
// Both values are public by design; access is enforced by anonymous sign-in plus the Realtime authorization policies
// in supabase/realtime-policies.sql. Never put a service-role key in a VITE_* variable.
// Without them the game still runs, and tabs in the same browser see each other through a local fallback.
const env = import.meta.env || {};
function supabaseUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.pathname.replace('/', '') && !url.search ? url.origin : ''; } catch { return ''; }
}
export const ONLINE = Object.freeze({ url: supabaseUrl(env.VITE_SUPABASE_URL), key: typeof env.VITE_SUPABASE_ANON_KEY === 'string' ? env.VITE_SUPABASE_ANON_KEY.trim() : '' });
export const ONLINE_CONFIGURED = !!(ONLINE.url && ONLINE.key);
