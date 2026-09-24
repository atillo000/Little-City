export default function EnvironmentPanel({ environment, mode, onMode }) {
  const { now, timeZone, daylight, location, weather, status, locating, locationMessage } = environment;
  const clock = new Intl.DateTimeFormat('en', { timeZone, hour: 'numeric', minute: '2-digit' }).format(now);
  return <aside className="environment-panel" aria-label="Time and weather" data-phase={daylight.phase} data-night={daylight.night}>
    <div className="environment-clock"><time dateTime={now.toISOString()}>{clock}</time><span>{daylight.phase}</span></div>
    <div className="timezone-label" title={timeZone}>{timeZone.replaceAll('_', ' ')}</div>
    <div className="weather-summary" aria-live="polite" data-status={status}><strong>{weather ? `${Math.round(weather.temperature)}°C` : '—'}</strong><span>{weather?.label || (status === 'loading' ? 'Loading forecast…' : 'Weather unavailable')}</span></div>
    <div className="weather-location">{location.name}{status === 'stale' ? ' · stale' : ''}</div>
    <div className="environment-modes" role="group" aria-label="City lighting">{[['auto', 'Auto'], ['morning', 'Morning'], ['night', 'Night']].map(([value, label]) => <button key={value} aria-pressed={mode === value} onClick={() => onMode(value)}>{label}</button>)}</div>
    <details className="weather-details"><summary>Forecast & location</summary><div className="weather-popover">
      <strong>{location.name}</strong>
      <p>{weather ? `${weather.label} · Wind ${Math.round(weather.wind)} km/h` : 'Forecast unavailable. The scene uses a clear-weather fallback.'}</p>
      {weather?.rainChance != null && <p>Next hour: {weather.rainChance}% precipitation chance</p>}
      {weather && <p>{status === 'stale' ? 'Last known forecast' : 'Forecast timestamp'}: {new Date(weather.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
      <button onClick={environment.useMyLocation} disabled={locating}>{locating ? 'Finding location…' : 'Use my location'}</button>
      <button onClick={environment.retry}>Refresh weather</button>
      <p>Location is optional. Approximate coordinates are sent to Open-Meteo for the forecast.</p>
      {locationMessage && <p role="status">{locationMessage}</p>}
      <p>Auto lighting follows your device time zone. Night starts at 6 PM; dawn fades into morning from 5–6 AM.</p>
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo ↗</a>
    </div></details>
  </aside>;
}
