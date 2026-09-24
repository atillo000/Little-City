import { useState } from 'react';
import { missionSummary } from '../../models/neighborhood/missions.js';

import { ExperienceDialog } from '../shared/ExperienceDialog.jsx';

export function GuestEntry({ profiles, onEnter, error }) {
  const [name, setName] = useState('');
  return <ExperienceDialog title="Your neighborhood awaits." className="guest-entry">
    <div className="guest-illustration" aria-hidden="true"><span>▥</span><span>▤</span><span>▥</span><i>hello!</i></div>
    <p>Warm coffee. A broken market light. Someone’s missing bag. A little help goes a long way in this city.</p>
    <form onSubmit={event => { event.preventDefault(); onEnter(name); }}><label htmlFor="guest-name">What should we call you?</label><input id="guest-name" autoFocus value={name} maxLength={24} autoComplete="nickname" placeholder="Your name (optional)" onChange={event => setName(event.target.value)} /><button className="experience-primary" type="submit">Enter as guest <span>→</span></button></form>
    {profiles.length > 0 && <div className="returning-guests"><span>WELCOME BACK</span>{profiles.map(p => <button key={p.id} onClick={() => onEnter('', p.id)}>Continue as {p.name}<small>Shift {p.progress.day} · {missionSummary(p.progress).count}/3 jobs</small></button>)}</div>}
    {error && <p role="alert">{error}</p>}
    <small className="guest-note">Your progress saves on this browser. Anyone using this device can resume a saved guest.</small>
  </ExperienceDialog>;
}
