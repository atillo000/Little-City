import { useWorldController } from '../controllers/useWorldController.js';
import WorldView from '../views/worldTour/WorldView.jsx';
export default function WorldTour({ onNeighborhood }) { return <WorldView controller={useWorldController()} onNeighborhood={onNeighborhood} />; }
