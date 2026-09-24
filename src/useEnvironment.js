import { useEffect, useRef, useState } from 'react';
import { daylightAt, DEFAULT_WEATHER_LOCATION, forecastUrl, parseWeather } from './environment';

export function useEnvironment(mode) {
  const [now, setNow] = useState(() => new Date());
  const [location, setLocation] = useState(DEFAULT_WEATHER_LOCATION);
  const [weather, setWeather] = useState(null);
  const [status, setStatus] = useState('loading');
  const [locationMessage, setLocationMessage] = useState('');
  const [locating, setLocating] = useState(false);
  const [retry, setRetry] = useState(0);
  const alive = useRef(true);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(() => {
    alive.current = true;
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    return () => { alive.current = false; clearInterval(timer); document.removeEventListener('visibilitychange', tick); };
  }, []);
  useEffect(() => {
    let disposed = false, controller, lastWeather = null;
    setWeather(null); setStatus('loading');
    async function refresh() {
      controller?.abort(); controller = new AbortController();
      const request = controller;
      const timeout = setTimeout(() => request.abort(), 10000);
      try {
        const response = await fetch(forecastUrl(location), { signal: request.signal });
        if (!response.ok) throw new Error(`Weather ${response.status}`);
        const parsed = parseWeather(await response.json());
        if (disposed || request !== controller) return;
        lastWeather = parsed; setWeather(parsed); setStatus('live');
      } catch {
        if (!disposed && request === controller) setStatus(lastWeather ? 'stale' : 'unavailable');
      } finally { clearTimeout(timeout); }
    }
    refresh();
    const interval = setInterval(refresh, 10 * 60 * 1000);
    const resume = () => { if (!document.hidden && (!lastWeather || Date.now() - lastWeather.fetchedAt > 10 * 60 * 1000)) refresh(); };
    document.addEventListener('visibilitychange', resume);
    return () => { disposed = true; controller?.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', resume); };
  }, [location, retry]);
  function useMyLocation() {
    if (!navigator.geolocation) { setLocationMessage('Location unavailable. Showing the default city.'); return; }
    setLocating(true); setLocationMessage('');
    navigator.geolocation.getCurrentPosition(position => {
      if (!alive.current) return;
      setLocation({ name: 'Your location', latitude: Number(position.coords.latitude.toFixed(2)), longitude: Number(position.coords.longitude.toFixed(2)) });
      setLocating(false);
    }, () => {
      if (!alive.current) return;
      setLocating(false); setLocationMessage('Location unavailable. Keeping the selected forecast.');
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60 * 60 * 1000 });
  }
  const daylight = mode === 'auto' ? daylightAt(now, timeZone) : { night: mode === 'night' ? 1 : 0, warmth: mode === 'morning' ? 0.3 : 0, phase: mode === 'night' ? 'Night preview' : 'Morning preview' };
  const stale = status === 'stale' || !!weather && now.getTime() - weather.observedAt > 60 * 60 * 1000;
  return { now, timeZone, daylight, location, weather, status: stale ? 'stale' : status, locating, locationMessage, useMyLocation,
    retry: () => setRetry(n => n + 1),
    scene: { ...daylight, cloudCover: weather?.cloudCover ?? 0, weatherKind: weather?.kind ?? 'clear', wind: weather?.wind ?? 0, weatherKnown: !!weather } };
}
