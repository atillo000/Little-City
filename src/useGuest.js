import { useCallback, useEffect, useRef, useState } from 'react';
import { advanceProgress, cleanProgress, freshProgress, MISSION_LIST, missionValue } from './missions';

export const GUEST_STORAGE_KEY = 'little-city-guests-v2';
function readGuests() {
  try {
    const saved = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || localStorage.getItem('city-studio-guests-v1'));
    const profiles = (Array.isArray(saved?.profiles) ? saved.profiles : []).filter(p => typeof p?.id === 'string' && typeof p?.name === 'string')
      .map(p => ({ id: p.id, name: p.name.slice(0, 24), progress: cleanProgress(p.progress ?? {}) }));
    return { profiles, active: profiles.some(p => p.id === saved.active) ? saved.active : null };
  } catch { return { profiles: [], active: null }; }
}
export function useGuest() {
  const [data, setData] = useState(readGuests);
  const dataRef = useRef(data);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [notification, setNotification] = useState(null);
  // Commit activity immediately so refresh/closing the tab cannot lose a pending save.
  const commit = useCallback(next => {
    dataRef.current = next; setData(next);
    try { localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(next)); setStorageAvailable(true); }
    catch { setStorageAvailable(false); }
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
    const guest = existing || { id: crypto.randomUUID(), name: name.trim().slice(0, 24) || 'Guest', progress: freshProgress() };
    commit({ profiles: existing ? current.profiles : [...current.profiles, guest], active: guest.id });
    setNotification(null);
  }
  function leave() { commit({ ...dataRef.current, active: null }); setNotification(null); }
  return { guest: data.profiles.find(p => p.id === data.active) ?? null, profiles: data.profiles, record, enter, leave, storageAvailable, notification };
}
