// One coordinate system for the city, mini-map, and building collisions.
export const WORLD = { halfSize: 70, streetsX: [-48, -18, 18, 48], streetsZ: [-48, -18, 12, 42], streetWidth: 8 };
export const OFFICE = { id: 'office', name: 'Community hub', number: 'HQ', color: '#b5c9eb', x: 0, z: -5, width: 25, depth: 18, height: 9, parking: [2, 12] };
export const LOUNGE = { id: 'lounge', name: 'Studio Lounge', number: '05', color: '#d7b6ba', x: 0, z: -34, width: 20, depth: 18, height: 7, parking: [0, -18] };
export const BUILDINGS = [
  { ...OFFICE, color: '#d8d9cf' },
  LOUNGE,
  { id: 'cafe', x: -33, z: -32, width: 20, depth: 19, height: 15, color: '#d9bba1', label: 'CORNER CAFE' },
  { id: 'workshop', x: 33, z: -32, width: 20, depth: 20, height: 22, color: '#a4b9b8', label: 'REPAIR SHOP' },
  { id: 'market', x: -33, z: 27, width: 20, depth: 18, height: 15, color: '#b5adca', label: 'NIGHT MARKET' },
  { id: 'library', x: 33, z: 27, width: 22, depth: 18, height: 11, color: '#d1a28e', label: 'PUBLIC LIBRARY' },
  ...[-63, -33, 0, 33, 63].map((x, i) => ({ x, z: -63, width: 17, depth: 18, height: 19 + i % 3 * 9, color: ['#a3b3bb', '#c8c0af', '#adb9b4'][i % 3] })),
  ...[-63, 63].flatMap((x, side) => [-32, 0, 29, 61].map((z, i) => ({ x, z, width: 16, depth: 18, height: 13 + (i + side) % 3 * 8, color: ['#bec9bd', '#b7b5c4', '#c6b5a5'][i % 3] }))),
  ...[-33, 0, 33].map((x, i) => ({ x, z: 62, width: 18, depth: 17, height: 16 + i * 4, color: '#b4bdc4' })),
];
export function isDriveable(x, z) {
  if (Math.abs(x) >= WORLD.halfSize - 1 || Math.abs(z) >= WORLD.halfSize - 1) return false;
  return !BUILDINGS.some(b => Math.abs(x - b.x) < b.width / 2 + 0.85 && Math.abs(z - b.z) < b.depth / 2 + 0.85);
}
