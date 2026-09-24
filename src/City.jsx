import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { stops } from './content';
import { OFFICE } from './world';
import { SPAWN, stepCar } from './driving';
import { createWorldLighting } from './lighting';
import { buildCity } from './cityScenery';
import { createCar } from './car';
import { createCharacter } from './character';
import { CHARACTER_SPAWN, LOUNGE_SPAWN, stepCharacter, nearbyStation } from './characterMovement';
import { createWeatherScene } from './weatherScene';
import { createCityLife } from './cityLife';
import { PARK, canInteract } from './gameLocations';
import { createJobScenery } from './jobScenery';
import { createLounge } from './loungeScenery';
const isInside = mode => ['office', 'lounge'].includes(mode);

export default function City({ controlsRef, apiRef, pausedRef, lightingModeRef, gameRef, musicRef, onReady, onError, onNearby, onMove, onCharacterMove, onSelect, onActivity }) {
  const hostRef = useRef(null);
  const callbacks = useRef({ onReady, onError, onNearby, onMove, onCharacterMove, onSelect });
  callbacks.current = { onReady, onError, onNearby, onMove, onCharacterMove, onSelect, onActivity };
  useEffect(() => {
    const host = hostRef.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch { callbacks.current.onError(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.setAttribute('aria-label', 'Little City game. Drive with WASD or arrows, brake with Space, and press E to interact nearby.');
    renderer.domElement.tabIndex = 0; host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#d3e2d9'); scene.fog = new THREE.Fog('#d3e2d9', 100, 290);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.3, 650);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enablePan = false; orbit.enableDamping = true;
    orbit.minPolarAngle = Math.PI / 8; orbit.maxPolarAngle = Math.PI / 2.5;
    orbit.minDistance = 20; orbit.maxDistance = 225;
    const lighting = createWorldLighting(scene, renderer);
    const city = buildCity(scene, lighting);
    const { car, wheels } = createCar(scene, city, lighting);
    const character = createCharacter(scene, city);
    const weatherScene = createWeatherScene(scene);
    const life = createCityLife(scene, city, lighting);
    const jobs = createJobScenery(scene, city, car);
    const lounge = createLounge(scene, city, lighting);
    lounge.setRoom('drive');
    const destinations = [OFFICE, PARK, ...stops];
    const followTarget = new THREE.Vector3(), cameraShift = new THREE.Vector3();
    let state = { ...SPAWN }, player = { ...CHARACTER_SPAWN }, viewMode = 'drive', nearby = null, elapsed = 0, lastTime = 0, lastUpdate = 0;
    let pendingActions = {};
    let lastImpact = -2;
    let activity = { type: 'activity', driven: 0, run: 0, jumped: false, waved: false };
    const cameraRay = new THREE.Raycaster(), cameraDirection = new THREE.Vector3();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function resetCamera() {
      scene.fog.near = viewMode === 'map' ? 190 : 100;
      scene.fog.far = viewMode === 'map' ? 480 : 290;
      if (isInside(viewMode)) {
        camera.position.set(player.x, 6.5, player.z + 8.5); orbit.target.set(player.x, 2.7, player.z);
      }
      else if (viewMode === 'map') { camera.position.set(95, 150, 130); orbit.target.set(0, 0, 0); }
      else { camera.position.set(state.x + 27, 38, state.z + 43); orbit.target.set(state.x, 1, state.z - 10); }
      orbit.minDistance = isInside(viewMode) ? 3 : 20;
      orbit.maxDistance = isInside(viewMode) ? 13 : 225;
      orbit.update();
    }
    function setView(mode) {
      pendingActions = {};
      if (mode !== viewMode && isInside(mode)) player = { ...(mode === 'lounge' ? LOUNGE_SPAWN : CHARACTER_SPAWN) };
      viewMode = mode; state.speed = 0; city.setRoom(mode); lounge.setRoom(mode); car.visible = !isInside(mode);
      character.avatar.visible = isInside(mode);
      nearby = null; callbacks.current.onNearby(null); resetCamera();
    }
    apiRef.current = {
      context() { return { ...(isInside(viewMode) ? player : state), mode: viewMode }; },
      visit(id) {
        const destination = id === 'npc:maya' ? OFFICE : destinations.find(place => place.id === id);
        if (!destination) return null;
        state = { ...SPAWN, x: destination.parking[0], z: destination.parking[1] };
        const mode = ['office', 'lounge'].includes(id) ? id : 'drive';
        setView(mode);
        callbacks.current.onMove({ ...state });
        callbacks.current.onCharacterMove({ ...player, action: 'Idle' });
        return mode;
      },
      newVisit() { state = { ...SPAWN }; player = { ...CHARACTER_SPAWN }; activity = { type: 'activity', driven: 0, run: 0, jumped: false, waved: false }; setView('drive'); },
      reset() { if (isInside(viewMode)) player = { ...(viewMode === 'lounge' ? LOUNGE_SPAWN : CHARACTER_SPAWN) }; else state = { ...SPAWN }; resetCamera(); },
      setView,
      act(action) { if (isInside(viewMode) && !pausedRef.current && ['jump', 'wave'].includes(action) && (action !== 'jump' || player.height === 0) && (action !== 'wave' || player.waveTime <= 0)) pendingActions[action] = true; },
      focus() { renderer.domElement.focus({ preventScroll: true }); },
    };
    resetCamera();
    function resize() {
      camera.aspect = host.clientWidth / Math.max(host.clientHeight, 1);
      camera.fov = host.clientWidth < 760 ? 64 : 48; camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host); resize();
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
    let downPosition = null;
    function pointerDown(event) { downPosition = [event.clientX, event.clientY]; }
    function pointerUp(event) {
      if (pausedRef.current || !downPosition || Math.hypot(event.clientX - downPosition[0], event.clientY - downPosition[1]) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        let item = hit.object, id = null, visible = true;
        while (item) { if (!item.visible) visible = false; id ||= item.userData.stopId; item = item.parent; }
        if (visible && id) { callbacks.current.onSelect(id); break; }
      }
    }
    function contextLost(event) { event.preventDefault(); callbacks.current.onError(); }
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    lighting.update(lightingModeRef.current, 0, true);
    renderer.setAnimationLoop(time => {
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0; lastTime = time; elapsed += dt;
      lighting.update(lightingModeRef.current, dt, reducedMotion);
      if (!pausedRef.current && !isInside(viewMode)) {
        const before = state;
        state = stepCar(state, controlsRef.current, dt, [...city.obstacles, ...life.obstacles()]);
        activity.driven += Math.hypot(state.x - before.x, state.z - before.z);
        if (Math.abs(before.speed) > 2 && state.speed * before.speed < 0 && elapsed - lastImpact > 1) { activity.collision = true; lastImpact = elapsed; }
      }
      else state.speed = 0;
      if (isInside(viewMode) && !pausedRef.current) {
        const before = player;
        const yaw = Math.atan2(orbit.target.x - camera.position.x, orbit.target.z - camera.position.z);
        player = stepCharacter(player, { ...controlsRef.current, ...pendingActions }, dt, yaw, viewMode);
        if (controlsRef.current.run) activity.run += Math.hypot(player.x - before.x, player.z - before.z);
        activity.jumped ||= before.height === 0 && player.height > 0;
        activity.waved ||= player.waveTime > before.waveTime;
        pendingActions = {};
      }
      character.update({ ...player, speed: pausedRef.current ? 0 : player.speed }, pausedRef.current ? 0 : dt, elapsed);
      car.position.set(state.x, 0.73, state.z); car.rotation.y = state.heading;
      wheels.forEach(wheel => { wheel.rotation.x += state.speed * dt * 2; });
      city.update(elapsed, reducedMotion);
      life.update(dt, elapsed, isInside(viewMode) ? player : state, isInside(viewMode), reducedMotion, viewMode);
      jobs.update(gameRef.current, viewMode, elapsed, reducedMotion);
      lounge.update(elapsed, musicRef.current, reducedMotion);
      weatherScene.update(lightingModeRef.current, state, dt, isInside(viewMode), reducedMotion);
      const foggy = lightingModeRef.current.weatherKind === 'fog';
      scene.fog.near = foggy ? (isInside(viewMode) ? 20 : 30) : viewMode === 'map' ? 190 : 100;
      scene.fog.far = foggy ? (viewMode === 'map' ? 240 : 100) : viewMode === 'map' ? 480 : 290;
      if (time - lastUpdate > 120) {
        lastUpdate = time;
        const stopId = viewMode === 'lounge' ? (canInteract('jukebox', { ...player, mode: viewMode }) ? 'jukebox' : null) : life.nearby(isInside(viewMode) ? player : state, isInside(viewMode)) || (isInside(viewMode) ? nearbyStation(player) : destinations.find(s => canInteract(s.id, { ...state, mode: viewMode }))?.id ?? null);
        if (stopId !== nearby) { nearby = stopId; callbacks.current.onNearby(nearby); }
        callbacks.current.onMove({ ...state, speed: Math.abs(state.speed) });
        callbacks.current.onCharacterMove({ ...player, action: player.height > 0.03 ? 'Jumping' : player.waveTime > 0 ? 'Waving' : player.speed > 3 ? 'Running' : player.speed > 0.1 ? 'Walking' : 'Idle' });
        if (activity.driven || activity.run || activity.jumped || activity.waved || activity.collision) {
          callbacks.current.onActivity?.(activity);
          activity = { type: 'activity', driven: 0, run: 0, jumped: false, waved: false };
        }
      }
      orbit.enabled = !pausedRef.current;
      if (viewMode === 'drive' || isInside(viewMode)) {
        if (isInside(viewMode)) followTarget.set(player.x, 2.7 + player.height * 0.4, player.z);
        else followTarget.set(state.x, 1, state.z - 10);
        cameraShift.copy(followTarget).sub(orbit.target).multiplyScalar(reducedMotion ? 1 : 1 - Math.exp(-5 * dt));
        camera.position.add(cameraShift); orbit.target.add(cameraShift);
      }
      orbit.update();
      if (isInside(viewMode)) {
        cameraDirection.copy(camera.position).sub(orbit.target);
        const distance = cameraDirection.length(); cameraDirection.normalize();
        cameraRay.set(orbit.target, cameraDirection); cameraRay.far = distance;
        const hit = cameraRay.intersectObjects(viewMode === 'lounge' ? lounge.cameraObstacles : city.cameraObstacles)[0];
        if (hit) camera.position.copy(orbit.target).addScaledVector(cameraDirection, Math.max(0.6, hit.distance - 0.3));
      }
      renderer.render(scene, camera);
    });
    callbacks.current.onReady();
    return () => {
      renderer.setAnimationLoop(null); resizeObserver.disconnect(); orbit.dispose();
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set(), materials = new Set(city.materials.values());
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); if (object.shadow) object.shadow.dispose(); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); city.textures.forEach(t => t.dispose());
      renderer.dispose(); renderer.domElement.remove(); apiRef.current = null;
    };
  }, [apiRef, controlsRef, pausedRef, lightingModeRef, gameRef, musicRef]);
  return <div className="city-canvas" ref={hostRef} />;
}
