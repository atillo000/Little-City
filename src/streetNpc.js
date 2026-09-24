import * as THREE from 'three';

// A shared articulated rig for civilians, gang members and responding officers.
export function createStreetNpc(scene, kit, { shirt = '#9ab6c0', police = false, armed = false } = {}) {
  const avatar = new THREE.Group(); scene.add(avatar);
  const hips = new THREE.Group(); avatar.add(hips); hips.position.y = 1.35;
  const torso = kit.box([0.9, 1, 0.55], shirt, [0, 0.45, 0], hips); torso.name = 'torso';
  kit.box([0.88, 0.12, 0.6], '#253747', [0, -0.06, 0], hips);
  const head = kit.box([0.65, 0.65, 0.6], '#cea280', [0, 1.3, 0], hips); head.name = 'head';
  kit.box([0.7, 0.18, 0.63], police ? '#22344d' : '#4c3c36', [0, 1.64, 0], hips);
  if (police) { kit.box([0.78, 0.08, 0.3], '#22344d', [0, 1.58, 0.35], hips); kit.box([0.13, 0.2, 0.06], '#ebcd7e', [-0.22, 0.64, 0.3], hips); }
  const arms = [], elbows = [], legs = [], knees = [];
  for (const side of [-1, 1]) {
    const name = side < 0 ? 'left' : 'right';
    const arm = new THREE.Group(); arm.name = name + '-shoulder'; arm.position.set(side * 0.6, 0.8, 0); hips.add(arm);
    kit.box([0.28, 0.52, 0.33], shirt, [0, -0.23, 0], arm);
    const elbow = new THREE.Group(); elbow.name = name + '-elbow'; elbow.position.y = -0.46; arm.add(elbow);
    kit.box([0.25, 0.44, 0.29], shirt, [0, -0.19, 0], elbow);
    const hand = kit.box([0.25, 0.26, 0.27], '#cea280', [0, -0.47, 0], elbow); hand.name = name + '-hand';
    if (side > 0 && armed) kit.box([0.16, 0.18, 0.6], '#29333d', [0, -0.5, 0.23], elbow);
    const leg = new THREE.Group(); leg.name = name + '-hip'; leg.position.set(side * 0.24, -0.12, 0); hips.add(leg);
    kit.box([0.35, 0.56, 0.41], '#344655', [0, -0.24, 0], leg);
    const knee = new THREE.Group(); knee.name = name + '-knee'; knee.position.y = -0.5; leg.add(knee);
    kit.box([0.33, 0.55, 0.39], '#344655', [0, -0.25, 0], knee);
    kit.box([0.38, 0.22, 0.63], '#dddccf', [0, -0.61, 0.1], knee);
    arms.push(arm); elbows.push(elbow); legs.push(leg); knees.push(knee);
  }
  let gait = 0;
  return {
    avatar,
    update(person, dt) {
      const speed = person.health > 0 ? person.speed || 0 : 0; gait += speed * dt * 3;
      avatar.position.set(person.x, 0.15, person.z); avatar.rotation.y = person.heading || 0;
      const fall = person.fall || 0; hips.rotation.x = fall; hips.position.y = 1.35 - Math.sin(fall) * 1.05;
      hips.rotation.z = (person.flinch || 0) * Math.sin((person.flinch || 0) * 30) * 0.5;
      const swing = Math.min(0.7, speed * 0.14), dead = person.health <= 0;
      for (let i = 0; i < 2; i++) {
        legs[i].rotation.x = Math.sin(gait + i * Math.PI) * swing;
        knees[i].rotation.x = dead ? 0.35 : Math.max(0, Math.sin(gait + i * Math.PI)) * swing;
        arms[i].rotation.x = armed && !dead ? -1.25 + (person.fireTime || 0) * 0.5 : -Math.sin(gait + i * Math.PI) * swing;
        arms[i].rotation.z = (i ? 1 : -1) * (dead ? 0.55 : 0.08);
        elbows[i].rotation.x = armed && !dead ? -0.25 : dead ? -0.6 : -swing * 0.3;
      }
    },
  };
}
