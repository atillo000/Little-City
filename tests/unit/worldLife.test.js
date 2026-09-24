import test from 'node:test';
import assert from 'node:assert/strict';
import { CITIES, createSession, attack, stepWorld, targetFor, freePosition } from '../../src/models/worldTour/worldAdventure.js';
import { vehicle, createTraffic } from '../../src/models/worldTour/worldPhysics.js';

const quiet = s => { s.traffic = []; s.policeCars.forEach(c => { c.x = 400; c.z = -400; c.route = []; c.loop = false; }); };

test('streets hold families with children, office workers and joggers, placed deterministically on sidewalks', () => {
  const s = createSession(CITIES[0]);
  const kids = s.pedestrians.filter(p => p.child), business = s.pedestrians.filter(p => p.role === 'business');
  assert.ok(s.pedestrians.length >= 40);
  assert.ok(kids.length >= 7); assert.ok(business.length >= 8); assert.ok(s.pedestrians.some(p => p.role === 'jogger'));
  for (const kid of kids) { const parent = s.pedestrians[kid.leader]; assert.ok(parent && !parent.child, 'every child walks with an adult'); assert.ok(kid.look.scale < 0.7); }
  assert.deepEqual(createSession(CITIES[0]).pedestrians.map(p => [p.x, p.z]), s.pedestrians.map(p => [p.x, p.z]));
  assert.notDeepEqual(createSession(CITIES[1]).pedestrians.map(p => p.look), s.pedestrians.map(p => p.look));
  for (const p of s.pedestrians) assert.ok(freePosition(p.x, p.z, s.blocks, 0.8), p.id);
});

test('pedestrians keep walking, stay out of buildings and families stay together', () => {
  const s = createSession(CITIES[2]); s.traffic = [];
  const start = s.pedestrians.map(p => ({ x: p.x, z: p.z }));
  for (let i = 0; i < 1200; i++) stepWorld(s, {}, 0.05);
  const moved = s.pedestrians.filter((p, i) => Math.hypot(p.x - start[i].x, p.z - start[i].z) > 20).length;
  assert.ok(moved > s.pedestrians.length * 0.7, 'most pedestrians travel');
  for (const p of s.pedestrians) {
    assert.ok(freePosition(p.x, p.z, s.blocks, 0.5), p.id + ' is not inside a building');
    if (p.leader !== null) assert.ok(Math.hypot(p.x - s.pedestrians[p.leader].x, p.z - s.pedestrians[p.leader].z) < 6, p.id + ' stays with its group');
  }
});

test('children are never targeted or injured, even by vehicles', () => {
  const s = createSession(CITIES[0]); quiet(s); s.blocks = [];
  const kid = s.pedestrians.find(p => p.child);
  s.pedestrians = [kid]; Object.assign(kid, { x: 8, z: 10, leader: null });
  s.weapon = 'fists'; assert.equal(targetFor(s), null);
  attack(s); assert.equal(kid.health, 100); assert.equal(s.heat, 0, 'an empty swing does not attract police');
  s.weapon = 'pistol'; s.cooldown = 0; attack(s); assert.equal(kid.health, 100);
  s.driving = true; s.car.x = kid.x; s.car.z = kid.z - 3; s.car.vz = 25;
  stepWorld(s, { forward: true }, 0.05);
  assert.equal(kid.health, 100); assert.ok(s.impacts.every(hit => !hit.blood || hit.kind !== 'car'));
});

test('punch combo builds to a knockdown hook with lift, blood spray and a directional fall', () => {
  const s = createSession(CITIES[0]); quiet(s); s.blocks = []; s.pedestrians = []; s.weapon = 'fists';
  const thug = { id: 'thug', kind: 'gang', x: 8, z: 15, heading: Math.PI, health: 200, cooldown: 9 };
  s.enemies = [thug];
  const healths = [];
  for (let i = 0; i < 3; i++) { s.cooldown = 0; attack(s); healths.push(thug.health); s.time += 0.3; }
  assert.deepEqual(healths, [166, 132, 87], 'jab, cross, then a heavier hook');
  assert.ok(thug.knockdown > 0 && thug.vy > 0, 'the hook knocks the target off its feet');
  assert.equal(thug.fallDir, -1, 'hit from the front, the target falls backward');
  const punches = s.impacts.filter(hit => hit.kind === 'punch');
  assert.equal(punches.length, 3); assert.ok(punches.every(hit => hit.blood && hit.dz > 0.99), 'blood sprays away from the player');
  const before = thug.z; for (let i = 0; i < 10; i++) stepWorld(s, {}, 0.05);
  assert.ok(thug.z > before + 1 && thug.fall > 0.5, 'knockback carries the body and it falls');
  for (let i = 0; i < 60; i++) stepWorld(s, {}, 0.05);
  assert.equal(thug.fall, 0, 'a knocked-down fighter gets back up');
  Object.assign(thug, { x: 8, z: 15, health: 30 }); s.cooldown = 0; s.time += 2; attack(s);
  assert.equal(thug.health, 0); assert.ok(s.impacts.some(hit => hit.kind === 'pool'), 'a defeated body leaves a blood pool');
});

test('a combo thrown in real time lands all three punches despite knockback', () => {
  const s = createSession(CITIES[0]); quiet(s); s.blocks = []; s.pedestrians = []; s.weapon = 'fists';
  const thug = { id: 'thug', kind: 'gang', x: 8, z: 15.5, heading: Math.PI, health: 300, cooldown: 60 };
  s.enemies = [thug];
  for (let i = 0; i < 3; i++) { attack(s); for (let n = 0; n < 10; n++) stepWorld(s, {}, 0.05); }
  assert.equal(thug.health, 300 - 34 - 34 - 45);
  assert.ok(thug.knockdown > 0 || thug.fall > 0, 'the final hook knocks the target down');
});

test('pistol prefers threats, spares bystanders behind the camera and stops stray shots at walls', () => {
  const s = createSession(CITIES[0]); quiet(s); s.blocks = [];
  const behind = { id: 'b', kind: 'civilian', x: 8, z: 30, health: 100, heading: 0 }, ahead = { id: 'a', kind: 'civilian', x: 8, z: -8, health: 100, heading: 0 };
  s.pedestrians = [behind]; s.aimYaw = Math.PI;
  assert.equal(targetFor(s), null, 'a bystander behind the aim direction is not auto-targeted');
  s.pedestrians = [behind, ahead]; assert.equal(targetFor(s), ahead);
  const gang = { id: 'g', kind: 'gang', x: 20, z: 40, health: 100, cooldown: 9 }; s.enemies = [gang];
  assert.equal(targetFor(s), gang, 'armed enemies take priority anywhere in range');
  s.enemies = []; s.pedestrians = []; s.blocks = [{ x: 8, z: -10, width: 20, depth: 4 }];
  attack(s); const shot = s.shots.at(-1);
  assert.ok(Math.abs(shot.tz - -8) < 0.01, 'the tracer ends at the wall instead of passing through');
  s.ammo = 0; s.cooldown = 0; s.reload = 0; attack(s); assert.equal(s.reload, 1.5, 'an empty pistol reloads automatically');
});

test('at one star officers arrest a suspect who stays still, and busted players are fined', () => {
  const s = createSession(CITIES[0], { cash: 2000 }); quiet(s); s.pedestrians = []; s.heat = 1; s.quiet = 0;
  s.enemies = [{ id: 'cop', unit: 'patrol-0', kind: 'police', x: 8, z: 24, health: 100, cooldown: 0 }];
  let busted = false;
  for (let i = 0; i < 120 && !busted; i++) { s.quiet = 0; stepWorld(s, {}, 0.05); busted = s.downReason === 'busted'; assert.equal(s.health, 100, 'no shots at one star'); }
  assert.ok(busted); assert.equal(s.cash, 1500);
  for (let i = 0; i < 90; i++) stepWorld(s, {}, 0.05);
  assert.ok(s.down <= 0); assert.equal(s.heat, 0); assert.equal(s.downReason, '');
  s.heat = 2.2; s.quiet = 0; s.enemies = [{ id: 'cop2', unit: 'patrol-0', kind: 'police', x: 8, z: 18, health: 100, cooldown: 0 }];
  stepWorld(s, {}, 0.05); assert.ok(s.health < 100, 'officers open fire at two stars');
});

test('enemy accuracy drops with distance and a sprinting target', () => {
  const rate = (distance, sprint) => {
    const t = createSession(CITIES[0]); quiet(t); t.pedestrians = []; t.blocks = [];
    let hits = 0;
    for (let i = 0; i < 80; i++) {
      t.enemies = [{ id: 'g' + i, kind: 'gang', x: 8, z: 12 + distance, health: 100, cooldown: 0 }];
      t.player = { ...t.player, x: 8, z: 12, moveX: sprint ? 15 : 0, moveZ: 0, kickX: 0, kickZ: 0 }; t.health = 100;
      stepWorld(t, sprint ? { right: true, run: true } : {}, 0.01); if (t.health < 100) hits++;
    }
    return hits / 80;
  };
  assert.equal(rate(5, true), 1, 'point-blank shots always land');
  const standing = rate(35, false), sprinting = rate(35, true);
  assert.ok(sprinting < standing, `sprinting (${sprinting}) is harder to hit than standing (${standing})`);
  assert.ok(sprinting > 0.05 && sprinting < 0.5);
});

test('police chase a fleeing car directly, search the last known position and regroup officers', () => {
  const s = createSession(CITIES[0]); s.traffic = []; s.pedestrians = [];
  const car = s.policeCars[0]; s.heat = 2; s.quiet = 0; s.incident = true; s.dispatchDelay = 99; s.unseen = 0;
  Object.assign(car, { state: 'responding', x: 0, z: -60, heading: 0, loop: false, route: [], replan: 0 });
  Object.assign(s.car, { x: 0, z: 0, vx: 0, vz: 30, speed: 30, heading: 0 }); s.driving = true;
  stepWorld(s, { forward: true }, 0.02);
  assert.ok(car.chasing, 'a visible fleeing car is pursued directly'); assert.equal(car.ignore, s.car);
  assert.ok(car.route[0].z > s.car.z, 'the pursuit aims ahead of the suspect');
  // Out of sight for a while: units head for where the suspect was last seen, not where they are now.
  s.lastSeen = { x: 120, z: 120 }; s.unseen = 6; Object.assign(s.car, { x: -360, z: 360, vx: 0, vz: 0 }); car.replan = 0;
  s.policeCars.slice(1).forEach(c => { c.x = 360; c.z = -360; c.state = 'patrol'; });
  stepWorld(s, {}, 0.02);
  const end = car.route.at(-1); assert.ok(Math.hypot(end.x - 120, end.z - 120) < 25, 'route ends at the last known position');
  // Officers on scene regroup when the suspect drives away, then the car resumes the pursuit.
  Object.assign(car, { state: 'onscene', x: 0, z: 0, vx: 0, vz: 0, deployed: true, route: [] });
  s.enemies = [{ id: 'o', unit: car.id, kind: 'police', x: 3, z: 0, health: 100, cooldown: 3 }];
  Object.assign(s.car, { x: 0, z: 40, vz: 20 }); s.car.speed = 20;
  stepWorld(s, { forward: true }, 0.02);
  assert.ok(['regroup', 'responding'].includes(car.state));
  for (let i = 0; i < 40 && car.state === 'regroup'; i++) stepWorld(s, { forward: true }, 0.05);
  assert.equal(car.state, 'responding'); assert.equal(s.enemies.filter(e => e.health > 0).length, 0, 'the officer boarded');
});

test('traffic loops use opposite lanes, keep flowing, and wedged cars reverse out', () => {
  const traffic = createTraffic();
  assert.equal(traffic.length, 18);
  const s = createSession(CITIES[0]); s.pedestrians = []; s.player.x = 430; s.player.z = 430;
  const travelled = s.traffic.map(() => 0);
  for (let i = 0; i < 1200; i++) {
    const before = s.traffic.map(c => ({ x: c.x, z: c.z })); stepWorld(s, {}, 0.05);
    s.traffic.forEach((c, n) => { travelled[n] += Math.hypot(c.x - before[n].x, c.z - before[n].z); });
  }
  assert.ok(travelled.every(d => d > 250), 'no car is stuck in a head-on standoff: ' + travelled.map(Math.round));
  // A car nosed into a wall (Rapier contact) cannot move forward, so its driver reverses out.
  const w = createSession(CITIES[0]); w.pedestrians = []; w.blocks = [{ x: 0, z: 6, width: 12, depth: 1, height: 10 }];
  w.policeCars.forEach((c, i) => Object.assign(c, { x: 420, z: -420 + i * 12, route: [], loop: false }));
  const car = vehicle('wedged', 0, 0); car.route = [{ x: 0, z: 60 }]; car.loop = false; w.traffic = [car];
  Object.assign(w.player, { x: 200, z: 200 });
  let reversed = false;
  for (let i = 0; i < 200; i++) { stepWorld(w, {}, 0.05); if (car.reverse > 0) reversed = true; }
  assert.ok(reversed, 'a car pressed against a wall backs up to recover');
});
