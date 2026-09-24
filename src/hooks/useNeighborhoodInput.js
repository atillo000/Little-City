import { useCallback, useEffect, useRef } from 'react';
import { emptyControls, combineControls } from '../models/neighborhood/controls.js';
export function useNeighborhoodInput(pausedRef, nearbyRef, callbacks) {
  const controlsRef = useRef(emptyControls()), keyboardRef = useRef(emptyControls()), pointerRef = useRef(emptyControls());
  const reset = () => callbacks.current.reset();
  const select = id => callbacks.current.select(id);
  const clearInput = useCallback(() => { window.dispatchEvent(new Event('city-input-clear')); keyboardRef.current = emptyControls(); pointerRef.current = emptyControls(); controlsRef.current = emptyControls(); }, []);
  useEffect(() => {
    const mapping = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'brake', ShiftLeft: 'run', ShiftRight: 'run', KeyF: 'wave' };
    const held = new Set();
    function update() { const next = emptyControls(); held.forEach(code => { if (mapping[code]) next[mapping[code]] = true; }); next.jump = held.has('Space'); keyboardRef.current = next; controlsRef.current = combineControls(next, pointerRef.current); }
    function keyDown(event) {
      if (pausedRef.current || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (['BUTTON', 'A'].includes(event.target.tagName) && ['Space', 'Enter'].includes(event.code)) return;
      if (mapping[event.code]) { event.preventDefault(); held.add(event.code); update(); }
      if (event.repeat) return;
      if (event.code === 'KeyR') reset();
      if ((event.code === 'KeyE' || event.code === 'Enter') && nearbyRef.current) { event.preventDefault(); select(nearbyRef.current); }
    }
    function keyUp(event) { held.delete(event.code); update(); }
    function clear() { held.clear(); keyboardRef.current = emptyControls(); pointerRef.current = emptyControls(); controlsRef.current = emptyControls(); }
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', clear); window.addEventListener('city-input-clear', clear); document.addEventListener('visibilitychange', clear);
    return () => { window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clear); window.removeEventListener('city-input-clear', clear); document.removeEventListener('visibilitychange', clear); };
  }, []);
  function setPointer(action, pressed) { pointerRef.current[action] = pressed; controlsRef.current = combineControls(keyboardRef.current, pointerRef.current); }
  function touch(action, pressed, event) { event.preventDefault(); if (pressed) event.currentTarget.setPointerCapture(event.pointerId); setPointer(action, pressed); }
  const pointerAction = action => ({ onPointerDown: event => touch(action, true, event), onPointerUp: event => touch(action, false, event), onPointerCancel: event => touch(action, false, event), onLostPointerCapture: () => setPointer(action, false) });
  return { controlsRef, clearInput, pointerAction };
}
