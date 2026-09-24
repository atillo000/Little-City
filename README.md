# Little City: World Tour

Source is organized into MVC layers with separate hooks, services and Three.js scenes. See [Architecture](docs/ARCHITECTURE.md) and [Security boundaries](docs/SECURITY.md) for the directory map, dependency rules, save validation and deployment configuration.

## The game

Little City: World Tour is an original, stylized open-world action game. Explore seven destinations: Miami, Tokyo, Manila, London, Dubai, Rio de Janeiro, and Cape Town. Each has an 880-by-880 playable district, 144 buildings, a coastal promenade, an airport, 18 traffic cars, and three contracts. Around 95 pedestrians fill the sidewalks: families with children holding a parent's hand, office workers with briefcases who stop to take calls, joggers, and friends who chat. Street spots give them somewhere to be: food stalls with vendors and queues, bus shelters with people sitting and waiting, benches, and chatting groups. Passers-by walk to spots along the sidewalks, stay a while and move on, so each block keeps changing. Violence empties the spots, and vendors reopen their stalls once things calm down. Cities use distinct colors, building heights and vegetation. The travel map connects these districts with instant flights; this is not a real-scale replica of Earth.

Walk, sprint, jump, drive your cyan car, fight with fists, or use a pistol. A ring shows who an attack will hit: armed threats anywhere in range come first, bystanders only when they are in front of the camera, and children are never targets. Buildings block shots and stop stray tracers. The pistol aims two-handed with recoil and muzzle flash, reloads automatically when empty, and loses damage past 30 meters. Punches chain into a jab, cross and knockdown hook. Hits spray blood that stains the ground, and defeated characters fall away from the blow and leave a pool. Blood can be turned off in the pause menu. Enemy shots miss more often at range and against a moving target. At zero health you respawn at the safehouse, keeping earned cash and completed contracts. Press E on foot at the green safehouse to restore health and ammo when no police are pursuing you.

World Tour physics runs on [Rapier](https://rapier.rs), an actively maintained open-source engine compiled to WebAssembly. Cars are rigid bodies on raycast wheels with spring suspension, tire grip, all-wheel drive, brakes and a drifting handbrake. They squat under acceleration and crash with real momentum, contact-force damage and continuous collision detection. A car flipped onto its roof is set back on its wheels. People move with a physics character controller that stops at walls and lands jumps. Deaths, knockout punches and car hits turn them into jointed ragdolls that fall away from the blow; knocked-down fighters get back up. Bullets are physics rays, so a car between you and a gunman is cover. Fast cars snap lamp posts, and trees are solid. Children are never injured or ragdolled; a car only nudges them aside.

Shooting or attacking someone starts a police response. Hurting bystanders or officers raises the wanted level. After a three-second dispatch delay, up to three existing patrol cars drive through the street grid to the incident, with flashing lights. Officers get out at their car doors only after arriving and stopping; there is no ring of officers spawned around the player. A patrol that can see a fleeing car chases it directly and aims ahead of it. Out of sight, units drive to your last known position and search nearby streets. If you drive off while officers are on foot, they return to their car and resume the chase. At one star, officers try to arrest you on foot: stay still and you are busted, fined up to $500, and released at the safehouse. At two or more stars they open fire. Stop attacking for 12 seconds and stay out of police sight for eight seconds to begin losing heat. Officers then walk back to their cars and patrols return to duty. Police and traffic AI are simplified: road routing is a grid/waypoint heuristic.

Each destination offers **Midnight delivery** ($650), **Take back the block** ($1,200), and **Heat on the highway** ($950): 21 contracts total. Accept one from Contracts, follow the gold marker, and stop within 12 meters to press E. Combat contracts require eliminating all four gang members; deliveries and escapes require collecting the case first. Lose all wanted stars before collecting your reward. World travel unlocks when you have no unfinished contract or wanted level. You can abandon a contract from its board and restart it later.

| World Tour input | Action |
| --- | --- |
| WASD / arrows | Walk or drive |
| Shift | Sprint on foot |
| Space | Jump on foot / handbrake in car |
| F | Enter nearby car / exit when stopped |
| J | Shoot or punch; hold to repeat |
| Q | Switch pistol / fists |
| R | Reload (48 rounds, unlimited reserve) |
| E | Collect / deliver / heal at safehouse |
| M / L | World map / contract board |
| Escape | Pause and controls |
| Drag / scroll | Orbit camera / zoom |

On-screen action buttons and mobile movement controls provide the same actions. Menus pause gameplay. Cash, completed contracts, and the selected city save locally under `little-city-world-v1`; unfinished contracts restart after a page reload. If browser storage is unavailable, a message in Contracts explains that progress lasts for the session.

## Playing together

Players in the same city see each other: their own character look, a name tag, their car while they drive, and a dot on the minimap. The world map shows who is online in each city, and a HUD chip shows the connection. It runs on Supabase Realtime (anonymous sign-in, private channels) once `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set; see [Multiplayer](docs/MULTIPLAYER.md) for the one-time setup. Without them, tabs in the same browser still share the world locally. Other players are ghosts: traffic, pedestrians, police, contracts and combat stay your own, and you cannot collide with or fight each other.

## Your character

On first launch the game opens a character creator before anything else loads. Choose a name, skin tone, hair style (short, long, buzz cut, bun, cap or bald) and colour, shirt, trousers, shoes and build (compact, average or tall), with a live 3D preview you can drag to turn. **Randomize** rolls a look, and **Start playing** begins your first flight. The look is saved on this browser under `little-city-character-v1`. Build changes your in-game size: capsule, ragdoll and model. Use **Pause → Edit character** to change your look at any time: the game pauses, and your cash, contracts and position stay as they are. Names are plain text, limited to 24 characters.

The original neighborhood mode (guest profiles, community jobs, the indoor hub, and the music lounge) has been removed. It remains in the git history before this change. Its old browser saves are left untouched but are no longer read. The music player will return when the catalog moves to Supabase Storage.

## Develop

Use Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
npm test
npm run build
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Vite serves localhost, normally port 5173. Deploy `dist/` to static hosting. Gameplay needs WebGL 2.

All characters, vehicles, and scenery are procedural geometry. No model downloads or API keys are required.

## Deploy to Vercel

`vercel.json` configures the deployment: `npm ci`, `npm run build`, and static serving of `dist/`. It sends the production security headers from `src/config/security.js` (CSP including `frame-ancestors 'none'`, `nosniff`, referrer and permissions policies). It also caches the content-hashed `/assets/*` files, including the large Rapier chunk, for a year. `index.html` and other files keep Vercel's default revalidation, so new deployments show up immediately. A unit test keeps the headers identical to `security.js`: after changing the policy, update both files.

- **From Git:** import the repository in the Vercel dashboard. The framework (Vite), commands and output directory come from `vercel.json`. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (or the `VITE_` names) for online multiplayer (optional; see [Multiplayer](docs/MULTIPLAYER.md)). Keep the project's Node.js version at 20.x or newer (Vite 7 needs 20.19+).
- **From the CLI:** `npx vercel` for a preview deployment, `npx vercel --prod` for production. `.vercelignore` keeps `node_modules`, `dist` and test output from being uploaded.

## Maintenance checks

Run `npm test` for gameplay, architecture and security regressions, `npm run test:architecture` for dependency boundaries, `npm run test:browser` for production browser checks, and `npm run audit:security` for known dependency advisories. Browser snapshots are generated under `test-results/`; test code belongs under `tests/`. Production hosting must apply the response headers described in [Security boundaries](docs/SECURITY.md).
