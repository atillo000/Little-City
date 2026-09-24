import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceProgress, freshProgress, MISSION_LIST, missionValue } from '../models/neighborhood/missions.js';

import { readGuests, writeGuests } from '../services/guestStorage.js';
import { cleanGuestName, MAX_GUESTS } from '../models/neighborhood/guests.js';

export function useGuest() {
  const [initial] = useState(readGuests);
  const [data, setData] = useState(initial.data);
  const [entryError, setEntryError] = useState('');
  const dataRef = useRef(data);
  const [storageAvailable, setStorageAvailable] = useState(initial.available);
  const [notification, setNotification] = useState(null);
  // Commit activity immediately so refresh/closing the tab cannot lose a pending save.
  const commit = useCallback(next => {
    dataRef.current = next; setData(next);
    setStorageAvailable(writeGuests(next));
  }, []);
  const record = useCallback(event => {
    const current = dataRef.current;
    const guest = current.profiles.find(p => p.id === current.active);
    if (!guest) return;
    const progress = advanceProgress(guest.progress, event);
    if (JSON.stringify(progress) === JSON.stringify(guest.progress)) return false;
    const completed = MISSION_LIST.filter(m => missionValue(m.id, guest.progress) < m.total && missionValue(m.id, progress) >= m.total);
    if (completed.length) setNotification({ title: completed.map(m => m.title).join(' · '), points: progress.coins - guest.progress.coins, stamp: Date.now() });
    commit({ ...current, profiles: current.profiles.map(p => p.id === guest.id ? { ...p, progress } : p) });
    return true;
  }, [commit]);
  useEffect(() => { if (!notification) return; const timer = setTimeout(() => setNotification(null), 4500); return () => clearTimeout(timer); }, [notification]);
  function enter(name, existingId) {
    const current = dataRef.current;
    const existing = current.profiles.find(p => p.id === existingId);
    if (!existing && current.profiles.length >= MAX_GUESTS) { setEntryError('This browser has reached its guest limit. Continue an existing guest.'); return false; }
    setEntryError('');
    const guest = existing || { id: crypto.randomUUID(), name: cleanGuestName(name), progress: freshProgress() };
    commit({ profiles: existing ? current.profiles : [...current.profiles, guest], active: guest.id });
    setNotification(null);
  }
  function leave() { commit({ ...dataRef.current, active: null }); setNotification(null); }
  return { guest: data.profiles.find(p => p.id === data.active) ?? null, profiles: data.profiles, entryError, record, enter, leave, storageAvailable, notification };
}
