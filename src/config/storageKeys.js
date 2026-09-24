// Changing these keys requires an explicit migration; the two modes never share saves.
export const STORAGE_KEYS = Object.freeze({
  guests: 'little-city-guests-v2', legacyGuests: 'city-studio-guests-v1',
  world: 'little-city-world-v1', effects: 'little-city-world-effects-v1', lighting: 'city-lighting-v2',
});
