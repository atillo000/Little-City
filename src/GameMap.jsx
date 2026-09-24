import { stops } from './content';
import { WORLD, BUILDINGS, OFFICE } from './world';
import { PARK } from './gameLocations';
import { MAYA } from './cityLifePaths';
export function Icon({ name, size = 20, ...props }) {
  const paths = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    diagonal: <><path d="M6 18 18 6M6 6h12v12" /></>,
    reset: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></>,
    sound: <><path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>,
    mute: <><path d="m11 4-6 5H2v6h3l6 5V4ZM16 9l6 6m0-6-6 6" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2M12 16v.1" /></>,
    close: <><path d="m6 6 12 12M6 18 18 6" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" /><circle cx="12" cy="10" r="2" /></>,
    car: <><path d="m5 8 2-4h10l2 4 2 3v7H3v-7l2-3ZM3 11h18M6 15h2m8 0h2M5 18v2m14-2v2M5 8h14" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    moon: <><path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.arrow}</svg>;
}

export function Logo() {
  return <svg width="38" height="38" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M5 34V14l10-5v25M15 34V4l13 5v25M28 34V17l8 4v13" fill="#8ca7ac" /><path d="M15 34V4l13 5v25" fill="#526d7c" /><path d="M19 11h4m-4 6h4m-4 6h4M8 18h3m-3 6h3m20 0h2" stroke="#eee5cf" strokeWidth="2" /><path d="M2 35h36" stroke="#a6b58a" strokeWidth="3" /></svg>;
}

export function MiniMap({ car, target, onSelect }) {
  return <div className="minimap" aria-label="City map">
    <div className="minimap-heading"><span>YOU ARE HERE</span><span className="north">N ↑</span></div>
    <svg viewBox="0 0 180 112" role="img" aria-label="Your car and neighborhood destinations">
      <rect x="22" y="8" width="136" height="96" rx="5" fill="#e1ded3" />
      {WORLD.streetsX.map(x => <path key={`x${x}`} d={`M${90 + x * 0.88} 8v96`} stroke="#a5b0b1" strokeWidth="5" />)}
      {WORLD.streetsZ.map(z => <path key={`z${z}`} d={`M22 ${56 + z * 0.66}h136`} stroke="#a5b0b1" strokeWidth="4" />)}
      {BUILDINGS.map((b, i) => <rect key={i} x={90 + (b.x - b.width / 2) * 0.88} y={56 + (b.z - b.depth / 2) * 0.66} width={b.width * 0.88} height={b.depth * 0.66} rx="1" fill={b.id === 'office' ? '#678ca4' : '#b4bcac'} />)}
      <rect x="80" y="68" width="20" height="12" fill="#a5bb94" rx="2" />
      {[...stops, PARK, OFFICE, { ...MAYA, name: 'Maya' }].map(stop => <g key={stop.id} onClick={() => onSelect(stop.id)} className="map-point"><circle cx={90 + stop.parking[0] * 0.88} cy={56 + stop.parking[1] * 0.66} r={target === stop.id ? 6 : 3} fill={target === stop.id ? '#e1ad4b' : '#fffaf0'} stroke="#796294" strokeWidth="1.5" /><title>{stop.name}</title></g>)}
      <g transform={`translate(${90 + car.x * 0.88} ${56 + car.z * 0.66}) rotate(${-car.heading * 180 / Math.PI})`}><circle r="7" fill="#e8aa7a" opacity=".3" /><path d="m0 5-4-8h8z" fill="#ce774e" stroke="#fffaf0" strokeWidth="1.5" /></g>
    </svg>
    <div className="map-caption"><span className="map-dot" /> Little City · live position</div>
  </div>;
}
