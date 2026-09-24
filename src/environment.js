export const DEFAULT_WEATHER_LOCATION = { name: 'Manila (default)', latitude: 14.6, longitude: 120.98 };
const smooth = value => { const x = Math.max(0, Math.min(1, value)); return x * x * (3 - 2 * x); };
export function daylightAt(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const hour = Number(parts.find(p => p.type === 'hour').value) + Number(parts.find(p => p.type === 'minute').value) / 60;
  if (hour < 5 || hour >= 18) return { night: 1, warmth: 0, phase: 'Night', hour };
  if (hour < 6) return { night: 1 - smooth(hour - 5), warmth: Math.sin((hour - 5) * Math.PI) * 0.7, phase: 'Dawn', hour };
  if (hour >= 16) return { night: smooth((hour - 16) / 2), warmth: Math.sin((hour - 16) / 2 * Math.PI) * 0.9, phase: 'Dusk', hour };
  return { night: 0, warmth: hour < 10 ? (10 - hour) / 8 : 0, phase: hour < 12 ? 'Morning' : 'Afternoon', hour };
}
export function weatherFromCode(code) {
  if (code === 0) return { kind: 'clear', label: 'Clear sky' };
  if ([1, 2, 3].includes(code)) return { kind: 'cloudy', label: code === 3 ? 'Overcast' : 'Partly cloudy' };
  if ([45, 48].includes(code)) return { kind: 'fog', label: 'Fog' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { kind: 'snow', label: 'Snow' };
  if ([95, 96, 99].includes(code)) return { kind: 'storm', label: 'Thunderstorms' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { kind: 'rain', label: 'Rain' };
  return { kind: 'unknown', label: 'Conditions unavailable' };
}
export function forecastUrl(location) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: location.latitude.toFixed(2), longitude: location.longitude.toFixed(2),
    current: 'temperature_2m,weather_code,cloud_cover,wind_speed_10m', hourly: 'precipitation_probability', forecast_days: '2', timezone: 'auto', timeformat: 'unixtime' }).toString();
  return url.toString();
}
export function parseWeather(data, now = Date.now()) {
  const current = data?.current;
  if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code) || !Number.isFinite(current.time)) throw new Error('Invalid forecast response');
  const index = data.hourly?.time?.findIndex(time => time * 1000 > now) ?? -1;
  return { ...weatherFromCode(current.weather_code), temperature: current.temperature_2m, cloudCover: Math.max(0, Math.min(1, (current.cloud_cover ?? 0) / 100)),
    wind: current.wind_speed_10m ?? 0, rainChance: index >= 0 ? data.hourly.precipitation_probability?.[index] ?? null : null,
    observedAt: current.time * 1000, fetchedAt: now };
}
