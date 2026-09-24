

import { ExperienceDialog } from '../shared/ExperienceDialog.jsx';

export function HelpDialog({ onClose }) {
  return <ExperienceDialog title="A little help getting around" onClose={onClose}><p>Find Maya by the community hub and accept a job. The gold diamond and map marker show your next stop. Drive there, brake, and press E to interact. Return to Maya to collect your pay.</p><div className="help-grid"><div><kbd>W A S D</kbd><span>Drive / walk</span></div><div><kbd>Space</kbd><span>Brake / jump indoors</span></div><div><kbd>Shift</kbd><span>Run indoors</span></div><div><kbd>E</kbd><span>Interact nearby</span></div><div><kbd>F</kbd><span>Wave indoors</span></div><div><kbd>R</kbd><span>Recover to hub / reset character</span></div></div><p>Use Enter hub from anywhere to explore on foot. The top menu takes you freely to each neighborhood; optional jobs are in the journal. Drag to orbit, scroll to zoom. Touch controls include a brake. Recovering the car spills 15% of a carried coffee tray. There is no time limit: take the scenic route.</p></ExperienceDialog>;
}
