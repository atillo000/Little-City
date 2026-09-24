import * as THREE from 'three';

export function createLounge(scene, kit, lighting) {
  const { box, cylinder, sign } = kit;
  const exterior = new THREE.Group(), interior = new THREE.Group(); scene.add(exterior, interior);
  exterior.userData.stopId = 'lounge';
  box([22, 0.3, 20], '#e1d5c7', [0, 0.8, -34], interior);
  for (let z = -42; z <= -26; z += 1.2) box([20, 0.02, 0.025], '#bb9f85', [0, 0.96, z], interior);
  const cameraObstacles = [
    box([20, 6.5, 0.3], '#ad9196', [0, 4.2, -43], interior),
    box([0.3, 6.5, 18], '#c9b3a9', [-10, 4.2, -34], interior),
    box([0.3, 6.5, 18], '#c9b3a9', [10, 4.2, -34], interior),
  ];
  box([21, 0.55, 19], '#555a69', [0, 7.65, -34], exterior);
  box([20, 1.6, 0.5], '#645568', [0, 6.6, -24.85], exterior);
  for (const x of [-9.6, -3.2, 3.2, 9.6]) box([0.3, 5.7, 0.3], '#6e626e', [x, 3.8, -25], exterior);
  const glass = new THREE.MeshStandardMaterial({ color: '#bcacc7', transparent: true, opacity: 0.2, roughness: 0.15, depthWrite: false });
  for (const x of [-6.4, 6.4]) { const pane = new THREE.Mesh(new THREE.BoxGeometry(6, 4.8, 0.08), glass); pane.position.set(x, 3.5, -25); exterior.add(pane); }
  sign('STUDIO LOUNGE', 'SLOW DOWN. PRESS PLAY. STAY A WHILE.', 18, 1.4, [0, 6.6, -24.56], exterior, '#645568', '#ffead3');
  sign('LISTENING ROOM', 'PARK HERE TO ENTER', 4.2, 1, [0, 2.9, -24.8], exterior, '#efdfc6', '#61576b');
  box([11, 0.025, 12], '#9d818d', [0, 0.975, -34], interior);
  for (const x of [-6.5, 6.5]) {
    box([3.2, 0.7, 6], '#6d7c83', [x, 1.6, -34], interior);
    box([0.45, 1.4, 6], '#63737a', [x + Math.sign(x) * 1.4, 2.25, -34], interior);
    for (const z of [-36.8, -31.2]) box([3.2, 1.1, 0.4], '#63737a', [x, 2, z], interior);
    for (const z of [-35.7, -34, -32.3]) box([2.7, 0.25, 1.5], '#83959a', [x - Math.sign(x) * 0.1, 2.08, z], interior);
    box([0.7, 0.7, 1.1], '#d1a076', [x + Math.sign(x) * 0.85, 2.5, -35.5], interior).rotation.z = Math.sign(x) * 0.25;
  }
  box([3, 0.2, 2], '#bd936e', [0, 1.6, -33.5], interior);
  for (const x of [-1.1, 1.1]) box([0.13, 0.6, 1.6], '#655e58', [x, 1.25, -33.5], interior);
  box([0.8, 0.09, 1], '#e4cbb4', [-0.6, 1.77, -33.5], interior);
  cylinder(0.18, 0.14, 0.32, '#ece4d1', [0.5, 1.92, -33.4], interior);
  const booth = new THREE.Group(); booth.userData.stopId = 'jukebox'; interior.add(booth);
  box([5, 1.5, 1.5], '#775a51', [0, 1.73, -41], booth);
  box([5.3, 0.18, 1.8], '#e1bd95', [0, 2.57, -41], booth);
  for (const x of [-1.5, 1.5]) {
    const deck = cylinder(0.62, 0.62, 0.09, '#343741', [x, 2.73, -41], booth, 24);
    cylinder(0.19, 0.19, 0.1, '#d6a57c', [x, 2.75, -41], booth, 16); deck.name = 'record';
  }
  for (let i = 0; i < 5; i++) box([0.06, 0.08, 0.6], '#5c5966', [-0.3 + i * 0.15, 2.72, -41], booth);
  for (const x of [-7.8, 7.8]) {
    box([1.5, 3.5, 1.5], '#414451', [x, 2.7, -41], interior);
    for (const y of [2, 3.5]) { const speaker = cylinder(0.49, 0.49, 0.07, '#242c34', [x, y, -40.21], interior, 20); speaker.rotation.x = Math.PI / 2; }
  }
  sign('SIDE A / TAKE IT EASY', 'POP / WORSHIP / JAZZ / YOUR MUSIC', 12, 2.2, [0, 5.15, -42.8], interior, '#645568', '#ffe3b6');
  const bars = [];
  for (let i = 0; i < 12; i++) {
    const bar = box([0.24, 1, 0.1], '#d7a477', [-2.2 + i * 0.4, 3.8, -42.65], interior);
    lighting.glow(bar, '#ffbe91', 0.7); bars.push(bar);
  }
  const lamp = new THREE.PointLight('#ffd2b0', 0, 26, 2); lamp.position.set(0, 5.8, -34); interior.add(lamp); lighting.light(lamp, 70);
  return { cameraObstacles, setRoom(mode) { exterior.visible = !['office', 'lounge'].includes(mode); interior.visible = mode === 'lounge'; },
    update(time, playing, reducedMotion) { bars.forEach((bar, i) => { bar.scale.y = playing && !reducedMotion ? 0.25 + Math.abs(Math.sin(time * 3 + i * 1.7)) * 0.85 : 0.18; }); },
  };
}
