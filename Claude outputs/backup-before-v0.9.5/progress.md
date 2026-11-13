# Unicorn Adventure - progress log

Open world 3D unicorn game for kids (ages 5 to 12). Browser based (Three.js). Runs by opening `index.html` (or the single-file build in `dist/`), with no server and no build step.

## How to play
- Open `dist/unicorn-adventure.html` (one self-contained file, about 1 MB) or `index.html` in a modern browser. Works offline.
- Keyboard: WASD / arrows move, Shift gallop, Space jump (press again in the air to flap, hold to glide), E pet / wish at the fountain / say hi to townsfolk, F feed, R play, Q or Enter horn magic, C cycle spell (or 1-4), N skip time of day, P dream ride (autopilot), ` show or hide the fps readout, B friends book, H help
- Mouse: drag to look around, wheel to zoom
- Touch (tablet/phone): left joystick, on-screen buttons, drag the scene to look
- Gamepad: left stick move, right stick camera, A jump, X magic, B pet, Y feed, LB play, RT gallop, d-pad right = spell, d-pad up = time
- Debug helpers: add `?autostart=1&coat=2&name=Alex&debug=1` to the URL. Also `hour=21&freeze=1` (time of day), `grass=0` (no grass), `keepgrass` (never auto-drop the grass on slow devices)

## Decisions (made with Alex)
- Ages 5-12, built on imagination and whimsy
- Look: Cotton-candy dreamland (soft pastels, rainbow skies, lollipop trees)
- Core loop: free exploration, befriend and collect creatures, small quests, mini-games
- Interactions: pet and feed, play together, sparkle magic from the horn
- Unicorn: gallop, jump, glide. Grows over time by unlocking gear
- World: one big seamless landscape
- Tech: Three.js r158 in the browser, keyboard + mouse + gamepad + touch controls
- Defaults chosen by me: single player, no fail states, no ads or online, progress saved locally

## Log
### Session 1 (Thu 5 Nov 2026)
**Foundation and world**
- Project set up, Three.js r158 vendored in `lib/` so the game works from file:// and offline. Classic script tags and one global `UA` namespace (no bundler)
- World: analytic height function (seamless terrain), vertex-colored toon terrain, 5 ponds, candy mountain ring at the edge, ~250 lollipop trees, giant mushrooms, ~4000 tulips, drifting clouds, rainbow arch landmark, gumdrop bushes (treat pickups that regrow after 30s)
- Four named regions with a toast when you cross in: Rose Grove, Minty Meadows, Lilac Hills, Sunny Glades (start area is Sparkle Meadow). Each has its own tree palette and ground tint
- Look: toon shading (4-step gradient), fog, sky dome, blob shadows, point-sprite particles (circles, sparkles, hearts)

**Unicorn**
- Procedural cartoon model (rainbow mane/tail, saddle pad, wings that open when gliding), gallop/trot gait, jump, flap, glide, slope alignment, water wading, rainbow trail when galloping/gliding, horn magic (burst, flowers sprout, nearby creatures dance)
- Camera: chase camera with drag-to-look, auto swing behind, zoom, speed FOV. Collides with tree crowns and mushroom caps: it lifts the pitch first, then pulls in if still blocked

**Creatures and quests**
- Species: Cloud Bunny, Gumdrop Dragon, Sparkle Fox, Cotton Sheep (30 total), each with its own behaviour (bunnies flee, foxes are curious, etc.). Wander, follow, play, dance, eat. Pet, feed, play. Up to 3 followers. Hearts per creature (0-3)
- Quests (one at a time, no failing, a yellow "!" floats over the giver): Find the baby bunnies (hide behind mushrooms, pink sparkle beacons), Feed the dragon three gumdrops, Catch the fox three times (tag). Rewards are treats and a best friend
- Unlocks: Flower Garland (2 friends), Star Clip (5), Sparkle Bow and Anklets (9)
- Mini-game: Rainbow Ring Run (8 rings that climb, so you need to glide)

**UI, audio, saving**
- HUD, speech bubbles, creature prompt (Pet/Feed/Play), friends book, start screen with live coat preview and name, touch controls, help
- Audio: synthesized sound effects and a gentle generative lullaby (no audio files)
- Save: localStorage (name, coat, treats, friends, quests, unlocked gear). All access is wrapped in try/catch

**Performance and robustness**
- Adaptive resolution: pixel ratio steps down if the frame rate stays low, and back up if it recovers
- Gamepad polling wrapped in try/catch (blocked in some embedded pages)
- Tree triangle budget reduced (secondary crown blobs use low detail). Roughly 520k triangles and 380-490 draw calls in the busiest view

**Testing (headless Chromium, SwiftShader, ~10 fps so game time runs slow)**
- No console errors in soak runs. Verified: movement, jump, flap, glide, pet, feed, play, magic, all three quests (babies and hungry completed, tag progressed), iPad touch layout, single-file build loading and rendering
- Not tested on real hardware (no GPU in the sandbox). First thing to check when you play: frame rate on the iPad

**Packaging**
- `build_single.py` bundles everything into `dist/unicorn-adventure.html` and `dist/unicorn-adventure.fragment.html` (the same page without html/head/body, used to publish it as a shareable web page)
- Run `python3 build_single.py` after any code change to refresh the single-file build

### Notes
- Three r155+ uses physical light units, so light intensities are about PI times the old values (hemisphere 2.15, sun 1.3). ShaderMaterials need `linearToOutputTexel` for correct colour
- Forward is +Z; `yaw` rotates +Z toward +X
- The three.min.js deprecation warning in the console is harmless (r158 UMD build)
- Link to Alex's computer dropped mid-session, so files were not written to his project folder (`Cartoon Kids Unicorn Adventure` under OneDrive/Programming). Everything is delivered as a zip and a playable page, and can be copied into the folder once the link is back

## Magic Update (v0.3)
Brainstormed 12 ideas, picked the ones that add a new *kind* of play and fit the cotton-candy tone. Ruled out anything with fail states, scary content or text-heavy puzzles. All of these are built and tested headlessly.

1. **Day/night with twilight glow** (`js/daynight.js`) - sky, light and fog shift through sunrise, day, sunset and night over a 10 minute day. Stars, an aurora, a sleepy moon, fireflies, glowing flowers/mushrooms, a glowing horn light. Wild creatures fall asleep at night (Zzz) and wake with a yawn when you come near; friends stay up. Shooting stars: cast magic under one to wish (+2 treats). `N` skips to the next phase (sunrise, day, sunset, starry night)
2. **Spell wheel** (`js/magic.js`) - Sparkle Burst, Bubble Float (creatures drift up in soap bubbles), Butterfly Swarm (glow moths at night), Rainbow Rain (little rain cloud, flower shower, a rainbow arch you can ride through for a speed boost). Unlocked by making friends. `C` cycles, `1-4` picks
3. **Bouncy mushrooms** (`js/wonders.js`) - land on a giant cap and go boing (squash and stretch). Chain them to reach high things
4. **Gear powers** (`js/unicorn.js`) - Flower Garland leaves a flower trail, Star Clip glides slower and shines, Bow and Anklets walk on water with rainbow ripples
5. **Fairy rings** - glowing mushroom rings in pairs; ride in and whoosh to the twin across the map
6. **Wishing fountain** - toss in 2 gumdrops (E) for one of 9 wishes: flower shower, gumdrop rain, creature party, rainbow, starry night, giant unicorn, teeny unicorn, shooting stars, bubble party
7. **Rainbow Chimes** - eight musical stepping stones, plus the "copy the song" quest from Cotton Sheep (3 rounds of 3, 4 and 5 notes)
8. Rainbow arch speed boost

Fixes found while testing this round:
- The chime songs originally skipped pads (0, 2, 4), which is impossible to play by riding along a row. Songs are now step-wise (0-1-2, 3-2-1-0, 1-2-3-4-3), pads fire once when you step on (not while you stand), a wrong first note is ignored and a wrong later note replays the demo (never a fail)
- Particle sizes are capped to 16% of the screen height so a sparkle next to the camera cannot fill the view

## Visual upgrade (v0.4)
Asked for by Alex: better visuals at low GPU cost, varied grass, a nicer unicorn, sparkles while running.
- **Grass** (`js/grass.js`) - a ring of ~9,200 tufts that follows the unicorn, drawn in ONE draw call (about +55k triangles). Tufts come in four kinds (regular, thin tall wisps, fat short clumps, big shaggy tufts), pastel green tints with a few pink/lilac/buttercup ones, nudged toward the local region colour. Wind sway in the vertex shader, grass parts and lies down around the unicorn, shrinks to nothing at the edge so nothing pops. No grass in ponds, on beaches, high peaks, or under the fountain, chimes and fairy rings. CPU cost is only recycling the cells that scroll in. If a device is still under 26 fps at the lowest resolution for ~5 seconds the grass switches itself off (never in `debug` mode)
- **Unicorn** (`js/unicorn.js`) - coat shader with a soft pastel rim light and twinkling glitter (no extra draw calls); big glossy violet eyes with highlights and lashes; spiral striped horn with a twinkling star at the tip that flares when you cast; fuller mane and tail; fluffy coloured fetlock cuffs; a glowing star cutie mark on each flank. About 25 extra draw calls
- **Running sparkles** - on every footfall the hooves throw star glitter, and while galloping or gliding glitter drifts off the mane and tail and floats up. Stars twinkle (new `twinkle` option in `FX.emit`)

- **Dream ride** (`P`) - the unicorn wanders, gallops, hops, glides and casts magic on its own; steering or pressing P again takes over. For little ones who want to watch, and a handy way to soak-test on a real GPU
- **Frame-rate readout** - press the backtick key (`) any time to show fps, pixel ratio, whether the grass is on, draw calls and triangles

## Unicorn rework (v0.5, Thu 5 Nov 2026 evening)
Alex: "The unicorn model and running animations suck. Can you rework them", and asked whether additive blending with a blurred canvas circle makes sense for sparkles and magic (yes, see below). Later: the camera moved awkwardly in and out, especially when flying.
- **New body** (`js/unicorn_rig.js`, `js/unicorn.js`) - no more stacked balls. The torso, neck, head and legs are smooth lofted shells built from elliptical rings (`R.Loft`): barrel body with a deep chest and rounded haunches, an arched two-piece neck, a proper head with a pink muzzle patch, and tapered legs with knee and hock bumps, fluffy fetlock cuffs and flat gold hooves. About 5k triangles, all drawn with the same coat shader (rim light and glitter) as before
- **Real gaits** - walk (4 beats), trot (diagonal pairs), canter (3 beats) and gallop (4 beats with a flight phase), blended by speed (`GAITS` table in `unicorn.js`). Each hoof lands where the ground is moving under it (stride length = speed x stance time / stride rate), so there is no foot skating. Legs are solved with two-bone IK, so the knee and hock bend naturally and the hoof lands flat. Body height follows how many hooves are down, the spine arches when the legs gather and hollows when they stretch, the body curves into turns, the neck stretches and nods with the stride, tail carriage rises with speed. Jump, rise, fall and glide have their own leg poses (tucked, reaching, stretched out)
- **Flowing mane, forelock and tail** - 12 mane locks down the crest, two forelock curls and a fan of 9 tail locks, each a tapered tube that trails like hair (chain of points with inertia, pulled toward a hanging pose or streaming back when running, with a flutter). One draw call, simulated on the CPU (a few hundred points)
- **Footfall sparkles** now fire from the exact hoof that just landed, and the glitter drifts off real points on the mane and tail
- **Soft additive glow** (`js/effects.js`) - every sparkle, heart and rainbow-trail puff now has a second, larger, blurred halo drawn with additive blending (radial falloff in the shader, which is the same look as a blurred canvas texture without the texture fetch). It stays gentle by day and glows at dusk and night. The horn star is additive too. One extra draw call
- **Camera** - the camera now sits at a fixed offset from a smoothed focus point instead of trailing behind on its own spring (that spring is what made the distance pulse with every speed change and flap). While airborne the focus follows height slowly, the camera no longer gets pulled in by tree crowns when flying, the pitch search is slower, and the speed zoom is subtle (62 to 66 degrees) and driven by a smoothed speed
- **Camera, final structure** - the camera keeps a smoothed *offset* from a smoothed focus point rather than chasing on its own spring. Measured on a scripted gallop-and-fly route: standard deviation of the camera distance fell 46%, and the fastest in/out zoom fell from 24.6 to about 10 units per second. The height lag is soft-capped (tanh), the xz focus is locked tight to the unicorn, the obstacle pull-in has a floor (the camera is never pulled closer than 70% of the way), and tree crowns are ignored while flying
- **Trail and glitter toned down** - the rainbow trail and mane glitter were hiding the unicorn from the rear camera. Trail puffs are smaller and softer (size 0.55, glow 0.3), glitter is thinner (interval 0.075 minus 0.03 times the speed fraction, size 0.36-0.86), the Star Clip glide stars are smaller, and every particle fades out as it passes within 2 to 6.5 units of the camera
- Test hooks: `unicorn.dbgSpeed` pins the speed, `unicorn.dbgStatic` animates in place

### Real-GPU test (Alex's MacBook Pro, Chrome, 5 Nov 2026 evening)
Ran the published build in Chrome on the Mac and let the dream ride gallop through Minty Meadows, a sunset and a night. Steady **120 fps** (the display's maximum) at pixel ratio 1.75 with the grass on, 166-577 draw calls and 510k-640k triangles. No shader problems: the grass, coat glitter, rim light, sparkles, sunset and night all render correctly. Not yet measured on an iPad.

### Test hooks (v0.3/v0.4)
`UA.dbg.sim(seconds)` fast-forwards game time without drawing. `UA.Wonders._grant('giant', unicorn)` forces a wish (ids: flowers, gumdrops, party, rainbow, night, giant, tiny, stars, bubbles). `UA.Magic.rainState()`. `UA.FX.flowerCount()`. `UA.Grass.refresh()`.

### Tested (headless Chromium, no GPU)
Day/night, all spells, arch boost, bouncing, water-walking, fairy-ring teleport, every wish outcome, giant/tiny camera, fountain flow, the whole chime song quest end to end, garland trail (19 flowers in 3 s), sleeping creatures at night, a 60-step randomized soak across all features (no console errors, state stays finite), iPad and phone touch layouts with the new buttons. About 520-620k triangles and 200-530 draw calls depending on the view.

### Known gaps / things to check on the Mac
- The Mac runs it at 120 fps, but the iPad is still unmeasured. Check it first (press ` for the readout). Quick levers if slow: `?grass=0`, lower the pixel ratio cap in `main.js`, reduce `N` in `grass.js`
- At night the near tree crowns turn a dull beige instead of a glowing blue-violet; the crown night glow could be stronger and bluer
- The giant-unicorn wish makes the camera sit farther back; worth a feel check
- Sunset sky and aurora colours were only eyeballed in screenshots
- The rainbow wish at the fountain spawns an arch right over the fountain; the camera can be inside a leg for a moment
- Sound is synthesized and untested by ear

## Twinkle Town (v0.6, Thu 5 Nov 2026 night)
Alex: "make a main street and town populated by magical creatures in one of the worlds". My choices: put it in Minty Meadows, about 90 units west of the spawn (Main Street runs east-west around world (-85, -14)), on a flattened pad that blends into the hills. Trees, bushes, mushrooms, flowers, grass and wild creature spawns keep out of it.

**The town** (`js/town_build.js`, merged into a handful of meshes)
- Ten candy-coloured shops, five on each side of a cobbled Main Street: Post Office, Sprinkle Bakery, Gumdrop Candy Shop, Starlight Library, Cozy Cloud Inn, Blossom Flowers, Sundae Scoops, Twirl Top Hats, Wands and Wonders, Toadstool Toys. Each has its own roof (gable, hip, dome, witch hat, mushroom cap), striped awning, shop window, door, lanterns and a picture sign (the signs share one canvas atlas, so they cost one draw call and non-readers can still tell shops apart)
- A rainbow gate with a hanging welcome sign at the east end, bunting and string lights across the street, lamps along both pavements, benches, a mailbox, barrels
- A plaza with a fountain, three market stalls and benches, and a town hall at the west end with a clock tower whose hands show the in-game time
- Everything glows at night (windows, lamps, lanterns). Colliders have a top, so the unicorn can glide over rooftops. Camera blockers keep the camera out of the big roofs
- Cost: about 100 draw calls on its own

**The residents** (`js/folk_models.js` builds them, `js/town_folk.js` makes them live). 11 shopkeepers plus 5 jelly-bean kids, each a chubby biped made of ~8 merged meshes sharing one toon material:
- Pixel the fox (postman), Baker Bun the bunny, Gumbo the dragon (candy-maker), Professor Hoot the owl (librarian), Nimbus the sleepy sheep (innkeeper), Madame Maple the hedgehog (hat-maker), Misty the cloud-cat (ice cream), Petal the flower fairy (hovers, leaves a sparkle trail), Wizzle the gnome (wand-maker, wand sparkles), Toby the toadstool (juggles three balls), Mayor Marshmallow (top hat, sash, moustache)
- Five jelly-bean kids in different colours and little hats play tag around the fountain ("Tag! You are it!")
- Each shopkeeper works at their shop front with a different animation (kneading, stirring, reading, scooping, stitching, juggling...), strolls the street now and then (the fountain is routed around), and walks home when the sky gets dark. They go through their own door, shrinking as they step in, and come back out in the morning (staggered, so they do not all leave at once). They keep out of the colliders
- They look at the unicorn, turn to face it when it is close, wave and call out a greeting when it arrives (cooldowns so the bubbles never flood), step aside when it gallops through, and cheer when you cast magic nearby (hooked into `Creatures.dazzle`)
- Press E near one to chat (4 rotating kid-friendly lines each, using the unicorn's own name). Baker Bun and Gumbo give a free treat (once a minute or so, never past 30). The wishing fountain prompt steps aside while a resident is close
- Pixel offers the **Special Delivery** quest (a "!" floats over him by day): bring his letters to Bun, Hoot and Petal. Floating letters mark the recipients, three little letters orbit the unicorn, each delivery is automatic when you ride up, the HUD shows n/3, and finishing pays 6 treats with a fanfare. The recipients stay up past bedtime while it is active. Saved with the game and resumed on load. Creature quests wait while it is active
- Cost: about 99 draw calls (far residents are hidden beyond 105 units), about 90k triangles, and 0.045 ms per frame of game logic

**Tested** (headless Chromium): every shopkeeper close-up for model problems, quest offer to completion, E-chat and gift, quest save and resume across a reload, bedtime (all inside within ~12 s) and morning (all out in ~8 s), dusk walk home, a 90-step randomized soak with time jumps, teleports and key presses (no console errors, no resident left the town or went non-finite), and the single-file build.

**Bugs found and fixed along the way:** barrels beside two shop doors trapped residents on the way to bed (barrels moved to the far side), arriving at a door was blocked by the shop's own collider (they now switch to a walk-in state near the door), the plaza stalls were invisible to the camera.

**Known gaps**
- Not measured on a real GPU or an iPad. The residents roughly double the draw calls in the town view (about 100 to about 200)
- The camera can sit just above the edge of the big mushroom roof when you ride along the south pavement, because the pull-in has a 70% floor (to avoid the in-and-out feel)
- Residents are not in the friends book and have no bond hearts. There is no rider avatar yet
- Sounds untested by ear

## Small fixes (v0.7, Fri 6 Nov 2026 morning)
Alex (three notes): "The unicorn tail and mane need reworking - they're very wide" and "It's very hard to say hi to the townspeople because the UI defaults to showing Puddle Cloud Bunny's dialog box instead. It should be able to show multiple dialog boxes when there are multiple people to interact with".

**Tail and mane** (`js/unicorn.js` hair section, `R.Hair` in `js/unicorn_rig.js`)
- Measured in the game (centre-lines, world units, unicorn about 0.9 wide at the hips): tail 1.8 wide at rest and 1.6 at a gallop, mane about 1.5, forelock curls out to 0.9. Causes: the locks sprayed sideways at rest (lateral rest directions up to 0.5), the streaming "fan" vector is normalised by the rig so the old (1.2, 0.2, 0) meant almost purely sideways, the sideways flutter was +/-0.35, and each lock was a fat flattened tube (radius 0.19, 1.3x wider than deep)
- Now: the tail is seven slim locks (was nine fat ones) bunched into one plume, staggered in length and lift so it still looks full from the side; the mane lies along the crest and falls back down the neck; the forelock curls stay on the brow. Fan vectors are mostly "up" with a hint of sideways, flutter is mostly vertical (new `flut` option on a lock), tube radius is about 0.08 to 0.12 and nearly round (`flat` 1.15), and the tail root sways less
- Result: the tail is about 0.5 wide at every speed and the mane about 0.4 to 0.5 (was 1.2 to 1.8)

**Several prompt boxes at once** (`js/ui.js`, `js/main.js`, `js/town_folk.js`, `js/wonders.js`, `js/input.js`, `index.html`)
- Before: a wild friend within 7.5 units always won, so a bunny wandering through the plaza hid the townspeople's "Say hi" box
- Now every creature, townsperson and the wishing fountain in reach offers a card (`UI.offer`), and up to three sit side by side (two on phones). The nearest is outlined and takes E (pet / say hi / wish), F and R for creatures. **Tab** (or d-pad left) switches who is selected, and any card's buttons can be clicked or tapped directly. A small hint shows when there is more than one card. The selection sticks to the nearest one with some hysteresis so it does not flicker, and a manual pick holds while that card stays close
- Cards are stable (they do not reorder as you move), fade in and out, and sit above the touch buttons on phones. Tested: baker plus a bunny (both cards, Tab switch, E on the picked one, clicking the unselected card, leaving range removes both)

**Roofs were penetrable** (`js/unicorn.js`, `js/world.js`, `js/town_build.js`)
- Alex: "the roof of the town can be penetrated if you fly down into them and get stuck". Cause: building colliders only counted when the unicorn was within 2.4 units of the ground, so at roof height it flew straight through walls and roofs. Once inside, the ring of overlapping collision circles kept shoving it around
- Fix: town buildings, the town hall, the clock tower, the fountain and the stalls are now flagged solid (`bld`) and block at any height. The town builds a coarse top-surface map from its real merged mesh (`Town.surf`, 0.6 unit cells, about 5 ms): roofs, awnings, canopies, the clock tower. The unicorn lands on those from above (feet at or above the surface, give or take a 0.6 step), stands on them, rides across them and falls off the edges. Under an awning at street level the surface is ignored, so riding along the pavement is unchanged
- Tested: dives onto all 11 buildings (roof centre, corners, edges), riding off, flying into every shop front at five altitudes and three offsets (no sinking), a 280-check random-input soak in town (no sunk or non-finite positions), a jump under an awning, and close-up views standing on the red roof, the mushroom cap and the witch hat
- Side effect worth knowing: the unicorn can now stand on a roof, which a kid will love. The camera copes (the roof blockers only pull it in when the ray crosses them)

## Simpler for little kids (v0.8, Fri 6 Nov 2026 afternoon; map view rolled back that evening)
Alex: "We need to make it simpler for little kids - and should allow unlimited feeding" and "The WASD control scheme is not intuitive for little kids, can we shift to a more top down view and use the arrows to go North, South, East, West".

**Unlimited feeding** (`js/creatures.js`, `js/ui.js`)
- Feeding no longer needs or uses gumdrops: the treat gate and the decrement are gone from `Creatures.feed`, the card button just says "Feed" (it used to show a count and grey out at zero), and the card no longer re-renders when the count changes
- Gumdrops are now only for wishes at the fountain (2 each) and are still collected from bushes, bakery, quests and rings. The HUD counter stays for that. Whether wishes should be free too is an open question for Alex

**Map view: tried, then rolled back as the default** (`js/unicorn.js` ChaseCam, `js/input.js`, `js/main.js`, `js/ui.js`, `index.html`)
- First cut: a north-up camera looking down from the south at about 57 degrees, so the arrow keys read as North / South / East / West, with a compass chip. It worked mechanically (Up is -z, Right is +x, Down is +z, Left is -x; touch stick, V toggle and dream ride all checked)
- Alex's verdict (same afternoon): "now we can't see the environment. Sorry, go back." The steep angle hides the horizon, the mushrooms and the distant friends, which is much of the charm
- Now: the over-the-shoulder camera is the default again, exactly as in v0.7 (pitch 0.3, FOV 62, drag to look, swings behind when running). The map view is still in the code, one key away: **V** toggles it, and the compass chip only shows while it is on (tap the chip to go back). The saved choice lives in `state.camView` (default 'chase'); the v0.8 `view` key is ignored so saves from the first cut do not stay in map view
- Dream ride (P) now steers by compass heading rather than "forward"; checked in both views
- If the arrows-as-compass idea is revisited, a middle ground is worth trying: a lower angle (about 35 degrees), wider FOV and a camera that is fixed to North but still shows the horizon

**Camera pulled back** (Sat 7 Nov, Alex: "Pull the camera back a bit so we can see more")
- Behind view default distance 9.2 to 12.5 and pitch 0.30 to 0.33 (about a third farther back, a little higher); the scroll-wheel zoom now goes out to 26 (was 18). Checked in the meadow, down the Twinkle Town street and in the air

**Arrow keys follow the child** (Sat 7 Nov, Alex: "In play testing little kids can't use the WASD controls intuitively. They use the arrows to go the way they want to go so if they push left or down we need the camera to move to follow the unicorn")
- Cause: the behind camera only swung round behind the unicorn in proportion to how hard Up was held (`k = 0.35 + input.y`), so Left got a weak swing and Down none. The unicorn would run off sideways, or towards the camera, and the child could not see where it was going
- Now (`ChaseCam.update` / `steerYaw` in `js/unicorn.js`, `keyOnly` in `js/input.js`, `js/main.js`): for the arrow and WASD keys the view turns round behind the unicorn whichever way it goes (up to about 2.2 rad/s, so a quarter turn takes about a second and a U-turn about two), and keeps turning for 2.4 s after the key is let go so the next push starts from a view that matches how the unicorn faces
- To stop the turning view feeding back into the steering (hold Left and spiral), each new key combination locks in "which way is that on screen right now" and holds it while the key stays down. So Left means "go to the left of what I see" and goes straight that way; tapping Left again turns another quarter. The latch only applies to keys; touch stick and gamepad keep the old live mapping and gentle swing, and the dream ride and the V map view are unchanged
- Tested headless with real key events: Left from north runs a straight line west and the view follows round in about 2 s; Down from west turns the unicorn about and the view swings round behind it; a tap of Left then Up carries on the way the unicorn faces; Up+Right goes straight north-east. Also the Down turn-around in Twinkle Town street and the 280-check town soak (no problems)
- Open: a hold-to-circle steering style for older kids is gone for the keyboard (a held direction is a straight line). A "steering wheel" option could come back later if wanted

## Cartoon graphics rework, phase A: inked outlines and bold cel shading (v0.9.0, Sat 7 Nov 2026)
Alex: "Let's rework and upgrade the graphics to make them more cartoon and fun." His choices: inked outlines with bold cel shading; all four focus areas (the unicorn, creatures and townsfolk, the world, motion and fun); spend more GPU and add a Quality switch.

Plan: A (this entry) is the rendering look. B is the unicorn redesign, bigger-eyed creatures and folk, and squash-and-stretch motion. C is the world palette (sky, clouds, trees, grass, water, a bolder town).

**What changed** (new `js/cartoon.js`, plus small edits in `core.js`, `daynight.js`, `main.js`, `input.js`, `ui.js`, `index.html`, `town_build.js`, `world.js`, `effects.js`, `unicorn_rig.js`)
- **Cel shading.** Every material was already a toon material; the lighting bands are now four crisp steps (0.2 / 0.42 / 0.86 / 1.0) instead of three soft ones. The dark bands are tinted lavender-blue rather than grey, and the final colour gets a 1.3x saturation lift. Done by patching three's toon shader once, so it costs next to nothing. A `GLOSS` flag exists for a crisp white sun-glint dab on shiny things (not applied to anything yet)
- **Lighting.** Sky light turned down (x0.66) and the sun turned up (x1.7), because the old flat 2.15 sky light washed every colour out to pastel and flattened the bands. Sunrise, sunset and night scale the same way
- **Inked outlines.** Each solid mesh gets a dark-plum shell (an inverted hull pushed outwards in screen space), so every line is about 2.3 px wide on screen at any size, thinning to half with distance. Fog-aware, instanced meshes supported (trees, rocks), hair included. Smooth push directions are welded by position so hard-edged boxes (the shops) keep closed outlines. Tiny things, glass, glow sprites, flowers and anything transparent are skipped; outlines beyond about 95 units are switched off; props that appear later are outlined by a rescan every 1.2 s
- **Cobblestones.** The old ones were near-white on near-white; now saturated candy stones (pink, apricot, mint, sky, lilac, butter) on deep grape grout
- **Fancy / Simple switch.** G key, or the new button in the help panel. Fancy = outlines on; Simple = outlines off (the cel shading stays, it is free). Saved with the game. The frame governor now drops to Simple by itself if Fancy cannot hold about 34 fps, after lowering the pixel ratio and before turning the grass off. `?keepfancy` turns that fallback off for testing

**Cost, measured in the headless GPU-less renderer, Twinkle Town main street:** 847 draw calls and 985k triangles in Fancy; 729 calls and 957k triangles in Simple. So outlines add about 16 percent more draw calls and 3 percent more triangles. Not yet measured on the Mac GPU or an iPad

**Checked:** meadow, the town street, close-ups of the unicorn and creatures, Simple mode and the toggle button label. Not yet checked: night and sunset colour of the outline, the soak run, an iPad

**Known rough edges for phases B and C:** the unicorn's pink muzzle is oversized from the front; the sky, grass and clouds are still pale next to the new town; creatures and folk still have small eyes

## Cartoon graphics rework, phases B and C: characters, motion and world palette (v0.9.1, Sat 7 Nov 2026)

**Phase B: the unicorn** (`js/unicorn.js`, `js/core.js`, `index.html`)
- Rounder, cuter head: the head shape is a bigger, rounder cranium with a much shorter, softer muzzle (the old one was long and the pink patch covered a third of the face), and the whole head is scaled 1.1x. The pink patch is now a small nose patch only
- Bigger eyes (1.2x) set further forward and closer together so the face reads from the front, not just the side; bigger lashes and cheek blush; nostrils and smile moved to the new nose. Ears and horn re-seated on the rounder skull
- Chunkier legs (about 20 percent thicker, leg lengths and gait untouched), bigger hooves and socks
- Richer coats: Rose, Lilac, Mint and Sky are more saturated, and two new coats were added, Sunny and Peach (7 in all; the picker shrinks on phones so they fit). Saved games keep their coat choice because the first five keep their positions
- Shiny: the coat, muzzle, horn and hair now get a crisp white sun-glint dab (the new `GLOSS` flag in `cartoon.js`), which shows on the coloured coats
**Phase B: creatures and townsfolk** (`js/creatures.js`, `js/folk_models.js`)
- Wild friends: eyes 1.38x bigger with a second little sparkle highlight
- Townsfolk and the town kids: eyes about 25 percent bigger, a larger main highlight and a second small one, so Bun, Gumbo, Pixel and the kids look wide-eyed and friendly. (The owl professor already had big spectacle eyes)
**Phase B: motion**
- Squash and stretch (a spring on the unicorn's body, scaled about the hooves so the feet stay planted): springs up tall on a jump (more on the double-jump), stretches slightly in the air by speed, squashes flat on landing in proportion to how hard it hit (up to about 15 percent shorter and 7 percent wider) and wobbles back, plus a tiny idle bounce
- Rainbow star ring: a ring of 7 stars at take-off, and 8 to 24 on landing depending on the fall (`FX.ring` in `effects.js`)
- Blinking was already there
**Phase C: the world** (`js/world.js`, `js/core.js`, `js/main.js`)
- Candy ground colours: mint, lime, aqua, pink meadow, sand, pond beds and lavender hills are all one step more saturated; the four region tints, tree crowns (per region and the scattered ones) and the water (a brighter sky-blue, a little more opaque) too
- A real sky: the chase camera only ever sees the bottom 13 degrees of sky, which used to be the pale pink horizon band, so the world never looked like it had a blue sky. The sky gradient is now much tighter (pink glow at the horizon, blue by about 12 degrees up), so the sky at the top of the screen is a bold blue, and the clouds read as white fluffs against it
- The mountain ring is about 40 percent lower (30 to 56 tall instead of 50 to 90) with snow-capped tops and lighter lavender rock, so the sky shows above the hills instead of a pink wall. Side effect: a few trees and mushrooms near the world edge moved, and about 5 more trees appeared
- Thinner fog (0.0043 to 0.0028) so distant hills keep their colour, and the base sky and fog colours are a little richer
- Lighting: sky light x0.66, sun x1.7, bands 0.2 / 0.42 / 0.86 / 1.0, saturation 1.3 (from phase A, baked in)
**Checked:** dawn, day, sunset and night in the town (outlines read at night), the meadow, the start screen on desktop and phone width, jump and fall squash (sampled frame by frame and screenshotted), the random-input soak (60 steps) and the 280-check town soak (4 flags, all riding under the rainbow gate arch at the west end, which the test counts as "inside" because the arch is a tall surface; the old build did not visit that spot with the same random seed)
**Not yet checked:** a real GPU or iPad (outline cost), the look of the Sunny Glades and Rose Grove border (the ground there is a muted peach, a little dull next to the rest), wild-creature faces up close from the front, and the night meadow from the normal chase view

## Idle glitter-poop gag (v0.9.2, Sat 7 Nov 2026)
*Retuned in v0.9.3 (below): about 20 seconds of standing still instead of 4, and a pile about half the size. The numbers in this section are the original v0.9.2 ones.*
Alex asked: "Make the unicorn do glitter poops if the user is idle for a few seconds".
- **Trigger** (`updatePoop` in `js/unicorn.js`): during play only (never on the title screen), when there has been no input at all for about 4 seconds (3.6 to 5.2, re-rolled each time) and she is standing on the ground (not in the air, not swimming, not giant). Any key, stick, tap, jump, magic, pet/feed/play, camera drag or menu key counts as input, and so does the dream ride. At least 6 seconds between gags, so a roughly 8 second rhythm while you keep standing still
- **The gag** (about 3.9 s): the tail lifts and trembles, she squats (the legs bend), screws her eyes shut and lays her ears back, with a little wobbling hum and a shimmer of glitter at the tail. At 0.85 s a soft-serve swirl of three pastel rainbow layers plops out behind her, one layer every 0.34 s with a squishy overshoot, a rising "bloop" each and a curl on top. Then a happy hop, a chirp and two hearts, and she glances back over her shoulder at it
- **The pile** (`js/glitterpoop.js`, new): drawn 1.3x oversized so small eyes can spot it, glossy and outlined, twinkling glitter around it. After 7.5 s it pops into stars and hearts, or at once if you bump into it (after the first 2 seconds). At most 3 at a time (the oldest pops to make room). Three piles are built once and reused, so nothing is created or leaked while she stands about
- **Interrupting:** any input before the plop cancels the whole thing (she thinks better of it); input after the plop ends the gag and leaves the pile
- **Safe spots:** it only happens when there is flat dry ground right behind her (no cliff edge, no water unless she has the rainbow anklets). A giant unicorn makes a giant pile
- Works the same in Simple mode (outlines off) and at night (the pile glows a little)
**Checked:** the full sequence in frames (wind-up, plop, relief, look-back, sparkling, pop) in the meadow and the glades at 2x; night; Simple mode; cancel before and after the plop; no gag while jumping or on the title screen; the cap of 3 piles; bumping a pile; the outline list does not grow with use (12 meshes outlined once); an idle soak at 6 places x day and night x 2 sizes (no NaNs, every pile on the ground); the 60-step random-input soak on the built single file, no console errors
**Not yet checked:** the sounds by ear (hum, bloops, chirp), the timing by eye on the Mac, and whether about 4 s is the right amount of "a few seconds" for kids

## Smaller, rarer poops and animals that play by themselves (v0.9.3, Sat 7 Nov 2026)
Alex asked: "I think they shouldn't have to do anything for the animals to play and frolick. Unicorn poops are too big and too frequent, they should take like 20 seconds".
**Glitter poops** (`js/glitterpoop.js`, `js/unicorn.js`)
- I read "take like 20 seconds" as: about 20 seconds of standing still before each poop. The first one comes after 18 to 23 seconds (re-rolled each time), then at least 20 seconds must pass before the next one. Measured on the real defaults with the unicorn standing still: poops at 20.8 s, 46 s and 69.1 s
- Pile size 1.3x down to 0.7x (a little over half its old size, about knee height on her), it now lasts 6 seconds instead of 7.5, and its pop is smaller (14 stars, 2 hearts and 6 sparkles instead of 24, 3 and 10)
**Animals play and frolic with no buttons** (`js/creatures.js`)
- Ambient frolics (`Cr.startFrolic`): when an idle animal's frolic timer is up (the first one 2 to 12 seconds after the game starts, staggered, then every 9 to 23 seconds, 16 to 30 for the sleepy dragons) it picks one of three romps and does it whether or not the unicorn is near: chase a nearby buddy (within 17 units) round in a ring with both animals circling, zoom about to random spots, or spin and leap. 3 to 8 seconds each, with sparkles, a fast tail wag, head up, hops, the odd heart, and one happy chirp at a time so a field of frolickers is a murmur. In a 60 second test with the unicorn parked away, 59 frolics began among about 20 awake animals (5 rings, 44 zooms, 10 spins)
- Auto-play (`Cr.autoPlay`): stand still or ride slowly (under 3.5 speed) within 10 units of an animal (13 for a follower) for 1.3 seconds and it comes over to play: it circles the unicorn for 6 seconds, hopping, sending up hearts and sparkles and calling "Catch me!" or "Let's play!". Wild animals play too, with no need to pet them first; they get hearts but no bond, while a friend earns its bond heart as before. At most 2 play at once, and each then rests 26 to 38 seconds
- Small touches: followers give a happy skip now and then as they trail, and an animal waiting near a standing unicorn gives little excited bounces
- Unchanged: animals still nod off at night (friends stay up), shy bunnies still bolt from a galloping unicorn, the quest's tag fox still runs away, and the Pet, Feed and Play buttons all still work (Play still says "Pet me first" on a wild animal, which is now optional since it will play anyway)
**Checked:** poop timing on the real defaults and pile size in a screenshot; ambient frolic counts with the unicorn far away; a wild sheep auto-plays with no press and earns no heart; a friend earns its heart; a crowd of 5 around her gives at most 2 playing; a bunny and a sheep forced into a ring really circle (positions sampled); a frolic soak across the world at hours 12, 18 and 23 with no bad positions and no animal stuck in a frolic with no data; the 60-step random-input soak on the built single file, no console errors
**Not yet checked:** by eye on the Mac, the sounds by ear, and whether 6 seconds of play and 26 to 38 seconds of rest feel right to kids. Open question: the Play card still shows greyed out for a wild animal, which may now just be clutter

## Next ideas (in rough priority)
1. Check performance on the real target device (iPad), then chunk the instanced props so the GPU can cull them
2. Rider avatar on the saddle, more gear (a hat from Twirl Top Hats, a wand from Wands and Wonders), mane/tail styles
3. More quests and mini-games (flower-picking race, bubble-pop, cloud hopping)
4. More biomes inside the one big landscape (crystal caves, beach, sky islands)
5. More creature species (hatching eggs, baby animals that grow)
6. Photo mode and a sticker book of creatures found
7. Townsfolk follow-ups: a friends-book page for the residents, repeatable mail runs, bedtime stories at the inn, kids who ask for a game of tag, rooftop treasure
8. Parked whimsical ideas: tea party with friends, sparkle-snow weather, hot air balloon rides, treasure maps
