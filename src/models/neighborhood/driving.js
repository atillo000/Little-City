import { isDriveable } from './world.js';

export const SPAWN = { x: 2, z: 12, heading: -Math.PI / 2, speed: 0 };

// Time-based movement keeps handling consistent across frame rates.
export function stepCar(car, input, delta, obstacles = []) {
  const dt = Math.min(Math.max(delta, 0), 0.05);
  const throttle = Number(input.forward) - Number(input.backward);
  const steering = Number(input.left) - Number(input.right);
  let speed = car.speed + throttle * 15 * dt;
  speed *= Math.exp(-(input.brake ? 9 : throttle ? 0.7 : 2.8) * dt);
  speed = Math.max(-7, Math.min(15, speed));
  const heading = car.heading + steering * 1.8 * dt * Math.min(Math.abs(speed) / 2, 1) * Math.sign(speed);
  const x = car.x + Math.sin(heading) * speed * dt;
  const z = car.z + Math.cos(heading) * speed * dt;
  const onStreet = isDriveable(x, z);
  const blocked = obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.radius + 0.65);
  return { x: onStreet && !blocked ? x : car.x, z: onStreet && !blocked ? z : car.z, heading, speed: onStreet && !blocked ? speed : -speed * 0.18 };
}
