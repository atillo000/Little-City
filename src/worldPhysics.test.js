import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CITIES, createSession, attack, stepWorld, clearSight } from './worldAdventure.js';
import { vehicle, moveBody, collideVehicles, driveVehicle, steerVehicle, fits, roadRoute, pushCharacter, stepCharacterBody } from './worldPhysics.js';
import { createStreetNpc } from './streetNpc.js';

test('every civilian, gang and police rig has two jointed arms, hands, legs and knees', () => {
  const scene = new THREE.Group(), geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshBasicMaterial();
  const kit = { box(size, color, position, parent) { const box = new THREE.Mesh(geometry, material); box.scale.set(...size); box.position.set(...position); parent.add(box); return box; } };
  for (const options of [{}, { armed: true }, { armed: true, police: true }]) {
    const model = createStreetNpc(scene, kit, options);
    for (const side of ['left', 'right']) for (const part of ['shoulder', 'elbow', 'hand', 'hip', 'knee']) assert.ok(model.avatar.getObjectByName(`${side}-${part}`));
    model.update({ x: 0, z: 0, health: 100, speed: 3, heading: 0 }, 0.1);
    assert.notEqual(model.avatar.getObjectByName('left-hip').rotation.x, 0);
    model.update({ x: 0, z: 0, health: 0, speed: 0, fall: 1, heading: 0 }, 0.1);
    assert.equal(model.avatar.getObjectByName('torso').parent.rotation.x, 1);
  }
  geometry.dispose(); material.dispose();
});
test('high-speed wall collision sweeps the whole movement and bounces without passing through', () => {
  const car = vehicle('one', 0, 0, Math.PI / 2); car.vx = 200;
  const blocks = [{ x: 10, z: 0, width: 0.2, depth: 30 }];
  assert.ok(moveBody(car, 0.1, blocks) > 100);
  assert.ok(car.x < 7.6); assert.ok(car.vx < 0); assert.ok(fits(car.x, car.z, blocks, car.radius));
});
test('vehicle contact conserves momentum, dissipates energy and limits positional correction', () => {
  const a = vehicle('a', 0, 0), b = vehicle('b', 4, 0); a.vx = 25; b.vx = 0;
  const before = a.mass * a.vx + b.mass * b.vx, energy = a.mass * a.vx ** 2;
  assert.equal(collideVehicles(a, b, []), 25);
  assert.ok(b.vx > 0 && a.vx < 25); assert.ok(Math.abs(a.mass * a.vx + b.mass * b.vx - before) < 0.001);
  assert.ok(a.mass * a.vx ** 2 + b.mass * b.vx ** 2 < energy);
  assert.ok(Math.abs(a.x) < 0.3 && Math.abs(b.x - 4) < 0.3);
  assert.equal(collideVehicles(a, b, []), 0, 'separating vehicles receive no second impulse');
});
test('stopped traffic resumes from its stopped position and follows a loop without wrapping', () => {
  const car = vehicle('traffic', 0, 0); car.route = [{ x: 0, z: 80 }, { x: 120, z: 80 }, { x: 120, z: 0 }, { x: 0, z: 0 }]; car.loop = true;
  const blocker = vehicle('blocker', 0, 6);
  for (let i = 0; i < 300; i++) { steerVehicle(car, [car, blocker], null, 1 / 60); moveBody(car, 1 / 60, []); }
  assert.ok(car.z < 0.1);
  let previous = { ...car };
  for (let i = 0; i < 2200; i++) {
    steerVehicle(car, [car], null, 1 / 60); moveBody(car, 1 / 60, []);
    assert.ok(Math.hypot(car.x - previous.x, car.z - previous.z) < 0.3, 'no jump when yielding ends or a loop closes'); previous = { ...car };
  }
  assert.ok(car.waypoint > 0 || car.z > 10);
});
test('reverse input brakes smoothly and steering preserves lateral inertia', () => {
  const car = vehicle('player', 0, 0); car.vz = 45;
  driveVehicle(car, { backward: true }, 1 / 120); assert.ok(car.vz > 44);
  driveVehicle(car, { forward: true, left: true }, 1 / 60); assert.ok(car.heading > 0); assert.ok(Number.isFinite(car.roll));
});
test('knockback moves characters with friction and dead characters fall over progressively', () => {
  const person = { x: 0, z: 0, health: 0 }; pushCharacter(person, 1, 0, 8);
  stepCharacterBody(person, 0, 0, 1 / 60, []); assert.ok(person.x > 0); assert.ok(person.fall > 0 && person.fall < 0.1);
  for (let i = 0; i < 120; i++) stepCharacterBody(person, 0, 0, 1 / 60, []);
  assert.equal(person.fall, Math.PI / 2); assert.ok(person.kickX < 0.01); assert.ok(person.x < 2);
});
test('police dispatch existing cars, travel continuously, stop and deploy officers at their doors', () => {
  const s = createSession(CITIES[0]); s.traffic = []; s.pedestrians = [];
  const original = s.policeCars.map(c => c.id); attack(s);
  for (let i = 0; i < 50; i++) stepWorld(s, {}, 0.05);
  assert.equal(s.enemies.length, 0, 'no officers materialize after a shot');
  let deployed = false;
  for (let i = 0; i < 800; i++) {
    const positions = s.policeCars.map(c => ({ x: c.x, z: c.z })); stepWorld(s, {}, 0.05);
    s.policeCars.forEach((c, index) => { assert.equal(c.id, original[index]); assert.ok(Math.hypot(c.x - positions[index].x, c.z - positions[index].z) < 1.5, 'patrol movement is continuous'); assert.ok(fits(c.x, c.z, s.blocks, c.radius)); });
    if (s.enemies.length) {
      for (const officer of s.enemies) {
        const car = s.policeCars.find(c => c.id === officer.unit); assert.ok(car); assert.equal(car.state, 'onscene');
        assert.ok(Math.hypot(car.vx, car.vz) < 1.2); assert.ok(Math.hypot(officer.x - car.x, officer.z - car.z) < 4.5); assert.ok(clearSight(car, s.player, s.blocks));
      }
      deployed = true; break;
    }
  }
  assert.ok(deployed, 'a patrol reaches the player and officers get out');
});
test('road routes stay outside buildings from every district corner', () => {
  const s = createSession(CITIES[0]);
  for (const from of [{ x: 360, z: -80 }, { x: -120, z: 220 }, { x: 215, z: -240 }]) {
    let previous = from;
    for (const point of roadRoute(from, { x: 8, z: 12 })) { assert.ok(clearSight(previous, point, s.blocks)); previous = point; }
  }
});
