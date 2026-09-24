import { length, roadRoute, fits } from './worldPhysics.js';

export function updatePolice(s, player, dt, clearSight) {
  const cars = s.policeCars;
  if (s.heat > 0) {
    if (!s.incident) { s.incident = true; s.dispatchDelay = 3; s.unseen = 0; }
    s.dispatchDelay -= dt;
    const observed = cars.some(c => c.state === 'responding' && length(c, player) < 55 && clearSight(c, player, s.blocks)) || s.enemies.some(e => e.kind === 'police' && e.health > 0 && length(e, player) < 45 && clearSight(e, player, s.blocks));
    s.unseen = observed ? 0 : (s.unseen || 0) + dt;
    if (s.quiet > 12 && s.unseen > 8) s.heat = Math.max(0, s.heat - dt * 0.14);
    const active = cars.filter(c => ['responding', 'onscene'].includes(c.state));
    if (s.heat > 0 && s.dispatchDelay <= 0 && active.length < Math.ceil(s.heat)) {
      const unit = cars.filter(c => c.state === 'patrol').sort((a, b) => length(a, player) - length(b, player))[0];
      if (unit) {
        unit.state = 'responding'; unit.loop = false; unit.route = roadRoute(unit, player); unit.waypoint = 0; unit.replan = 3;
        s.message = 'Police dispatched. A patrol car is responding by road.'; s.messageTime = 5;
      }
      s.dispatchDelay = 5;
    }
  }
  if (!s.heat && s.incident) { s.incident = false; s.message = 'You lost the police. Patrols are standing down.'; s.messageTime = 5; }
  for (const car of cars) {
    car.replan -= dt;
    if (!s.heat && ['responding', 'onscene'].includes(car.state)) {
      car.state = 'returning'; car.route = []; car.waypoint = 0; car.loop = false;
    }
    if (car.state === 'responding') {
      const d = length(car, player), visible = clearSight(car, player, s.blocks);
      if (d < 30 && visible && (!s.driving || Math.abs(player.speed) < 4)) {
        car.route = []; car.waypoint = 0;
        if (Math.hypot(car.vx, car.vz) < 1.2) {
          // Officers appear at their car doors only after the car has arrived and stopped.
          if (!car.deployed) {
            for (const side of [-1, 1]) {
              const x = car.x + Math.cos(car.heading) * side * 3.5, z = car.z - Math.sin(car.heading) * side * 3.5;
              if (fits(x, z, s.blocks, 0.8) && Math.hypot(x - player.x, z - player.z) > 7) s.enemies.push({ id: car.id + ':' + side, unit: car.id, kind: 'police', x, z, heading: car.heading, health: 100, cooldown: 2.5, speed: 0 });
            }
            car.deployed = true;
          }
          car.state = 'onscene';
        }
      } else if (car.replan <= 0) { car.route = roadRoute(car, player); car.waypoint = 0; car.replan = 3; }
    }
    if (car.state === 'returning') {
      const officers = s.enemies.filter(e => e.unit === car.id && e.health > 0);
      for (const e of officers) e.returning = true;
      s.enemies = s.enemies.filter(e => !(e.unit === car.id && e.health > 0 && length(e, car) < 4.5));
      if (!s.enemies.some(e => e.unit === car.id && e.health > 0)) {
        if (!car.route.length) { car.route = roadRoute(car, car.base); car.waypoint = 0; }
        if (length(car, car.base) < 5 && Math.hypot(car.vx, car.vz) < 2) {
          const { x, z } = car.base; car.state = 'patrol'; car.deployed = false; car.loop = true;
          car.route = [{ x, z: z + 120 }, { x: x + 120, z: z + 120 }, { x: x + 120, z }, { x, z }]; car.waypoint = 0;
        }
      }
    }
  }
}
