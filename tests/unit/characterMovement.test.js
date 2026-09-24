import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_SPAWN, OFFICE_STATIONS, canWalk, nearbyStation, stepCharacter } from '../../src/models/neighborhood/characterMovement.js';
import { LOUNGE_SPAWN } from '../../src/models/neighborhood/characterMovement.js';
import { combineControls, emptyControls } from '../../src/models/neighborhood/controls.js';
import { createCharacter } from '../../src/scenes/shared/character.js';
import * as THREE from 'three';
const move = (input, player = CHARACTER_SPAWN, frames = 20) => { let state = { ...player }; for (let i = 0; i < frames; i++) state = stepCharacter(state, input, 0.016); return state; };
test('walks relative to the camera; running is faster and diagonals are normalized', () => {
  const walk = move({ forward: true }), run = move({ forward: true, run: true });
  assert.ok(run.z < walk.z && walk.z < CHARACTER_SPAWN.z);
  const diagonal = move({ forward: true, right: true });
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z - 2) - Math.abs(walk.z - 2)) < 0.01);
  assert.ok(stepCharacter(CHARACTER_SPAWN, { forward: true }, 0.05, Math.PI / 2).x > 0);
});
test('walls and furniture block movement while sliding along free axes', () => {
  const wall = move({ forward: true, run: true }, CHARACTER_SPAWN, 1000);
  assert.ok(canWalk(wall.x, wall.z)); assert.ok(wall.z >= -13.3);
  const desk = move({ left: true, run: true }, CHARACTER_SPAWN, 400);
  assert.ok(canWalk(desk.x, desk.z));
  assert.equal(canWalk(-7, 0.2), false); assert.equal(canWalk(5.4, -2.6), false);
});
test('jump lands and holding jump does not trigger repeated jumps', () => {
  let player = stepCharacter(CHARACTER_SPAWN, { jump: true }, 0.016);
  assert.ok(player.height > 0);
  player = move({ jump: true }, player, 100);
  assert.equal(player.height, 0);
  player = stepCharacter(player, {}, 0.016);
  assert.ok(stepCharacter(player, { jump: true }, 0.016).height > 0);
});
test('wave expires; every hub interaction point is walkable and discoverable', () => {
  assert.ok(move({ wave: true }, CHARACTER_SPAWN, 1).waveTime > 0);
  assert.equal(move({ wave: true }, CHARACTER_SPAWN, 120).waveTime, 0);
  OFFICE_STATIONS.forEach(station => { assert.ok(canWalk(station.x, station.z), station.id); assert.equal(nearbyStation(station), station.id); });
});
test('touch and keyboard actions stay independent when a key or pointer is released', () => {
  const keyboard = { ...emptyControls(), forward: true }, pointer = { ...emptyControls(), run: true };
  assert.equal(combineControls(keyboard, pointer).run, true);
  assert.equal(combineControls(keyboard, pointer).forward, true);
  keyboard.forward = false;
  assert.equal(combineControls(keyboard, pointer).run, true);
  keyboard.run = true; pointer.run = false;
  assert.equal(combineControls(keyboard, pointer).run, true);
});
test('wave raises a jointed hand above its shoulder and returns it to a relaxed pose', () => {
  const scene = new THREE.Scene();
  const kit = { box(size, color, pos, parent) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ color })); mesh.position.set(...pos); parent.add(mesh); return mesh; } };
  const character = createCharacter(scene, kit);
  const player = { ...CHARACTER_SPAWN, waveTime: 1 };
  for (let i = 0; i < 60; i++) character.update(player, 1 / 60);
  scene.updateMatrixWorld(true);
  const hand = character.avatar.getObjectByName('right-hand'), shoulder = character.avatar.getObjectByName('right-shoulder');
  const handPosition = hand.getWorldPosition(new THREE.Vector3()), shoulderPosition = shoulder.getWorldPosition(new THREE.Vector3());
  assert.ok(handPosition.y > shoulderPosition.y + 0.2);
  assert.ok(character.avatar.worldToLocal(handPosition.clone()).x > shoulder.position.x + 0.3, 'raised hand stays outside the head and torso');
  const pausedAngle = hand.rotation.z; character.update(player, 0); assert.equal(hand.rotation.z, pausedAngle);
  for (let i = 0; i < 60; i++) character.update({ ...player, waveTime: 0 }, 1 / 60);
  assert.ok(Math.abs(shoulder.rotation.z) < 0.06); assert.ok(Math.abs(hand.rotation.z) < 0.01);
  scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
});
test('lounge movement respects sofas, tables, walls, and the music console approach', () => {
  assert.ok(canWalk(LOUNGE_SPAWN.x, LOUNGE_SPAWN.z, 'lounge'));
  assert.ok(canWalk(0, -38.5, 'lounge'));
  assert.equal(canWalk(0, -33.5, 'lounge'), false);
  assert.equal(canWalk(-6.5, -34, 'lounge'), false);
  assert.equal(canWalk(10, -30, 'lounge'), false);
  let player = { ...LOUNGE_SPAWN };
  for (let i = 0; i < 180; i++) player = stepCharacter(player, { forward: true }, 1 / 60, Math.PI, 'lounge');
  assert.ok(player.z > -32.2 && player.z < LOUNGE_SPAWN.z);
});
