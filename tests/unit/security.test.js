import test from 'node:test';
import assert from 'node:assert/strict';
import { readGuests, writeGuests } from '../../src/services/guestStorage.js';
import { cleanGuestSave, MAX_GUESTS } from '../../src/models/neighborhood/guests.js';
import { readWorldSave, serializeWorldSave, writeWorldSave } from '../../src/services/worldStorage.js';
import { readJson, writeJson } from '../../src/services/storage.js';
import { STORAGE_KEYS } from '../../src/config/storageKeys.js';
import { parseWeather, forecastUrl } from '../../src/models/environment.js';
import { fetchWeather } from '../../src/services/weatherClient.js';
import { officialVideoUrl, musicFileUrl, audioFileError } from '../../src/services/mediaSources.js';
import { freshProgress } from '../../src/models/neighborhood/missions.js';
import { readFileSync } from 'node:fs';
import { CONTENT_SECURITY_POLICY, PREVIEW_HEADERS } from '../../src/config/security.js';
import { MUSIC_ENABLED } from '../../src/config/musicConfig.js';
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
test('guest saves deduplicate IDs, validate progress, cap input and preserve a valid active guest', () => {
  const save = cleanGuestSave({ active: 'one', profiles: [null, { id: 'one', name: '  Ada\u0000  ', progress: { ...freshProgress(), coins: 25 } }, { id: 'one', name: 'Duplicate' }, { id: '', name: 'Empty ID' }, { id: 'two', name: '<img onerror=alert(1)>' }] });
  assert.equal(save.profiles.length, 2); assert.equal(save.active, 'one'); assert.equal(save.profiles[0].name, 'Ada'); assert.equal(save.profiles[0].progress.coins, 25);
  assert.equal(cleanGuestSave({ active: 'missing' }).active, null);
  assert.equal(cleanGuestSave({ profiles: Array.from({ length: MAX_GUESTS + 20 }, (_, i) => ({ id: String(i), name: 'Guest' })) }).profiles.length, MAX_GUESTS);
  assert.deepEqual(cleanGuestSave(null), { profiles: [], active: null });
});
test('legacy guests migrate without overwriting their source or crossing World Tour saves', () => {
  const storage = memory();
  storage.setItem(STORAGE_KEYS.legacyGuests, JSON.stringify({ profiles: [{ id: 'old', name: 'Old guest' }], active: 'old' }));
  const legacy = storage.getItem(STORAGE_KEYS.legacyGuests);
  const loaded = readGuests(storage); assert.equal(loaded.data.active, 'old');
  assert(writeGuests(loaded.data, storage));
  assert.equal(storage.getItem(STORAGE_KEYS.legacyGuests), legacy);
  const guestSave = storage.getItem(STORAGE_KEYS.guests);
  assert(writeWorldSave(serializeWorldSave({ city: 'tokyo', cash: 85, completed: ['tokyo:courier', 'bad', 'tokyo:courier'] }), storage));
  assert.deepEqual(readWorldSave(storage), { city: 'tokyo', cash: 85, completed: ['tokyo:courier'] });
  assert.equal(storage.getItem(STORAGE_KEYS.guests), guestSave);
});
test('unavailable, corrupt and oversized storage fail without breaking play', () => {
  const blocked = { getItem() { throw new Error('Denied'); }, setItem() { throw new Error('Quota'); } };
  assert.equal(readGuests(blocked).available, false); assert.equal(writeGuests({ profiles: [] }, blocked), false);
  const storage = memory(); storage.setItem('bad', '{'); assert.equal(readJson('bad', storage).value, null);
  storage.setItem('large', 'x'.repeat(1_000_001)); assert.equal(readJson('large', storage).value, null);
  const cycle = {}; cycle.self = cycle; assert.equal(writeJson('cycle', cycle, storage), false);
});
test('weather validates coordinates and malformed optional fields before reaching rendering', async () => {
  for (const location of [null, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: Infinity }, { latitude: '0', longitude: 0 }]) assert.throws(() => forecastUrl(location));
  const data = { current: { time: 1000, temperature_2m: 24, weather_code: 61, cloud_cover: 'bad', wind_speed_10m: -50 }, hourly: { time: {}, precipitation_probability: [Infinity] } };
  const result = parseWeather(data); assert.equal(result.cloudCover, 0); assert.equal(result.wind, 0); assert.equal(result.rainChance, null);
  const signal = new AbortController().signal;
  let seen;
  await fetchWeather({ latitude: 14.6, longitude: 120.98 }, { signal, fetcher: async (url, options) => { seen = { url, options }; return new Response(JSON.stringify(data)); } });
  assert.equal(new URL(seen.url).hostname, 'api.open-meteo.com'); assert.equal(seen.options.signal, signal); assert.equal(seen.options.credentials, 'omit'); assert.equal(seen.options.redirect, 'error');
  await assert.rejects(fetchWeather({ latitude: 0, longitude: 0 }, { fetcher: async () => new Response('x'.repeat(256_001)) }));
});
test('media accepts only known sources and bounded local audio files; music stays disabled', () => {
  assert.equal(MUSIC_ENABLED, false);
  assert.equal(musicFileUrl('carefree.mp3', '/city/'), '/city/music/carefree.mp3');
  for (const file of ['../secret', 'https://evil.example/file.mp3', 'unknown.mp3']) assert.throws(() => musicFileUrl(file));
  assert.equal(new URL(officialVideoUrl('2Vv-BfVoq4g', true)).hostname, 'www.youtube-nocookie.com');
  assert.throws(() => officialVideoUrl('javascript:alert(1)'));
  assert(audioFileError({ name: 'x.html', size: 100, type: 'text/html' }));
  assert(audioFileError({ name: 'x.mp3', size: 51 * 1024 * 1024, type: 'audio/mpeg' }));
  assert.equal(audioFileError({ name: 'x.mp3', size: 100, type: 'audio/mpeg' }), '');
  assert(CONTENT_SECURITY_POLICY.includes("script-src 'self' 'wasm-unsafe-eval'"));
  assert(!CONTENT_SECURITY_POLICY.includes("'unsafe-eval'"));
});
test('the Vercel deployment sends exactly the production security headers and caches only hashed assets', () => {
  const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  assert.equal(vercel.outputDirectory, 'dist'); assert.equal(vercel.buildCommand, 'npm run build'); assert.equal(vercel.installCommand, 'npm ci');
  const site = vercel.headers.find(rule => rule.source === '/(.*)');
  // vercel.json cannot import src/config/security.js, so this keeps the two copies of the policy identical.
  assert.deepEqual(Object.fromEntries(site.headers.map(({ key, value }) => [key, value])), PREVIEW_HEADERS);
  assert.match(PREVIEW_HEADERS['Content-Security-Policy'], /frame-ancestors 'none'/);
  const immutable = vercel.headers.filter(rule => rule.headers.some(h => h.key === 'Cache-Control' && /immutable/.test(h.value)));
  assert.deepEqual(immutable.map(rule => rule.source), ['/assets/(.*)'], 'index.html and music must not be cached as immutable');
});
