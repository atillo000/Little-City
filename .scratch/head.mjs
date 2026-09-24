import * as THREE from 'three';
import { createStreetNpc } from '../src/streetNpc.js';
const scene = new THREE.Group(), g = new THREE.BoxGeometry(1, 1, 1), m = new THREE.MeshBasicMaterial();
const kit = { box(size, color, position, parent) { const b = new THREE.Mesh(g, m); b.scale.set(...size); b.position.set(...position); parent.add(b); return b; } };
for (const opts of [{}, { role: 'kid', look: { scale: 0.6 } }, { armed: true, police: true }]) {
  const npc = createStreetNpc(scene, kit, opts);
  npc.update({ x: 0, z: 0, health: 100, speed: 2, heading: 0 }, 0.1);
  scene.updateMatrixWorld(true);
  const w = n => npc.avatar.getObjectByName(n).getWorldPosition(new THREE.Vector3());
  console.log(JSON.stringify(opts), 'head', w('head').toArray().map(v => v.toFixed(2)), 'torso', w('torso').toArray().map(v => v.toFixed(2)), 'neck visible', npc.avatar.getObjectByName('neck').visible, 'head visible', npc.avatar.getObjectByName('head').visible);
}
