# Multiplayer: shared world

Players in the same city see each other: each player's own character look, a name tag, their car while they drive, and a dot on the minimap. The world map shows how many people are online in each city. Positions are sent about 10 times a second (once a second while standing still) and smoothed on arrival.

What is shared and what is not:

| Shared | Per player (not synchronized) |
| --- | --- |
| Position, heading, speed, jumping | Traffic, pedestrians, street spots |
| Driving and the car's pose | Police, wanted level, contracts |
| Character look and name, current city | Combat, blood, ragdolls, physics |

Other players are **ghosts**: visible, not collidable, and they cannot be attacked. Running one physics world for everyone would need an authoritative game server. It is a much larger change than presence.

## Transports

- **Online (Supabase Realtime)**: used when the build has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Each browser signs in anonymously and joins two private channels: `little-city:lobby` (presence: who is online, and in which city) and `little-city:city:<id>` (presence for look and name, broadcast for positions). The HUD chip shows "Online · N other players here".
- **Local**: without those variables, tabs of the **same browser** share the world over `BroadcastChannel`. There is no network traffic. The HUD chip shows "Local · N other tabs". It is useful for trying the feature and is what the browser test uses. It does not connect different devices.

## Setting up Supabase (once)

1. Create a project at supabase.com (the free tier is enough for small groups).
2. **Authentication → Sign In / Providers**: turn on **Allow anonymous sign-ins**. Consider enabling CAPTCHA or Supabase's rate limits for anonymous sign-ups if the game becomes public.
3. **Realtime → Settings**: turn off **Allow public access**, so only private channels with policies work.
4. **SQL editor**: run `supabase/realtime-policies.sql`. It allows signed-in (including anonymous) players to send and receive Broadcast and Presence on the lobby and the seven city channels, and nothing else.
5. **Project Settings → API**: copy the Project URL and the anon (publishable) key.
6. **Vercel → Project → Settings → Environment Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production (and Preview if wanted), then redeploy. For local development, put the same two lines in `.env.local` (git-ignored; see `.env.example`).

Never use the service-role key in a `VITE_*` variable: everything prefixed `VITE_` is bundled into public JavaScript.

## Security and limits

- The anon key is public by design. What protects the channels is anonymous sign-in plus the Realtime policies: only authenticated clients can use private channels, and only on the game's topics.
- Every incoming state and profile is untrusted. `models/worldTour/multiplayer.js` clamps positions to the map, normalizes rotations, rebuilds looks from the known options and names as plain text (24 characters). It drops players who send more than 25 messages a second, renders at most 24 others (nearest first), and forgets players silent for 6 seconds.
- Positions are accepted only from players present in the city channel. A modified client could still claim another player's presence key, because Realtime policies cannot check payload contents. Since ghosts cannot affect anyone's game, the impact is limited to what is drawn; an authoritative server would be needed to prevent it.
- The deployed HTTP policy (`vercel.json`) allows connections to `*.supabase.co`. Each build's meta policy names only its configured project, and browsers apply both, so a build connects only to its own project.
- Realtime usage counts messages delivered: 10 per second per player, times the other players in the same city. Check the project's Realtime quotas before a large event.

## Code map

- `config/online.js`: build-time Supabase settings.
- `models/worldTour/multiplayer.js`: message format, validation, rate limits, the roster and interpolation (Node-tested).
- `services/multiplayerClient.js`: the Supabase and local transports behind one interface.
- `hooks/useMultiplayer.js`: connection lifecycle, sending, city switching and the HUD summary.
- `scenes/worldTour/adventureScene.js` (`updateRemotes`): drawing other players.
- `tests/unit/multiplayer.test.js`, `tests/browser/smoke.mjs` (two tabs joining, moving and leaving).
