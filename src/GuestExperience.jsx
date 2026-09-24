import { useEffect, useRef, useState } from 'react';
import { MISSION_LIST, activeMission, currentObjective, inventory, missionValue, missionSummary } from './missions';
import { LOCATIONS, PARK, DESKS, canInteract } from './gameLocations';

export function ExperienceDialog({ title, children, onClose, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement, dialog = ref.current; dialog.showModal();
    return () => { dialog.close(); previous?.focus?.({ preventScroll: true }); };
  }, []);
  return <dialog className={`experience-dialog ${className}`} ref={ref} aria-labelledby="experience-title" onCancel={event => { event.preventDefault(); onClose?.(); }}>
    {onClose && <button className="experience-close" onClick={onClose} aria-label="Close dialog">×</button>}
    <span className="experience-eyebrow">LITTLE CITY / NEIGHBORHOOD ADVENTURES</span><h2 id="experience-title">{title}</h2>{children}
  </dialog>;
}
export function GuestEntry({ profiles, onEnter }) {
  const [name, setName] = useState('');
  return <ExperienceDialog title="Your neighborhood awaits." className="guest-entry">
    <div className="guest-illustration" aria-hidden="true"><span>▥</span><span>▤</span><span>▥</span><i>hello!</i></div>
    <p>Warm coffee. A broken market light. Someone’s missing bag. A little help goes a long way in this city.</p>
    <form onSubmit={event => { event.preventDefault(); onEnter(name); }}><label htmlFor="guest-name">What should we call you?</label><input id="guest-name" autoFocus value={name} maxLength={24} autoComplete="nickname" placeholder="Your name (optional)" onChange={event => setName(event.target.value)} /><button className="experience-primary" type="submit">Enter as guest <span>→</span></button></form>
    {profiles.length > 0 && <div className="returning-guests"><span>WELCOME BACK</span>{profiles.map(p => <button key={p.id} onClick={() => onEnter('', p.id)}>Continue as {p.name}<small>Shift {p.progress.day} · {missionSummary(p.progress).count}/3 jobs</small></button>)}</div>}
    <small className="guest-note">Your progress saves on this browser. Anyone using this device can resume a saved guest.</small>
  </ExperienceDialog>;
}
export function MissionBoard({ guest, storageAvailable, onClose, onSwitch, onGuide }) {
  const p = guest.progress, summary = missionSummary(p);
  return <ExperienceDialog title="Your neighborhood journal" onClose={onClose}>
    <div className="mission-profile"><div><strong>{guest.name}</strong><span>Shift {p.day} · {summary.points} coins · {summary.count === 3 ? 'Neighborhood favorite' : 'Community courier'}</span></div><button onClick={onSwitch}>Switch guest</button></div>
    <p>Jobs are optional. Explore any destination using the top menu, or meet Maya when you feel like helping out. Accepting jobs and completing task actions are separate from visiting places. {storageAvailable ? 'Progress saves automatically.' : 'Storage is unavailable; progress lasts for this visit.'}</p>
    <button className="experience-primary" onClick={onGuide}>Talk to Maya →</button>
    <div className="inventory-note">Carrying: <strong>{inventory(p) || 'Nothing yet'}</strong>{p.active === 'coffee' && p.step === 1 && <span> · Tray condition {p.condition}%</span>}</div>
    <div className="mission-list">{MISSION_LIST.map((m, index) => {
      const value = missionValue(m.id, p), done = p.completed.includes(m.id), active = p.active === m.id;
      return <article className={`mission-card ${done ? 'complete' : ''}`} key={m.id} data-mission={m.id} data-complete={done}>
        <div className="mission-check">{done ? '✓' : active ? '→' : index + 1}</div><div className="mission-copy"><div><h3>{m.title}</h3><span>{m.reward} coins</span></div><p>{m.description}</p><progress value={value} max={3} aria-label={m.title} /><small>{done ? 'Complete' : active ? `${value}/3 steps` : 'Ask Maya'}</small>
          {active && <small className="mission-detail">Next: {currentObjective(p).title}</small>}
          {m.id === 'coffee' && <small className="mission-detail">+25 coins for delivering with at least 80% tray condition. Collisions and car recovery spill coffee.</small>}
        </div>
      </article>;
    })}</div>
    {summary.count === 3 && <div className="mission-finish">✦ Neighborhood favorite! Talk to Maya for another shift. Your coins carry over.</div>}
    <button className="experience-primary" onClick={onClose}>Back to the city →</button>
  </ExperienceDialog>;
}
export function ExploreDialog({ id, onClose, onJournal }) {
  const place = LOCATIONS.find(location => location.id === id);
  const stories = {
    cafe: ['A seat by the window', 'Nora’s cafe is the neighborhood’s meeting place. Enjoy the slow morning, watch the street, and take a look around.'],
    workshop: ['Made to last', 'Leo’s workshop keeps the neighborhood moving. Bicycles, spare parts, and things waiting for a second life fill this corner of the city.'],
    market: ['A little bit of everything', 'Rosa and the market neighbors are setting up their stalls. Wander the block and enjoy the lights and passing traffic.'],
    library: ['One more chapter', 'The library is a quiet landmark in a busy neighborhood. Eli’s reading club welcomes familiar faces and new visitors alike.'],
  };
  const story = stories[id];
  return <ExperienceDialog title={place?.name || 'Explore the city'} onClose={onClose}>
    <span className="experience-eyebrow">FREE EXPLORATION</span><blockquote>{story?.[0]}</blockquote><p>{story?.[1] || place?.subtitle}</p>
    <p>Stay as long as you like. Visiting does not start or complete a mission.</p>
    <button className="experience-primary" onClick={onClose}>Explore this neighborhood →</button><button className="back-to-city" onClick={onJournal}>View optional missions</button>
  </ExperienceDialog>;
}
export function InteractionDialog({ id, guest, context, onAction, onClose }) {
  const [sequence, setSequence] = useState([]), [feedback, setFeedback] = useState('');
  const p = guest.progress, mission = activeMission(p), objective = currentObjective(p);
  const place = [...LOCATIONS, PARK, ...DESKS].find(place => place.id === id);
  const guide = id === 'npc:maya', next = MISSION_LIST.find(m => !p.completed.includes(m.id));
  const relevant = mission && objective.location === id;
  const reachable = canInteract(id, context);
  const act = (event) => { if (!onAction(event)) setFeedback('Move closer and come to a stop before interacting.'); };
  const repair = action => {
    const nextSequence = [...sequence, action];
    if (action !== ['off', 'replace', 'test'][sequence.length]) { setSequence([]); setFeedback('The safety interlock stopped the repair. Switch off the power, replace the fuse, then test. Try again.'); return; }
    setSequence(nextSequence); setFeedback(['Power is isolated. It is safe to replace the fuse.', 'The new fuse is seated. Test the lights now.', ''][nextSequence.length - 1]);
    if (nextSequence.length === 3) act({ type: 'interact', location: id, sequence: nextSequence });
  };
  return <ExperienceDialog title={guide ? 'Maya’s dispatch' : place?.name || 'Community hub'} onClose={onClose}>
    {guide ? <div className="guide-intro"><span>M</span><div><strong>Maya</strong><small>Neighborhood dispatcher</small></div></div> : <p>{place?.subtitle}</p>}
    {!reachable && <p className="location-warning">{context.mode === 'office' && LOCATIONS.some(l => l.id === id) ? 'Head outside and drive to this location.' : 'Follow the map to this location, move close, and come to a stop.'} Reading this page does not advance your job.</p>}
    {relevant ? <>
      <blockquote>{objective.text}</blockquote>
      {mission.id === 'coffee' && p.step === 1 && <p>Tray condition: {p.condition}%. {p.condition >= 80 ? 'Your careful-driving tip is still available.' : 'A few spills, but the volunteers still appreciate the delivery. You will receive the base pay.'}</p>}
      {objective.puzzle ? <><p>Service label: 1. Isolate power. 2. Replace fuse. 3. Test the lights.</p><div className="repair-buttons">{[['off', 'Switch power off'], ['replace', 'Replace fuse'], ['test', 'Test lights']].map(([action, label]) => <button disabled={!reachable || sequence.includes(action)} key={action} onClick={() => repair(action)}>{sequence.includes(action) ? '✓ ' : ''}{label}</button>)}</div></> : <button className="experience-primary" disabled={!reachable} onClick={() => act({ type: 'interact', location: id })}>{objective.action} →</button>}
    </> : guide ? <>
      {mission ? <><p>One thing at a time, {guest.name}. {objective.title}. I’ll be here when you’re done.</p><p>Carrying: {inventory(p) || 'Nothing yet'}</p></> : next ? <><p>Hey {guest.name}! Ready to help out? {next.description}</p><blockquote>{next.title} · {next.reward} coins{next.id === 'coffee' ? ' + a careful-driving tip' : ''}</blockquote><button className="experience-primary" disabled={!reachable} onClick={() => act({ type: 'accept', id: next.id })}>Accept this job →</button></> : <><p>Everyone’s sorted for today. You earned a place in this neighborhood. Fancy another shift?</p><button className="experience-primary" disabled={!reachable} onClick={() => act({ type: 'next-day' })}>Start the next shift →</button></>}
    </> : <p>{mission ? `Your current task: ${objective.title}.` : 'Maya has the latest neighborhood jobs. Find her beside the community hub.'}</p>}
    {feedback && <p role="status">{feedback}</p>}
    <button className="back-to-city" onClick={onClose}>Back to exploring</button>
  </ExperienceDialog>;
}
export function HelpDialog({ onClose }) {
  return <ExperienceDialog title="A little help getting around" onClose={onClose}><p>Find Maya by the community hub and accept a job. The gold diamond and map marker show your next stop. Drive there, brake, and press E to interact. Return to Maya to collect your pay.</p><div className="help-grid"><div><kbd>W A S D</kbd><span>Drive / walk</span></div><div><kbd>Space</kbd><span>Brake / jump indoors</span></div><div><kbd>Shift</kbd><span>Run indoors</span></div><div><kbd>E</kbd><span>Interact nearby</span></div><div><kbd>F</kbd><span>Wave indoors</span></div><div><kbd>R</kbd><span>Recover to hub / reset character</span></div></div><p>Use Enter hub from anywhere to explore on foot. The top menu takes you freely to each neighborhood; optional jobs are in the journal. Drag to orbit, scroll to zoom. Touch controls include a brake. Recovering the car spills 15% of a carried coffee tray. There is no time limit: take the scenic route.</p></ExperienceDialog>;
}
