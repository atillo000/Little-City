import { LOUNGE } from './world.js';
export const LOCATIONS = [
  { id: 'cafe', number: '01', name: 'Corner Cafe', subtitle: 'Nora keeps the neighborhood going, one coffee at a time.', position: [-33, -21.9], parking: [-33, -17], color: '#f6cc94' },
  { id: 'workshop', number: '02', name: 'Repair Shop', subtitle: 'Tools, spare parts, and a very patient mechanic named Leo.', position: [33, -21.4], parking: [33, -17], color: '#c7dab0' },
  { id: 'market', number: '03', name: 'Night Market', subtitle: 'Fresh produce and friendly faces. The stall lights need a little help.', position: [-33, 17.4], parking: [-33, 12], color: '#c5b4e0' },
  { id: 'library', number: '04', name: 'Public Library', subtitle: 'Eli and the reading club are preparing for story time.', position: [33, 17.4], parking: [33, 12], color: '#f2b5a4' },
  { ...LOUNGE, subtitle: 'A cozy listening room, just north of the community hub. Park outside to step in.', position: [0, -24.9] },
];
export const PARK = { id: 'park', number: '?', name: 'Fountain Park', subtitle: 'A canvas bag was last seen near the south end of the fountain.', parking: [0, 36], color: '#bbcf9b' };
export const DESKS = [
  { id: 'dispatch', name: 'Lost & found', number: 'HQ', subtitle: 'Check a found item against the local lost-property register.', parking: [-2.7, 0.2], color: '#e7c797' },
  { id: 'radio', name: 'Dispatch radio', subtitle: 'Maya coordinates neighborhood jobs from here.', parking: [-2.1, -8] },
  { id: 'notice', name: 'Community board', subtitle: 'Story time at the library. Evening stalls at the market. Everyone is welcome.', parking: [5.5, -11.4] },
  { id: 'planning', name: 'Route table', subtitle: 'Use the street grid and brake before turning. Follow the gold marker on your map.', parking: [0.4, -2.6] },
];
export function interactionPoint(id, mode = 'drive') {
  if (mode === 'lounge') return id === 'jukebox' ? { x: 0, z: -38.5, radius: 3 } : null;
  if (id === 'npc:maya') return { x: mode === 'office' ? 9 : 5, z: mode === 'office' ? -9 : 8.5, radius: mode === 'office' ? 2.8 : 5.5 };
  if (id === 'office' && mode !== 'office') return { x: 2, z: 12, radius: 5.5 };
  const place = (mode === 'office' ? DESKS : [...LOCATIONS, PARK]).find(p => p.id === id);
  return place ? { x: place.parking[0], z: place.parking[1], radius: mode === 'office' ? 2.4 : 4.5 } : null;
}
export function canInteract(id, context) {
  if (!context || !['drive', 'map', 'office', 'lounge'].includes(context.mode)) return false;
  const point = interactionPoint(id, context.mode);
  return Boolean(point && Number.isFinite(context.speed) && Math.abs(context.speed) < 1.2 && Math.hypot(context.x - point.x, context.z - point.z) < point.radius);
}
