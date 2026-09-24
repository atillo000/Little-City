import test from 'node:test';
import assert from 'node:assert/strict';
import { daylightAt, weatherFromCode, parseWeather, forecastUrl, DEFAULT_WEATHER_LOCATION } from '../../src/models/environment.js';
test('local 6 PM is night; afternoon and dawn transition smoothly in the chosen timezone', () => {
  assert.equal(daylightAt(new Date('2026-09-23T10:00:00Z'), 'Asia/Manila').night, 1);
  assert.equal(daylightAt(new Date('2026-09-23T08:00:00Z'), 'Asia/Manila').night, 0);
  assert.equal(daylightAt(new Date('2026-09-23T09:00:00Z'), 'Asia/Manila').night, 0.5);
  assert.equal(daylightAt(new Date('2026-09-22T21:30:00Z'), 'Asia/Manila').night, 0.5);
  assert.equal(daylightAt(new Date('2026-09-22T22:00:00Z'), 'Asia/Manila').night, 0);
  assert.equal(daylightAt(new Date('2026-07-01T22:00:00Z'), 'America/New_York').night, 1);
  assert.equal(daylightAt(new Date('2026-01-01T23:00:00Z'), 'America/New_York').night, 1);
});
test('weather codes distinguish fog, rain, snow, storm, and unavailable conditions', () => {
  [[0, 'clear'], [3, 'cloudy'], [45, 'fog'], [65, 'rain'], [75, 'snow'], [95, 'storm'], [999, 'unknown']].forEach(([code, kind]) => assert.equal(weatherFromCode(code).kind, kind));
});
test('forecast parsing validates responses and selects the next future hour', () => {
  const data = { current: { time: 1000, temperature_2m: 29, weather_code: 61, cloud_cover: 85 }, hourly: { time: [900, 1200], precipitation_probability: [20, 70] } };
  const parsed = parseWeather(data, 1000000);
  assert.equal(parsed.rainChance, 70); assert.equal(parsed.cloudCover, 0.85); assert.equal(parsed.observedAt, 1000000);
  assert.throws(() => parseWeather({ current: {} }));
  const url = new URL(forecastUrl(DEFAULT_WEATHER_LOCATION));
  assert.equal(url.hostname, 'api.open-meteo.com'); assert.equal(url.searchParams.get('timezone'), 'auto');
});
