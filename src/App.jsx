import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { stops } from './content';
import { SPAWN } from './driving';
import { OFFICE } from './world';
import { useEnvironment } from './useEnvironment';
import EnvironmentPanel from './EnvironmentPanel';
import { CHARACTER_SPAWN } from './characterMovement';
import { useGuest } from './useGuest';
import { GuestEntry, MissionBoard, InteractionDialog, HelpDialog, ExploreDialog } from './GuestExperience';
import { currentObjective, inventory, missionSummary, freshProgress } from './missions';
import { interactionPoint, PARK, DESKS } from './gameLocations';
import { MAYA } from './cityLifePaths';
import { MiniMap, Logo, Icon } from './GameMap';
import './simulation.css';
import './experience.css';
import './game.css';
import './lounge.css';
import LoungeDialog from './LoungeDialog';
import { useMusic } from './useMusic';
import { emptyControls, combineControls } from './controls';

const City = lazy(() => import('./City.jsx'));
const WorldAdventure = lazy(() => import('./WorldAdventure.jsx'));

export default function App() {
  const [neighborhood, setNeighborhood] = useState(false);
  return neighborhood ? <><NeighborhoodApp /><button className="return-world" onClick={() => setNeighborhood(false)}>↗ World tour</button></> : <Suspense fallback={<div style={{ padding: 40, background: '#172831', color: '#fff', height: '100vh' }}>Loading World Tour…</div>}><WorldAdventure onNeighborhood={() => setNeighborhood(true)} /></Suspense>;
}

function NeighborhoodApp() {
  const [section, setSection] = useState(null), [nearby, setNearby] = useState(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(false);
  const [car, setCar] = useState({ ...SPAWN }), [viewMode, setViewMode] = useState('drive');
  const [player, setPlayer] = useState({ ...CHARACTER_SPAWN, action: 'Idle' });
  const guests = useGuest(), { guest, record } = guests;
  const inside = ['office', 'lounge'].includes(viewMode);
  const music = useMusic(viewMode === 'lounge');
  const musicRef = useRef(false); musicRef.current = music.playing;
  const progress = guest?.progress ?? freshProgress(), objective = currentObjective(progress);
  const [lightingMode, setLightingMode] = useState(() => { try { const saved = localStorage.getItem('city-lighting-v2'); return ['auto', 'morning', 'night'].includes(saved) ? saved : 'auto'; } catch { return 'auto'; } });
  const environment = useEnvironment(lightingMode);
  const lightingModeRef = useRef(environment.scene); lightingModeRef.current = environment.scene;
  const gameRef = useRef(progress); gameRef.current = progress;
  const controlsRef = useRef(emptyControls()), apiRef = useRef(null), pausedRef = useRef(true), nearbyRef = useRef(null);
  pausedRef.current = Boolean(section) || !guest || error; nearbyRef.current = nearby;
  const keyboardRef = useRef(emptyControls()), pointerRef = useRef(emptyControls());
  const context = { ...(inside ? player : car), mode: viewMode };
  const clearInput = useCallback(() => { window.dispatchEvent(new Event('city-input-clear')); keyboardRef.current = emptyControls(); pointerRef.current = emptyControls(); controlsRef.current = emptyControls(); }, []);
  useEffect(() => { document.title = 'Little City — Neighborhood Adventures'; }, []);
  useEffect(() => { try { localStorage.setItem('city-lighting-v2', lightingMode); } catch { /* Saving is optional. */ } }, [lightingMode]);
  const select = useCallback(id => {
    clearInput();
    if (id === 'office') {
      if (apiRef.current && !error) { apiRef.current.visit('office'); setSection(null); setViewMode('office'); }
      return;
    }
    setSection(id);
  }, [clearInput, error]);
  const explore = useCallback(id => {
    clearInput();
    if (id === 'lounge') { setSection('lounge'); return; }
    if (id === 'office') { select(id); return; }
    const mode = !error ? apiRef.current?.visit(id) : null;
    if (mode) setViewMode(mode);
    setSection(stops.some(place => place.id === id) ? 'explore:' + id : id);
  }, [clearInput, error, select]);
  const reset = useCallback(() => { clearInput(); if (!['office', 'lounge'].includes(apiRef.current?.context().mode)) record({ type: 'reset' }); apiRef.current?.reset(); apiRef.current?.focus(); }, [clearInput, record]);
  useEffect(() => {
    const mapping = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'brake', ShiftLeft: 'run', ShiftRight: 'run', KeyF: 'wave' };
    const held = new Set();
    function update() { const next = emptyControls(); held.forEach(code => { if (mapping[code]) next[mapping[code]] = true; }); next.jump = held.has('Space'); keyboardRef.current = next; controlsRef.current = combineControls(next, pointerRef.current); }
    function keyDown(event) {
      if (pausedRef.current || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (['BUTTON', 'A'].includes(event.target.tagName) && ['Space', 'Enter'].includes(event.code)) return;
      if (mapping[event.code]) { event.preventDefault(); held.add(event.code); update(); }
      if (event.repeat) return;
      if (event.code === 'KeyR') reset();
      if ((event.code === 'KeyE' || event.code === 'Enter') && nearbyRef.current) { event.preventDefault(); select(nearbyRef.current); }
    }
    function keyUp(event) { held.delete(event.code); update(); }
    function clear() { held.clear(); keyboardRef.current = emptyControls(); pointerRef.current = emptyControls(); controlsRef.current = emptyControls(); }
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', clear); window.addEventListener('city-input-clear', clear); document.addEventListener('visibilitychange', clear);
    return () => { window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clear); window.removeEventListener('city-input-clear', clear); document.removeEventListener('visibilitychange', clear); };
  }, [reset, select]);
  function enterGuest(name, id) { clearInput(); setSection(null); setViewMode('drive'); apiRef.current?.newVisit(); guests.enter(name, id); }
  function switchGuest() { clearInput(); setSection(null); setViewMode('drive'); apiRef.current?.newVisit(); guests.leave(); }
  function leaveHub() { clearInput(); setViewMode('drive'); apiRef.current?.setView('drive'); apiRef.current?.focus(); }
  function toggleView() { clearInput(); const next = viewMode === 'drive' ? 'map' : 'drive'; setViewMode(next); apiRef.current?.setView(next); }
  function setPointer(action, pressed) { pointerRef.current[action] = pressed; controlsRef.current = combineControls(keyboardRef.current, pointerRef.current); }
  function touch(action, pressed, event) { event.preventDefault(); if (pressed) event.currentTarget.setPointerCapture(event.pointerId); setPointer(action, pressed); }
  const pointerAction = action => ({ onPointerDown: event => touch(action, true, event), onPointerUp: event => touch(action, false, event), onPointerCancel: event => touch(action, false, event), onLostPointerCapture: () => setPointer(action, false) });
  function enterLounge() {
    if (!apiRef.current || error) return;
    clearInput(); setSection(null); setViewMode('lounge'); apiRef.current.visit('lounge'); apiRef.current.focus();
  }
  function action(event) {
    if (error || !apiRef.current) return false;
    const changed = record({ ...event, context: apiRef.current.context() });
    if (changed) { setSection(null); clearInput(); apiRef.current.focus(); }
    return changed;
  }
  const nearbyStop = [{ id: 'jukebox', name: 'Lounge music console', number: '♫' }, OFFICE, MAYA, PARK, ...stops, ...DESKS].find(stop => stop.id === nearby);
  const targetId = objective.location === 'dispatch' && viewMode !== 'office' ? 'office' : objective.location;
  const target = interactionPoint(targetId, viewMode);
  const distance = target ? Math.round(Math.hypot(context.x - target.x, context.z - target.z)) : null;
  return <div className={`app-shell simulation is-driving ${environment.daylight.night >= 0.5 ? 'is-night' : ''} ${inside ? 'is-office' : ''} ${viewMode === 'lounge' ? 'is-lounge' : ''}`}>
    <header className="site-header"><a className="brand" href="#home" onClick={event => { event.preventDefault(); select('missions'); }} aria-label="Little City journal"><Logo /><span>little<span className="brand-light">city</span><span className="brand-period">.</span></span></a><nav aria-label="City destinations">{stops.map(stop => <button key={stop.id} onClick={() => explore(stop.id)}>{{ cafe: 'Cafe', workshop: 'Repairs', market: 'Market', library: 'Library', lounge: 'Lounge' }[stop.id]}<span /></button>)}</nav><button className="contact-button" onClick={() => select('missions')}>Journal <Icon name="arrow" size={16} /></button></header>
    <main id="home">
      <div className="world-wrap"><Suspense fallback={null}><City controlsRef={controlsRef} apiRef={apiRef} pausedRef={pausedRef} lightingModeRef={lightingModeRef} gameRef={gameRef} musicRef={musicRef} onReady={() => setReady(true)} onError={() => setError(true)} onNearby={setNearby} onMove={setCar} onCharacterMove={setPlayer} onSelect={select} onActivity={record} /></Suspense></div>
      <section className="welcome"><div className="eyebrow">A GOOD DAY TO DO SOME GOOD</div><h1>Little City<span className="serif-word">.</span></h1><div className="hello-line">Shift {progress.day} · {progress.coins} coins</div>{guest && <div className="guest-strip"><button onClick={() => select('missions')} aria-label={`Guest ${guest.name}, open journal`} className="guest-name">{guest.name}</button><button className="mission-button" onClick={() => select('missions')}>Jobs <b>{missionSummary(progress).count}/3</b></button></div>}</section>
      {guest && progress.active && <section className="objective-tracker" aria-label="Current objective"><small>{progress.active ? 'CURRENT JOB' : progress.completed.length === 3 ? 'SHIFT COMPLETE' : 'START HERE'}</small><strong>{objective.title}</strong><span>{distance !== null ? `${distance} m away · gold map marker` : 'Head back outside to continue'}</span><div>Carrying: {inventory(progress) || 'Nothing'}</div>{progress.active === 'coffee' && progress.step === 1 && <div className="cargo-condition">Tray condition <b>{progress.condition}%</b><progress value={progress.condition} max={100} aria-label="Coffee tray condition" /></div>}<button onClick={() => select(objective.location)}>View task →</button></section>}
      <EnvironmentPanel environment={environment} mode={lightingMode} onMode={setLightingMode} />
      <button className="office-access" disabled={!ready || error} onClick={() => inside ? leaveHub() : select('office')}><Icon name="code" size={17} />{inside ? 'Back to city' : 'Enter hub'}<Icon name="arrow" size={15} /></button>
      {error && <div className="scene-error" role="status"><h3>The city needs WebGL.</h3><p>Try a browser with hardware acceleration to play. Your saved jobs are safe; you can still read your journal.</p><button onClick={() => select('missions')}>Open journal</button></div>}
      <div className={`nearby-toast ${nearbyStop && !section ? 'visible' : ''}`} aria-live="polite">{nearbyStop && <><span className="stop-badge" style={{ background: nearbyStop.color }}>{nearbyStop.number || 'HQ'}</span><div><small>NEARBY · STOP TO INTERACT</small><strong>{nearbyStop.name}</strong></div><button onClick={() => select(nearby)}><kbd>E</kbd> Interact <Icon name="arrow" size={16} /></button></>}</div>
      <div className="touch-controls" aria-label={inside ? 'Touch walking controls' : 'Touch driving controls'}>{[['forward', '↑'], ['left', '←'], ['backward', '↓'], ['right', '→']].map(([key, label]) => <button key={key} className={`touch-${key}`} aria-label={inside ? `Walk ${key}` : key === 'forward' ? 'Accelerate' : key === 'backward' ? 'Reverse' : `Steer ${key}`} {...pointerAction(key)}>{label}</button>)}</div>
      {!inside && <button className="touch-brake" {...pointerAction('brake')}>Brake</button>}
      {inside && <><div className="character-hud" aria-label="Character status" data-x={player.x.toFixed(3)} data-z={player.z.toFixed(3)} data-height={player.height.toFixed(3)}><span>ON FOOT / THIRD PERSON</span><strong>{player.action}</strong><small>WASD walk · Shift run · E interact</small></div><div className="character-actions" aria-label="Character actions"><button {...pointerAction('run')}>Hold to run</button><button disabled={player.height > 0.03} onClick={() => apiRef.current?.act('jump')}>Jump</button><button disabled={player.waveTime > 0} onClick={() => apiRef.current?.act('wave')}>{player.waveTime > 0 ? 'Waving…' : 'Wave'}</button></div></>}
      <div className="bottom-hud"><div className="journey-panel"><div className="journey-heading"><span className="eyebrow">NEIGHBORHOOD DIRECTORY</span></div><div className="stop-list">{stops.map(stop => <button key={stop.id} onClick={() => explore(stop.id)}><span className="stop-number">{stop.number}</span><span>{stop.name}</span><Icon name="pin" size={13} /></button>)}</div></div><div className="driving-guide">{inside ? <div className="office-guide"><strong>{viewMode === 'lounge' ? 'Slow down. Stay a while.' : 'Welcome to the community hub.'}</strong><span>WASD walk · Shift run · Space jump · E interact</span></div> : <div><kbd>W A S D</kbd><span>drive</span><kbd>Space</kbd><span>brake</span><kbd>E</kbd><span>interact</span></div>}<small>Drag to look around · scroll to zoom</small></div><MiniMap car={car} target={progress.active ? targetId : null} onSelect={explore} /></div>
    </main>
    <footer className="site-footer"><div className="world-tools"><span className="speed-indicator"><Icon name="car" size={15} /> {Math.round(car.speed * 3.6)} <small>km/h</small></span><button onClick={() => inside ? leaveHub() : toggleView()} aria-label={viewMode === 'drive' ? 'Show world map' : 'Follow the car'}><Icon name="pin" size={16} /><span>{inside ? 'City view' : viewMode === 'drive' ? 'Map view' : 'Follow car'}</span></button><button onClick={() => select('missions')}>Journal</button><button onClick={reset} aria-label="Recover car or reset character"><Icon name="reset" size={16} /><span>Recover</span></button><button onClick={() => select('help')} aria-label="How to play"><Icon name="help" size={17} /></button></div></footer>
    {guest && viewMode === 'lounge' && <button className="lounge-music-button" onClick={() => select('jukebox')}>♫ {!music.enabled ? 'Music coming soon' : music.playing ? music.title : 'Choose some music'} <span>{!music.enabled ? 'Console off' : music.playing ? 'Playing' : 'Music console'}</span></button>}
    {!guest && <GuestEntry profiles={guests.profiles} onEnter={enterGuest} />}
    {guest && section === 'missions' && <MissionBoard guest={guest} storageAvailable={guests.storageAvailable} onClose={() => setSection(null)} onSwitch={switchGuest} onGuide={() => explore('npc:maya')} />}
    {guest && ['lounge', 'jukebox'].includes(section) && <LoungeDialog inside={viewMode === 'lounge'} available={ready && !error} music={music} onEnter={enterLounge} onClose={() => setSection(null)} />}
    {guest && section === 'help' && <HelpDialog onClose={() => setSection(null)} />}
    {guest && section?.startsWith('explore:') && <ExploreDialog id={section.slice(8)} onClose={() => setSection(null)} onJournal={() => select('missions')} />}
    {guest && section && !section.startsWith('explore:') && !['missions', 'help', 'lounge', 'jukebox'].includes(section) && <InteractionDialog key={section + progress.active + progress.step} id={section} guest={guest} context={context} onAction={action} onClose={() => setSection(null)} />}
    <div className={`mission-notification ${guests.notification && !section ? 'visible' : ''}`} role="status" aria-live="polite">{guests.notification && <><span>✦ JOB COMPLETE · +{guests.notification.points} COINS</span><strong>{guests.notification.title}</strong></>}</div>
  </div>;
}
