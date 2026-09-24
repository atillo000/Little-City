import { useEffect, useState } from 'react';
import { readLightingPreference, writeLightingPreference } from '../services/preferences.js';
export function useLightingPreference() {
  const [mode, setMode] = useState(readLightingPreference);
  useEffect(() => { writeLightingPreference(mode); }, [mode]);
  return [mode, setMode];
}
