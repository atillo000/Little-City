import * as THREE from 'three';
import { BUILDINGS, WORLD } from '../../models/neighborhood/world.js';
import { stops } from '../../models/neighborhood/content.js';

export function buildCity(scene, lighting) {
  const materials = new Map(), textures = [], obstacles = [];
  const officeExterior = new THREE.Group();
  const officeInterior = new THREE.Group();
  const city = new THREE.Group();
  scene.add(city, officeExterior, officeInterior);
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }));
    return materials.get(color);
  }
  function mesh(geometry, color, position, parent = city) {
    const item = new THREE.Mesh(geometry, material(color));
    item.position.set(...position); item.castShadow = true; item.receiveShadow = true;
    parent.add(item); return item;
  }
  const box = (size, color, position, parent) => mesh(new THREE.BoxGeometry(...size), color, position, parent);
  const cylinder = (top, bottom, height, color, position, parent, sides = 12) => mesh(new THREE.CylinderGeometry(top, bottom, height, sides), color, position, parent);
  function sign(text, subtitle, width, height, position, parent = city, color = '#eef0df', ink = '#354759') {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, 1024, 320);
    ctx.fillStyle = ink; ctx.font = 'bold 62px Arial'; ctx.fillText(text, 46, 135, 930);
    ctx.globalAlpha = 0.65; ctx.font = '28px Arial'; ctx.fillText(subtitle, 48, 221, 920);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, side: THREE.DoubleSide }));
    panel.position.set(...position); parent.add(panel); lighting.glow(panel, '#ffffff', 0.55, true);
    return panel;
  }
  function plant(x, z, scale = 1, parent = city, y = 0.8) {
    cylinder(0.55 * scale, 0.4 * scale, 0.7 * scale, '#a18d73', [x, y + 0.35 * scale, z], parent);
    cylinder(0.1 * scale, 0.14 * scale, 1.5 * scale, '#716c52', [x, y + 1.2 * scale, z], parent);
    const crown = mesh(new THREE.IcosahedronGeometry(0.95 * scale, 1), '#779577', [x, y + 2 * scale, z], parent);
    crown.scale.y = 1.2;
  }

  box([550, 0.6, 550], '#c2c8c4', [0, 0.15, 0]);
  box([140, 0.3, 140], '#d8d5cb', [0, 0.5, 0]);
  for (const x of WORLD.streetsX) box([WORLD.streetWidth, 0.035, 140], '#68747b', [x, 0.675, 0]);
  for (const z of WORLD.streetsZ) box([140, 0.04, WORLD.streetWidth], '#68747b', [0, 0.68, z]);
  for (const x of WORLD.streetsX) for (let z = -67; z < 70; z += 4) {
    if (!WORLD.streetsZ.some(street => Math.abs(street - z) < 6)) box([0.14, 0.02, 1.7], '#f0d79f', [x, 0.71, z]);
  }
  for (const z of WORLD.streetsZ) for (let x = -67; x < 70; x += 4) {
    if (!WORLD.streetsX.some(street => Math.abs(street - x) < 6)) box([1.7, 0.02, 0.14], '#f0d79f', [x, 0.72, z]);
  }
  // Crosswalks on each side of the central intersections.
  for (const x of [-18, 18]) for (const z of [-18, 12, 42]) {
    for (let stripe = -3; stripe <= 3; stripe++) {
      for (const side of [-1, 1]) {
        box([0.55, 0.02, 2.2], '#edf0dc', [x + stripe, 0.73, z + side * 5.5]);
        box([2.2, 0.02, 0.55], '#edf0dc', [x + side * 5.5, 0.73, z + stripe]);
      }
    }
  }

  function building(b) {
    const group = new THREE.Group(); city.add(group);
    group.position.set(b.x, 0.65, b.z);
    if (b.id) group.userData.stopId = b.id;
    box([b.width + 2, 0.22, b.depth + 2], '#e7e2d4', [0, 0.11, 0], group);
    box([b.width, b.height, b.depth], b.color, [0, b.height / 2 + 0.22, 0], group);
    box([b.width + 0.5, 0.5, b.depth + 0.5], '#64757a', [0, b.height + 0.4, 0], group);
    box([3.5, 1.1, 3], '#a4b0ab', [b.width / 4, b.height + 1.1, -2], group);
    const columns = Math.floor((b.width - 2) / 3.5), floors = Math.floor((b.height - 4) / 3.4);
    for (let floor = 0; floor < floors; floor++) for (let col = 0; col < columns; col++) {
      const x = (col - (columns - 1) / 2) * 3.5, y = 5.5 + floor * 3.4;
      for (const side of [-1, 1]) {
        const pane = box([2.1, 1.65, 0.055], '#658189', [x, y, side * (b.depth / 2 + 0.035)], group);
        if ((floor + col) % 3 !== 1) lighting.glow(pane, '#fbd699', 0.7);
      }
    }
    for (const side of [-1, 1]) for (let row = 0; row < 3; row++) {
      const pane = box([0.06, b.height - 5, 2.4], '#6d8990', [side * (b.width / 2 + 0.035), b.height / 2 + 1.9, (row - 1) * 4.5], group);
      lighting.glow(pane, '#ccdfd6', 0.18);
    }
    const streetSide = b.z > 0 ? -1 : 1;
    box([4, 3.1, 0.09], '#405e65', [0, 1.8, streetSide * (b.depth / 2 + 0.07)], group);
    if (b.label) {
      const label = sign(b.label, 'LITTLE CITY / ' + stops.find(s => s.id === b.id).number, b.width - 2, 2.7, [0, 3.4, streetSide * (b.depth / 2 + 0.14)], group, '#f2ecd9');
      if (streetSide === -1) label.rotation.y = Math.PI;
      box([b.width - 1, 0.2, 2.2], '#556f74', [0, 4.95, streetSide * (b.depth / 2 + 0.7)], group);
    }
  }
  BUILDINGS.filter(b => !['office', 'lounge'].includes(b.id)).forEach(building);

  // The office has a removable roof and front wall for the interior view.
  box([27, 0.3, 20], '#eee6d7', [0, 0.8, -5], officeInterior);
  for (let x = -12; x <= 12; x += 2) box([0.025, 0.01, 18], '#cbbda4', [x, 0.958, -5], officeInterior);
  const cameraObstacles = [
    box([25, 7, 0.35], '#d2d8ce', [0, 4.45, -14], officeInterior),
    box([0.35, 7, 18], '#b6c4c3', [-12.5, 4.45, -5], officeInterior),
  ];
  box([0.35, 8.5, 18], '#b7c6c8', [12.5, 5.2, -5], officeExterior);
  box([26, 0.65, 19], '#63757e', [0, 9.55, -5], officeExterior);
  box([22, 0.08, 14], '#92aaa0', [0, 9.91, -5], officeExterior);
  for (const x of [-10.8, -3.5, 3.5, 10.8]) box([0.32, 8.3, 0.4], '#486272', [x, 5, 4], officeExterior);
  const glassMaterial = new THREE.MeshStandardMaterial({ color: '#94bec6', transparent: true, opacity: 0.26, roughness: 0.1, metalness: 0.1, depthWrite: false });
  for (const x of [-7.2, 7.2]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(6.8, 5.8, 0.12), glassMaterial);
    pane.position.set(x, 4.6, 4.1); officeExterior.add(pane);
  }
  box([25.3, 2.1, 0.5], '#486272', [0, 8, 4.25], officeExterior);
  sign('COMMUNITY HUB', 'DISPATCH · LOST & FOUND · NEIGHBORS WELCOME', 21.7, 1.8, [0, 8, 4.53], officeExterior, '#486272', '#f9f2dd');
  sign('COMMUNITY HUB', 'PARK OUTSIDE TO ENTER', 5.5, 1.35, [0, 2.8, 4.4], officeExterior, '#e9d4aa');
  officeExterior.userData.stopId = 'office';
  // Furnishings are clickable hub stations.
  function station(id) { const group = new THREE.Group(); group.userData.stopId = id; officeInterior.add(group); return group; }
  const reception = station('dispatch');
  box([6.6, 1.6, 2.1], '#b99472', [-7, 1.76, 0.2], reception);
  box([7, 0.18, 2.5], '#ebddc5', [-7, 2.65, 0.2], reception);
  sign('LOST & FOUND', 'HELP A NEIGHBOR FIND THEIR WAY', 5.8, 1.1, [-7, 1.95, 1.28], reception);
  const skills = station('radio');
  box([7, 0.22, 3.1], '#d6b68c', [-6.5, 2.55, -8.1], skills);
  for (const x of [-9.2, -3.8]) box([0.2, 1.55, 2.5], '#617377', [x, 1.73, -8.1], skills);
  for (const x of [-8.1, -5]) {
    box([0.18, 0.65, 0.2], '#344c59', [x, 3, -8.5], skills);
    box([2.8, 1.75, 0.17], '#344c59', [x, 3.8, -8.5], skills);
    sign('NEIGHBORHOOD DISPATCH', 'Cafe   Market   Library', 2.55, 1.48, [x, 3.8, -8.39], skills, '#273e50', '#b2e6cc');
    box([1.9, 0.07, 0.7], '#59747b', [x, 2.7, -7.5], skills);
  }
  sign('DISPATCH RADIO', 'KEEP THE NEIGHBORHOOD CONNECTED', 5.2, 1.2, [-6.5, 5.7, -13.78], skills, '#d1dfc9');
  const projects = station('planning');
  const rug = box([10, 0.03, 7], '#b5c4c5', [5.4, 0.97, -2.6], projects);
  rug.castShadow = false;
  box([7.5, 0.23, 3.4], '#d8bc95', [5.4, 2.5, -2.6], projects);
  for (const x of [2.5, 8.3]) box([0.25, 1.4, 2.6], '#526a75', [x, 1.7, -2.6], projects);
  for (const x of [3.3, 7.5]) {
    box([1.8, 0.08, 1.2], '#647c8a', [x, 2.68, -2.4], projects);
    const laptop = box([1.8, 1.15, 0.08], '#536c7d', [x, 3.22, -3], projects);
    lighting.glow(laptop, '#b7dbe8', 0.3);
  }
  sign('ROUTE TABLE', 'PLAN YOUR NEXT DELIVERY', 5.7, 1.3, [5.4, 1.8, -0.87], projects, '#efd1b8');
  const experience = station('notice');
  sign('COMMUNITY BOARD', 'GOOD THINGS HAPPEN CLOSE TO HOME', 9.3, 2.8, [6, 5.5, -13.76], experience, '#c7bad4');
  for (let i = 0; i < 3; i++) {
    box([2.1, 1.4, 0.12], '#f0e8d8', [2.5 + i * 3, 2.8, -13.7], experience);
    sign(['STORY TIME', 'MARKET', 'PARK WALK'][i], ['LIBRARY', 'EVENINGS', 'ALL DAY'][i], 1.9, 1.2, [2.5 + i * 3, 2.8, -13.62], experience);
  }
  function chair(x, z, rotation = 0) {
    const group = new THREE.Group(); group.position.set(x, 0.95, z); group.rotation.y = rotation; officeInterior.add(group);
    box([1.5, 0.2, 1.5], '#68858b', [0, 0.75, 0], group);
    box([1.5, 1.3, 0.17], '#68858b', [0, 1.5, 0.65], group);
    cylinder(0.09, 0.13, 0.7, '#516873', [0, 0.35, 0], group);
    box([1.5, 0.1, 0.2], '#516873', [0, 0.1, 0], group);
  }
  chair(-8, -5.6); chair(-4.8, -5.6); chair(3.2, 0.2); chair(7.4, 0.2); chair(3.2, -5.4, Math.PI); chair(7.4, -5.4, Math.PI);
  plant(-10.8, -11.8, 1.2, officeInterior, 0.95); plant(10.5, 1.5, 1.15, officeInterior, 0.95); plant(-10.7, 2.1, 0.8, officeInterior, 0.95);
  // A personal corner, with shelving and a small studio nameplate.
  for (const y of [1.1, 2.3, 3.5]) box([1.2, 0.15, 5.5], '#a78869', [-11.6, y, -5.5], officeInterior);
  for (const z of [-8.2, -2.8]) box([1.2, 2.55, 0.15], '#a78869', [-11.6, 2.3, z], officeInterior);
  for (let i = 0; i < 9; i++) box([0.8, 0.55 + i % 3 * 0.12, 0.26], ['#94a99b', '#a395b5', '#c4a07c'][i % 3], [-11.6, 2.7, -7.8 + i * 0.45], officeInterior);
  const studioName = sign('LITTLE CITY', 'A PLACE TO CALL HOME', 5.5, 1.7, [-12.29, 5.2, -5], officeInterior, '#b6c4c3', '#486273');
  studioName.rotation.y = Math.PI / 2;
  const roomLight = new THREE.PointLight('#ffe2b2', 0, 32, 2); roomLight.position.set(0, 7, -5); scene.add(roomLight); lighting.light(roomLight, 95);

  // A pocket park softens the block across from the studio.
  box([23, 0.18, 20], '#a2b58c', [0, 0.77, 27]);
  box([4, 0.04, 20], '#e4dac2', [0, 0.88, 27]);
  box([23, 0.04, 3.2], '#e4dac2', [0, 0.89, 27]);
  cylinder(3.4, 3.6, 0.6, '#a3aeb0', [0, 1.18, 27], city, 32);
  const fountain = cylinder(3.12, 3.12, 0.08, '#6aaeb7', [0, 1.51, 27], city, 32);
  lighting.tint(fountain.material, '#6aaeb7', '#365772');
  cylinder(0.45, 0.8, 1.5, '#c2c9bd', [0, 2.23, 27]);
  obstacles.push({ x: 0, z: 27, radius: 3.6 });
  for (const x of [-8.2, 8.2]) for (const z of [20, 33.5]) { plant(x, z, 1.8); obstacles.push({ x, z, radius: 0.8 }); }
  for (const x of [-7, 7]) { box([3.5, 0.17, 1], '#ad8a66', [x, 1.5, 27]); box([3.5, 0.95, 0.17], '#ad8a66', [x, 1.95, 27.5]); obstacles.push({ x, z: 27, radius: 1.4 }); }

  // Street lamps, small planters, and destination parking markers.
  for (const stop of stops) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.52, 40), new THREE.MeshBasicMaterial({ color: stop.color, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(stop.parking[0], 0.735, stop.parking[1]); city.add(ring);
  }
  for (const x of [-23.5, 23.5]) for (const z of [-12, 6, 37]) {
    cylinder(0.09, 0.16, 6, '#435b65', [x, 3.7, z]);
    box([1.8, 0.12, 0.15], '#435b65', [x - Math.sign(x) * 0.7, 6.7, z]);
    const lamp = box([0.65, 0.12, 0.5], '#f3dfb5', [x - Math.sign(x) * 1.4, 6.6, z]);
    lighting.glow(lamp, '#ffe0a6', 2.8);
    if (z !== 37) { const light = new THREE.PointLight('#ffdb9e', 0, 22, 2); light.position.set(x, 6, z); city.add(light); lighting.light(light, 110); }
    obstacles.push({ x, z, radius: 0.2 });
  }
  for (const x of [-10, 10]) { plant(x, 6, 1.1); obstacles.push({ x, z: 6, radius: 0.6 }); }
  // Distant skyline, kept outside the playable neighborhood.
  for (let i = 0; i < 18; i++) {
    const height = 17 + (i * 13 % 39);
    box([12 + i % 3 * 5, height, 15], ['#a6b9c1', '#b4c0c0', '#c0c5be'][i % 3], [-140 + i * 17, height / 2, -103 - i % 3 * 12]);
  }
  return {
    box, cylinder, sign, materials, textures, obstacles, cameraObstacles,
    setRoom(mode) { const inside = ['office', 'lounge'].includes(mode); city.visible = !inside; officeExterior.visible = !inside; officeInterior.visible = mode !== 'lounge'; },
    update(time, reducedMotion) { if (!reducedMotion) fountain.scale.y = 1 + Math.sin(time * 1.3) * 0.1; },
  };
}
