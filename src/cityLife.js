import * as THREE from 'three';
import { createCharacter } from './character';
import { createCar } from './car';
import { canInteract } from './gameLocations';
import { MAYA, TRAFFIC_ROUTE, BIKE_ROUTE, WALK_ROUTES, sampleRoute, shouldYield } from './cityLifePaths';

function bicycle(parent, kit, color) {
  const group = new THREE.Group(); parent.add(group);
  const wheels = [];
  const frameMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  function bar(a, b, radius = 0.045, material = frameMaterial) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 6), material);
    mesh.position.copy(start.add(end).multiplyScalar(0.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); group.add(mesh);
  }
  for (const z of [-0.85, 0.85]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.065, 5, 14), new THREE.MeshStandardMaterial({ color: '#38464b' }));
    wheel.rotation.y = Math.PI / 2; wheel.position.set(0, 0.58, z); group.add(wheel); wheels.push(wheel);
    for (let i = 0; i < 4; i++) { const spoke = kit.box([0.015, 1, 0.015], '#b8c7c4', [0, 0, 0], wheel); spoke.rotation.z = i * Math.PI / 4; }
  }
  const rear = [0, 0.58, -0.85], front = [0, 0.58, 0.85], crank = [0, 0.6, -0.05], seat = [0, 1.35, -0.4], handle = [0, 1.4, 0.55];
  [[rear, crank], [rear, seat], [seat, crank], [seat, handle], [handle, crank], [handle, front]].forEach(([a, b]) => bar(a, b));
  kit.box([0.36, 0.12, 0.45], '#554b4c', [0, 1.47, -0.4], group);
  bar(handle, [0, 1.65, 0.58]); bar([-0.42, 1.65, 0.58], [0.42, 1.65, 0.58]);
  // Seated rider, leaning into the handlebars, with pedaling legs.
  kit.box([0.62, 0.72, 0.42], color, [0, 2.05, -0.2], group).rotation.x = 0.25;
  kit.box([0.43, 0.48, 0.43], '#c38b6e', [0, 2.64, -0.02], group);
  kit.box([0.5, 0.2, 0.51], '#eee8d2', [0, 2.9, -0.04], group);
  for (const side of [-1, 1]) bar([side * 0.3, 2.27, -0.16], [side * 0.35, 1.7, 0.58], 0.09);
  const legs = [-1, 1].map(side => {
    const leg = new THREE.Group(); leg.position.set(side * 0.2, 1.75, -0.4); group.add(leg);
    kit.box([0.2, 0.68, 0.23], '#3d4c5b', [0, -0.25, 0.2], leg).rotation.x = -0.5;
    kit.box([0.2, 0.52, 0.23], '#3d4c5b', [0, -0.65, 0.32], leg);
    kit.box([0.23, 0.13, 0.4], '#e4dac4', [0, -0.9, 0.4], leg); return leg;
  });
  return { car: group, wheels, pedal(time) { legs.forEach((leg, i) => { leg.rotation.x = Math.sin(time * 7 + i * Math.PI) * 0.3; }); } };
}

export function createCityLife(scene, kit, lighting) {
  const outdoors = new THREE.Group(), indoors = new THREE.Group(); scene.add(outdoors, indoors);
  const colors = ['#708fa3', '#c29361', '#917f9e', '#658c77', '#bc8077', '#788caa'];
  const walkers = colors.map((shirt, index) => {
    const character = createCharacter(outdoors, kit, { shirt, skin: index % 2 ? '#ad7655' : '#d6a07d' }); character.avatar.visible = true;
    character.avatar.scale.setScalar(0.8 + index % 3 * 0.04);
    return { character, route: WALK_ROUTES[index % WALK_ROUTES.length], distance: index * 17, speed: 0.8 + index % 3 * 0.17 };
  });
  const traffic = [0, 1, 2].map((index) => ({ ...createCar(outdoors, kit, lighting, { color: colors[index], headlights: false }), route: TRAFFIC_ROUTE, distance: 28 + index * 119, speed: 6.5, radius: 1.7 }));
  for (let i = 0; i < 2; i++) traffic.push({ ...bicycle(outdoors, kit, colors[i + 3]), route: BIKE_ROUTE, distance: 20 + i * 93, speed: 3.4, radius: 1 });
  for (const item of traffic) { item.position = sampleRoute(item.route, item.distance); item.car.position.set(item.position.x, 0.73, item.position.z); }
  function host(parent, location) {
    const actor = createCharacter(parent, kit, { shirt: '#a57655', skin: '#ad7655' }); actor.avatar.visible = true;
    actor.avatar.userData.stopId = MAYA.id;
    kit.box([0.65, 0.6, 0.2], '#46362e', [0, 2.45, -0.3], actor.avatar);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 32), new THREE.MeshBasicMaterial({ color: '#ebc67e' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; actor.avatar.add(ring);
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.23), new THREE.MeshBasicMaterial({ color: '#ffe1a1' })); marker.position.y = 3.75; actor.avatar.add(marker);
    actor.update({ x: location[0], z: location[1], height: 0, heading: 0, speed: 0, waveTime: 0 }, 1, 0);
    return { actor, location, marker };
  }
  const hosts = [host(outdoors, MAYA.parking), host(indoors, MAYA.office)];
  return {
    obstacles() { return traffic.map(item => ({ x: item.position.x, z: item.position.z, radius: item.radius })); },
    nearby(player, office) { return canInteract(MAYA.id, { ...player, speed: 0, mode: office ? 'office' : 'drive' }) ? MAYA.id : null; },
    update(dt, time, player, office, reducedMotion, room = 'office') {
      outdoors.visible = !office; indoors.visible = office && room !== 'lounge';
      // Respect reduced motion: the neighborhood remains populated, with ambient actors at rest.
      const delta = reducedMotion || document.hidden ? 0 : dt;
      for (const walker of walkers) {
        if (!office) walker.distance += delta * walker.speed;
        const position = sampleRoute(walker.route, walker.distance);
        walker.character.update({ ...position, height: -0.2, speed: delta ? walker.speed : 0, waveTime: 0 }, delta, time);
      }
      for (const item of traffic) {
        const blocked = !office && (shouldYield(item.position, player, 6) || traffic.some(other => other !== item && shouldYield(item.position, other.position, 4)));
        const distance = office || blocked ? 0 : delta * item.speed;
        item.distance += distance; item.position = sampleRoute(item.route, item.distance);
        item.car.position.set(item.position.x, 0.73, item.position.z); item.car.rotation.y = item.position.heading;
        item.wheels.forEach(wheel => { if (item.pedal) wheel.rotation.z += distance * 2; else wheel.rotation.x += distance * 2; }); if (distance) item.pedal?.(time);
      }
      hosts.forEach(({ actor, location, marker }, i) => {
        if (Boolean(i) !== office) return;
        const near = Math.hypot(player.x - location[0], player.z - location[1]) < 7;
        actor.update({ x: location[0], z: location[1], height: office ? 0 : -0.2, heading: near ? Math.atan2(player.x - location[0], player.z - location[1]) : 0, speed: 0, waveTime: near && delta ? 1 : 0 }, delta, reducedMotion ? 0 : time);
        marker.position.y = 3.75 + (reducedMotion ? 0 : Math.sin(time * 2) * 0.13);
      });
    },
  };
}
