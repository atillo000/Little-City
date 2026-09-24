import * as THREE from 'three';

// Update the existing scene instead of recreating it when the time changes.
export function createWorldLighting(scene, renderer) {
  const hemisphere = new THREE.HemisphereLight('#f5f4df', '#657b62', 2);
  const sun = new THREE.DirectionalLight('#fff0cd', 2.7);
  sun.position.set(-50, 85, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -85, right: 85, top: 75, bottom: -75, near: 1, far: 230 });
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -0.0002;
  scene.add(hemisphere, sun);

  const colors = {
    sky: [new THREE.Color('#d3e2d9'), new THREE.Color('#101c33')],
    ambient: [new THREE.Color('#fff3d8'), new THREE.Color('#8da9d8')],
    ground: [new THREE.Color('#657b62'), new THREE.Color('#22324d')],
    sun: [new THREE.Color('#ffe2ae'), new THREE.Color('#a8c7ff')],
  };
  const glowingMaterials = [];
  const nightLights = [];
  const tintedMaterials = [];
  let blend = 0;
  const duskSky = new THREE.Color('#dba895'), duskSun = new THREE.Color('#ffac65'), overcast = new THREE.Color('#99a9b9');

  // Distant sky objects become visible when looking toward the horizon.
  const starPositions = [];
  for (let i = 0; i < 240; i++) {
    const angle = i * 2.39996;
    const height = 0.2 + (i % 37) / 47;
    const radius = Math.sqrt(1 - height * height);
    starPositions.push(Math.cos(angle) * radius * 280, height * 280, Math.sin(angle) * radius * 280);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({ color: '#e6efff', size: 0.8, transparent: true, opacity: 0, fog: false, depthWrite: false, toneMapped: false });
  scene.add(new THREE.Points(starGeometry, starMaterial));
  const moonMaterial = new THREE.MeshBasicMaterial({ color: '#fff0cd', transparent: true, opacity: 0, fog: false, toneMapped: false });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 16), moonMaterial);
  moon.position.set(-62, 87, -130);
  scene.add(moon);

  return {
    glow(mesh, color = '#ffc77a', strength = 1, useMap = false) {
      mesh.material = mesh.material.clone();
      mesh.material.emissive.set(color);
      mesh.material.emissiveIntensity = 0;
      if (useMap) mesh.material.emissiveMap = mesh.material.map;
      glowingMaterials.push({ material: mesh.material, strength });
    },
    light(light, intensity) {
      light.intensity = 0;
      nightLights.push({ light, intensity });
    },
    tint(material, morning, night) {
      tintedMaterials.push({ material, morning: new THREE.Color(morning), night: new THREE.Color(night) });
    },
    update(environment, delta, immediate = false) {
      const target = typeof environment === 'string' ? (environment === 'night' ? 1 : 0) : environment.night;
      const warmth = environment.warmth ?? 0;
      const clouds = environment.cloudCover ?? 0;
      blend = immediate ? target : THREE.MathUtils.lerp(blend, target, 1 - Math.exp(-3 * delta));
      if (Math.abs(blend - target) < 0.001) blend = target;
      scene.background.copy(colors.sky[0]).lerp(colors.sky[1], blend);
      scene.background.lerp(duskSky, warmth * (1 - blend) * 0.65).lerp(overcast, clouds * (1 - blend) * 0.35);
      scene.fog.color.copy(scene.background);
      hemisphere.color.copy(colors.ambient[0]).lerp(colors.ambient[1], blend);
      hemisphere.groundColor.copy(colors.ground[0]).lerp(colors.ground[1], blend);
      hemisphere.intensity = THREE.MathUtils.lerp(2, 0.65, blend) * (1 - clouds * 0.2);
      sun.color.copy(colors.sun[0]).lerp(colors.sun[1], blend);
      sun.color.lerp(duskSun, warmth * (1 - blend));
      sun.intensity = THREE.MathUtils.lerp(2.7, 0.65, blend) * (1 - clouds * 0.65);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(1.15, 1, blend);
      starMaterial.opacity = blend * 0.8 * (1 - clouds);
      moonMaterial.opacity = blend * (1 - clouds * 0.8);
      glowingMaterials.forEach(({ material, strength }) => { material.emissiveIntensity = blend * strength; });
      nightLights.forEach(({ light, intensity }) => { light.intensity = blend * intensity; });
      tintedMaterials.forEach(({ material, morning, night }) => { material.color.copy(morning).lerp(night, blend); });
    },
  };
}
