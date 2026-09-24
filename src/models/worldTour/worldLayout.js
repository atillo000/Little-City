import { ROAD_GRID as ROADS } from './worldPhysics.js';

// Street furniture shared by the renderer (visuals) and the physics world (colliders), so both always agree.
export function sceneryLayout() {
  const posts = [], trees = [];
  for (const x of ROADS) for (let z = -400; z < 440; z += 90) posts.push({ id: `post:${x}:${z}`, x: x + 14, z });
  for (let n = -400; n <= 400; n += 34) for (const x of [-410, 405]) trees.push({ x, z: n, radius: 0.35, height: 10, edge: true });
  for (let z = -390; z < 410; z += 45) for (const x of [-15, 15]) {
    if (ROADS.some(road => Math.abs(road - z) < 17)) continue;
    trees.push({ x, z, radius: 0.3, height: 8, edge: false });
  }
  return { posts, trees };
}
