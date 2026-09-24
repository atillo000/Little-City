import { vehicle, createTraffic, createPatrols, driveVehicle, steerVehicle, moveBody, collideVehicles, stepCharacterBody, pushCharacter } from './worldPhysics.js';
import { updatePolice } from './worldPolice.js';

export const CITIES = [
  { id: 'miami', name: 'Miami', country: 'United States', district: 'Ocean Drive', region: 'North America', color: '#ff8bb5', sky: '#d998ac', ground: '#9ba78b', buildings: ['#f5ccb5', '#b6d5cf', '#dbb1c9'], trees: 'palm', map: [25, 39], seed: 7, tagline: 'Pink skies. Fast cars. A fresh start.' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', district: 'Neon Crossing', region: 'Asia', color: '#a8a0ff', sky: '#30344f', ground: '#666f7a', buildings: ['#53677d', '#767286', '#416777'], trees: 'cherry', map: [87, 34], seed: 13, tagline: 'Find your way through the electric night.' },
  { id: 'manila', name: 'Manila', country: 'Philippines', district: 'Bay District', region: 'Asia', color: '#f7bd65', sky: '#daa890', ground: '#91a58b', buildings: ['#c9c5b3', '#b6c7c7', '#dfa789'], trees: 'palm', map: [82, 48], seed: 23, tagline: 'Bayfront highways and golden-hour hustle.' },
  { id: 'london', name: 'London', country: 'United Kingdom', district: 'River Quarter', region: 'Europe', color: '#a5d6d5', sky: '#9eb5bd', ground: '#839a89', buildings: ['#a78c83', '#b7a396', '#7e949b'], trees: 'oak', map: [48, 23], seed: 37, tagline: 'Old streets. New trouble.' },
  { id: 'dubai', name: 'Dubai', country: 'United Arab Emirates', district: 'Mirage Marina', region: 'Asia', color: '#ebcf8c', sky: '#d8b99a', ground: '#cbb58a', buildings: ['#8bafb6', '#c4c5b6', '#77979f'], trees: 'palm', map: [64, 41], seed: 43, tagline: 'Glass towers above the desert.' },
  { id: 'rio', name: 'Rio de Janeiro', country: 'Brazil', district: 'Sunset Coast', region: 'South America', color: '#b2dc83', sky: '#ddad9a', ground: '#819c68', buildings: ['#deb49e', '#d9cc91', '#a0c9b7'], trees: 'palm', map: [35, 73], seed: 59, tagline: 'Coastal roads with something around every corner.' },
  { id: 'cape', name: 'Cape Town', country: 'South Africa', district: 'Atlantic Point', region: 'Africa', color: '#8ed9c8', sky: '#abc7ce', ground: '#a4ab83', buildings: ['#c6bfb0', '#9ebcbb', '#dac9b7'], trees: 'oak', map: [53, 79], seed: 67, tagline: 'Take the long road to the ocean.' },
];
export const LIMIT = 440;
export const ROADS = [-360, -240, -120, 0, 120, 240, 360];
export const CONTRACTS = [
  { id: 'courier', title: 'Midnight delivery', type: 'DRIVING', reward: 650, description: 'Collect a package at the docks, then deliver it across the city.', target: { x: 120, z: 65 }, finish: { x: -240, z: -185 } },
  { id: 'crew', title: 'Take back the block', type: 'COMBAT', reward: 1200, description: 'Eliminate the four armed gang members at the marked block. Lose the heat and return to the safehouse.', target: { x: -120, z: -65 }, finish: { x: 8, z: 12 } },
  { id: 'escape', title: 'Heat on the highway', type: 'PURSUIT', reward: 950, description: 'Pick up the marked case, escape a two-star pursuit, then reach the drop-off.', target: { x: 240, z: 65 }, finish: { x: -360, z: 180 } },
];
export function generateBlocks(city) {
  let seed = city.seed;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const blocks = [];
  for (let x = -300; x <= 300; x += 120) for (let z = -300; z <= 300; z += 120) {
    for (const dx of [-23, 23]) for (const dz of [-23, 23]) {
      const height = 10 + random() * (city.id === 'dubai' ? 110 : city.id === 'tokyo' ? 75 : 44);
      blocks.push({ x: x + dx, z: z + dz, width: 29 + random() * 8, depth: 29 + random() * 8, height, color: city.buildings[Math.floor(random() * 3)] });
    }
  }
  return blocks;
}
export function freePosition(x, z, blocks, radius = 1) {
  return Math.abs(x) < LIMIT - radius && Math.abs(z) < LIMIT - radius && !blocks.some(b => Math.abs(x - b.x) < b.width / 2 + radius && Math.abs(z - b.z) < b.depth / 2 + radius);
}
export function clearSight(a, b, blocks) {
  return !blocks.some(block => {
    let enter = 0, exit = 1;
    for (const [axis, size] of [['x', 'width'], ['z', 'depth']]) {
      const delta = b[axis] - a[axis], min = block[axis] - block[size] / 2, max = block[axis] + block[size] / 2;
      if (Math.abs(delta) < 0.00001) { if (a[axis] < min || a[axis] > max) return false; }
      else { const near = (min - a[axis]) / delta, far = (max - a[axis]) / delta; enter = Math.max(enter, Math.min(near, far)); exit = Math.min(exit, Math.max(near, far)); }
      if (enter > exit) return false;
    }
    return exit > 0 && enter < 1;
  });
}
export function cleanWorldSave(value) {
  const keys = CITIES.flatMap(c => CONTRACTS.map(m => `${c.id}:${m.id}`));
  return { city: CITIES.some(c => c.id === value?.city) ? value.city : 'miami', cash: Number.isFinite(value?.cash) ? Math.max(0, Math.min(9999999, Math.floor(value.cash))) : 0, completed: [...new Set(Array.isArray(value?.completed) ? value.completed.filter(k => keys.includes(k)) : [])] };
}
export function createSession(city, save = {}) {
  const pedestrians = Array.from({ length: 24 }, (_, i) => ({ id: 'civilian-' + i, kind: 'civilian', x: ROADS[i % 7] + 13, z: -350 + i * 29, heading: i % 2 ? 0 : Math.PI, direction: i % 2 ? 1 : -1, health: 100, speed: 0 }));
  return { city: city.id, blocks: generateBlocks(city), player: { x: 8, z: 12, heading: Math.PI, speed: 0, height: 0, velocityY: 0, waveTime: 0 }, car: vehicle('player', 3, 12, Math.PI, 'player'), traffic: createTraffic(), policeCars: createPatrols(), pedestrians, driving: false, health: 100, ammo: 48, weapon: 'pistol', heat: 0, quiet: 0, cooldown: 0, reload: 0, down: 0, mission: null, enemies: [], shots: [], time: 0, cash: save.cash || 0, completed: [...(save.completed || [])], message: 'Welcome to ' + city.name + '. Your car is parked beside you.', messageTime: 7 };
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const actor = s => s.driving ? s.car : s.player;
export function objectivePoint(s) { return s.mission ? CONTRACTS.find(m => m.id === s.mission.id)[s.mission.stage === 0 ? 'target' : 'finish'] : null; }
export function notify(s, message) { s.message = message; s.messageTime = 5; }
export function startContract(s, id) {
  const mission = CONTRACTS.find(m => m.id === id);
  if (!mission || s.mission || s.down || s.completed.includes(`${s.city}:${id}`)) return false;
  s.mission = { id, stage: 0 };
  if (id === 'crew') s.enemies = s.enemies.filter(e => e.kind !== 'gang').concat(Array.from({ length: 4 }, (_, i) => ({ id: 'gang' + i, kind: 'gang', x: -120 + (i % 2) * 7 - 3, z: -65 + Math.floor(i / 2) * 8, health: 100, cooldown: 1 + i * 0.5 })));
  notify(s, 'Contract started: ' + mission.title); return true;
}
export function interact(s) {
  if (s.down) return;
  const at = actor(s), point = objectivePoint(s);
  if (point && distance(at, point) < 12 && Math.abs(at.speed) < 3) {
    if (s.mission.stage === 0) {
      if (s.mission.id === 'crew') { notify(s, 'Eliminate the marked gang members first.'); return; }
      s.mission.stage = 1;
      if (s.mission.id === 'escape') { s.heat = 2; s.quiet = 0; }
      notify(s, 'Package collected. Follow the gold marker to the drop-off.');
    } else {
      if (s.heat > 0) { notify(s, 'Lose the police before completing the contract.'); return; }
      const mission = CONTRACTS.find(m => m.id === s.mission.id);
      s.cash += mission.reward; s.completed.push(`${s.city}:${mission.id}`); s.mission = null;
      notify(s, `Contract complete. +$${mission.reward.toLocaleString()}`);
    }
    return;
  }
  if (distance(at, { x: 8, z: 12 }) < 13 && !s.driving && s.heat === 0) { s.health = 100; s.ammo = 48; notify(s, 'Safehouse: health and ammunition restored.'); return; }
  notify(s, 'Move to the gold marker and stop to interact.');
}
export function toggleVehicle(s) {
  if (s.down) return;
  if (s.driving) {
    if (Math.abs(s.car.speed) > 3) { notify(s, 'Brake before getting out.'); return; }
    const exits = [[4, 0], [-4, 0], [0, 5], [0, -5]];
    const exit = exits.find(([x, z]) => freePosition(s.car.x + x, s.car.z + z, s.blocks) && [...s.traffic, ...s.policeCars].every(c => Math.hypot(s.car.x + x - c.x, s.car.z + z - c.z) > c.radius + 1));
    if (!exit) return;
    s.player = { ...s.player, x: s.car.x + exit[0], z: s.car.z + exit[1], heading: s.car.heading, moveX: 0, moveZ: 0, kickX: 0, kickZ: 0 }; s.driving = false;
  } else if (distance(s.player, s.car) < 9 && Math.abs(s.car.speed) < 3) { s.driving = true; }
  else notify(s, 'Get closer to your cyan car to enter.');
}
export function attack(s) {
  if (s.driving || s.down || s.cooldown > 0 || s.reload > 0) return;
  const gun = s.weapon === 'pistol';
  if (gun && s.ammo <= 0) { notify(s, 'Press R to reload.'); return; }
  s.cooldown = gun ? 0.3 : 0.45; if (gun) s.ammo--;
  const candidates = [...s.enemies, ...s.pedestrians].filter(e => e.health > 0 && distance(s.player, e) < (gun ? 65 : 5) && clearSight(s.player, e, s.blocks)).sort((a, b) => Number(a.kind === 'civilian') - Number(b.kind === 'civilian') || distance(s.player, a) - distance(s.player, b));
  const target = candidates[0];
  if (target) {
    s.player.heading = Math.atan2(target.x - s.player.x, target.z - s.player.z);
    target.health = Math.max(0, target.health - (gun ? 40 : 34));
    pushCharacter(target, target.x - s.player.x, target.z - s.player.z, gun ? 2.8 : 6);
    if (target.health === 0) target.deadAt = s.time;
  }
  if (gun) s.shots.push({ x: s.player.x, z: s.player.z, tx: target?.x ?? s.player.x + Math.sin(s.player.heading) * 45, tz: target?.z ?? s.player.z + Math.cos(s.player.heading) * 45, ttl: 0.12, police: false });
  if (gun || target) { s.heat = Math.min(3, Math.max(s.heat, 1) + (target?.kind === 'police' ? 0.3 : 0)); s.quiet = 0; }
}
export function recover(s) {
  s.player = { x: 8, z: 12, heading: Math.PI, speed: 0, height: 0, velocityY: 0, waveTime: 0 }; s.car = vehicle('player', 3, 12, Math.PI, 'player'); s.driving = false; s.health = 100; s.ammo = 48; s.reload = 0; s.heat = 0; s.down = 0; s.mission = null; s.enemies = []; s.traffic = createTraffic(); s.policeCars = createPatrols(); s.incident = false;
  notify(s, 'Back at the safehouse. Any unfinished contract can be restarted.');
}
export function stepWorld(s, input, delta, yaw = Math.PI) {
  const duration = Math.min(Math.max(delta, 0), 0.05), steps = Math.max(1, Math.ceil(duration * 120));
  for (let i = 0; i < steps; i++) stepSimulation(s, input, duration / steps, yaw);
}
function stepSimulation(s, input, dt, yaw) {
  s.time += dt;
  s.cooldown = Math.max(0, s.cooldown - dt); s.messageTime = Math.max(0, s.messageTime - dt);
  s.shots = s.shots.map(shot => ({ ...shot, ttl: shot.ttl - dt })).filter(shot => shot.ttl > 0);
  if (s.down > 0) { s.down -= dt; if (s.down <= 0) recover(s); return; }
  if (s.reload > 0) { s.reload -= dt; if (s.reload <= 0) { s.ammo = 48; notify(s, 'Reloaded.'); } }
  const p = actor(s), forward = Number(!!input.forward) - Number(!!input.backward), right = Number(!!input.right) - Number(!!input.left);
  if (!s.driving) {
    const length = Math.hypot(forward, right) || 1, speed = input.run ? 15 : 8;
    const dx = (Math.sin(yaw) * forward - Math.cos(yaw) * right) / length * speed;
    const dz = (Math.cos(yaw) * forward + Math.sin(yaw) * right) / length * speed;
    stepCharacterBody(p, dx, dz, dt, s.blocks);
    if (dx || dz) p.heading = Math.atan2(dx, dz);
    if (input.jump && !s.jumpHeld && p.height === 0) p.velocityY = 8;
    s.jumpHeld = !!input.jump; p.velocityY -= 22 * dt; p.height = Math.max(0, p.height + p.velocityY * dt); if (!p.height) p.velocityY = 0;
  }
  if (input.attack) attack(s);
  if (s.heat > 0) s.quiet += dt;
  updatePolice(s, p, dt, clearSight);
  const cars = [s.car, ...s.traffic, ...s.policeCars];
  for (const car of cars) {
    car.hitCooldown = Math.max(0, car.hitCooldown - dt); car.impact *= Math.exp(-7 * dt);
    if (car === s.car) driveVehicle(car, s.driving ? input : { brake: true }, dt);
    else steerVehicle(car, cars, s.driving ? null : s.player, dt, car.state === 'responding' ? 24 : 13);
    const impact = moveBody(car, dt, s.blocks);
    if (impact > 5 && car.hitCooldown <= 0) { car.damage = Math.min(100, car.damage + impact * 0.5); car.impact = Math.min(1, impact / 25); car.hitCooldown = 0.5; if (car === s.car && s.driving) s.health -= impact * 0.25; }
  }
  for (let i = 0; i < cars.length; i++) for (let j = i + 1; j < cars.length; j++) {
    const impact = collideVehicles(cars[i], cars[j], s.blocks);
    if (impact > 5) for (const car of [cars[i], cars[j]]) if (car.hitCooldown <= 0) { car.damage = Math.min(100, car.damage + impact * 0.35); car.hitCooldown = 0.5; if (car === s.car && s.driving) s.health -= impact * 0.2; }
  }
  for (const car of cars) car.speed = car.vx * Math.sin(car.heading) + car.vz * Math.cos(car.heading);
  for (const e of s.enemies) {
    if (e.health <= 0) { stepCharacterBody(e, 0, 0, dt, s.blocks); continue; }
    const returning = e.kind === 'police' && (!s.heat || e.returning), destination = returning ? s.policeCars.find(c => c.id === e.unit) || e : p;
    const d = distance(e, destination), heading = Math.atan2(destination.x - e.x, destination.z - e.z); e.heading = heading;
    const speed = d < (e.kind === 'police' ? 180 : 80) && d > (returning ? 3 : 13) ? e.kind === 'police' ? 6 : 3.5 : 0;
    stepCharacterBody(e, Math.sin(heading) * speed, Math.cos(heading) * speed, dt, s.blocks);
    e.cooldown -= dt;
    if (!returning && d < 38 && e.cooldown <= 0 && clearSight(e, p, s.blocks)) {
      s.health -= s.driving ? 2 : 5; e.cooldown = 1.5; e.fireTime = 0.2;
      if (!s.driving) pushCharacter(s.player, p.x - e.x, p.z - e.z, 0.6);
      s.shots.push({ x: e.x, z: e.z, tx: p.x, tz: p.z, ttl: 0.13, police: true });
    }
    e.fireTime = Math.max(0, (e.fireTime || 0) - dt);
  }
  for (const person of s.pedestrians) {
    if (person.z > 390) person.direction = -1; if (person.z < -390) person.direction = 1;
    const afraid = s.heat > 0 && s.quiet < 8 && distance(person, p) < 60;
    if (afraid) person.direction = person.z >= p.z ? 1 : -1;
    person.heading = person.direction > 0 ? 0 : Math.PI;
    stepCharacterBody(person, 0, person.health > 0 ? person.direction * (afraid ? 5 : 1.6) : 0, dt, s.blocks);
  }
  for (const person of [...s.enemies, ...s.pedestrians, ...(!s.driving ? [s.player] : [])]) {
    if (person.health <= 0 || person.height > 1.4) continue;
    person.hitCooldown = Math.max(0, (person.hitCooldown || 0) - dt);
    for (const car of cars) {
      const d = distance(person, car), radius = car.radius + 0.8;
      if (d >= radius) continue;
      const nx = d > 0.01 ? (person.x - car.x) / d : 1, nz = d > 0.01 ? (person.z - car.z) / d : 0;
      const amount = Math.min(0.15, radius - d), x = person.x + nx * amount, z = person.z + nz * amount;
      if (freePosition(x, z, s.blocks, 0.8)) { person.x = x; person.z = z; }
      const impact = Math.max(0, car.vx * nx + car.vz * nz);
      if (impact > 3 && person.hitCooldown <= 0) {
        pushCharacter(person, nx, nz, Math.min(18, impact * 0.8)); person.hitCooldown = 1;
        if (person === s.player) s.health -= impact * 2; else { person.health = Math.max(0, person.health - impact * 4); if (!person.health) person.deadAt = s.time; }
        car.vx *= 0.8; car.vz *= 0.8;
        if (car === s.car && s.driving) { s.heat = Math.max(1, s.heat); s.quiet = 0; }
      }
    }
  }
  if (s.mission?.id === 'crew' && s.mission.stage === 0 && s.enemies.filter(e => e.kind === 'gang').every(e => e.health <= 0)) { s.mission.stage = 1; notify(s, 'Block cleared. Lose the heat and return to the safehouse.'); }
  if (s.health <= 0) { s.health = 0; s.down = 4; notify(s, 'WASTED. Returning to the safehouse...'); }
}
