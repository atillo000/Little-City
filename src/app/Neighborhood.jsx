import { useNeighborhoodController } from '../controllers/useNeighborhoodController.js';
import NeighborhoodView from '../views/neighborhood/NeighborhoodView.jsx';
export default function Neighborhood() { return <NeighborhoodView controller={useNeighborhoodController()} />; }
