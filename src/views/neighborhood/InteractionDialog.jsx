import { useState } from 'react';
import { MISSION_LIST, activeMission, currentObjective, inventory } from '../../models/neighborhood/missions.js';
import { LOCATIONS, PARK, DESKS, canInteract } from '../../models/neighborhood/gameLocations.js';
import { ExperienceDialog } from '../shared/ExperienceDialog.jsx';

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
