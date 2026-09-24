# Application architecture

Little City uses MVC adapted to React. Models hold game rules, controller hooks coordinate the game and the character creator, and views render state and emit user actions. Small React hooks own input and effect lifecycles. Browser I/O lives in services; Three.js rendering lives in scenes.

```text
src/
  app/                     Composition: character creator first, then the lazily loaded game
  controllers/             useWorldController (game session), useCharacterController (creator and saved look)
  hooks/                   World input, character preview lifecycle, multiplayer connection
  models/
    worldTour/             World simulation, AI, physics, street spots, character rules and save rules
  services/                Storage, world/character saves, preferences and the multiplayer transport
  scenes/
    worldTour/             World Tour renderer and the creator's turntable preview
    shared/                Player, vehicle, NPC and ragdoll rigs
  views/
    worldTour/             HUD, map, dialogs and the character creator
    shared/                Accessible native dialog
  config/                  Storage keys, security policy and Supabase settings
  styles/                  base.css, adventure.css, creator.css, imported through index.css
tests/
  unit/                    Gameplay, physics, street life, saves, boundaries and security
  browser/                 Production smoke test
```

## Dependency rules

| Layer | May import application code from |
| --- | --- |
| Models | Models, config |
| Services | Services, models, config |
| Scenes | Scenes, models, config |
| Hooks | Hooks, services, models, scenes, config |
| Controllers | Controllers, hooks, services, models, scenes, config |
| Views | Views, hooks, models, services, config |
| App | App, controllers, hooks, views |

Models do not import React, Three.js, DOM APIs or localStorage. `models/worldTour/physicsEngine.js` is the deliberate engine adapter: it owns Rapier worlds without depending on browser rendering, so physics tests run in Node. Scenes may consume models, never React views. Storage access is restricted to services. Relative imports use explicit extensions and exact filename casing. Architecture tests reject forbidden dependencies, unresolved imports and cycles.

## State ownership

World Tour's mutable session ref remains authoritative. `mountAdventure` advances it and renders persistent actors; React receives HUD snapshots around every 100 ms. Controller actions accept/abandon contracts, travel and recover. Do not move the frame loop into React state or derive traffic positions from elapsed-time routes.

`useCharacterController` owns the saved look and the creator's draft. With no valid save, `App` renders only the creator (the game module is not loaded yet). Afterwards it renders the game and, while editing, the creator on top with `suspended` pausing the session. A saved look reaches the simulation through `setAppearance`, which replaces the player object so Rapier rebuilds the capsule at the new size. The renderer rebuilds the avatar when `session.appearance` changes. The creator's turntable (`scenes/worldTour/characterPreview.js`) uses the same `createCharacter` rig as the game.

Multiplayer (see docs/MULTIPLAYER.md): `useMultiplayer` connects through `services/multiplayerClient.js`, keeps the roster of other players in a ref that `mountAdventure` reads every frame (`updateRemotes`), and gives React only the HUD summary (status, players here, counts per city). All network data passes through the cleaners in `models/worldTour/multiplayer.js`.

Street spots (`models/worldTour/worldLayout.js`) are shared by three consumers: pedestrian AI (slots), physics (stall and shelter colliders) and the renderer (props). Change them in one place.

Components may keep local UI state. Rewards, contracts and saves belong in models, services and controller actions. Views should not mutate a session or write saves directly.

## Adding a feature

1. Put its rules and validation in a model; add focused Node regression tests.
2. Put browser storage/network operations in a service.
3. Use a hook for subscriptions, input and cleanup, and a controller action to coordinate the game.
4. Render through a view; keep new styling in its own stylesheet imported from `index.css`.
5. Update README and AGENTS when architecture or gameplay changes.

Keep existing storage keys stable unless a migration is explicitly implemented.

## Checks

```sh
npm test
npm run test:architecture
npm run build
npm run test:browser
npm run audit:security
```

`test:browser` builds and starts its own loopback preview on an unused port. It uses installed Chrome on Windows when available, otherwise Playwright Chromium (`npx playwright install chromium`). Override with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if needed. Browser test code lives in `tests/browser`; generated screenshots stay in ignored `test-results`. It runs the actual production bundle, Rapier and CSP in Chrome, and fails on any third-party request.

Node tests cover game rules, street life, character validation and the architecture boundary. The browser check covers the first-launch creator (live preview, escaped names, saved look), input, travel/reload, contract restrictions, preferences, editing the character mid-game and mobile layouts. Changes to combat, vehicle contacts, ragdolls or street-spot visuals need additional focused visual checks.
