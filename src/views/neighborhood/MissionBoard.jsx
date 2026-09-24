
import { MISSION_LIST, currentObjective, inventory, missionValue, missionSummary } from '../../models/neighborhood/missions.js';

import { ExperienceDialog } from '../shared/ExperienceDialog.jsx';

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
