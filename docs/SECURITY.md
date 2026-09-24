# Security boundaries

This is a static, single-player application. The character name is a local label, not an authenticated account. Anyone with access to a browser profile can read or alter its saves. Client-side validation prevents malformed data from crashing normal gameplay; it cannot provide anti-cheat or access control. Do not store secrets, credentials, sensitive personal data or authoritative purchase/reward records in localStorage.

## Implemented controls

- All storage access goes through `services/storage.js`. Reads and writes handle denied access, quota failures, invalid JSON and oversized payloads. World progress, the effects preference and the character each keep their own key. Saves from the removed neighborhood mode are left untouched and never read.
- The character save is rebuilt from known fields only: every option must be one of the listed values (otherwise the default), and names have control characters removed and are limited to 24 characters. A missing or corrupt save simply reopens the creator. World saves validate cities, cash and contract completion IDs. React renders names and messages as text; HTML injection and `eval` are prohibited by architecture checks.
- Production builds embed a Content Security Policy that allows only this origin: no third-party scripts, styles, fonts, frames or connections. Inline CSS is retained for dynamic scene/UI styling. Rapier uses the narrower `wasm-unsafe-eval` allowance; JavaScript `unsafe-eval` and inline scripts are not allowed. Geolocation, camera and microphone are disabled through `Permissions-Policy`.
- Vite dev/preview bind to loopback. Preview also sends CSP with `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`. Architecture and browser tests verify these boundaries and ensure the policy allows the real Rapier build.

The policy follows [MDN's CSP guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), including its [WebAssembly distinction for script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src).

## Static hosting

The built HTML retains its CSP on any static host. Preview headers do **not** automatically configure a deployed hosting provider. For Vercel, `vercel.json` sends these headers on every response, and `tests/unit/security.test.js` fails if they drift from `PREVIEW_HEADERS`. Vercel serves its domains over HTTPS with HSTS. On any other host, configure the HTTP response headers from `src/config/security.js`, including `frame-ancestors 'none'` (which cannot be enforced through a meta tag), and serve over HTTPS. Enable HSTS only after confirming the domain and required subdomains are permanently served over HTTPS.

Do not expose the Vite development server publicly. `VITE_*` variables are bundled into public client code, so they must never contain private credentials. When adding Supabase (planned for music) or another backend, implement authorization/storage policies there and update the CSP, `vercel.json` and the policy test with only the specific required origins. Do not weaken the entire policy to accommodate a new provider.

## Verification and limits

Run `npm run audit:security` against the lockfile and review fixes before changing dependency versions. An audit with no findings means no known advisories were returned at that time, not a guarantee that dependencies or this application have no vulnerabilities. The September 24, 2026 check returned zero known vulnerabilities. Keep the lockfile committed and use `npm ci` for reproducible installations.

Current tests cover world and character save validation, corrupted and unavailable storage, name escaping, the production policy (including that it names no third-party origin) and the Vercel header copy. The browser check fails on any third-party request. Hosting configuration and any future server authorization require separate verification.
