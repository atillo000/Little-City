import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceProgress, freshProgress, cleanProgress, missionSummary, missionValue } from '../../src/models/neighborhood/missions.js';
import { TRAFFIC_ROUTE, BIKE_ROUTE, routeLength, sampleRoute, shouldYield } from '../../src/models/neighborhood/cityLifePaths.js';
import { isDriveable } from '../../src/models/neighborhood/world.js';
import { interactionPoint, canInteract } from '../../src/models/neighborhood/gameLocations.js';
import { MISSION_LIST, currentObjective, inventory } from '../../src/models/neighborhood/missions.js';

const at = (id, mode = 'drive') => ({ ...interactionPoint(id, mode), mode, speed: 0 });
const accept = (p, id) => advanceProgress(p, { type: 'accept', id, context: at('npc:maya') });
const interact = (p, location, mode = 'drive', extra = {}) => advanceProgress(p, { type: 'interact', location, context: at(location, mode), ...extra });
test('jobs require accepting in order, physical proximity, and the correct inventory stage', () => {
  const initial = freshProgress();
  assert.deepEqual(accept(initial, 'repair'), initial);
  assert.deepEqual(advanceProgress(initial, { type: 'accept', id: 'coffee', context: { x: 60, z: 60, mode: 'drive', speed: 0 } }), initial);
  let p = accept(initial, 'coffee');
  assert.equal(p.active, 'coffee');
  assert.deepEqual(interact(p, 'library'), p, 'delivery before pickup is rejected');
  assert.deepEqual(advanceProgress(p, { type: 'visit', id: 'cafe' }), p, 'reading a location does not advance a job');
  assert.deepEqual(advanceProgress(p, { type: 'interact', location: 'cafe', context: at('library') }), p, 'remote interaction is rejected');
  assert.deepEqual(advanceProgress(p, { type: 'interact', location: 'cafe', context: { ...at('cafe'), speed: 4 } }), p, 'stop before interacting');
  p = interact(p, 'cafe'); assert.equal(inventory(p), 'Six coffees');
  assert.deepEqual(interact(p, 'cafe'), p, 'cannot duplicate pickup');
  p = interact(p, 'library'); assert.equal(inventory(p), null); assert.equal(p.coins, 0);
  p = interact(p, 'npc:maya'); assert.equal(p.coins, 85); assert.equal(p.active, null);
  assert.deepEqual(interact(p, 'npc:maya'), p, 'cannot collect a reward twice');
});
test('coffee spills affect the delivery tip only while the tray is being carried', () => {
  let p = accept(freshProgress(), 'coffee');
  assert.equal(advanceProgress(p, { type: 'collision' }).condition, 100);
  p = interact(p, 'cafe');
  p = advanceProgress(p, { type: 'activity', collision: true }); assert.equal(p.condition, 85);
  p = advanceProgress(p, { type: 'reset' }); assert.equal(p.condition, 70);
  p = interact(p, 'library'); p = interact(p, 'npc:maya'); assert.equal(p.coins, 60);
});
test('repair requires the safe sequence; the lost bag must be checked in on foot; another shift retains coins', () => {
  let p = freshProgress();
  for (const mission of MISSION_LIST) {
    p = accept(p, mission.id);
    p = interact(p, mission.steps[0].location);
    if (mission.id === 'repair') {
      assert.deepEqual(interact(p, 'market'), p);
      assert.deepEqual(interact(p, 'market', 'drive', { sequence: ['replace', 'off', 'test'] }), p);
      p = interact(p, 'market', 'drive', { sequence: ['off', 'replace', 'test'] });
    } else if (mission.id === 'lost') {
      assert.equal(canInteract('dispatch', { x: -2.7, z: 0.2, speed: 0, mode: 'drive' }), false);
      p = interact(p, 'dispatch', 'office');
    } else p = interact(p, 'library');
    assert.equal(currentObjective(p).location, 'npc:maya');
    p = interact(p, 'npc:maya');
  }
  assert.deepEqual(missionSummary(p), { count: 3, points: 250 });
  assert.equal(missionValue('lost', p), 3);
  const next = advanceProgress(p, { type: 'next-day', context: at('npc:maya') });
  assert.equal(next.coins, 250); assert.equal(next.day, 2); assert.deepEqual(next.completed, []);
});
test('new saves resume jobs and inventory; legacy guest achievements do not auto-complete jobs', () => {
  const carrying = interact(accept(freshProgress(), 'coffee'), 'cafe');
  assert.deepEqual(cleanProgress(JSON.parse(JSON.stringify(carrying))), carrying);
  assert.deepEqual(cleanProgress({ visited: ['about'], driven: 120 }), freshProgress());
  const corrupt = cleanProgress({ version: 2, active: 'not-a-job', completed: ['coffee', 'coffee', 'fake'], coins: Infinity, condition: -10 });
  assert.deepEqual(corrupt.completed, ['coffee']); assert.equal(corrupt.active, null); assert.equal(corrupt.coins, 0); assert.equal(corrupt.condition, 0);
});

test('traffic and bicycle routes loop continuously and stay clear of buildings', () => {
  for (const route of [TRAFFIC_ROUTE, BIKE_ROUTE]) {
    const length = routeLength(route);
    assert.deepEqual(sampleRoute(route, 0), sampleRoute(route, length));
    for (let d = 0; d < length; d += 0.25) {
      const p = sampleRoute(route, d);
      assert.ok(isDriveable(p.x, p.z), `Blocked route at ${p.x}, ${p.z}`);
      const next = sampleRoute(route, d + 0.1);
      assert.ok(Math.hypot(next.x - p.x, next.z - p.z) <= 0.101, 'no teleport at corners');
    }
  }
});
test('traffic yields to the player in its lane, without stopping for someone behind it', () => {
  const car = { x: 0, z: 0, heading: Math.PI / 2 };
  assert.equal(shouldYield(car, { x: 3, z: 0 }), true);
  assert.equal(shouldYield(car, { x: -3, z: 0 }), false);
  assert.equal(shouldYield(car, { x: 3, z: 4 }), false);
});
