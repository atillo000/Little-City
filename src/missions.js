import { canInteract } from './gameLocations.js';

export const MISSION_LIST = [
  { id: 'coffee', title: 'The reading club run', description: 'Nora has coffee ready for the library volunteers. Bring it over without spilling it.', reward: 60, total: 3,
    steps: [
      { location: 'cafe', title: 'Pick up coffee at the cafe', action: 'Collect the coffee tray', text: 'Nora: Six coffees for Eli at the library. Keep the tray level on those corners!', item: 'Six coffees' },
      { location: 'library', title: 'Deliver to Eli at the library', action: 'Hand over the coffees', text: 'Eli: Perfect timing! The volunteers have been setting up all morning.' },
      { location: 'npc:maya', title: 'Return to Maya for your pay', action: 'Finish the coffee run', text: 'Maya: A small delivery makes a big difference. Nice work.' },
    ] },
  { id: 'repair', title: 'Light up the market', description: 'The market sign is out. Get a replacement fuse, then safely restore the stall lights.', reward: 90, total: 3,
    steps: [
      { location: 'workshop', title: 'Collect a fuse from Leo', action: 'Collect the replacement fuse', text: 'Leo: Switch the power off first. Then replace the fuse and test the lights.', item: 'Replacement fuse' },
      { location: 'market', title: 'Repair the market light box', action: 'Repair the light box', text: 'Rosa: Here is the service box. Leo left instructions on the replacement part.', puzzle: true },
      { location: 'npc:maya', title: 'Report the repair to Maya', action: 'Collect your repair pay', text: 'Maya: The market can stay open this evening. Rosa says thank you!' },
    ] },
  { id: 'lost', title: 'Someone’s whole afternoon', description: 'A neighbor lost a canvas bag near the fountain. Find it and check the owner at the community hub.', reward: 75, total: 3,
    steps: [
      { location: 'park', title: 'Search the south side of the park', action: 'Pick up the canvas bag', text: 'A canvas bag rests beside the path. There is a library card inside, but no phone number.', item: 'Lost canvas bag' },
      { location: 'dispatch', title: 'Check the lost & found desk inside the hub', action: 'Match the library card to the register', text: 'The register matches the card to a neighbor who reported this bag. You leave it safely at the desk.' },
      { location: 'npc:maya', title: 'Tell Maya the bag is safe', action: 'Finish the lost-property errand', text: 'Maya: I have contacted the owner. You saved their afternoon.' },
    ] },
];
export const freshProgress = () => ({ version: 2, completed: [], active: null, step: 0, condition: 100, coins: 0, day: 1 });
export function cleanProgress(value = {}) {
  if (value?.version !== 2) return freshProgress();
  const completed = MISSION_LIST.filter(m => Array.isArray(value.completed) && value.completed.includes(m.id)).map(m => m.id);
  const active = MISSION_LIST.find(m => m.id === value.active && !completed.includes(m.id))?.id ?? null;
  const clamp = (n, min, max, fallback) => Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
  return { version: 2, completed, active, step: active ? clamp(value.step, 0, 2, 0) : 0,
    condition: clamp(value.condition, 0, 100, 100), coins: clamp(value.coins, 0, 1000000, 0), day: clamp(value.day, 1, 9999, 1) };
}
export const activeMission = p => MISSION_LIST.find(m => m.id === p.active);
export const currentObjective = p => activeMission(p)?.steps[p.step] ?? { location: 'npc:maya', title: p.completed.length === MISSION_LIST.length ? 'Visit Maya to start another shift' : 'Meet Maya beside the community hub', action: 'Talk to Maya' };
export const inventory = p => p.active && p.step === 1 ? activeMission(p)?.steps[0].item : null;
export function advanceProgress(progress, event) {
  const p = progress;
  if (event.type === 'accept' && !p.active && canInteract('npc:maya', event.context)) {
    const next = MISSION_LIST.find(m => !p.completed.includes(m.id));
    if (next?.id === event.id) return { ...p, active: next.id, step: 0, condition: 100 };
  }
  if (event.type === 'next-day' && p.completed.length === MISSION_LIST.length && canInteract('npc:maya', event.context)) return { ...freshProgress(), coins: p.coins, day: p.day + 1 };
  if ((event.type === 'collision' || event.type === 'reset' || (event.type === 'activity' && event.collision)) && p.active === 'coffee' && p.step === 1) return { ...p, condition: Math.max(0, p.condition - 15) };
  const mission = activeMission(p), objective = currentObjective(p);
  if (event.type !== 'interact' || !mission || event.location !== objective.location || !canInteract(event.location, event.context)) return p;
  if (objective.puzzle && JSON.stringify(event.sequence) !== JSON.stringify(['off', 'replace', 'test'])) return p;
  if (p.step < mission.steps.length - 1) return { ...p, step: p.step + 1 };
  const bonus = mission.id === 'coffee' && p.condition >= 80 ? 25 : 0;
  return { ...p, completed: [...p.completed, mission.id], active: null, step: 0, coins: p.coins + mission.reward + bonus };
}
export const missionValue = (id, p) => p.completed.includes(id) ? 3 : p.active === id ? p.step : 0;
export const missionSummary = p => ({ count: p.completed.length, points: p.coins });
