import { STORAGE_KEYS } from '../config/storageKeys.js';
import { cleanGuestSave } from '../models/neighborhood/guests.js';
import { readJson, writeJson } from './storage.js';

export function readGuests(storage) {
  const current = readJson(STORAGE_KEYS.guests, storage);
  const result = current.found ? current : readJson(STORAGE_KEYS.legacyGuests, storage);
  return { data: cleanGuestSave(result.value), available: result.available };
}
export function writeGuests(data, storage) { return writeJson(STORAGE_KEYS.guests, cleanGuestSave(data), storage); }
