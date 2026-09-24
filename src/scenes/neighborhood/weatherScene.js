import * as THREE from 'three';
import { WORLD } from '../../models/neighborhood/world.js';

export function createWeatherScene(scene) {
  const atmosphere = new THREE.Group(); scene.add(atmosphere);
  const clouds = new THREE.Group(); atmosphere.add(clouds);
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: '#9facb5', roughness: 1, transparent: true, opacity: 0 });
  const puffGeometry = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 32; i++) {
    const puff = new THREE.Mesh(puffGeometry, cloudMaterial);
    puff.position.set(Math.sin(i * 2.4) * 95, 38 + i % 4 * 4, Math.cos(i * 2.4) * 90);
    puff.scale.set(8 + i % 3 * 3, 2.5, 5); clouds.add(puff);
  }
  // A fixed, evenly populated volume covers the district and its edges.
  // All drops share one draw call, independent of the car or camera position.
  const rainExtent = WORLD.halfSize + 12, rainHeight = 52;
  const rainGrid = 40, rainCount = rainGrid * rainGrid * 4;
  const rainCell = rainExtent * 2 / rainGrid;
  const fraction = value => value - Math.floor(value);
  const rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const x = -rainExtent + (i % rainGrid + fraction(Math.sin(i * 17.7 + 1) * 43758.5453)) * rainCell;
    const z = -rainExtent + (Math.floor(i / rainGrid) % rainGrid + fraction(Math.sin(i * 6.4 + 2) * 23421.631)) * rainCell;
    const y = 0.75 + fraction(i * 0.61803398875) * rainHeight;
    rainPositions.set([x, y, z, x + 0.12, y + 0.8, z], i * 6);
  }
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#b9d9ef', transparent: true, opacity: 0.5, depthWrite: false }));
  rain.frustumCulled = false; atmosphere.add(rain);
  const snowPositions = new Float32Array(240 * 3);
  for (let i = 0; i < 240; i++) snowPositions.set([Math.sin(i * 7.2) * 24, (i * 5.7) % 30 + 1, Math.cos(i * 2.4) * 24], i * 3);
  const snowGeometry = new THREE.BufferGeometry(); snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  const snow = new THREE.Points(snowGeometry, new THREE.PointsMaterial({ color: '#f3f8ff', size: 0.12, transparent: true, opacity: 0.8, depthWrite: false }));
  snow.frustumCulled = false; atmosphere.add(snow);
  return {
    update(environment, position, delta, inside, reducedMotion) {
      atmosphere.visible = !inside;
      cloudMaterial.opacity = environment.cloudCover * 0.7;
      clouds.visible = environment.cloudCover > 0.15;
      rain.visible = ['rain', 'storm'].includes(environment.weatherKind);
      snow.visible = environment.weatherKind === 'snow';
      snow.position.set(position.x, 0, position.z);
      if (inside || reducedMotion) { rain.visible = false; snow.visible = false; return; }
      clouds.rotation.y += delta * 0.003;
      if (rain.visible) {
        for (let i = 0; i < rainCount; i++) {
          const n = i * 6; rainPositions[n + 1] -= delta * 18;
          if (rainPositions[n + 1] < 0.75) rainPositions[n + 1] += rainHeight;
          rainPositions[n + 4] = rainPositions[n + 1] + 0.8;
        }
        rainGeometry.attributes.position.needsUpdate = true;
      }
      if (snow.visible) {
        for (let i = 0; i < 240; i++) { const n = i * 3; snowPositions[n + 1] -= delta * 2; if (snowPositions[n + 1] < 0.75) snowPositions[n + 1] = 30; }
        snowGeometry.attributes.position.needsUpdate = true;
      }
    },
  };
}
