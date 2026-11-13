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

    UA.World.build(scene);
    UA.Town.build(scene);
    UA.FX.init(scene);
    // (Three r155+ uses physical light units, so intensities are about PI times the old values; lights live in daynight.js)
    UA.Time.init(scene);
    state.quests = state.quests || {};
    UA.Wonders.init(scene);
    if (state.hour !== undefined) UA.Time.hour = state.hour;
    if (params.has('hour')) UA.Time.hour = parseFloat(params.get('hour')) || 0;
    if (params.has('freeze')) UA.Time.auto = false;
    UA.Creatures.spawn(scene);
    UA.Rings.build(scene);
    state.quests = state.quests || {};
    // grass grows everywhere except under the landmarks
    const Wd = UA.Wonders;
    if (Wd.fountain) UA.Grass.clear.push({ x: Wd.fountain.x, z: Wd.fountain.z, r: 5.6 });
    Wd.pads.forEach((p) => UA.Grass.clear.push({ x: p.x, z: p.z, r: 2.3 }));
    Wd.rings.forEach((r) => UA.Grass.clear.push({ x: r.x, z: r.z, r: 5 }));
    UA.Grass.init(scene);
    if (params.get('grass') === '0') UA.Grass.setVisible(false);

    const coat = C.COATS[state.coat] || C.COATS[0];
    unicorn = new UA.Unicorn(scene, coat.color);
    unicorn.teleport(0, 0, Math.PI);
    unicorn.setAccessories(state.unlocked);
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
    UA.Rings.reset();
    UA.UI.setRings(0, UA.Rings.total, false);
    refreshHUD();
    resize();
    window.addEventListener('resize', resize);

    UA.Quests.init(scene);
    UA.Folk.build(scene);
    UA.Magic.init(scene);
    UA.onBond = onBond;
    UA.onRingsDone = onRingsDone;

    buildStartScreen();
    if (params.has('autostart')) {
      if (params.get('coat')) state.coat = parseInt(params.get('coat'), 10) || 0;
      if (params.get('name')) state.name = params.get('name');
      unicorn.setCoat((C.COATS[state.coat] || C.COATS[0]).color);
      startGame(true);
    } else {
      mode = 'start';
      $('start').classList.remove('hidden');
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
    if (mode === 'start' && w > 760) camera.setViewOffset(w, h, -w * 0.16, 0, w, h);
    else if (mode === 'start') camera.setViewOffset(w, h, 0, h * 0.18, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function refreshHUD() {
    UA.UI.updateHUD(state, UA.Creatures.list.length, UA.Creatures.friendCount());
  }
  UA.refreshHUD = refreshHUD;

  function buildStartScreen() {
    const sw = $('swatches');
    sw.innerHTML = '';
    C.COATS.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'sw' + (i === state.coat ? ' sel' : '');
      b.style.background = '#' + c.color.toString(16).padStart(6, '0');
      b.setAttribute('aria-label', c.name + ' coat');
      b.onclick = () => {
        state.coat = i;
        unicorn.setCoat(c.color);
        sw.querySelectorAll('.sw').forEach((x, j) => x.classList.toggle('sel', j === i));
      };
      sw.appendChild(b);
    });
    $('name').value = state.name || 'Sparkle';
    $('go').onclick = () => startGame(false);
    $('name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startGame(false);
      e.stopPropagation();
    });
    $('name').addEventListener('keyup', (e) => e.stopPropagation());
  }

  function startGame(silent) {
    const nm = ($('name').value || state.name || 'Sparkle').trim().slice(0, 14) || 'Sparkle';
    state.name = nm;
    if (!silent) UA.Audio.init();
    else UA.Audio.init();
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
      UA.Magic.update(dt, t, unicorn, true);
      UA.Wonders.update(dt, t, unicorn, { chase, input });
      UA.Town.updateStatic(dt, t, unicorn);
      UA.Folk.update(dt, t, unicorn, { input });
      UA.UI.endOffers(input);
      UA.Rings.update(dt, t, unicorn);
      UA.Quests.update(dt, t, unicorn);
      regionCheck(dt);
    } else if (mode === 'start') {
      if (input.help) {
        /* ignored on start */
      }
      unicorn.gag = false;
      unicorn.update(dt, ZERO, 0);
      UA.Grass.update(dt, t, unicorn);
      startAng += dt * 0.28;
      // slow orbit in front of the unicorn
      const r = 11,
        cy = unicorn.pos.y + 3.2;
      camera.position.set(unicorn.pos.x + Math.sin(startAng) * r, cy + 0.6, unicorn.pos.z + Math.cos(startAng) * r);
      camera.lookAt(unicorn.pos.x, unicorn.pos.y + 2.2, unicorn.pos.z);
      UA.Creatures.nearest; // no-op
    }

    W.update(dt, t, camera.position);
    UA.Time.update(dt, t, camera, unicorn, mode === 'play');
    UA.Creatures.update(dt, t, unicorn);
    UA.FX.update(dt);
    UA.UI.update(dt, camera, window.innerWidth, window.innerHeight);
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
