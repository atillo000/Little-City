import test from 'node:test';
import assert from 'node:assert/strict';
import { SPAWN, stepCar } from './driving.js';
import { WORLD, BUILDINGS, OFFICE, isDriveable } from './world.js';
import { stops } from './content.js';

const input = (values = {}) => ({ forward: false, backward: false, left: false, right: false, brake: false, ...values });
test('accelerates forward, reverses, and brakes', () => {
  const forward = stepCar(SPAWN, input({ forward: true }), 0.05);
  assert.ok(forward.x < SPAWN.x);
  const reverse = stepCar(SPAWN, input({ backward: true }), 0.05);
  assert.ok(reverse.x > SPAWN.x);
  const moving = { ...SPAWN, speed: 8 };
  assert.ok(stepCar(moving, input({ brake: true }), 0.05).speed < stepCar(moving, input(), 0.05).speed);
});
test('stays in the city and cannot pass through street furniture', () => {
  let car = { ...SPAWN };
  for (let i = 0; i < 2000; i++) car = stepCar(car, input({ forward: true }), 0.016);
  assert.ok(isDriveable(car.x, car.z));
  const collision = stepCar({ x: 0, z: 40, heading: 0, speed: 8 }, input({ forward: true }), 0.05, [{ x: 0, z: 41, radius: 0.5 }]);
  assert.equal(collision.z, 40);
});
test('building footprints block the car, including the office facade', () => {
  BUILDINGS.forEach(b => assert.equal(isDriveable(b.x, b.z), false));
  let car = { ...SPAWN, x: OFFICE.x, z: OFFICE.z + OFFICE.depth / 2 + 2, heading: Math.PI, speed: 10 };
  for (let i = 0; i < 200; i++) car = stepCar(car, input({ forward: true }), 0.016);
  assert.ok(car.z >= OFFICE.z + OFFICE.depth / 2 + 0.85);
});
test('spawn, destination parking, and every street center remain accessible', () => {
  assert.ok(isDriveable(SPAWN.x, SPAWN.z));
  [OFFICE, ...stops].forEach(stop => assert.ok(isDriveable(...stop.parking), `${stop.id} parking is accessible`));
  for (let distance = -68; distance <= 68; distance++) {
    WORLD.streetsX.forEach(x => assert.ok(isDriveable(x, distance), `north/south street ${x}, ${distance}`));
    WORLD.streetsZ.forEach(z => assert.ok(isDriveable(distance, z), `east/west street ${distance}, ${z}`));
  }
});
test('steering changes heading and excessive frame deltas are clamped', () => {
  const moving = { ...SPAWN, speed: 6 };
  assert.ok(stepCar(moving, input({ left: true }), 0.016).heading > moving.heading);
  assert.deepEqual(stepCar(moving, input(), 4), stepCar(moving, input(), 0.05));
});
