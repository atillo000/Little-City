# Security boundaries

This is a static, single-player application. Guest profiles are local labels, not authenticated accounts. Anyone with access to a browser profile can read or alter its saves. Client-side validation prevents malformed data from crashing normal gameplay; it cannot provide anti-cheat or access control. Do not store secrets, credentials, sensitive personal data or authoritative purchase/reward records in localStorage.

## Implemented controls

- All storage access goes through `services/storage.js`. Reads and writes handle denied access, quota failures, invalid JSON and oversized payloads. World Tour and neighborhood retain separate keys; legacy guest data remains untouched.
- Guest data is rebuilt from known fields, with bounded names/IDs, duplicate-ID removal and a 100-profile limit. World saves validate cities, cash and contract completion IDs. React renders names/messages as text; HTML injection and `eval` are prohibited by architecture checks.
- Weather requests go only to the fixed HTTPS Open-Meteo origin, omit credentials/referrers, reject redirects, accept an abort signal and keep the existing ten-second timeout. Coordinates and forecast fields are validated before rendering; invalid optional weather fields become bounded defaults.
- Local music URLs and YouTube video IDs must exist in the static catalogue. Local audio selection checks supported extensions/MIME and a 50 MB limit before creating a blob URL. This is client-side validation, not malware scanning or upload authorization. Files stay local. Music remains disabled by `config/musicConfig.js` until its planned storage migration is implemented.
- Production builds embed a Content Security Policy that restricts scripts to this origin, external frames to the official YouTube embed host, and weather connections to Open-Meteo. Google Fonts hosts remain allowed for the current typography. Inline CSS is retained for dynamic scene/UI styling. Rapier uses the narrower `wasm-unsafe-eval` allowance; JavaScript `unsafe-eval` and inline scripts are not allowed.
- Vite dev/preview bind to loopback. Preview also sends CSP with `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`. Architecture and browser tests verify these boundaries and ensure the policy allows the real Rapier build.

The policy follows [MDN's CSP guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), including its [WebAssembly distinction for script-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src).

## Static hosting

The built HTML retains its CSP on any static host. Preview headers do **not** automatically configure a deployed hosting provider. For Vercel, `vercel.json` sends these headers on every response, and `tests/unit/security.test.js` fails if they drift from `PREVIEW_HEADERS`. Vercel serves its domains over HTTPS with HSTS. On any other host, configure the HTTP response headers from `src/config/security.js`, including `frame-ancestors 'none'` (which cannot be enforced through a meta tag), and serve over HTTPS. Enable HSTS only after confirming the domain and required subdomains are permanently served over HTTPS.

Do not expose the Vite development server publicly. `VITE_*` variables are bundled into public client code, so they must never contain private credentials. When adding Supabase or another backend, implement authorization/storage policies there and update the CSP with only the specific required origins. Do not weaken the entire policy to accommodate a new provider.

## Verification and limits

Run `npm run audit:security` against the lockfile and review fixes before changing dependency versions. An audit with no findings means no known advisories were returned at that time, not a guarantee that dependencies or this application have no vulnerabilities. The September 24, 2026 check returned zero known vulnerabilities. Keep the lockfile committed and use `npm ci` for reproducible installations.

Current tests cover save isolation/migration, corrupted and unavailable storage, guest text escaping, URL allowlists, file bounds, weather validation and production-policy compatibility. Online player availability, hosting configuration and future server authorization require separate verification.
