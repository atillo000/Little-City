import { useEffect, useRef } from 'react';
import { mountNeighborhood } from '../scenes/neighborhood/mountNeighborhood.js';
export function useNeighborhoodScene(options) {
  const hostRef = useRef(null), callbacks = useRef(options);
  callbacks.current = options;
  const { apiRef, controlsRef, pausedRef, lightingModeRef, gameRef, musicRef } = options;
  useEffect(() => mountNeighborhood({ host: hostRef.current, callbacks, apiRef, controlsRef, pausedRef, lightingModeRef, gameRef, musicRef }), [apiRef, controlsRef, pausedRef, lightingModeRef, gameRef, musicRef]);
  return hostRef;
}
