import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCharacter } from './character';
import { createCar } from './car';
import { createStreetNpc } from './streetNpc';
import { ROADS, actor, objectivePoint, stepWorld } from './worldAdventure';

export function mountAdventure(host, session, input, paused, onUpdate, onError) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', 'Open world game. WASD to move, F to enter your car, J to attack, E to interact.'); host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(55, 1, 0.2, 1500);
  const orbit = new OrbitControls(camera, renderer.domElement); orbit.enablePan = false; orbit.enableDamping = true; orbit.minDistance = 12; orbit.maxDistance = 160; orbit.maxPolarAngle = Math.PI / 2.25;
  const hemisphere = new THREE.HemisphereLight('#fff2df', '#54647f', 2.4); scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#ffd7b0', 3); sun.position.set(-90, 160, 100); scene.add(sun);
  let root, avatar, playerCar, marker, targetRing, dynamic, traffic = [], patrols = [], pedestrians = [], lastTime = 0, uiTime = 0, lastCity, shotLines = [], night = false;
  const enemies = new Map(), geometries = new Set(), materials = new Map(), textures = new Set();
  const unitBox = new THREE.BoxGeometry(1, 1, 1); geometries.add(unitBox);
  function material(color) { if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.7 })); return materials.get(color); }
  const kit = {
    box(size, color, position, parent = root) { const mesh = new THREE.Mesh(unitBox, material(color)); mesh.scale.set(...size); mesh.position.set(...position); parent.add(mesh); return mesh; },
    cylinder(top, bottom, height, color, position, parent = root, sides = 8) { const geometry = new THREE.CylinderGeometry(top, bottom, height, sides); geometries.add(geometry); const mesh = new THREE.Mesh(geometry, material(color)); mesh.position.set(...position); parent.add(mesh); return mesh; },
  };
  const glow = { glow() {}, light() {} };
  function disposeCity() {
    if (root) { root.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); scene.remove(root); }
    geometries.forEach(g => { if (g !== unitBox) { g.dispose(); geometries.delete(g); } });
    textures.forEach(t => t.dispose()); textures.clear();
    for (const [key, mat] of materials) if (key.startsWith('label-')) { mat.dispose(); materials.delete(key); }
    enemies.clear(); traffic = []; patrols = []; pedestrians = [];
    shotLines.forEach(l => { scene.remove(l); l.geometry.dispose(); l.material.dispose(); }); shotLines = [];
  }
  function build(city) {
    disposeCity(); lastCity = city.id; root = new THREE.Group(); scene.add(root); dynamic = new THREE.Group(); root.add(dynamic);
    scene.background = new THREE.Color(city.sky); scene.fog = new THREE.Fog(city.sky, 180, 800); night = city.id === 'tokyo'; hemisphere.intensity = night ? 1.5 : 2.4; sun.intensity = night ? 0.8 : 3;
    const batches = new Map();
    function box(size, color, position, rotation = 0) { if (!batches.has(color)) batches.set(color, []); batches.get(color).push({ size, position, rotation }); }
    box([2400, 1, 2400], '#4c91a1', [0, -3, 0]); box([910, 2, 910], city.ground, [0, -1.1, 0]); box([30, 0.3, 910], '#e5c79e', [455, -0.1, 0]);
    for (const road of ROADS) {
      box([21, 0.15, 880], '#36424c', [road, 0.05, 0]); box([880, 0.15, 21], '#36424c', [0, 0.06, road]);
      for (const side of [-1, 1]) { box([3, 0.3, 870], '#bac0b9', [road + side * 12, 0.1, 0]); box([870, 0.3, 3], '#bac0b9', [0, 0.1, road + side * 12]); }
      for (let n = -420; n <= 420; n += 16) { box([0.2, 0.03, 6], '#e8d8b0', [road, 0.15, n]); box([6, 0.03, 0.2], '#e8d8b0', [n, 0.16, road]); }
    }
    for (const b of session.current.blocks) {
      box([b.width + 3, 0.5, b.depth + 3], '#a6aca8', [b.x, 0.2, b.z]);
      box([b.width, b.height, b.depth], b.color, [b.x, b.height / 2, b.z]);
      box([b.width + 1, 0.8, b.depth + 1], '#d6d3c4', [b.x, b.height, b.z]);
      box([b.width * 0.4, 2, b.depth * 0.3], '#69797b', [b.x, b.height + 1, b.z]);
      const front = b.z + b.depth / 2 + 0.15;
      box([b.width - 5, 3.3, 0.3], '#314b58', [b.x, 1.9, front]);
      box([b.width - 3, 0.35, 2.5], city.color, [b.x, 3.8, front + 0.9]);
      for (let x = -b.width / 2 + 4; x < b.width / 2; x += 5) box([0.28, b.height - 3, 0.3], b.color, [b.x + x, b.height / 2 + 1, front]);
      for (let y = 5; y < b.height - 2; y += 7) for (const side of [-1, 1]) {
        box([b.width - 4, 2.4, 0.1], night ? '#9caaca' : '#587b88', [b.x, y, b.z + side * (b.depth / 2 + 0.08)]);
        box([0.1, 2.4, b.depth - 4], '#688c98', [b.x + side * (b.width / 2 + 0.08), y, b.z]);
      }
      if (night) box([b.width, 0.6, 0.4], city.color, [b.x, 3.4, b.z + b.depth / 2 + 0.3]);
      if (city.id === 'dubai' && b.height > 70) box([1.5, 25, 1.5], '#c3ced1', [b.x, b.height + 12, b.z]);
    }
    for (let n = -400; n <= 400; n += 34) for (const x of [-410, 405]) {
      box([0.7, 10, 0.7], '#827362', [x, 5, n]);
      if (city.trees === 'palm') for (let a = 0; a < 5; a++) box([12, 0.6, 2.4], '#537e63', [x, 10, n], a * Math.PI / 5);
      else box([8, 7, 8], city.trees === 'cherry' ? '#d39eae' : '#668766', [x, 11, n]);
    }
    for (let z = -390; z < 410; z += 45) for (const x of [-15, 15]) {
      if (ROADS.some(road => Math.abs(road - z) < 17)) continue;
      box([0.6, 8, 0.6], '#8b7f68', [x, 4, z]);
      if (city.trees === 'palm') for (let a = 0; a < 4; a++) box([8, 0.4, 1.6], '#547f68', [x, 8, z], a * Math.PI / 4);
      else box([5, 5, 5], city.trees === 'cherry' ? '#dca8bd' : '#648567', [x, 8, z]);
    }
    for (const x of ROADS) for (let z = -400; z < 440; z += 90) {
      box([0.3, 8, 0.3], '#596773', [x + 14, 4, z]); box([3, 0.3, 1], '#fff0b9', [x + 13, 8, z]);
    }
    // A coastal promenade and an airport at the edge of every district.
    box([7, 0.3, 875], '#d5c7b5', [425, 0, 0]); box([21, 0.1, 220], '#53616b', [-413, 0.1, -200]);
    for (let z = -300; z < -100; z += 20) box([1, 0.05, 10], '#f1ebd2', [-413, 0.2, z]);
    box([4, 3, 28], '#e0e5e3', [-413, 3, -190]); box([30, 0.6, 5], '#e0e5e3', [-413, 3, -192]);
    box([11, 0.4, 3], '#e0e5e3', [-413, 4, -202]);
    box([10, 0.1, 9], '#5ca699', [8, 0.3, 12]);
    const dummy = new THREE.Object3D();
    for (const [color, entries] of batches) {
      const mesh = new THREE.InstancedMesh(unitBox, material(color), entries.length);
      entries.forEach((e, i) => { dummy.position.set(...e.position); dummy.scale.set(...e.size); dummy.rotation.set(0, e.rotation, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }); mesh.computeBoundingSphere(); root.add(mesh);
    }
    function label(text, x, z, color) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#142634'; ctx.fillRect(0, 0, 512, 128); ctx.fillStyle = color; ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 80, 480);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
      const mat = new THREE.SpriteMaterial({ map: texture }); materials.set('label-' + text, mat); const sprite = new THREE.Sprite(mat); sprite.position.set(x, 6, z); sprite.scale.set(8, 2, 1); root.add(sprite);
    }
    label('SAFEHOUSE', 8, 12, '#86edcb'); label(city.district.toUpperCase(), 0, -32, city.color); label('AIRPORT', -413, -110, '#ffffff');
    avatar = createCharacter(root, kit, { shirt: '#e5ded5' }); avatar.avatar.visible = true;
    const hand = avatar.avatar.getObjectByName('right-hand'); const gun = kit.box([0.16, 0.22, 0.65], '#25303c', [0, -0.16, 0.23], hand); gun.name = 'pistol';
    playerCar = createCar(root, kit, glow, { color: '#67dccc', headlights: false }); playerCar.car.scale.setScalar(1.7);
    for (let i = 0; i < session.current.traffic.length; i++) {
      const model = createCar(root, kit, glow, { color: ['#dba186', '#d0c9bb', '#798bac', '#bc7d94'][i % 4], headlights: false }); model.car.scale.setScalar(1.5);
      traffic.push(model);
    }
    for (let i = 0; i < session.current.policeCars.length; i++) {
      const model = createCar(root, kit, glow, { color: '#24394e', police: true, headlights: false }); model.car.scale.setScalar(1.7);
      for (const side of [-1, 1]) { kit.box([0.03, 0.4, 1.2], '#e5eaec', [side * 0.69, 0.6, -0.1], model.car); kit.box([0.04, 0.2, 0.18], '#d7b96b', [side * 0.71, 0.6, -0.1], model.car); }
      kit.box([1.1, 0.1, 0.3], '#142937', [0, 1.55, -0.1], model.car);
      model.lights = [-1, 1].map(side => kit.box([0.43, 0.18, 0.28], side < 0 ? '#ff4966' : '#438aff', [side * 0.28, 1.68, -0.1], model.car));
      model.lights.forEach(light => { light.material.emissive.copy(light.material.color); light.material.emissiveIntensity = 2; });
      patrols.push(model);
    }
    for (let i = 0; i < session.current.pedestrians.length; i++) pedestrians.push(createStreetNpc(root, kit, { shirt: ['#e7b591', '#99b5c0', '#cc93a3'][i % 3] }));
    const markerGeo = new THREE.OctahedronGeometry(2.8); geometries.add(markerGeo); marker = new THREE.Mesh(markerGeo, material('#f8d47a')); root.add(marker);
    const ringGeo = new THREE.TorusGeometry(3.5, 0.15, 6, 24); geometries.add(ringGeo); targetRing = new THREE.Mesh(ringGeo, material('#ff727f')); targetRing.rotation.x = Math.PI / 2; root.add(targetRing);
    const p = actor(session.current); camera.position.set(p.x, 11, p.z + 24); orbit.target.set(p.x, 1.8, p.z); orbit.update();
  }
  const follow = new THREE.Vector3(), shift = new THREE.Vector3();
  function updateCar(model, body, dt) {
    model.car.position.set(body.x, Math.sin(body.impact * 9) * body.impact * 0.06, body.z);
    model.car.rotation.set(body.pitch || 0, body.heading, body.roll || 0, 'YXZ');
    model.wheels.forEach((wheel, index) => { wheel.rotation.x += body.speed * dt / 0.55; if (index % 2) wheel.rotation.y = body.steer || 0; });
    const hood = model.car.children[1]; hood.scale.y = 0.2 * (1 - body.damage * 0.003);
  }
  function resize() { camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix(); renderer.setSize(host.clientWidth, host.clientHeight); }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const lost = event => { event.preventDefault(); onError(); }; renderer.domElement.addEventListener('webglcontextlost', lost);
  renderer.setAnimationLoop(time => {
    const s = session.current;
    if (lastCity !== s.city) build(s.cityInfo);
    const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0; lastTime = time;
    const yaw = Math.atan2(orbit.target.x - camera.position.x, orbit.target.z - camera.position.z);
    if (!paused.current && !document.hidden) stepWorld(s, input.current, dt, yaw);
    const p = actor(s), point = objectivePoint(s);
    avatar.avatar.visible = !s.driving; avatar.update(s.player, paused.current ? 0 : dt); avatar.avatar.position.y = 0.2 + s.player.height; avatar.avatar.getObjectByName('pistol').visible = s.weapon === 'pistol';
    if (s.cooldown > 0) { avatar.avatar.getObjectByName('right-shoulder').rotation.x = -1.3; }
    updateCar(playerCar, s.car, paused.current ? 0 : dt);
    marker.visible = !!point; if (point) { marker.position.set(point.x, 6 + Math.sin(s.time * 2), point.z); marker.rotation.y = s.time; }
    for (const e of s.enemies) {
      if (!enemies.has(e.id)) {
        const model = createStreetNpc(dynamic, kit, { shirt: e.kind === 'police' ? '#4366af' : '#b64e6d', armed: true, police: e.kind === 'police' });
        const bar = kit.box([1.6, 0.15, 0.15], '#ff747b', [0, 3.7, 0], model.avatar); bar.name = 'health'; enemies.set(e.id, model);
      }
      const model = enemies.get(e.id); model.update(e, paused.current ? 0 : dt); model.avatar.getObjectByName('health').visible = e.health > 0; model.avatar.getObjectByName('health').scale.x = Math.max(0.01, e.health / 100 * 1.6);
    }
    for (const [id, model] of enemies) if (!s.enemies.some(e => e.id === id)) { dynamic.remove(model.avatar); enemies.delete(id); }
    const closest = s.enemies.filter(e => e.health > 0).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    targetRing.visible = !!closest; if (closest) targetRing.position.set(closest.x, 0.25, closest.z);
    shotLines.forEach(line => { root.remove(line); line.geometry.dispose(); line.material.dispose(); });
    shotLines = s.shots.map(shot => { const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(shot.x, 2.1, shot.z), new THREE.Vector3(shot.tx, 2, shot.tz)]); const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: shot.police ? '#ff7881' : '#fff4b0' })); root.add(line); return line; });
    traffic.forEach((model, i) => updateCar(model, s.traffic[i], paused.current ? 0 : dt));
    patrols.forEach((model, i) => {
      const car = s.policeCars[i]; updateCar(model, car, paused.current ? 0 : dt);
      model.lights.forEach((light, side) => { light.visible = ['responding', 'onscene'].includes(car.state) && Math.floor(s.time * 8) % 2 === side; });
    });
    pedestrians.forEach((model, i) => model.update(s.pedestrians[i], paused.current ? 0 : dt));
    follow.set(p.x, 1.8 + (s.player.height || 0) * 0.3, p.z); shift.copy(follow).sub(orbit.target); camera.position.add(shift); orbit.target.copy(follow);
    orbit.enabled = !paused.current; orbit.update();
    // Keep the camera in front of walls, including when orbiting around a corner.
    const offset = camera.position.clone().sub(orbit.target); let fraction = 1;
    for (const b of s.blocks) {
      let enter = 0, exit = 1, hit = true;
      for (const [axis, center, half] of [['x', b.x, b.width / 2 + 1], ['y', b.height / 2, b.height / 2 + 1], ['z', b.z, b.depth / 2 + 1]]) {
        const start = orbit.target[axis], direction = offset[axis];
        if (Math.abs(direction) < 0.00001) { if (start < center - half || start > center + half) { hit = false; break; } }
        else { const a = (center - half - start) / direction, c = (center + half - start) / direction; enter = Math.max(enter, Math.min(a, c)); exit = Math.min(exit, Math.max(a, c)); }
        if (enter > exit) { hit = false; break; }
      }
      if (hit && enter > 0) fraction = Math.min(fraction, Math.max(0.04, enter - 0.02));
    }
    if (fraction < 1) camera.position.copy(orbit.target).addScaledVector(offset, fraction);
    renderer.render(scene, camera);
    if (time - uiTime > 100) { onUpdate(s); uiTime = time; }
  });
  return () => { renderer.setAnimationLoop(null); observer.disconnect(); orbit.dispose(); disposeCity(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer.domElement.removeEventListener('webglcontextlost', lost); renderer.dispose(); renderer.domElement.remove(); };
}
