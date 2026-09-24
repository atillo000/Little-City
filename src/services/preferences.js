import { STORAGE_KEYS } from '../config/storageKeys.js';
import { readJson, readText, writeJson, writeText } from './storage.js';

export const LIGHTING_MODES = ['auto', 'morning', 'night'];
export function readLightingPreference(storage) {
  const saved = readText(STORAGE_KEYS.lighting, storage).value;
  return LIGHTING_MODES.includes(saved) ? saved : 'auto';
}
export function writeLightingPreference(value, storage) {
  return LIGHTING_MODES.includes(value) && writeText(STORAGE_KEYS.lighting, value, storage);
}
export function readBloodPreference(storage) { return readJson(STORAGE_KEYS.effects, storage).value?.blood !== false; }
export function writeBloodPreference(blood, storage) { return typeof blood === 'boolean' && writeJson(STORAGE_KEYS.effects, { blood }, storage); }
