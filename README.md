# Little City

Source is organized into MVC layers with separate hooks, services and Three.js scenes. See [Architecture](docs/ARCHITECTURE.md) and [Security boundaries](docs/SECURITY.md) for the directory map, dependency rules, save validation and deployment configuration.

## World Tour action mode

The game now opens in **World Tour**, an original, stylized open-world action mode. Explore seven destinations: Miami, Tokyo, Manila, London, Dubai, Rio de Janeiro, and Cape Town. Each has an 880-by-880 playable district, 144 buildings, a coastal promenade, an airport, 18 traffic cars, and three contracts. Around 50 pedestrians fill the sidewalks: families with children holding a parent's hand, office workers with briefcases who stop to take calls, joggers, and friends who stop to chat. They turn at corners, window-shop, and flee from violence. Cities use distinct colors, building heights and vegetation. The travel map connects these districts with instant flights; this is not a real-scale replica of Earth.

Walk, sprint, jump, drive your cyan car, fight with fists, or use a pistol. A ring shows who an attack will hit: armed threats anywhere in range come first, bystanders only when they are in front of the camera, and children are never targets. Buildings block shots and stop stray tracers. The pistol aims two-handed with recoil and muzzle flash, reloads automatically when empty, and loses damage past 30 meters. Punches chain into a jab, cross and knockdown hook. Hits spray blood that stains the ground, and defeated characters fall away from the blow and leave a pool. Blood can be turned off in the pause menu. Enemy shots miss more often at range and against a moving target. At zero health you respawn at the safehouse, keeping earned cash and completed contracts. Press E on foot at the green safehouse to restore health and ammo when no police are pursuing you.

World Tour physics runs on [Rapier](https://rapier.rs), an actively maintained open-source engine compiled to WebAssembly. Cars are rigid bodies on raycast wheels with spring suspension, tire grip, all-wheel drive, brakes and a drifting handbrake. They squat under acceleration and crash with real momentum, contact-force damage and continuous collision detection. A car flipped onto its roof is set back on its wheels. People move with a physics character controller that stops at walls and lands jumps. Deaths, knockout punches and car hits turn them into jointed ragdolls that fall away from the blow; knocked-down fighters get back up. Bullets are physics rays, so a car between you and a gunman is cover. Fast cars snap lamp posts, and trees are solid. Children are never injured or ragdolled; a car only nudges them aside.

Shooting or attacking someone starts a police response. Hurting bystanders or officers raises the wanted level. After a three-second dispatch delay, up to three existing patrol cars drive through the street grid to the incident, with flashing lights. Officers get out at their car doors only after arriving and stopping; there is no ring of officers spawned around the player. A patrol that can see a fleeing car chases it directly and aims ahead of it. Out of sight, units drive to your last known position and search nearby streets. If you drive off while officers are on foot, they return to their car and resume the chase. At one star, officers try to arrest you on foot: stay still and you are busted, fined up to $500, and released at the safehouse. At two or more stars they open fire. Stop attacking for 12 seconds and stay out of police sight for eight seconds to begin losing heat. Officers then walk back to their cars and patrols return to duty. These are lightweight arcade physics and AI, rather than a full rigid-body/ragdoll engine.

Each destination offers **Midnight delivery** ($650), **Take back the block** ($1,200), and **Heat on the highway** ($950): 21 contracts total. Accept one from Contracts, follow the gold marker, and stop within 12 meters to press E. Combat contracts require eliminating all four gang members; deliveries and escapes require collecting the case first. Lose all wanted stars before collecting your reward. World travel unlocks when you have no unfinished contract or wanted level. You can abandon a contract from its board and restart it later.

| World Tour input | Action |
| --- | --- |
| WASD / arrows | Walk or drive |
| Shift | Sprint on foot |
| Space | Jump on foot / brake in car |
| F | Enter nearby car / exit when stopped |
| J | Shoot or punch; hold to repeat |
| Q | Switch pistol / fists |
| R | Reload (48 rounds, unlimited reserve) |
| E | Collect / deliver / heal at safehouse |
| M / L | World map / contract board |
| Escape | Pause and controls |
| Drag / scroll | Orbit camera / zoom |

On-screen action buttons and mobile movement controls provide the same actions. Menus pause gameplay. Cash, completed contracts, and the selected city save locally under `little-city-world-v1`; unfinished contracts restart after a page reload. If browser storage is unavailable, a message in Contracts explains that progress lasts for the session. Original guest saves are separate and preserved.

Use **Pause → Original neighborhood** to return to the existing neighborhood, community jobs, lounge and music. **World tour** returns to action mode. The original neighborhood documentation follows below.

Run `npm test` for movement, mission, combat, pursuit, street-life, save validation, and legacy gameplay checks; `npm run build` creates the production bundle. `npm run test:browser` builds and runs the maintained production smoke checks for both modes using Playwright. See docs/ARCHITECTURE.md for browser installation and override options.

A cozy React + Three.js neighborhood game. Drive through a living city, meet Maya, and help your neighbors. The former portfolio has become a community hub, cafe, repair shop, market, and public library.

## Play

Enter as a guest and explore freely. The top destination buttons, neighborhood directory, and map let you visit places immediately. **Lounge → Enter the lounge** works from anywhere, as does **Enter hub**. You can also drive around yourself.

Missions are optional and separate from browsing. Open **Journal → Talk to Maya** to take a job, then follow the **gold diamond and map marker**. Use **View task** or press E nearby to perform each pickup, delivery, or repair. Visiting a destination never accepts, advances, or completes a job by itself; saved mission progress is preserved while exploring.

- **The reading club run:** collect six coffees from Nora, deliver them to Eli at the library, and return to Maya. Pays 60 coins, plus 25 if tray condition is at least 80%. Collisions and recovering the car each spill 15% while carrying coffee. You can always finish for base pay.
- **Light up the market:** collect a replacement fuse from Leo, switch the market power off, replace the fuse, and test the lights. The lights visibly turn on after the repair. Return to Maya for 90 coins. An incorrect sequence resets the repair puzzle without losing the job.
- **Someone’s whole afternoon:** find the canvas bag at the south side of the fountain park. Park at the community hub, enter on foot, and walk to the lost & found desk to identify its owner. Report back to Maya for 75 coins.

Jobs unlock in that order. Finish all three to become a **Neighborhood favorite**, then ask Maya for another shift. Coins carry over. There are no time limits. The journal shows the current job, inventory, and saved progress.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Drive outside / walk inside the hub |
| Space | Brake outside / jump indoors |
| Shift | Run indoors |
| F | Wave indoors |
| E / Enter | Interact nearby |
| R / Recover | Recover car to the hub / reset indoor character |
| Drag / scroll | Orbit / zoom the camera |
| Map view | Overview of the city and objective marker |

Touch screens have directional controls, a brake outside, and Run / Jump / Wave inside. Use Enter hub from anywhere to enter. Your car parks outside the destination while you walk indoors. Menus pause player movement. The car collides with buildings, street furniture, and traffic; the character respects furniture and walls.

## Studio Lounge

The **Studio Lounge** sits directly north of the community hub, at the middle of the north street. Click **Lounge** in the top menu or directory and choose **Enter the lounge**; no driving, parking, or mission is required. It has sofas, a record console, speakers, and a close third-person walking view. Furniture and walls block movement.

**Music is switched off for now** while the song library moves to Supabase Storage (`MUSIC_ENABLED` in `src/config/musicConfig.js`). The lounge stays open, and the console says music is coming soon. When it is re-enabled, the features below return unchanged.

Use the **Music console** button inside, or walk to the decks and press E. The music library includes:

- **Downloads:** two included MP3 recordings by Kevin MacLeod, **Carefree** (acoustic/pop, CC BY 4.0) and **Local Forecast - Elevator** (jazz/lounge, CC BY 3.0). They are served from `public/music/`, with attribution and license links in the console and [music credits](public/music/CREDITS.txt).
- **Popular:** official YouTube players for Ed Sheeran's **Perfect** and Coldplay's **Adventure Of A Lifetime**.
- **Worship:** official YouTube players for **What A Beautiful Name** by Hillsong Worship and **Oceans (Where Feet May Fail)** by Hillsong UNITED.
- **Originals:** the synthesized **Window Seat**, **Last Light**, and **After Hours** loops.

Press **Play music** for recordings and loops; playback is never automatic. Volume and Pause controls are provided. You can also select an audio file from your device; it stays local and is not uploaded. Closing the console keeps this audio playing inside the room. Leaving the lounge, switching guests, or hiding the tab pauses it. A returning visit does not restart playback automatically.

Online songs require internet access and play through visible YouTube controls after you select a song. Online videos stop when the console closes, the category changes, you leave the room, or the tab is hidden. Each has an **Open on YouTube** fallback for unavailable embeds. These commercial recordings are not downloaded or bundled. Add further official video IDs to `src/models/musicLibrary.js`; only put recordings with redistribution permission in `public/music/` and include their credits.

Waves use articulated shoulders, elbows, and wrists; walking and jumping include knee motion. Jump cannot retrigger in midair, and a held wave key does not loop the gesture. Keyboard and pointer controls combine, so holding the on-screen Run button while pressing W works. Releasing either input or changing rooms clears the appropriate controls.

## Guests and saves

Guest names and job progress are stored locally under `little-city-guests-v2`. The journal's **Switch guest** option allows separate saves on one browser. Returning visits resume the active guest and any carried item; the car starts at the hub. There are no server accounts or multiplayer sessions. Anyone sharing the browser can resume its saved guests.

Old `city-studio-guests-v1` guest names are imported if no game save exists. The new jobs start fresh; the old save is retained. If storage is unavailable, play continues in memory for the current visit.

## City, time, and weather

Six pedestrians, three cars, two cyclists, and Maya populate the neighborhood. Traffic follows the streets and yields to your car. Reduced-motion preferences stop ambient actors and hide precipitation.

Auto lighting follows the device's time zone: dawn at 5–6 AM, dusk at 4–6 PM, and night from 6 PM. Morning and Night let you preview lighting. Weather comes from the [Open-Meteo forecast API](https://open-meteo.com/en/docs), using Manila by default. **Forecast & location → Use my location** requests browser permission; approximate coordinates are sent to Open-Meteo and are not stored. Conditions refresh every ten minutes. The panel reports stale or unavailable data when needed.

Rain covers the entire city in fixed world coordinates. Weather includes clouds, rain, snow, and fog; precipitation is hidden inside the hub. Weather is forecast data, not a physical sensor reading. See [Open-Meteo's project](https://github.com/open-meteo/open-meteo) for provider licensing and attribution.

## Develop

Use Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
npm test
npm run build
```

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Vite serves localhost, normally port 5173. Deploy `dist/` to static hosting. Gameplay needs WebGL 2; the journal remains readable if rendering fails.

- `src/models/neighborhood/missions.js`: job stories, objective order, inventory, rewards, and save validation.
- `src/models/neighborhood/gameLocations.js`: destinations and distance checks for interactions.
- `src/scenes/neighborhood/jobScenery.js`: objective marker, coffee cargo, lost bag, and repairable market lights.
- `src/scenes/neighborhood/loungeScenery.js`, `src/views/neighborhood/LoungeDialog.jsx`: listening-room geometry and music controls.
- `src/services/musicEngine.js`, `src/models/musicLibrary.js`, `src/hooks/useMusic.js`: original Web Audio loops, licensed recording and official video catalogues, local-file playback, volume, and audio cleanup.
- `src/models/neighborhood/controls.js`: combined keyboard and touch input.
- `src/views/neighborhood/`, `src/controllers/useNeighborhoodController.js`: guest entry, journal, task interactions, controls, and HUD.
- `src/hooks/useGuest.js`: guest persistence and migration.
- `src/views/neighborhood/CityCanvas.jsx`, `src/scenes/neighborhood/cityScenery.js`, `src/scenes/neighborhood/cityLife.js`: scene, neighborhood geometry, and ambient actors.
- `src/models/neighborhood/driving.js`, `src/models/neighborhood/characterMovement.js`: driving, walking, and collisions.
- `src/hooks/useEnvironment.js`, `src/scenes/neighborhood/lighting.js`, `src/scenes/neighborhood/weatherScene.js`: weather, clock, and atmosphere.

All characters, vehicles, and scenery are procedural geometry. No model downloads or API keys are required.

## Maintenance checks

Run `npm test` for gameplay, architecture and security regressions, `npm run test:architecture` for dependency boundaries, `npm run test:browser` for production browser checks, and `npm run audit:security` for known dependency advisories. Browser snapshots are generated under `test-results/`; test code belongs under `tests/`. Production hosting must apply the response headers described in [Security boundaries](docs/SECURITY.md).
