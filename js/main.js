/* Main: scene setup, game state, start screen, main loop */
(function () {
  const UA = window.UA,
    C = UA.C;
  const V3 = THREE.Vector3;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  UA.UNLOCKS = [
    { id: 'garland', name: 'Flower Garland', need: 2, power: 'Flowers bloom where you gallop' },
    { id: 'star', name: 'Star Clip', need: 5, power: 'Glide slower and shine at night' },
    { id: 'bow', name: 'Sparkle Bow and Anklets', need: 9, power: 'Rainbow hooves: run across water!' },
  ];

  const SAVE_KEY = 'ua_save_v1';
  const state = (UA.state = Object.assign({ name: 'Sparkle', coat: 0, treats: 3, bonds: {}, unlocked: [], ringRuns: 0, played: 0, camView: 'chase', quality: 'fancy' }, UA.store.get(SAVE_KEY, {})));
  UA.save = function () {
    state.bonds = UA.Creatures.save();
    state.hour = UA.Time ? Math.round(UA.Time.hour * 100) / 100 : state.hour;
    UA.store.set(SAVE_KEY, state);
  };
  UA.Audio.muted = !!UA.store.get('ua_muted', false);

  let renderer, scene, camera, unicorn, chase;
  let perfAcc = 0,
    perfN = 0,
    maxPR = 1.75;
  let mode = 'loading'; // loading | start | play
  let t = 0,
    last = performance.now(),
    startAng = 0.6,
    frames = 0,
    fpsT = 0;
  const ZERO = { x: 0, y: 0, gallop: false, jumpHeld: false, jumpPressed: false, pet: false, feed: false, play: false, magic: false, book: false, help: false, camDX: 0, camDY: 0, zoom: 0 };

  function setup() {
    UA.initMaterials();
    const canvas = $('c');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    maxPR = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(maxPR);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(C.FOG);
    scene.fog = new THREE.FogExp2(C.FOG, 0.0028);
    camera = new THREE.PerspectiveCamera(62, 1, 0.3, 1800);

    // meshes that belong to the main world (hidden while you are in Starlight Castle; see realm.js)
    const mainWorld = [];
    const track = (fn) => {
      const before = new Set(scene.children);
      fn();
      scene.children.forEach((c) => !before.has(c) && mainWorld.push(c));
    };
    UA.World.build(scene);
    track(() => UA.Town.build(scene));
    UA.FX.init(scene);
    // (Three r155+ uses physical light units, so intensities are about PI times the old values; lights live in daynight.js)
    UA.Time.init(scene);
    state.quests = state.quests || {};
    track(() => UA.Wonders.init(scene));
    if (state.hour !== undefined) UA.Time.hour = state.hour;
    if (params.has('hour')) UA.Time.hour = parseFloat(params.get('hour')) || 0;
    if (params.has('freeze')) UA.Time.auto = false;
    UA.Creatures.spawn(scene);
    track(() => UA.Rings.build(scene));
    state.quests = state.quests || {};
    // grass grows everywhere except under the landmarks
    const Wd = UA.Wonders;
    if (Wd.fountain) UA.Grass.clear.push({ x: Wd.fountain.x, z: Wd.fountain.z, r: 5.6 });
    Wd.pads.forEach((p) => UA.Grass.clear.push({ x: p.x, z: p.z, r: 2.3 }));
    Wd.rings.forEach((r) => UA.Grass.clear.push({ x: r.x, z: r.z, r: 5 }));
    UA.Grass.init(scene);
    if (params.get('grass') === '0') UA.Grass.setVisible(false);

    // how the player has dressed their unicorn (look.js); old saves only knew a coat number
    if (params.has('autostart') && params.get('coat')) {
      UA.Look.cur().coat = (C.COATS[parseInt(params.get('coat'), 10) || 0] || C.COATS[0]).id;
    }
    UA.Look.sanitize();
    unicorn = new UA.Unicorn(scene, UA.Look.item('coat', UA.Look.cur().coat).color);
    unicorn.teleport(0, 0, Math.PI);
    unicorn.setAccessories(state.unlocked);
    UA.Look.apply(unicorn);
    chase = new UA.ChaseCam(camera);
    chase.setMode(state.camView);
    UA.toggleView = toggleView;

    UA.Creatures.load(state.bonds);
    // returning friends tag along
    UA.Creatures.list.filter((c) => c.bond > 0).slice(0, 3).forEach((c) => UA.Creatures.makeFollower(c));

    UA.Outline.init(scene); // inked outlines (Fancy graphics)
    UA.toggleQuality = toggleQuality;
    applyQuality();
    UA.Input.init(canvas);
    UA.UI.init();
    window.addEventListener('keydown', (e) => {
      // Escape closes the dress-up screen when it was opened in the middle of a ride
      if (e.code === 'Escape' && mode === 'start' && lookFrom === 'play') closeLook();
    });
    UA.Rings.reset();
    UA.UI.setRings(0, UA.Rings.total, false);
    refreshHUD();
    resize();
    window.addEventListener('resize', resize);

    track(() => UA.Quests.init(scene));
    track(() => UA.Folk.build(scene));
    UA.Magic.init(scene);
    UA.mainWorld = (UA.World.mainMeshes || []).concat(mainWorld);
    UA.Realm.build(scene); // Starlight Castle, far off to the east, reached through the sparkle portals
    if (UA.Princess) UA.Princess.build(scene);
    if (UA.IcePrincess) UA.IcePrincess.build(scene); // Princess Flurry, in the ice castle
    if (UA.Finds) UA.Finds.build(scene); // gift boxes with new looks inside, out in the three worlds
    UA.onBond = onBond;
    UA.onRingsDone = onRingsDone;

    buildStartScreen();
    if (params.has('autostart')) {
      if (params.get('name')) state.name = params.get('name');
      startGame(true);
    } else {
      mode = 'start';
      // a brand new game goes straight to the dress-up screen; a returning player gets a welcome card first
      lookFrom = state.played > 0 ? 'welcome' : 'first';
      showStartPanel(lookFrom === 'first' ? 'look' : 'welcome');
      lookRel = LOOKVIEWS.coat.rel - 0.6;
      $('start').classList.remove('hidden');
      applyStartOffset(); // (shifts the view so the unicorn stands beside the panel, not behind it)
    }
    $('loading').classList.add('gone');
    if (params.has('debug')) $('dbg').style.display = 'block';
    // press ` (backtick) any time to show or hide the frame-rate readout
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') {
        UA.showDbg = !UA.showDbg;
        $('dbg').style.display = UA.showDbg || params.has('debug') ? 'block' : 'none';
      }
    });
    requestAnimationFrame(frame);
  }

  function resize() {
    const w = window.innerWidth,
      h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    UA.FX.setScale(renderer, camera);
    applyStartOffset();
  }
  function applyStartOffset() {
    const w = window.innerWidth,
      h = window.innerHeight;
    if (mode === 'start') {
      // shift the view so the unicorn stands in the space beside (or above) the panel, not behind it
      const p = $('look').classList.contains('hidden') ? $('welcome') : $('look');
      const r = p.getBoundingClientRect();
      if (w > 760) {
        const free = ((r.right || w * 0.5) + w) / 2;
        camera.setViewOffset(w, h, -(free - w / 2) * 0.9, 0, w, h);
      } else {
        const free = (r.top || h * 0.42) / 2;
        camera.setViewOffset(w, h, 0, (h / 2 - free) * 0.85, w, h);
      }
    } else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function refreshHUD() {
    UA.UI.updateHUD(state, UA.Creatures.list.length, UA.Creatures.friendCount());
  }
  UA.refreshHUD = refreshHUD;

  /* ---------- the start screen and the dress-up screen ----------
     The dress-up screen is the game's 'start' mode with the unicorn on show. It opens by itself for a brand new game and
     any time from the brush button (or L) while playing: lookFrom remembers which, so the big button knows whether to start
     the game or just go back to the ride. */
  let lookFrom = 'first'; // 'first' (a new game) | 'welcome' (from the welcome card) | 'play' (from the brush button)
  let startOrbit = false; // the welcome card turns the unicorn slowly round; the dress-up screen lets you do it
  let lookHop = false; // do a little hop for the next step
  const HOP_IN = Object.assign({}, ZERO, { jumpPressed: true });
  // where the camera stands for each tab: angle round the unicorn (0 = in front, 1.57 = at its side), distance, height, and the
  // height it looks at
  const LOOKVIEWS = {
    coat: { rel: 0.95, r: 11, h: 3.4, ty: 2.2 },
    hair: { rel: 2.45, r: 10, h: 3.8, ty: 2.5 },
    horn: { rel: 0.4, r: 8, h: 4.4, ty: 3.2 },
    sparkle: { rel: 1.25, r: 11.5, h: 3.6, ty: 2.2 },
    mark: { rel: 1.57, r: 9, h: 2.8, ty: 2.0 },
    saddle: { rel: 1.95, r: 9.5, h: 5.2, ty: 2.2 },
    size: { rel: 1.1, r: 13.5, h: 4, ty: 2.2 },
  };
  let lookRel = 0.9,
    lookR = 11,
    lookH = 3.4,
    lookTY = 2.2,
    lookIdle = 0;

  function showStartPanel(which) {
    $('welcome').classList.toggle('hidden', which !== 'welcome');
    $('look').classList.toggle('hidden', which !== 'look');
    startOrbit = which === 'welcome';
    if (which === 'look') {
      UA.LookUI.show(lookFrom === 'play' ? UA.LookUI.tab : 'coat');
      $('look-title').textContent = lookFrom === 'first' ? 'Make your unicorn!' : 'Dress up!';
      $('go').textContent = lookFrom === 'play' ? 'All done!' : "Let's ride!";
    } else {
      $('wb-name').textContent = state.name || 'Sparkle';
    }
  }
  function buildStartScreen() {
    $('name').value = state.name || 'Sparkle';
    $('go').onclick = () => (lookFrom === 'play' ? closeLook() : startGame(false));
    $('go-back').onclick = () => startGame(false);
    $('to-look').onclick = () => {
      UA.Audio.init();
      lookFrom = 'welcome';
      showStartPanel('look');
    };
    $('name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        $('name').blur();
        $('go').click();
      }
      e.stopPropagation();
    });
    $('name').addEventListener('keyup', (e) => e.stopPropagation());
    UA.LookUI.init(unicorn, {
      onPick: (key) => {
        lookCheer(14);
        if (key === 'size' || key === 'sparkle' || key === 'sparkleColor' || key === 'mark') lookHop = true;
      },
      onDice: () => {
        lookCheer(26);
        lookHop = true;
        if (UA.Audio.started) UA.Audio.sparkle();
      },
      onTab: () => (lookIdle = 0),
    });
    UA.openLook = openLook;
    UA.closeLook = closeLook;
    UA.hopOff = hopOff;
  }
  // a burst of the unicorn's own sparkles and a happy chirp
  const _lp = new THREE.Vector3();
  function lookCheer(n) {
    const k = (unicorn.size || 1) * (unicorn.scaleK || 1);
    _lp.set(unicorn.pos.x, unicorn.pos.y + 2.4 * k, unicorn.pos.z);
    UA.Look.burst(_lp, n);
    if (UA.Audio.started) UA.Audio.chirp(560 + Math.random() * 380);
  }
  const eachPrincess = (fn) => [UA.Princess, UA.IcePrincess].forEach((P) => P && P.built && fn(P));

  function openLook() {
    if (mode !== 'play') return;
    if (unicorn.rail && unicorn.rail.active) {
      UA.UI.toast('Not while sliding!<small>You can dress up when you stop</small>', 2400);
      return;
    }
    UA.UI.toggleBook(false);
    UA.UI.toggleHelp(false);
    UA.Input.auto = null;
    UA.Input.enabled = false;
    lookFrom = 'play';
    mode = 'start';
    $('hud').classList.add('hidden');
    eachPrincess((P) => P.lookHide && P.lookHide(true)); // a princess on the saddle waits out of sight
    showStartPanel('look');
    $('start').classList.remove('hidden');
    lookRel = LOOKVIEWS[UA.LookUI.tab].rel - 0.7;
    lookIdle = 0;
    applyStartOffset();
    if (UA.Audio.started) UA.Audio.pop();
  }
  function closeLook() {
    if (lookFrom !== 'play' || mode !== 'start') return;
    UA.LookUI.hide();
    state.name = ($('name').value || state.name || 'Sparkle').trim().slice(0, 14) || 'Sparkle';
    UA.save();
    mode = 'play';
    $('start').classList.add('hidden');
    $('hud').classList.remove('hidden');
    applyStartOffset();
    chase.snap(unicorn);
    UA.Input.enabled = true;
    eachPrincess((P) => P.lookHide && P.lookHide(false));
    if (UA.Audio.started) UA.Audio.chirp(760);
    lookCheer(10);
  }
  // J or the "Hop off" pill: ask the princess on the saddle to get down
  function hopOff() {
    if (mode !== 'play') return false;
    let did = false;
    eachPrincess((P) => {
      if (!did && P.state === 'ride') did = P.hopOff(unicorn);
    });
    return did;
  }

  function startGame(silent) {
    const nm = ($('name').value || state.name || 'Sparkle').trim().slice(0, 14) || 'Sparkle';
    state.name = nm;
    UA.Audio.init();
    UA.LookUI.hide();
    mode = 'play';
    $('start').classList.add('hidden');
    $('hud').classList.remove('hidden');
    applyStartOffset();
    unicorn.teleport(0, 0, Math.PI);
    chase.snap(unicorn);
    UA.Input.enabled = true;
    state.played++;
    UA.save();
    if (!silent) {
      UA.Audio.chirp(700);
      UA.UI.toast('Hi, ' + escapeHtml(nm) + '!<small>Ride forward to meet your first friend</small>', 4200);
      setTimeout(() => {
        if (mode === 'play') UA.UI.toast('Space jumps<small>Hold it in the air to glide. Shift gallops!</small>', 4200);
      }, 5200);
    }
  }
  // Fancy graphics (inked outlines) or Simple (no outlines, lighter on the GPU). G, the button in the help panel, or
  // the frame-rate governor below
  function applyQuality() {
    const fancy = state.quality !== 'simple';
    UA.Outline.setEnabled(fancy);
    const b = $('btn-quality');
    if (b) b.textContent = 'Graphics: ' + (fancy ? 'Fancy' : 'Simple');
  }
  function toggleQuality() {
    state.quality = state.quality === 'simple' ? 'fancy' : 'simple';
    applyQuality();
    UA.save();
    if (state.quality === 'simple') UA.UI.toast('Simple graphics<small>Faster on slow devices. Press G for Fancy</small>', 3000);
    else UA.UI.toast('Fancy graphics<small>Inked cartoon outlines! Press G for Simple</small>', 3000);
  }

  // V (or tapping the compass): flip between the map view and the behind-the-unicorn view
  function toggleView() {
    if (mode !== 'play') return;
    const m = chase.toggle();
    state.camView = m;
    UA.save();
    if (m === 'top') UA.UI.toast('Map view<small>Arrow keys: Up is North, Right is East. Press V to go back</small>', 3400);
    else UA.UI.toast('Behind view<small>Drag to look around</small>', 2600);
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- game events ---------- */
  function onBond(c, kind) {
    refreshHUD();
    const n = UA.Creatures.friendCount();
    if (kind === 'friend') {
      UA.UI.toast(c.name + ' the ' + c.S.label + ' is your friend!<small>' + n + ' of ' + UA.Creatures.list.length + ' friends made</small>', 3000);
    }
    // unlock gear
    UA.UNLOCKS.forEach((u) => {
      if (n >= u.need && state.unlocked.indexOf(u.id) < 0) {
        state.unlocked.push(u.id);
        unicorn.setAccessories(state.unlocked);
        UA.Audio.fanfare();
        UA.FX.burst(unicorn.center(new V3()), 40);
        setTimeout(() => UA.UI.toast('New gear: ' + u.name + '!<small>' + u.power + '</small>', 4200), kind === 'friend' ? 3100 : 0);
      }
    });
    UA.save();
  }
  function onRingsDone() {
    state.treats = Math.min(30, state.treats + 3);
    state.ringRuns++;
    refreshHUD();
    UA.UI.toast('Rainbow run complete! +3 treats<small>The rings will come back soon</small>', 4200);
    UA.save();
  }

  function collectBushes(dt) {
    const p = unicorn.pos;
    for (const b of UA.World.bushes) {
      if (!b.ready) continue;
      const dx = b.x - p.x,
        dz = b.z - p.z;
      if (dx * dx + dz * dz < 6.5 && Math.abs(p.y - b.h) < 3.2) {
        b.ready = false;
        b.regrow = 30;
        b.grp.scale.setScalar(0.05);
        if (state.treats < 30) state.treats++;
        UA.FX.sparkles(new V3(b.x, b.h + 0.8, b.z), 10, undefined, 1.2);
        UA.FX.puff(new V3(b.x, b.h + 0.4, b.z), 4, 0xffffff);
        UA.Audio.pop();
        refreshHUD();
        UA.save();
      } else if (b.glint > 0) {
        b.glint -= dt;
      } else {
        b.glint = 2.5 + Math.random() * 3;
        // twinkle so kids can spot them from afar
        const dd = dx * dx + dz * dz;
        if (dd < 90 * 90) UA.FX.sparkles(new V3(b.x, b.h + 1.3, b.z), 1, 0xffffff, 0.8, 0.2);
      }
    }
  }

  // announce new regions as the unicorn rides into them
  let curRegion = null,
    regionT = 0,
    pendingRegion = null,
    pendingT = 0;
  function regionCheck(dt) {
    regionT -= dt;
    if (regionT > 0) return;
    regionT = 0.4;
    const info = UA.World.regionInfo(unicorn.pos.x, unicorn.pos.z);
    if (curRegion === null) {
      curRegion = info;
      return;
    }
    if (info === curRegion) {
      pendingRegion = null;
      return;
    }
    if (pendingRegion !== info) {
      pendingRegion = info;
      pendingT = 0;
    }
    pendingT += 0.4;
    if (pendingT >= 1.2) {
      curRegion = info;
      pendingRegion = null;
      UA.UI.toast(info.name + '<small>' + info.note + '</small>', 3200);
    }
  }

  /* ---------- main loop ---------- */
  let slowChecks = 0,
    slowFancy = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    // adaptive resolution: keep tablets smooth
    if (dt < 0.5) {
      perfAcc += dt;
      perfN++;
      if (perfAcc > 2.5) {
        const fps = perfN / perfAcc;
        const cur = renderer.getPixelRatio();
        if (fps < 38 && cur > 1) {
          renderer.setPixelRatio(Math.max(1, cur - 0.25));
          resize();
        } else if (fps < 34 && cur <= 1 && mode === 'play' && state.quality !== 'simple' && !params.has('keepfancy')) {
          // already at the lowest resolution and still slow: the outlines are the next thing to go
          if (++slowFancy >= 2) {
            state.quality = 'simple';
            applyQuality();
            UA.save();
            UA.UI.toast('Simple graphics<small>Switched so it keeps running smoothly. Press G to try Fancy</small>', 4200);
          }
        } else if (fps < 26 && cur <= 1 && mode === 'play' && !params.has('debug') && !params.has('keepgrass')) {
          // already at the lowest resolution and still slow: drop the grass field for good (it is the optional prettiness)
          if (++slowChecks >= 2 && UA.Grass.mesh && UA.Grass.mesh.visible) UA.Grass.setVisible(false);
        } else if (fps > 57 && cur < maxPR) {
          renderer.setPixelRatio(Math.min(maxPR, cur + 0.25));
          resize();
        }
        perfAcc = 0;
        perfN = 0;
      }
    }
    dt = Math.min(0.05, Math.max(0.0005, dt));
    t += dt;
    UA.Outline.update(dt, camera, renderer);
    frames++;
    fpsT += dt;
    if (fpsT > 0.5) {
      if (params.has('debug') || UA.showDbg) {
        $('dbg').textContent = 'fps ' + Math.round(frames / fpsT) + '  px ' + renderer.getPixelRatio().toFixed(2) + '  grass ' + (UA.Grass.mesh && UA.Grass.mesh.visible ? 'on' : 'off') + '  pos ' + unicorn.pos.x.toFixed(0) + ',' + unicorn.pos.z.toFixed(0) + ' spd ' + unicorn.speed.toFixed(1) + ' calls ' + renderer.info.render.calls + ' tris ' + renderer.info.render.triangles;
      }
      frames = 0;
      fpsT = 0;
    }
    if (chase && unicorn) {
      UA.Input.camYaw = chase.yaw;
      UA.Input.uniYaw = unicorn.yaw;
    }
    const input = UA.Input.read();
    if (UA.paused) {
      // keep rendering while a menu is open but freeze the action
      render();
      return;
    }
    tick(dt, input);
    render();
  }

  // one step of the game (no drawing). Also used by the test hook UA.dbg.sim
  function tick(dt, input) {
    const W = UA.World;
    if (mode === 'play') {
      if (input.book) UA.UI.toggleBook();
      if (input.help) UA.UI.toggleHelp();
      if (input.view) toggleView();
      if (input.quality) toggleQuality();
      if (input.time) UA.Time.skip();
      if (input.spell) UA.Magic.next();
      if (input.pick >= 0) UA.Magic.pick(input.pick);
      if (input.look) openLook();
      if (input.hop) hopOff();
      unicorn.gag = true; // the idle glitter-poop gag only runs while playing
      unicorn.update(dt, input, chase.steerYaw(input));
      chase.update(dt, unicorn, input);
      UA.UI.setCompass(chase.yaw, unicorn.yaw, chase.mode);
      if (input.magic) unicorn.castMagic();

      // interactions: everything in reach offers a card (wild friends here, the fountain and townspeople below)
      UA.UI.beginOffers();
      for (const { c, d } of UA.Creatures.nearby(unicorn, 7.5, 2)) {
        UA.UI.creatureOffer(c, d, state, {
          pet: () => UA.Creatures.pet(c, unicorn),
          feed: () => {
            if (UA.Creatures.feed(c, unicorn, state)) {
              UA.Quests.onFeed(c);
              refreshHUD();
              UA.save();
            }
          },
          play: () => UA.Creatures.play(c, unicorn),
        });
      }
      collectBushes(dt);
      UA.Grass.update(dt, t, unicorn);
      UA.Grass.setCam(0, 0, 0);
      UA.Magic.update(dt, t, unicorn, true);
      UA.Wonders.update(dt, t, unicorn, { chase, input });
      UA.Realm.update(dt, t, unicorn, { chase, input });
      if (UA.Princess) UA.Princess.update(dt, t, unicorn, { chase, input });
      if (UA.IcePrincess) UA.IcePrincess.update(dt, t, unicorn, { chase, input });
      if (UA.Finds) UA.Finds.update(dt, t, unicorn);
      {
        // "Hop off" shows at the top left while a princess is on the saddle
        const rider = [UA.Princess, UA.IcePrincess].find((P) => P && P.built && P.state === 'ride');
        UA.UI.setRider(rider ? rider.cfg.name : null);
      }
      if (UA.IceGuides) UA.IceGuides.update(dt, t, unicorn);
      if (UA.IceSlide) UA.IceSlide.update(dt, t, unicorn);
      UA.Town.updateStatic(dt, t, unicorn);
      UA.Folk.update(dt, t, unicorn, { input });
      UA.UI.endOffers(input);
      UA.Rings.update(dt, t, unicorn);
      UA.Quests.update(dt, t, unicorn);
      regionCheck(dt);
    } else if (mode === 'start') {
      unicorn.gag = false;
      const hop = lookHop && unicorn.grounded;
      lookHop = false;
      unicorn.update(dt, hop ? HOP_IN : ZERO, 0);
      UA.Grass.update(dt, t, unicorn);
      lookCamera(dt, input);
      UA.Grass.setCam(camera.position.x, camera.position.z, 3.6); // no blade or flower right at the lens
    }

    W.update(dt, t, camera.position);
    UA.Time.update(dt, t, camera, unicorn, mode === 'play');
    UA.Creatures.update(dt, t, unicorn);
    UA.FX.update(dt);
    UA.UI.update(dt, camera, window.innerWidth, window.innerHeight);
  }

  // the camera on the dress-up screen: drift to the view that suits the tab (with a gentle sway), or turn with the player's drag
  function lookCamera(dt, input) {
    const V = LOOKVIEWS[UA.LookUI.tab] || LOOKVIEWS.coat;
    const dx = input.camDX || 0;
    if (dx) {
      lookRel -= dx * 0.008;
      lookIdle = 3.2;
    } else lookIdle = Math.max(0, lookIdle - dt);
    if (startOrbit) lookRel += dt * 0.28;
    else if (lookIdle <= 0) {
      const want = V.rel + Math.sin(t * 0.5) * 0.3;
      let d = (want - lookRel) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      else if (d < -Math.PI) d += Math.PI * 2;
      lookRel += d * Math.min(1, dt * 1.6);
    }
    const asp = window.innerWidth / Math.max(1, window.innerHeight);
    const wide = asp < 0.75 ? 1.3 : asp < 1 ? 1.12 : 1;
    const k = Math.min(1, dt * 3.2);
    const sz = Math.pow((unicorn.size || 1) * (unicorn.scaleK || 1), 0.85) * wide;
    lookR += (V.r * sz - lookR) * k;
    lookH += (V.h * sz - lookH) * k;
    lookTY += (V.ty * Math.pow(sz / wide, 0.9) - lookTY) * k;
    const ang = unicorn.yaw + lookRel;
    let cx = unicorn.pos.x + Math.sin(ang) * lookR,
      cz = unicorn.pos.z + Math.cos(ang) * lookR;
    // a portal's ring of crystals is about 7 m wide: keep the lens well outside it, or a crystal fills the picture
    for (const p of UA.Realm.portals) {
      if (p.area !== UA.Realm.cur) continue;
      const dx = cx - p.wx,
        dz = cz - p.wz,
        d = Math.hypot(dx, dz);
      if (d < 12.5 && d > 0.01) {
        cx = p.wx + (dx / d) * 12.5;
        cz = p.wz + (dz / d) * 12.5;
      }
    }
    camera.position.set(cx, Math.max(unicorn.pos.y + lookH, UA.World.groundAt(cx, cz) + 1.4), cz);
    camera.lookAt(unicorn.pos.x, unicorn.pos.y + lookTY, unicorn.pos.z);
  }

  function render() {
    renderer.render(scene, camera);
  }

  // test / debug handles
  UA.dbg = {
    get unicorn() {
      return unicorn;
    },
    get camera() {
      return camera;
    },
    get chase() {
      return chase;
    },
    get renderer() {
      return renderer;
    },
    get scene() {
      return scene;
    },
    get mode() {
      return mode;
    },
    start: startGame,
    // run game time forward without drawing (tests)
    sim(seconds, step) {
      const dt = step || 0.05;
      for (let n = 0; n < seconds / dt; n++) {
        t += dt;
        tick(dt, UA.Input.read());
      }
    },
  };

  window.addEventListener('DOMContentLoaded', () => {
    try {
      setup();
    } catch (e) {
      console.error(e);
      $('loading').textContent = 'Oops, something went wrong: ' + e.message;
    }
  });
})();
