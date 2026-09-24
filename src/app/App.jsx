import { lazy, Suspense, useState } from 'react';
const WorldTour = lazy(() => import('./WorldTour.jsx'));
const Neighborhood = lazy(() => import('./Neighborhood.jsx'));
export default function App() {
  const [neighborhood, setNeighborhood] = useState(false);
  return <Suspense fallback={<div className="mode-loading">Loading Little City…</div>}>
    {neighborhood ? <><Neighborhood /><button className="return-world" onClick={() => setNeighborhood(false)}>↗ World tour</button></> : <WorldTour onNeighborhood={() => setNeighborhood(true)} />}
  </Suspense>;
}
