export const CHARACTER_SPAWN = { x: 0, z: 2, heading: Math.PI, height: 0, velocityY: 0, speed: 0, waveTime: 0, jumpHeld: false, waveHeld: false };
export const LOUNGE_SPAWN = { ...CHARACTER_SPAWN, z: -27 };
export const LOUNGE_OBSTACLES = [
  { x: -6.5, z: -34, width: 3.2, depth: 6 }, { x: 6.5, z: -34, width: 3.2, depth: 6 },
  { x: 0, z: -33.5, width: 3, depth: 2 }, { x: 0, z: -41, width: 5, depth: 1.5 },
  { x: -7.8, z: -41, width: 1.5, depth: 1.5 }, { x: 7.8, z: -41, width: 1.5, depth: 1.5 },
];
export const OFFICE_STATIONS = [
  { id: 'dispatch', x: -2.7, z: 0.2, radius: 2.4 },
  { id: 'radio', x: -2.1, z: -8, radius: 2.5 },
  { id: 'notice', x: 5.5, z: -11.4, radius: 2.6 },
  { id: 'planning', x: 0.4, z: -2.6, radius: 2.3 },
];
// Furniture footprints include a little personal space for the avatar.
export const OFFICE_OBSTACLES = [
  { x: 9, z: -9, width: 0.8, depth: 0.8 }, // Maya's personal space.
  { x: -7, z: 0.2, width: 7, depth: 2.5 },
  { x: -6.5, z: -8.1, width: 7, depth: 3.1 },
  { x: 5.4, z: -2.6, width: 7.5, depth: 3.4 },
  { x: -11.6, z: -5.5, width: 1.2, depth: 5.5 },
  ...[[-8, -5.6], [-4.8, -5.6], [3.2, 0.2], [7.4, 0.2], [3.2, -5.4], [7.4, -5.4]].map(([x, z]) => ({ x, z, width: 1.5, depth: 1.5 })),
  ...[[-10.8, -11.8], [10.5, 1.5], [-10.7, 2.1]].map(([x, z]) => ({ x, z, width: 1.2, depth: 1.2 })),
];
export function canWalk(x, z, room = 'office') {
  if (room === 'lounge') { if (x < -9.3 || x > 9.3 || z < -42.3 || z > -25.6) return false; }
  else if (x < -11.9 || x > 11.9 || z < -13.3 || z > 3.3) return false;
  return !(room === 'lounge' ? LOUNGE_OBSTACLES : OFFICE_OBSTACLES).some(o => Math.abs(x - o.x) < o.width / 2 + 0.35 && Math.abs(z - o.z) < o.depth / 2 + 0.35);
}
export function nearbyStation(player) {
  return OFFICE_STATIONS.map(s => ({ ...s, distance: Math.hypot(player.x - s.x, player.z - s.z) }))
    .filter(s => s.distance < s.radius).sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
}
export function stepCharacter(player, input, delta, cameraYaw = Math.PI, room = 'office') {
  const dt = Math.min(Math.max(delta, 0), 0.05);
  const forward = Number(!!input.forward) - Number(!!input.backward);
  const right = Number(!!input.right) - Number(!!input.left);
  const length = Math.hypot(forward, right);
  const speed = length ? (input.run ? 5 : 2.6) : 0;
  const dx = length ? (Math.sin(cameraYaw) * forward - Math.cos(cameraYaw) * right) / length * speed * dt : 0;
  const dz = length ? (Math.cos(cameraYaw) * forward + Math.sin(cameraYaw) * right) / length * speed * dt : 0;
  let x = player.x, z = player.z;
  if (canWalk(x + dx, z, room)) x += dx;
  if (canWalk(x, z + dz, room)) z += dz;
  const moved = Math.hypot(x - player.x, z - player.z);
  let velocityY = player.velocityY;
  if (input.jump && !player.jumpHeld && player.height === 0) velocityY = 5.2;
  velocityY -= 14 * dt;
  const height = Math.max(0, player.height + velocityY * dt);
  if (height === 0) velocityY = 0;
  return { x, z, heading: length ? Math.atan2(dx, dz) : player.heading, speed: dt ? moved / dt : 0, height, velocityY,
    waveTime: input.wave && !player.waveHeld ? 1.5 : Math.max(0, player.waveTime - dt), jumpHeld: !!input.jump, waveHeld: !!input.wave };
}
