# Application architecture

Little City uses MVC adapted to React. Models hold game rules, controller hooks coordinate each mode, and views render state and emit user actions. Small React hooks own input and effect lifecycles. Browser I/O lives in services; Three.js rendering lives in scenes.

```text
src/
  app/                     Entry composition and lazy mode switching
  controllers/             useWorldController, useNeighborhoodController
  hooks/                   Input, guests, weather, music and scene lifecycle
  models/
    worldTour/             World simulation, AI, physics and save rules
    neighborhood/          Community jobs, driving, locations and guest rules
    environment.js         Clock and validated weather data
    musicLibrary.js        Recording and video metadata
    musicTracks.js         Original loop definitions
  services/                Storage, preferences, weather HTTP and audio
  scenes/
    worldTour/             World Tour renderer
    neighborhood/          Neighborhood renderer and scenery
    shared/                Character, vehicle, NPC and ragdoll rigs
  views/
    worldTour/             World Tour HUD, map and dialogs
    neighborhood/          Neighborhood HUD and individual feature dialogs
    shared/                Accessible native dialog
  config/                  Storage keys, music switch and security policy
  styles/                  CSS, imported through index.css in cascade order
tests/
  unit/                    Gameplay, physics, saves, boundaries and security
  browser/                 Production smoke test for both modes
```

## Dependency rules

| Layer | May import application code from |
| --- | --- |
| Models | Models, config |
| Services | Services, models, config |
| Scenes | Scenes, models, config |
| Hooks | Hooks, services, models, scenes, config |
| Controllers | Controllers, hooks, services, models, scenes, config |
| Views | Views, hooks, models, config; services for validated media URLs |
| App | App, controllers, hooks, views |

Models do not import React, Three.js, DOM APIs or localStorage. `models/worldTour/physicsEngine.js` is the deliberate engine adapter: it owns Rapier worlds without depending on browser rendering, so physics tests run in Node. Scenes may consume models, never React views. Storage access is restricted to services. Relative imports use explicit extensions and exact filename casing. Architecture tests reject forbidden dependencies, unresolved imports and cycles.

## State ownership

World Tour's mutable session ref remains authoritative. `mountAdventure` advances it and renders persistent actors; React receives HUD snapshots around every 100 ms. Controller actions accept/abandon contracts, travel and recover. Do not move the frame loop into React state or derive traffic positions from elapsed-time routes.

The neighborhood controller owns navigation and UI state. `useNeighborhoodScene` mounts `mountNeighborhood`, which owns the renderer, movement and scene resources. The controller passes stable refs and callbacks; changing a dialog does not recreate the city. Each input hook clears keyboard and pointer state when focus or visibility changes and when its controller opens a menu.

Components may keep local UI state (for example a dialog's selected category or repair sequence). Reward changes and mission progression belong in models and controller actions. Views should not mutate a session or write saves directly.

## Adding a feature

1. Put its rules and validation in a model; add focused Node regression tests.
2. Put browser storage/network/audio operations in a service.
3. Use a hook for subscriptions, input and cleanup, and a controller action to coordinate the game.
4. Render through a view; keep new styling scoped to its game mode.
5. Update README and AGENTS when architecture or gameplay changes.

Both modes are lazy-loaded. Shared assets and dialogs are reused without importing an entire feature UI. Keep the music-off configuration and existing storage keys stable unless a migration is explicitly implemented.

## Checks

```sh
npm test
npm run test:architecture
npm run build
npm run test:browser
npm run audit:security
```

`test:browser` builds and starts its own loopback preview on an unused port. It uses installed Chrome on Windows when available, otherwise Playwright Chromium (`npx playwright install chromium`). Override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed. Browser test code lives in `tests/browser`; generated screenshots stay in ignored `test-results`. Weather/fonts are stubbed for reproducibility; the actual production bundle, Rapier and CSP run in Chrome. Remote YouTube playback is not exercised while music is disabled.

Node tests cover game rules and the architecture boundary; the browser check covers mode switching, input, travel/reload, contract restrictions, storage isolation, local guest text, mobile layouts and disabled music. Additional focused visual/physics checks are needed when changing those systems.
