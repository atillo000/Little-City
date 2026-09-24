// Production policy: Rapier needs WebAssembly compilation, not JavaScript eval.
// Inline CSS is used for live city colors, minimaps and canvas dimensions.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://api.open-meteo.com",
  "media-src 'self' blob:",
  'frame-src https://www.youtube-nocookie.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');
export const PREVIEW_HEADERS = {
  'Content-Security-Policy': `${CONTENT_SECURITY_POLICY}; frame-ancestors 'none'`,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};
