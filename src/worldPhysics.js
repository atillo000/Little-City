// Small, deterministic planar physics solver. All movement uses bounded substeps.
export const ROAD_GRID = [-360, -240, -120, 0, 120, 240, 360];
export const length = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function vehicle(id, x, z, heading = 0, kind = 'traffic') {
  return { id, kind, x, z, heading, speed: 0, vx: 0, vz: 0, radius: 2.3, mass: kind === 'police' ? 1600 : 1250, steer: 0, roll: 0, pitch: 0, impact: 0, damage: 0, hitCooldown: 0, route: [], waypoint: 0 };
}
export function fits(x, z, blocks, radius = 1) {
  return Math.abs(x) < 440 - radius && Math.abs(z) < 440 - radius && !blocks.some(b => Math.abs(x - b.x) < b.width / 2 + radius && Math.abs(z - b.z) < b.depth / 2 + radius);
}
export function moveBody(body, dt, blocks, radius = body.radius || 0.8) {
  body.vx ||= 0; body.vz ||= 0;
  let impact = 0;
  for (const axis of ['x', 'z']) {
    const v = axis === 'x' ? 'vx' : 'vz', other = axis === 'x' ? 'z' : 'x';
    const size = axis === 'x' ? 'width' : 'depth', otherSize = axis === 'x' ? 'depth' : 'width';
    const start = body[axis], next = start + body[v] * dt;
    let end = clamp(next, -440 + radius + 0.001, 440 - radius - 0.001);
    for (const b of blocks) {
      if (Math.abs(body[other] - b[other]) >= b[otherSize] / 2 + radius) continue;
      const min = b[axis] - b[size] / 2 - radius, max = b[axis] + b[size] / 2 + radius;
      if (start <= min && end > min) end = min - 0.001;
      else if (start >= max && end < max) end = max + 0.001;
    }
    body[axis] = end;
    if (Math.abs(end - next) > 0.00001) { impact = Math.max(impact, Math.abs(body[v])); body[v] *= -0.08; }
  }
  return impact;
}
export function collideVehicles(a, b, blocks) {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), overlap = a.radius + b.radius - d;
  if (overlap <= 0) return 0;
  const nx = d > 0.0001 ? dx / d : 1, nz = d > 0.0001 ? dz / d : 0;
  const ia = 1 / a.mass, ib = 1 / b.mass, total = ia + ib;
  // Small contact corrections never relocate a vehicle to a route or spawn point.
  const correction = Math.min(0.3, Math.max(0, overlap - 0.01) * 0.65);
  for (const [body, sign, weight] of [[a, -1, ia / total], [b, 1, ib / total]]) {
    const x = body.x + nx * correction * sign * weight, z = body.z + nz * correction * sign * weight;
    if (fits(x, z, blocks, body.radius)) { body.x = x; body.z = z; }
  }
  const closing = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (closing >= 0) return 0;
  const impulse = -(1.12 * closing) / total;
  a.vx -= impulse * ia * nx; a.vz -= impulse * ia * nz;
  b.vx += impulse * ib * nx; b.vz += impulse * ib * nz;
  a.impact = b.impact = Math.min(1, -closing / 25);
  return -closing;
}
export function driveVehicle(car, input, dt) {
  const forward = Number(!!input.forward) - Number(!!input.backward), steer = Number(!!input.left) - Number(!!input.right);
  const sx = Math.sin(car.heading), sz = Math.cos(car.heading);
  const longitudinal = car.vx * sx + car.vz * sz;
  car.steer += (steer * 0.48 - car.steer) * (1 - Math.exp(-9 * dt));
  const yaw = Math.tan(car.steer) * longitudinal / 3.5;
  car.heading += clamp(yaw, -1.8, 1.8) * dt;
  car.vx += sx * forward * 23 * dt; car.vz += sz * forward * 23 * dt;
  const side = car.vx * sz - car.vz * sx, grip = 1 - Math.exp(-(input.brake ? 3 : 7) * dt);
  car.vx -= side * sz * grip; car.vz += side * sx * grip;
  const damping = Math.exp(-(input.brake ? 7 : forward ? 0.36 : 0.8) * dt);
  car.vx *= damping; car.vz *= damping;
  const speed = Math.hypot(car.vx, car.vz), limit = longitudinal < 0 ? 18 : 55;
  if (speed > limit) { car.vx *= limit / speed; car.vz *= limit / speed; }
  car.roll += (clamp(-yaw * Math.abs(longitudinal) * 0.0015, -0.12, 0.12) - car.roll) * (1 - Math.exp(-8 * dt));
  car.pitch += ((input.brake ? Math.abs(longitudinal) * 0.002 : -forward * 0.035) - car.pitch) * (1 - Math.exp(-8 * dt));
}
const nearest = value => ROAD_GRID.reduce((best, n) => Math.abs(value - n) < Math.abs(value - best) ? n : best, 0);
function roadAnchor(point) {
  const x = nearest(point.x), z = nearest(point.z);
  return { node: { x, z }, projection: Math.abs(point.x - x) < Math.abs(point.z - z) ? { x, z: point.z } : { x: point.x, z } };
}
export function roadRoute(from, to) {
  const a = roadAnchor(from), b = roadAnchor(to);
  const sameVertical = a.projection.x === b.projection.x && ROAD_GRID.includes(a.projection.x);
  const sameHorizontal = a.projection.z === b.projection.z && ROAD_GRID.includes(a.projection.z);
  const points = sameVertical || sameHorizontal ? [a.projection, b.projection] : [a.projection, a.node, { x: b.node.x, z: a.node.z }, b.node, b.projection];
  return points.filter((point, index) => length(point, index ? points[index - 1] : from) > 1);
}
export function createTraffic() {
  return Array.from({ length: 14 }, (_, i) => {
    const col = i % 6, row = Math.floor(i / 6) * 2, x = ROAD_GRID[col] + 4, z = ROAD_GRID[row] - 4;
    const route = [{ x, z }, { x, z: z + 120 }, { x: x + 120, z: z + 120 }, { x: x + 120, z }];
    const start = i % 4, car = vehicle('traffic-' + i, route[start].x, route[start].z);
    car.route = route; car.waypoint = (start + 1) % 4; car.loop = true;
    car.heading = Math.atan2(route[car.waypoint].x - car.x, route[car.waypoint].z - car.z);
    return car;
  });
}
export function createPatrols() {
  return [[0, -240], [240, 0], [-240, 120]].map(([x, z], i) => ({ ...vehicle('patrol-' + i, x, z, 0, 'police'), state: 'patrol', base: { x, z }, route: [{ x, z: z + 120 }, { x: x + 120, z: z + 120 }, { x: x + 120, z }, { x, z }], loop: true, replan: 0, deployed: false }));
}
export function steerVehicle(car, cars, pedestrian, dt, desiredSpeed = 13) {
  let target = car.route[car.waypoint];
  if (target && length(car, target) < 3.5) { car.waypoint++; if (car.loop) car.waypoint %= car.route.length; target = car.route[car.waypoint]; }
  let speed = target ? desiredSpeed : 0;
  let desiredHeading = target ? Math.atan2(target.x - car.x, target.z - car.z) : car.heading;
  const turn = angleDelta(desiredHeading, car.heading);
  speed *= Math.max(0.15, 1 - Math.abs(turn) / Math.PI);
  if (target && !car.loop && car.waypoint === car.route.length - 1) speed = Math.min(speed, Math.sqrt(8 * length(car, target)));
  const stopping = 7 + Math.hypot(car.vx, car.vz) ** 2 / 12;
  const hazards = pedestrian ? [...cars, pedestrian] : cars;
  for (const other of hazards) {
    if (other === car) continue;
    const dx = other.x - car.x, dz = other.z - car.z, ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading), across = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
    if (ahead > 0 && ahead < stopping && across < car.radius + (other.radius || 0.8)) speed = Math.min(speed, Math.max(0, (ahead - 6) * 0.8));
  }
  car.heading += clamp(turn, -2.2 * dt, 2.2 * dt);
  // Acceleration limited steering preserves impact velocity instead of resetting it.
  const desiredX = Math.sin(desiredHeading) * speed, desiredZ = Math.cos(desiredHeading) * speed;
  const dx = desiredX - car.vx, dz = desiredZ - car.vz, change = Math.hypot(dx, dz), rate = speed < Math.hypot(car.vx, car.vz) ? 13 : 7;
  const blend = change ? Math.min(1, rate * dt / change) : 0;
  car.vx += dx * blend; car.vz += dz * blend; car.steer = clamp(turn, -0.45, 0.45);
  car.roll += (clamp(-turn * speed * 0.004, -0.1, 0.1) - car.roll) * Math.min(1, 8 * dt);
}
export function pushCharacter(person, dx, dz, strength) {
  const d = Math.hypot(dx, dz) || 1;
  person.kickX = (person.kickX || 0) + dx / d * strength; person.kickZ = (person.kickZ || 0) + dz / d * strength;
  person.flinch = 0.35;
}
export function stepCharacterBody(person, dx, dz, dt, blocks) {
  const blend = 1 - Math.exp(-12 * dt);
  person.moveX = (person.moveX || 0) + (dx - (person.moveX || 0)) * blend;
  person.moveZ = (person.moveZ || 0) + (dz - (person.moveZ || 0)) * blend;
  person.vx = person.moveX + (person.kickX || 0); person.vz = person.moveZ + (person.kickZ || 0);
  moveBody(person, dt, blocks, 1);
  person.kickX = (person.kickX || 0) * Math.exp(-5 * dt); person.kickZ = (person.kickZ || 0) * Math.exp(-5 * dt);
  person.flinch = Math.max(0, (person.flinch || 0) - dt); person.speed = Math.hypot(person.moveX, person.moveZ);
  if (person.health <= 0) { person.fallVelocity = (person.fallVelocity || 0) + 7 * dt; person.fall = Math.min(Math.PI / 2, (person.fall || 0) + person.fallVelocity * dt); }
}
