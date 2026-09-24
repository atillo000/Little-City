import { cleanProgress } from './missions.js';

export const MAX_GUESTS = 100;
export function cleanGuestName(value) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || 'Guest' : 'Guest';
}
export function cleanGuestSave(saved) {
  const profiles = [], seen = new Set();
  if (Array.isArray(saved?.profiles)) {
    for (const profile of saved.profiles.slice(0, MAX_GUESTS)) {
      if (!profile || typeof profile.id !== 'string' || !profile.id.trim() || profile.id.length > 128 || typeof profile.name !== 'string' || seen.has(profile.id)) continue;
      seen.add(profile.id);
      profiles.push({ id: profile.id, name: cleanGuestName(profile.name), progress: cleanProgress(profile.progress) });
    }
  }
  return { profiles, active: profiles.some(profile => profile.id === saved?.active) ? saved.active : null };
}
