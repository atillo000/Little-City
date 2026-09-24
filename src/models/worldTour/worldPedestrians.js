import { ROAD_GRID, length, random, stepCharacterBody } from './worldPhysics.js';

// Sidewalk street life: families with children, office workers, joggers and friends walking together.
// Pedestrians walk sidewalk lanes 13 units from each road centre and may turn at corners.
const SIDEWALK = 13;
const CORNERS = ROAD_GRID.flatMap(road => [road - SIDEWALK, road + SIDEWALK]);
const SKIN = ['#f3cfb0', '#e0ac85', '#c18b63', '#9a6644', '#6d452e', '#4d3122'];
const HAIR = ['#2a211c', '#4b3428', '#7d532f', '#c7a266', '#161616', '#a7a39c', '#8c3b2b'];
const CASUAL = ['#e7b591', '#99b5c0', '#cc93a3', '#f0d58a', '#8fc7a2', '#b6a4d8', '#e98d6f', '#f2efe6', '#6f8fbf'];
const PANTS = ['#344655', '#4d5a6a', '#6b5a48', '#2f3338', '#7b8793', '#a38f72'];
const SUITS = ['#2b3240', '#3b3e46', '#26314a', '#4a4038', '#51565e'];
const KIDS = ['#ff9a8a', '#ffd166', '#7bd3ea', '#a0e37b', '#e39bf0', '#ffb36b'];

// Group plans are fixed so every city has the same mix; the city seed changes looks and placement.
const GROUPS = [
  ...Array.from({ length: 7 }, (_, i) => ({ type: 'family', parents: 1 + (i % 2), kids: 1 + (i % 3 === 0 ? 1 : 0) })),
  ...Array.from({ length: 9 }, () => ({ type: 'business' })),
  ...Array.from({ length: 10 }, () => ({ type: 'adult' })),
  ...Array.from({ length: 3 }, () => ({ type: 'jogger' })),
  ...Array.from({ length: 4 }, () => ({ type: 'friends' })),
];
// Follower slots relative to the group leader: lateral offset (right is positive) and distance behind.
const SLOTS = [[1.3, 0.3], [-1.15, 0.1], [0.6, 1.9], [-0.6, 1.9]];

const pick = (s, list) => list[Math.floor(random(s) * list.length)];
function look(s, role) {
  const kid = role === 'kid';
  return {
    skin: pick(s, SKIN), hair: pick(s, HAIR),
    hairStyle: pick(s, kid ? ['short', 'long', 'cap', 'short'] : role === 'business' ? ['short', 'short', 'long', 'bald'] : role === 'jogger' ? ['cap', 'short', 'long'] : ['short', 'long', 'long', 'cap', 'bald']),
    shirt: role === 'business' ? pick(s, SUITS) : kid ? pick(s, KIDS) : role === 'jogger' ? pick(s, ['#ff6b6b', '#3dd6c6', '#f7d24a', '#8f7cff']) : pick(s, CASUAL),
    pants: role === 'business' ? '' : pick(s, PANTS),
    scale: kid ? 0.56 + random(s) * 0.12 : 0.94 + random(s) * 0.13,
    backpack: kid && random(s) < 0.6,
  };
}
function spawnPoint(s, awayFrom, minimum = 0) {
  for (let tries = 0; tries < 40; tries++) {
    const axis = random(s) < 0.5 ? 'x' : 'z', lane = pick(s, CORNERS);
    let along = -400 + random(s) * 800;
    // Never place a group in the roadway at a crossing.
    for (const road of ROAD_GRID) if (Math.abs(along - road) < 16) along = road + (along < road ? -18 : 18);
    const point = axis === 'z' ? { x: lane, z: along } : { x: along, z: lane };
    if (!awayFrom || length(point, awayFrom) >= minimum) return { axis, lane, along, point };
  }
  return { axis: 'z', lane: CORNERS[0], along: 0, point: { x: CORNERS[0], z: 0 } };
}
function place(s, person, leader, spawn, slot) {
  const heading = spawn.axis === 'z' ? (leader.direction > 0 ? 0 : Math.PI) : (leader.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
  const [side, back] = slot || [0, 0], fx = Math.sin(heading), fz = Math.cos(heading), rx = -Math.cos(heading), rz = Math.sin(heading);
  Object.assign(person, {
    x: spawn.point.x + rx * side - fx * back, z: spawn.point.z + rz * side - fz * back, heading, axis: spawn.axis, lane: spawn.lane,
    health: 100, speed: 0, fall: 0, fallVelocity: 0, knockdown: 0, height: 0, vy: 0, kickX: 0, kickZ: 0, moveX: 0, moveZ: 0,
    deadAt: undefined, idle: 0, pause: 6 + random(s) * 20, panic: false, ragdoll: null, getUp: 0,
  });
}
export function createPedestrians(s) {
  const people = [];
  GROUPS.forEach((plan, group) => {
    const roles = plan.type === 'family' ? [...Array(plan.parents).fill('parent'), ...Array(plan.kids).fill('kid')] : plan.type === 'friends' ? ['adult', 'adult'] : [plan.type];
    const spawn = spawnPoint(s), leaderIndex = people.length, direction = random(s) < 0.5 ? 1 : -1;
    roles.forEach((role, member) => {
      const person = {
        id: 'civilian-' + people.length, kind: 'civilian', role: role === 'parent' ? 'adult' : role, child: role === 'kid', group,
        leader: member ? leaderIndex : null, slot: member ? SLOTS[member - 1] : null, direction,
        walk: role === 'jogger' ? 4.6 + random(s) : role === 'business' ? 2 + random(s) * 0.5 : 1.4 + random(s) * 0.5,
        look: look(s, role === 'parent' ? 'adult' : role),
      };
      place(s, person, person.leader === null ? person : people[leaderIndex], spawn, person.slot);
      people.push(person);
    });
  });
  return people;
}

function crossedCorner(before, after) {
  return CORNERS.find(c => (before - c) * (after - c) < 0 && Math.abs(c) < 420);
}
function nearRoad(value) { return ROAD_GRID.some(road => Math.abs(value - road) < 12); }
function frightened(s, person, player) {
  const alarm = s.alarm && s.time - s.alarm.time < 7 && length(person, s.alarm) < s.alarm.radius;
  return !!alarm || (s.heat > 0 && s.quiet < 8 && length(person, player) < 60);
}

export function stepPedestrians(s, player, dt) {
  const people = s.pedestrians;
  for (const person of people) {
    if (person.health <= 0 || person.knockdown > 0 || person.ragdoll) { stepCharacterBody(person, 0, 0, dt); person.panic = false; continue; }
    const leader = person.leader === null ? null : people[person.leader];
    const following = leader && leader.health > 0;
    const afraid = frightened(s, person, following ? leader : person) || (following && leader.panic);
    person.panic = afraid;
    if (following) {
      // Stay in formation beside or behind the leader (children hold the leader's hand).
      person.axis = leader.axis; person.lane = leader.lane; person.direction = leader.direction;
      const h = leader.heading, [side, back] = person.slot, fx = Math.sin(h), fz = Math.cos(h), rx = -Math.cos(h), rz = Math.sin(h);
      const tx = leader.x + rx * side - fx * back, tz = leader.z + rz * side - fz * back, dx = tx - person.x, dz = tz - person.z, gap = Math.hypot(dx, dz);
      const limit = (leader.knockdown > 0 ? 0 : leader.speed || 0) + (afraid ? 4 : 1.6), speed = Math.min(limit, gap * 3);
      const vx = gap > 0.05 ? dx / gap * speed : 0, vz = gap > 0.05 ? dz / gap * speed : 0;
      stepCharacterBody(person, vx, vz, dt);
      if (speed > 0.35) person.heading = Math.atan2(vx, vz);
      else person.heading = leader.idle > 0 && !person.child ? Math.atan2(leader.x - person.x, leader.z - person.z) : leader.heading;
      person.idle = leader.idle;
      // Children waiting with a parent occasionally hop in place.
      if (person.child && leader.idle > 0 && !person.height && random(s) < dt * 0.5) person.vy = 3.2;
      continue;
    }
    const along = person.axis, perp = along === 'z' ? 'x' : 'z';
    if (afraid) { person.direction = person[along] >= player[along] ? 1 : -1; person.idle = 0; }
    let speed = 0;
    if (person.idle > 0) person.idle -= dt;
    else {
      person.pause -= dt;
      if (person.pause <= 0 && !afraid && !nearRoad(person[along])) {
        // Stop to window-shop, take a call or chat, facing the nearest storefront.
        person.idle = 2.5 + random(s) * 5; person.pause = 10 + random(s) * 25;
        const road = ROAD_GRID.reduce((best, r) => Math.abs(person.lane - r) < Math.abs(person.lane - best) ? r : best, 0), side = Math.sign(person.lane - road) || 1;
        person.idleHeading = along === 'z' ? side * Math.PI / 2 : side > 0 ? 0 : Math.PI;
      } else speed = afraid ? (person.child ? 5.5 : 7) : person.walk;
    }
    if (person[along] > 420) person.direction = -1; else if (person[along] < -420) person.direction = 1;
    const before = person[along], forward = person.direction * speed, correction = Math.max(-2, Math.min(2, (person.lane - person[perp]) * 2));
    stepCharacterBody(person, along === 'x' ? forward : correction, along === 'z' ? forward : correction, dt);
    person.heading = speed ? Math.atan2(along === 'x' ? forward : correction * 0.2, along === 'z' ? forward : correction * 0.2) : person.idleHeading ?? person.heading;
    const corner = speed ? crossedCorner(before, person[along]) : undefined;
    if (corner !== undefined && !afraid && random(s) < 0.3) {
      // Turn onto the crossing sidewalk: the corner coordinate becomes the new lane.
      person.axis = perp; person.lane = corner; person.direction = random(s) < 0.5 ? 1 : -1;
    }
  }
  s.respawnCheck = (s.respawnCheck || 0) - dt;
  if (s.respawnCheck > 0) return;
  s.respawnCheck = 1;
  // Bodies are cleared once nobody in the group is near the player; the group re-enters elsewhere as new pedestrians.
  const groups = new Map();
  for (const person of people) { if (!groups.has(person.group)) groups.set(person.group, []); groups.get(person.group).push(person); }
  for (const members of groups.values()) {
    if (!members.some(m => m.health <= 0 && s.time - (m.deadAt ?? s.time) > 40)) continue;
    if (members.some(m => length(m, player) < 150)) continue;
    const spawn = spawnPoint(s, player, 190), lead = members.find(m => m.leader === null), direction = random(s) < 0.5 ? 1 : -1;
    for (const m of members) { m.direction = direction; place(s, m, lead, spawn, m.slot); }
  }
}
