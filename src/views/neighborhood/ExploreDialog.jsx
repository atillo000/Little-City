

import { LOCATIONS } from '../../models/neighborhood/gameLocations.js';
import { ExperienceDialog } from '../shared/ExperienceDialog.jsx';

export function ExploreDialog({ id, onClose, onJournal }) {
  const place = LOCATIONS.find(location => location.id === id);
  const stories = {
    cafe: ['A seat by the window', 'Nora’s cafe is the neighborhood’s meeting place. Enjoy the slow morning, watch the street, and take a look around.'],
    workshop: ['Made to last', 'Leo’s workshop keeps the neighborhood moving. Bicycles, spare parts, and things waiting for a second life fill this corner of the city.'],
    market: ['A little bit of everything', 'Rosa and the market neighbors are setting up their stalls. Wander the block and enjoy the lights and passing traffic.'],
    library: ['One more chapter', 'The library is a quiet landmark in a busy neighborhood. Eli’s reading club welcomes familiar faces and new visitors alike.'],
  };
  const story = stories[id];
  return <ExperienceDialog title={place?.name || 'Explore the city'} onClose={onClose}>
    <span className="experience-eyebrow">FREE EXPLORATION</span><blockquote>{story?.[0]}</blockquote><p>{story?.[1] || place?.subtitle}</p>
    <p>Stay as long as you like. Visiting does not start or complete a mission.</p>
    <button className="experience-primary" onClick={onClose}>Explore this neighborhood →</button><button className="back-to-city" onClick={onJournal}>View optional missions</button>
  </ExperienceDialog>;
}
