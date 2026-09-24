export const TRAFFIC_ROUTE = [[-49.6, -49.6], [46.4, -49.6], [46.4, 40.4], [-49.6, 40.4]];
export const BIKE_ROUTE = [[-20.6, -20.6], [15.4, -20.6], [15.4, 39.4], [-20.6, 39.4]];
export const WALK_ROUTES = [
  [[-13.5, 7], [13.5, 7], [13.5, 5.5], [-13.5, 5.5]],
  [[-12, 18], [12, 18], [12, 36], [-12, 36]],
  [[-44, -43], [-22, -43], [-22, -21], [-44, -21]],
  [[22, -44], [44, -44], [44, -21], [22, -21]],
];
export function routeLength(route) {
  return route.reduce((sum, p, i) => { const next = route[(i + 1) % route.length]; return sum + Math.hypot(next[0] - p[0], next[1] - p[1]); }, 0);
}
export function sampleRoute(route, distance) {
  const length = routeLength(route);
  if (!length) return { x: route[0][0], z: route[0][1], heading: 0 };
  let remaining = ((distance % length) + length) % length;
  for (let i = 0; i < route.length; i++) {
    const start = route[i], end = route[(i + 1) % route.length];
    const dx = end[0] - start[0], dz = end[1] - start[1], segment = Math.hypot(dx, dz);
    if (segment && remaining <= segment) return { x: start[0] + dx * remaining / segment, z: start[1] + dz * remaining / segment, heading: Math.atan2(dx, dz) };
    remaining -= segment;
  }
  return { x: route[0][0], z: route[0][1], heading: 0 };
}
export function shouldYield(position, other, distance = 5) {
  const dx = other.x - position.x, dz = other.z - position.z;
  const forward = dx * Math.sin(position.heading) + dz * Math.cos(position.heading);
  const side = dx * Math.cos(position.heading) - dz * Math.sin(position.heading);
  return forward > 0 && forward < distance && Math.abs(side) < 2.2;
}
export const MAYA = { id: 'npc:maya', name: 'Maya · Dispatcher', number: 'HI', color: '#d8b982', parking: [5, 8.5], office: [9, -9] };
