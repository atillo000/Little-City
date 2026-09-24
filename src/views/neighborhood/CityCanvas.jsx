import { useNeighborhoodScene } from '../../hooks/useNeighborhoodScene.js';
export default function CityCanvas(props) {
  const hostRef = useNeighborhoodScene(props);
  return <div className="city-canvas" ref={hostRef} />;
}
