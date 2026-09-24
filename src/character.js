import * as THREE from 'three';

export function createCharacter(scene, kit, palette = {}) {
  const { box } = kit;
  const avatar = new THREE.Group(); avatar.visible = false; scene.add(avatar);
  const body = new THREE.Group(); avatar.add(body);
  box([0.84, 0.95, 0.5], palette.shirt || '#496b92', [0, 1.77, 0], body);
  box([0.26, 0.7, 0.025], '#e6e8df', [0, 1.88, 0.263], body);
  box([0.88, 0.12, 0.53], '#334458', [0, 1.29, 0], body);
  box([0.23, 0.23, 0.24], '#bf8969', [0, 2.32, 0], body);
  const head = new THREE.Group(); head.position.y = 2.65; body.add(head);
  box([0.58, 0.62, 0.53], palette.skin || '#d6a07d', [0, 0, 0], head);
  box([0.63, 0.19, 0.59], '#46362e', [0, 0.29, -0.02], head);
  box([0.62, 0.38, 0.14], '#46362e', [0, 0.08, -0.25], head);
  box([0.32, 0.12, 0.15], '#46362e', [-0.16, 0.2, 0.22], head);
  for (const x of [-0.15, 0.15]) box([0.075, 0.08, 0.025], '#293747', [x, 0.015, 0.277], head);
  box([0.1, 0.12, 0.1], '#c6906e', [0, -0.06, 0.3], head);
  box([0.16, 0.025, 0.02], '#835641', [0, -0.2, 0.279], head);
  const arms = [], elbows = [], wrists = [], legs = [], knees = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.57, 2.13, 0); body.add(arm);
    arm.name = side === 1 ? 'right-shoulder' : 'left-shoulder';
    box([0.28, 0.42, 0.32], palette.shirt || '#496b92', [0, -0.19, 0], arm);
    const elbow = new THREE.Group(); elbow.position.y = -0.4; arm.add(elbow); elbows.push(elbow);
    box([0.25, 0.36, 0.29], palette.shirt || '#496b92', [0, -0.16, 0], elbow);
    const wrist = new THREE.Group(); wrist.position.y = -0.36; elbow.add(wrist); wrists.push(wrist);
    wrist.name = side === 1 ? 'right-hand' : 'left-hand';
    box([0.24, 0.25, 0.25], palette.skin || '#d6a07d', [0, -0.1, 0], wrist); arms.push(arm);
    const leg = new THREE.Group(); leg.position.set(side * 0.23, 1.25, 0); avatar.add(leg);
    box([0.34, 0.55, 0.4], '#344653', [0, -0.25, 0], leg);
    const knee = new THREE.Group(); knee.position.y = -0.53; leg.add(knee); knees.push(knee);
    box([0.32, 0.5, 0.37], '#344653', [0, -0.24, 0], knee);
    box([0.38, 0.23, 0.65], '#e8e2d6', [0, -0.59, 0.11], knee);
    box([0.39, 0.06, 0.67], '#8a8f90', [0, -0.7, 0.11], knee); legs.push(leg);
  }
  let gait = 0, motion = 0, wave = 0, animationTime = 0;
  return {
    avatar,
    update(player, delta) {
      animationTime += delta;
      avatar.position.set(player.x, 0.96 + player.height, player.z);
      const turn = Math.atan2(Math.sin(player.heading - avatar.rotation.y), Math.cos(player.heading - avatar.rotation.y));
      avatar.rotation.y += turn * (1 - Math.exp(-14 * delta));
      const blend = 1 - Math.exp(-16 * delta);
      motion += (Math.min(player.speed / 5, 1) - motion) * blend;
      wave += ((player.waveTime > 0 ? 1 : 0) - wave) * blend;
      gait += player.speed * delta * 3.2;
      const amplitude = motion * 0.7;
      legs[0].rotation.x = Math.sin(gait) * amplitude;
      legs[1].rotation.x = -Math.sin(gait) * amplitude;
      arms[0].rotation.x = -Math.sin(gait) * amplitude * 0.8;
      arms[1].rotation.x = Math.sin(gait) * amplitude * 0.8;
      arms[0].rotation.z = -0.05;
      arms[1].rotation.z = 0.05 + wave * 1.95;
      arms[1].rotation.x *= 1 - wave;
      elbows.forEach((elbow, i) => { elbow.rotation.x = -motion * 0.45; elbow.rotation.z = i === 1 ? wave * (0.65 + Math.sin(animationTime * 9) * 0.16) : 0; });
      wrists[1].rotation.z = wave * Math.sin(animationTime * 9) * 0.3;
      knees.forEach((knee, i) => { knee.rotation.x = Math.max(0, Math.sin(gait + i * Math.PI)) * motion * 0.65; });
      body.position.y = player.speed > 0.1 ? Math.abs(Math.sin(gait)) * 0.035 : Math.sin(animationTime * 2) * 0.012;
      body.rotation.x = player.speed > 3 ? 0.09 : 0;
      if (player.height > 0.03) {
        legs.forEach(leg => { leg.rotation.x = -0.35; }); knees.forEach(knee => { knee.rotation.x = 0.65; });
        arms[0].rotation.z = -0.3; if (wave < 0.1) arms[1].rotation.z = 0.3;
      }
    },
  };
}
