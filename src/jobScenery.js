import * as THREE from 'three';
import { currentObjective, inventory } from './missions.js';
import { interactionPoint } from './gameLocations.js';

export function createJobScenery(scene, kit, car) {
  const exterior = new THREE.Group(), interior = new THREE.Group(); scene.add(exterior, interior);
  const bag = new THREE.Group(); bag.userData.stopId = 'park'; exterior.add(bag); bag.position.set(0, 0.8, 36);
  kit.box([1.1, 0.85, 0.55], '#c4a06e', [0, 0.43, 0], bag);
  kit.box([0.35, 0.3, 0.58], '#ece2c9', [0.2, 0.67, 0], bag);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 12), new THREE.MeshStandardMaterial({ color: '#806346' })); handle.position.y = 0.92; bag.add(handle);
  const returnedBag = kit.box([1.1, 0.85, 0.55], '#c4a06e', [-6, 3.1, 0], interior);
  const bulbs = [];
  for (let i = 0; i < 9; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), new THREE.MeshStandardMaterial({ color: '#9b9277', emissive: '#ffd990', emissiveIntensity: 0 }));
    bulb.position.set(-40 + i * 1.75, 4.85, 17.65); exterior.add(bulb); bulbs.push(bulb);
  }
  const marker = new THREE.Group(); scene.add(marker);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.65), new THREE.MeshBasicMaterial({ color: '#ffd275', depthTest: false })); gem.renderOrder = 5; marker.add(gem);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 6, 32), new THREE.MeshBasicMaterial({ color: '#ffd275' })); ring.rotation.x = Math.PI / 2; marker.add(ring);
  const cargo = new THREE.Group(); car.add(cargo); cargo.position.set(0, 0.95, -0.75);
  kit.box([1, 0.13, 0.55], '#d9bd8f', [0, 0, 0], cargo);
  for (const x of [-0.32, 0, 0.32]) for (const z of [-0.15, 0.15]) {
    kit.cylinder(0.12, 0.09, 0.25, '#f4eee1', [x, 0.18, z], cargo, 8);
    kit.cylinder(0.13, 0.13, 0.04, '#6d5546', [x, 0.32, z], cargo, 8);
  }
  return { update(progress, mode, time, reducedMotion) {
    const inside = ['office', 'lounge'].includes(mode); exterior.visible = !inside; interior.visible = mode === 'office';
    const repaired = progress.completed.includes('repair') || (progress.active === 'repair' && progress.step >= 2);
    bulbs.forEach(bulb => { bulb.material.emissiveIntensity = repaired ? 2.5 : 0; bulb.material.color.set(repaired ? '#ffe9b3' : '#756f62'); });
    bag.visible = progress.active === 'lost' && progress.step === 0;
    returnedBag.visible = progress.completed.includes('lost') || (progress.active === 'lost' && progress.step === 2);
    cargo.visible = !inside && progress.active === 'coffee' && Boolean(inventory(progress));
    const objective = currentObjective(progress);
    const targetId = objective.location === 'dispatch' && !inside ? 'office' : objective.location;
    const point = interactionPoint(targetId, mode);
    marker.visible = Boolean(point && progress.active); marker.userData.stopId = targetId;
    if (point) { marker.position.set(point.x, inside ? 0.98 : 0.8, point.z); ring.position.y = 0.02; gem.position.y = 4.5 + (reducedMotion ? 0 : Math.sin(time * 2) * 0.25); gem.rotation.y = reducedMotion ? 0 : time * 0.6; }
  } };
}
