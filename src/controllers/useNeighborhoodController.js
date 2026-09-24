import { useCallback, useEffect, useRef, useState } from 'react';
import { stops } from '../models/neighborhood/content.js';
import { SPAWN } from '../models/neighborhood/driving.js';
import { OFFICE } from '../models/neighborhood/world.js';
import { useEnvironment } from '../hooks/useEnvironment.js';
import { CHARACTER_SPAWN } from '../models/neighborhood/characterMovement.js';
import { useGuest } from '../hooks/useGuest.js';
import { currentObjective, freshProgress } from '../models/neighborhood/missions.js';
import { interactionPoint, PARK, DESKS } from '../models/neighborhood/gameLocations.js';
import { MAYA } from '../models/neighborhood/cityLifePaths.js';
import { useMusic } from '../hooks/useMusic.js';
import { useNeighborhoodInput } from '../hooks/useNeighborhoodInput.js';
import { useLightingPreference } from '../hooks/useLightingPreference.js';

export function useNeighborhoodController() {
  const [section, setSection] = useState(null), [nearby, setNearby] = useState(null);
  const [ready, setReady] = useState(false), [error, setError] = useState(false);
  const [car, setCar] = useState({ ...SPAWN }), [viewMode, setViewMode] = useState('drive');
  const [player, setPlayer] = useState({ ...CHARACTER_SPAWN, action: 'Idle' });
  const guests = useGuest(), { guest, record } = guests;
  const inside = ['office', 'lounge'].includes(viewMode);
  const music = useMusic(viewMode === 'lounge');
  const musicRef = useRef(false); musicRef.current = music.playing;
  const progress = guest?.progress ?? freshProgress(), objective = currentObjective(progress);
  const [lightingMode, setLightingMode] = useLightingPreference();
  const environment = useEnvironment(lightingMode);
  const lightingModeRef = useRef(environment.scene); lightingModeRef.current = environment.scene;
  const gameRef = useRef(progress); gameRef.current = progress;
  const apiRef = useRef(null), pausedRef = useRef(true), nearbyRef = useRef(null);
  pausedRef.current = Boolean(section) || !guest || error; nearbyRef.current = nearby;
  const inputCallbacks = useRef({});
  const { controlsRef, clearInput, pointerAction } = useNeighborhoodInput(pausedRef, nearbyRef, inputCallbacks);
  const context = { ...(inside ? player : car), mode: viewMode };
  useEffect(() => { document.title = 'Little City — Neighborhood Adventures'; }, []);
  const select = useCallback(id => {
    clearInput();
    if (id === 'office') {
      if (apiRef.current && !error) { apiRef.current.visit('office'); setSection(null); setViewMode('office'); }
      return;
    }
    setSection(id);
  }, [clearInput, error]);
  const explore = useCallback(id => {
    clearInput();
    if (id === 'lounge') { setSection('lounge'); return; }
    if (id === 'office') { select(id); return; }
    const mode = !error ? apiRef.current?.visit(id) : null;
    if (mode) setViewMode(mode);
    setSection(stops.some(place => place.id === id) ? 'explore:' + id : id);
  }, [clearInput, error, select]);
  const reset = useCallback(() => { clearInput(); if (!['office', 'lounge'].includes(apiRef.current?.context().mode)) record({ type: 'reset' }); apiRef.current?.reset(); apiRef.current?.focus(); }, [clearInput, record]);
  inputCallbacks.current = { reset, select };
  function enterGuest(name, id) { clearInput(); setSection(null); setViewMode('drive'); apiRef.current?.newVisit(); guests.enter(name, id); }
  function switchGuest() { clearInput(); setSection(null); setViewMode('drive'); apiRef.current?.newVisit(); guests.leave(); }
  function leaveHub() { clearInput(); setViewMode('drive'); apiRef.current?.setView('drive'); apiRef.current?.focus(); }
  function toggleView() { clearInput(); const next = viewMode === 'drive' ? 'map' : 'drive'; setViewMode(next); apiRef.current?.setView(next); }
  function enterLounge() {
    if (!apiRef.current || error) return;
    clearInput(); setSection(null); setViewMode('lounge'); apiRef.current.visit('lounge'); apiRef.current.focus();
  }
  function action(event) {
    if (error || !apiRef.current) return false;
    const changed = record({ ...event, context: apiRef.current.context() });
    if (changed) { setSection(null); clearInput(); apiRef.current.focus(); }
    return changed;
  }
  const nearbyStop = [{ id: 'jukebox', name: 'Lounge music console', number: '♫' }, OFFICE, MAYA, PARK, ...stops, ...DESKS].find(stop => stop.id === nearby);
  const targetId = objective.location === 'dispatch' && viewMode !== 'office' ? 'office' : objective.location;
  const target = interactionPoint(targetId, viewMode);
  const distance = target ? Math.round(Math.hypot(context.x - target.x, context.z - target.z)) : null;
  return { section, setSection, nearby, ready, error, car, viewMode, player, guests, guest, record, inside, music, musicRef, progress, objective, lightingMode, setLightingMode, environment, lightingModeRef, gameRef, controlsRef, apiRef, pausedRef, select, explore, reset, enterGuest, switchGuest, leaveHub, toggleView, pointerAction, enterLounge, action, nearbyStop, targetId, distance, target, context, setReady, setError, setNearby, setCar, setPlayer };
}
