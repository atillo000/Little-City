import { useEffect, useRef, useState } from 'react';
import { CITIES, CONTRACTS, ROADS, actor, attack, cleanWorldSave, createSession, interact, notify, objectivePoint, recover, startContract, toggleVehicle } from './worldAdventure';
import { mountAdventure } from './adventureScene';
import { ExperienceDialog } from './GuestExperience';
import './adventure.css';

const SAVE_KEY = 'little-city-world-v1';
const CONTROL_KEYS = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'run', ShiftRight: 'run', Space: 'brake', KeyJ: 'attack' };
function readSave() { try { return cleanWorldSave(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { return cleanWorldSave(); } }
function sessionFor(city, save) { return { ...createSession(city, save), cityInfo: city }; }
function snapshot(s) { return { ...s, player: { ...s.player }, car: { ...s.car }, mission: s.mission && { ...s.mission }, enemies: s.enemies.map(e => ({ ...e })), policeCars: s.policeCars.map(c => ({ ...c })) }; }

export default function WorldAdventure({ onNeighborhood }) {
  const [initial] = useState(readSave), session = useRef(null);
  if (!session.current) session.current = sessionFor(CITIES.find(c => c.id === initial.city), initial);
  const [hud, setHud] = useState(() => snapshot(session.current)), [panel, setPanel] = useState(null), [ready, setReady] = useState(false), [error, setError] = useState(false), [storage, setStorage] = useState(true);
  const host = useRef(null), input = useRef({}), paused = useRef(false), held = useRef(new Set()), touch = useRef({}), lastSave = useRef('');
  paused.current = !!panel || error;
  const city = hud.cityInfo, current = CONTRACTS.find(m => m.id === hud.mission?.id), p = actor(hud), point = objectivePoint(hud);
  function clear() { held.current.clear(); touch.current = {}; input.current = {}; }
  function refreshControls() { const next = { ...touch.current }; held.current.forEach(key => { if (CONTROL_KEYS[key]) next[CONTROL_KEYS[key]] = true; if (key === 'Space') next.jump = true; }); input.current = next; }
  function open(value) { clear(); setPanel(value); }
  function save(s) {
    const value = JSON.stringify({ city: s.city, cash: s.cash, completed: s.completed });
    if (lastSave.current === value) return;
    try { localStorage.setItem(SAVE_KEY, value); lastSave.current = value; } catch { setStorage(false); }
  }
  useEffect(() => {
    document.title = 'Little City: World Tour';
    let dispose;
    try { dispose = mountAdventure(host.current, session, input, paused, s => { setHud(snapshot(s)); save(s); setReady(true); }, () => setError(true)); }
    catch (e) { console.error('World scene could not start', e); setError(true); }
    return () => dispose?.();
  }, []);
  function action(key) {
    if (paused.current || !ready) return;
    const s = session.current;
    if (key === 'vehicle') toggleVehicle(s);
    if (key === 'attack') attack(s);
    if (key === 'interact') interact(s);
    if (key === 'weapon') { s.weapon = s.weapon === 'pistol' ? 'fists' : 'pistol'; notify(s, s.weapon === 'pistol' ? 'Pistol equipped. J to fire.' : 'Fists equipped. Get close and press J.'); }
    if (key === 'reload' && s.ammo < 48 && s.reload <= 0 && !s.down) { s.reload = 1.5; notify(s, 'Reloading...'); }
    setHud(snapshot(s));
  }
  const actions = useRef(action); actions.current = action;
  useEffect(() => {
    const mapping = CONTROL_KEYS;
    function update() { refreshControls(); }
    function down(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || paused.current) return;
      if (['BUTTON', 'A'].includes(e.target.tagName) && ['Space', 'Enter'].includes(e.code)) return;
      if (mapping[e.code] || ['KeyF', 'KeyE', 'KeyQ', 'KeyR', 'KeyM', 'KeyL', 'Escape'].includes(e.code)) e.preventDefault();
      held.current.add(e.code); update(); if (e.repeat) return;
      const key = { KeyF: 'vehicle', KeyE: 'interact', KeyQ: 'weapon', KeyR: 'reload', KeyJ: 'attack' }[e.code]; if (key) actions.current(key);
      if (e.code === 'KeyM') { clear(); setPanel('world'); }
      if (e.code === 'KeyL') { clear(); setPanel('contracts'); }
      if (e.code === 'Escape') { clear(); setPanel('help'); }
    }
    function up(e) { held.current.delete(e.code); update(); }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', clear); };
  }, []);
  function touchControl(key) {
    function set(pressed) { touch.current[key] = pressed; if (key === 'brake') touch.current.jump = pressed; refreshControls(); }
    return { onPointerDown: e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); set(true); if (key === 'attack') actions.current('attack'); }, onPointerUp: () => set(false), onPointerCancel: () => set(false), onLostPointerCapture: () => set(false) };
  }
  function travel(id) {
    const old = session.current;
    if (old.heat > 0 || old.mission || old.down) return;
    session.current = sessionFor(CITIES.find(c => c.id === id), old); save(session.current); setHud(snapshot(session.current)); open(null);
  }
  const task = !current ? 'The world is yours.' : hud.mission.stage === 0 ? current.id === 'crew' ? `Eliminate the crew · ${hud.enemies.filter(e => e.kind === 'gang' && e.health <= 0).length}/4` : 'Collect the marked package' : hud.heat > 0 ? 'Lose the police' : 'Reach the drop-off';
  return <div className="adventure" style={{ '--city-accent': city.color }}>
    <div className="adventure-canvas" ref={host} />
    <header className="adventure-header"><a href="#world" onClick={e => { e.preventDefault(); open('world'); }} className="adventure-brand">lc<span>WORLD TOUR</span><i>✦</i></a><nav aria-label="World navigation"><button onClick={() => open('world')}>◎ <span>World map</span><kbd>M</kbd></button><button onClick={() => open('contracts')}>◇ <span>Contracts</span><kbd>L</kbd></button><button onClick={() => open('help')} aria-label="Controls and pause menu">Ⅱ</button></nav></header>
    <section className="adventure-location"><span className="adventure-kicker">{city.country} / {city.region}</span><h1>{city.name}<span>.</span></h1><div><i />{city.district}<span>FREE ROAM</span></div></section>
    <section className="adventure-stats" aria-label="Player status"><div className="wanted" aria-label={`Wanted level ${Math.ceil(hud.heat)}`}><span className={hud.heat >= 0.01 ? 'lit' : ''}>★</span><span className={hud.heat > 1 ? 'lit' : ''}>★</span><span className={hud.heat > 2 ? 'lit' : ''}>★</span></div><strong>${hud.cash.toLocaleString()}</strong><label><span>HEALTH</span><b>{Math.ceil(hud.health)}</b><progress max="100" value={hud.health} /></label><div className="weapon-status"><span>{hud.driving ? 'SPORT COUPE' : hud.weapon === 'pistol' ? 'PISTOL' : 'UNARMED'}</span><b>{hud.driving ? `${Math.round(Math.abs(hud.car.speed) * 3.6)} km/h` : hud.reload > 0 ? 'RELOADING' : hud.weapon === 'pistol' ? `${hud.ammo} / ∞` : 'FISTS'}</b></div></section>
    <section className="adventure-objective"><div className="adventure-kicker">{current ? current.type + ' / ACTIVE CONTRACT' : 'YOUR NEXT MOVE'}</div><h2>{task}</h2><p>{current ? `${current.title} · $${current.reward.toLocaleString()}` : 'Seven cities. No set route. Make your next move.'}</p>{point && <span className="objective-distance">◇ {Math.round(Math.hypot(p.x - point.x, p.z - point.z))} m <small>Follow the gold marker · E to interact</small></span>}<button onClick={() => open('contracts')}>{current ? 'Contract details' : 'Find a contract'} <span>↗</span></button></section>
    {hud.heat > 0 && <div className="adventure-dispatch" aria-label="Police response"><span>POLICE RESPONSE</span><strong>{hud.policeCars.some(c => c.state === 'onscene') ? 'Officers on scene' : hud.policeCars.some(c => c.state === 'responding') ? 'Patrol cars en route' : 'Dispatching patrol'}</strong><small>Break line of sight to lose the pursuit.</small></div>}
    {hud.messageTime > 0 && <div className="adventure-toast" role="status">{hud.message}</div>}
    {hud.down > 0 && <div className="adventure-wasted"><h2>WASTED</h2><p>Returning to your safehouse…</p></div>}
    {!ready && !error && <div className="adventure-loading">Building your city…</div>}
    {error && <div className="adventure-loading"><strong>The city needs WebGL.</strong><p>Enable hardware acceleration and reload to play.</p><button onClick={onNeighborhood}>Back to neighborhood</button></div>}
    <div className="adventure-bottom"><section className="adventure-radar" aria-label="City minimap"><div><span>↑ N</span><b>{city.district.toUpperCase()}</b></div><svg viewBox="-460 -460 920 920" role="img" aria-label="Streets, your position, car and mission destination"><rect x="-460" y="-460" width="920" height="920" fill="#182b31" />{hud.blocks.map((b, i) => <rect key={i} x={b.x - b.width / 2} y={b.z - b.depth / 2} width={b.width} height={b.depth} fill="#425453" />)}{ROADS.map(n => <g key={n} stroke="#82908a" strokeWidth="9"><path d={`M${n} -440V440`} /><path d={`M-440 ${n}H440`} /></g>)}<rect x="445" y="-460" width="15" height="920" fill="#609ba3" /><circle cx="8" cy="12" r="18" fill="#87c7a1" /><circle cx={hud.car.x} cy={hud.car.z} r="15" fill="#64ddd1" />{hud.enemies.filter(e => e.health > 0).map(e => <circle key={e.id} cx={e.x} cy={e.z} r="13" fill={e.kind === 'police' ? '#88aaff' : '#ff6d82'} />)}{point && <g><path d={`M${p.x} ${p.z}L${point.x} ${point.z}`} stroke="#f8d47a" strokeWidth="4" strokeDasharray="12 10" /><circle cx={point.x} cy={point.z} r="23" fill="#f8d47a" /></g>}<path d="M0 -24L17 18L0 11L-17 18Z" fill="white" stroke="#152b32" strokeWidth="5" transform={`translate(${p.x} ${p.z}) rotate(${180 - p.heading * 180 / Math.PI})`} /></svg><footer><span><i /> {hud.driving ? 'IN VEHICLE' : 'ON FOOT'}</span><button onClick={() => open('world')}>Expand ↗</button></footer></section><div className="adventure-hints"><span><kbd>W A S D</kbd> {hud.driving ? 'Drive' : 'Move'}</span><span><kbd>F</kbd> {hud.driving ? 'Exit car' : 'Enter car'}</span><span><kbd>J</kbd> Attack</span><span><kbd>E</kbd> Interact</span><small>Drag to look · Scroll to zoom</small></div><div className="adventure-actions"><button disabled={!ready || error} onClick={() => action('vehicle')}>{hud.driving ? 'Exit car' : 'Enter car'} <kbd>F</kbd></button><button disabled={!ready || error || hud.driving} {...touchControl('attack')}>Attack <kbd>J</kbd></button><button disabled={!ready || error} onClick={() => action('interact')}>Interact <kbd>E</kbd></button><button onClick={() => action('weapon')}>{hud.weapon === 'pistol' ? 'Use fists' : 'Use pistol'} <kbd>Q</kbd></button><button onClick={() => action('reload')}>Reload <kbd>R</kbd></button></div></div>
    <div className="adventure-touch" aria-label="Touch movement controls">{[['forward', '↑'], ['left', '←'], ['backward', '↓'], ['right', '→'], ['run', 'Run'], ['brake', hud.driving ? 'Brake' : 'Jump']].map(([key, title]) => <button key={key} className={'control-' + key} aria-label={key} {...touchControl(key)}>{title}</button>)}</div>
    {panel === 'world' && <ExperienceDialog title="One world. Your next chapter." className="adventure-dialog world-dialog" onClose={() => open(null)}><p>Travel between seven open districts. Every city has its own skyline, streets, and three contracts.</p><div className="atlas"><svg viewBox="0 0 1000 440" aria-label="World travel map"><defs><pattern id="atlas-grid" width="50" height="44" patternUnits="userSpaceOnUse"><path d="M50 0H0V44" fill="none" stroke="#ffffff0b" /></pattern></defs><rect width="1000" height="440" fill="url(#atlas-grid)" /><g fill="#354b52" stroke="#6c8184" strokeWidth="1"><path d="M75 75L150 35 275 65 300 105 255 145 245 195 215 220 185 170 135 140Z" /><path d="M270 210L350 225 385 270 350 325 305 400 295 310 265 260Z" /><path d="M435 83L485 58 535 73 555 130 495 149 445 127Z" /><path d="M450 152L532 143 587 210 551 280 510 367 477 302 451 230 425 189Z" /><path d="M543 64L677 40 800 60 930 110 862 171 821 222 765 210 723 155 674 192 629 145 565 140Z" /><path d="M786 307L866 285 927 335 887 371 804 365Z" /><path d="M329 40L379 32 395 75 356 100Z" /></g>{CITIES.map(c => <g key={c.id} transform={`translate(${c.map[0] * 10} ${c.map[1] * 4.4})`}><circle r={c.id === city.id ? 12 : 7} fill={c.color} opacity=".3" /><circle r="4" fill={c.color} /><text x="10" y="-10" fill="#f3ece1" fontSize="13">{c.name}</text></g>)}</svg></div>{(hud.mission || hud.heat > 0 || hud.down > 0) && <p className="travel-notice">Finish or abandon your contract and lose the police before flying.</p>}<div className="destination-grid">{CITIES.map(c => <button key={c.id} className={city.id === c.id ? 'selected' : ''} disabled={city.id === c.id || !!hud.mission || hud.heat > 0 || hud.down > 0 || !ready || error} onClick={() => travel(c.id)} style={{ '--destination-color': c.color }}><small>{c.country}</small><strong>{c.name}<span>{city.id === c.id ? '●' : '↗'}</span></strong><span>{c.district} · {hud.completed.filter(k => k.startsWith(c.id + ':')).length}/3 contracts</span></button>)}</div><small>Stylized city districts connected by instant flights, not a real-scale Earth simulation.</small></ExperienceDialog>}
    {panel === 'contracts' && <ExperienceDialog title="Good work. Better pay." className="adventure-dialog" onClose={() => open(null)}><p>Available in {city.name}. Follow the gold marker, stop, then press E at the objective. Combat locks onto the nearest visible enemy in range.</p><div className="world-contracts">{CONTRACTS.map(m => { const done = hud.completed.includes(`${city.id}:${m.id}`); return <article key={m.id}><div><small>{m.type}</small><b>${m.reward.toLocaleString()}</b></div><h3>{m.title}</h3><p>{m.description}</p><button disabled={done || !!hud.mission || !ready || error || hud.down > 0} onClick={() => { startContract(session.current, m.id); setHud(snapshot(session.current)); open(null); }}>{done ? '✓ Completed' : hud.mission?.id === m.id ? 'In progress' : 'Accept contract ↗'}</button></article>; })}</div>{hud.mission && <button className="adventure-secondary" onClick={() => { session.current.mission = null; session.current.enemies = session.current.enemies.filter(e => e.kind !== 'gang'); notify(session.current, 'Contract abandoned. You can accept it again.'); setHud(snapshot(session.current)); open(null); }}>Abandon current contract</button>}<p className="adventure-save">{storage ? 'Cash and completed contracts save automatically on this browser. Unfinished contracts restart after reloading.' : 'Browser storage is unavailable. Progress lasts for this session.'} {hud.completed.length}/21 completed.</p></ExperienceDialog>}
    {panel === 'help' && <ExperienceDialog title="Make yourself at home." className="adventure-dialog" onClose={() => open(null)}><p>The game is paused. Explore on foot or take your cyan coupe. Pick up contracts and fly to another country using the world map.</p><div className="adventure-help">{[['WASD / arrows', 'Move or drive'], ['Shift / Space', 'Sprint / jump; Space brakes while driving'], ['F', 'Enter or exit your car (stop first)'], ['J / Attack', 'Shoot or punch the nearest visible enemy'], ['Q / R', 'Switch fists / pistol; reload'], ['E', 'Collect, deliver, or heal at the green safehouse'], ['M / L', 'World map / contracts'], ['Drag / scroll', 'Look around / zoom']].map(([key, text]) => <div key={key}><kbd>{key}</kbd><span>{text}</span></div>)}</div><p>Shots and attacks attract police. Patrol cars respond by road, then officers get out. Stop attacking for 12 seconds and stay out of police sight for 8 seconds to begin losing heat. Enemies fight back; at zero health you respawn and can restart your contract. Reloading provides another 48 rounds. Return to the green safehouse and press E on foot to heal.</p><div className="adventure-menu-actions"><button onClick={() => open(null)}>Resume game ↗</button><button onClick={() => { recover(session.current); setHud(snapshot(session.current)); open(null); }}>Recover to safehouse</button><button onClick={onNeighborhood}>Original neighborhood</button></div></ExperienceDialog>}
  </div>;
}
