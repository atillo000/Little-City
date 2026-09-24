import { forecastUrl, parseWeather } from '../models/environment.js';

export async function fetchWeather(location, { signal, fetcher = globalThis.fetch } = {}) {
  const response = await fetcher(forecastUrl(location), { signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error' });
  if (!response.ok) throw new Error(`Weather ${response.status}`);
  const text = await response.text();
  if (text.length > 256_000) throw new Error('Forecast response is too large');
  return parseWeather(JSON.parse(text));
}
