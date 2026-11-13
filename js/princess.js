/* The princesses: Princess Starla, who lives in Starlight Castle, and Princess Flurry, who lives in the Ice Castle on
   Frostglow Peak (one model builder and one behaviour, two outfits: see the two configs at the bottom). A princess waits
   by her castle door, skips over to say hello when a unicorn rides up, asks for a ride and hops onto the saddle. She
   rides along (leaning into turns, hair streaming, arms up on jumps, giggling, twirling her wand), and hops off when you
   stop at her castle. No buttons: it all happens by riding up to her and standing still for a moment. Only one princess
   rides at a time.

   She is built from simple toon shapes like everything else. While riding she is parented to the unicorn's saddle, so
   she follows every bob, pitch, squash and size change of the unicorn rig for free. */
(function () {
  const UA = window.UA,
    C = UA.C,
    T = THREE,
    V3 = T.Vector3;
  const TAU = Math.PI * 2;
  const SEAT = new V3(0, 2.5, 0.02); // where she sits, in the saddle's space
  const _v = new V3(),
    _w = new V3(),
    _q = new V3();

  /* ---------- the model ---------- */
  const SKIN = 0xffdcc6,
    HAIR = 0xffc93c,
    HAIR2 = 0xffe27a,
    DRESS = 0xff93c8,
    DRESS2 = 0xffc4e0,
    LILAC = 0xb394ff,
    GOLD = 0xffd45e;
  const M = (c, e) => UA.mat(c, e);
  const gem = (c, k) => UA.addGlow(new T.MeshToonMaterial({ color: c, gradientMap: UA.gradient, emissive: c, emissiveIntensity: 0.6 }), k || 1.4);

  /* Merge a rigid part's primitives into one to three vertex-coloured meshes (plain / glossy hair / glowing gold), so
     the whole princess costs a few dozen draw calls instead of a few hundred. Only direct mesh children are merged;
     child groups (arms, head, locks...) stay separate so they can still move. */
  let MATS = null,
    HAIRMAT = null;
  function bake(g) {
    if (!MATS) {
      const mk = () => new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient });
      MATS = { toon: mk(), hair: UA.Cartoon && UA.Cartoon.gloss ? UA.Cartoon.gloss(mk()) : mk(), glow: UA.addGlow(mk(), 1.4) };
    }
    const lists = { toon: [], hair: [], glow: [] };
    const kill = [];
    g.children.forEach((m) => {
      if (!m.isMesh || m.userData.keep) return;
      m.updateMatrix();
      const mat = m.material;
      const kind = mat === HAIRMAT ? 'hair' : mat.emissive && mat.emissive.getHex() !== 0 ? 'glow' : 'toon';
      lists[kind].push({ geo: m.geometry, color: mat.color.getHex(), matrix: m.matrix.clone() });
      kill.push(m);
    });
    kill.forEach((m) => g.remove(m));
    for (const k in lists) if (lists[k].length) g.add(new T.Mesh(UA.mergeGeos(lists[k]), MATS[k]));
    return g;
  }

  function buildModel(cfg) {
    const { SKIN, HAIR, HAIR2, DRESS, DRESS2, LILAC, GOLD, GEM, EYE, BROW, WAND } = cfg.pal;
    const fl = cfg.style === 'flurry';
    const B = UA.ball,
      CY = UA.cyl;
    const root = new T.Group();
    const hips = new T.Group();
    root.add(hips);
    const torso = new T.Group();
    hips.add(torso);

    // legs and shoes
    const legs = [-1, 1].map((s) => {
      const g = new T.Group();
      g.position.set(s * 0.13, -0.05, 0);
      g.add(CY(0.06, 0.55, M(SKIN), 0, -0.3, 0));
      g.add(B(0.1, M(LILAC), 1, 0.7, 1.55, 0, -0.62, 0.05));
      g.add(B(0.045, M(GOLD, GOLD), 1, 1, 1, 0, -0.6, 0.17, true));
      bake(g);
      hips.add(g);
      return g;
    });

    // the gown: a lathe (profile runs bottom to top so the faces point outwards)
    const prof = [
      [0.72, -0.62],
      [0.7, -0.55],
      [0.62, -0.42],
      [0.5, -0.27],
      [0.38, -0.13],
      [0.27, -0.02],
      [0.22, 0.05],
      [0.0, 0.05],
    ].map((p) => new T.Vector2(p[0], p[1]));
    const skirt = new T.Group();
    skirt.position.y = 0.02;
    const sk = new T.Mesh(new T.LatheGeometry(prof, 22), M(DRESS));
    skirt.add(sk);
    const under = new T.Mesh(new T.LatheGeometry(prof.map((p) => new T.Vector2(p.x * 1.0, p.y * 1.0)), 22), M(0xffffff));
    under.scale.set(1.06, 0.18, 1.06);
    under.position.y = -0.5;
    skirt.add(under);
    const hem = new T.Mesh(new T.TorusGeometry(0.705, 0.045, 6, 28).rotateX(Math.PI / 2), M(0xfff4fa));
    hem.position.y = -0.585;
    skirt.add(hem);
    // little gold stars on the gown
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3,
        y = -0.3 - (i % 2) * 0.16;
      const r = 0.38 + (-y - 0.1) * 0.62;
      const s = B(0.045, M(GOLD, GOLD), 1, 1.3, 0.5, Math.cos(a) * r, y, Math.sin(a) * r, true);
      s.rotation.y = -a;
      skirt.add(s);
    }
    bake(skirt);
    hips.add(skirt);

    // bodice, sash, bow
    torso.add(CY(0.2, 0.46, M(DRESS2), 0, 0.26, 0));
    torso.add(B(0.235, M(DRESS2), 1, 0.85, 0.82, 0, 0.5, 0));
    const sash = new T.Mesh(new T.TorusGeometry(0.205, 0.05, 6, 20).rotateX(Math.PI / 2), M(LILAC));
    sash.position.y = 0.06;
    torso.add(sash);
    torso.add(B(0.08, M(LILAC), 1.5, 0.8, 0.8, -0.1, 0.1, -0.22, true));
    torso.add(B(0.08, M(LILAC), 1.5, 0.8, 0.8, 0.1, 0.1, -0.22, true));
    torso.add(B(0.05, M(GOLD, GOLD), 1, 1, 1, 0, 0.1, -0.22, true));
    torso.add(B(0.05, gem(GEM), 1, 1, 0.6, 0, 0.42, 0.23, true)); // brooch
    torso.add(CY(0.065, 0.14, M(SKIN), 0, 0.64, 0));
    bake(torso);

    // arms: sleeve puff, arm, hand
    const arms = [-1, 1].map((s) => {
      const g = new T.Group();
      g.position.set(s * 0.29, 0.52, 0);
      g.add(B(0.17, M(DRESS), 1, 1, 1, 0, 0, 0, true));
      const cuff = new T.Mesh(new T.TorusGeometry(0.09, 0.03, 5, 12).rotateX(Math.PI / 2), M(0xfff4fa));
      cuff.position.y = -0.14;
      g.add(cuff);
      g.add(CY(0.052, 0.4, M(SKIN), 0, -0.3, 0));
      g.add(B(0.07, M(SKIN), 1, 1, 1, 0, -0.52, 0, true));
      bake(g);
      torso.add(g);
      return g;
    });

    // her star wand, in the right hand (arms[0])
    const wand = new T.Group();
    wand.position.set(0, -0.52, 0);
    wand.rotation.x = 0.8;
    wand.add(CY(0.016, 0.95, M(0xfff4fa), 0, 0.4, 0));
    wand.add(B(0.03, M(LILAC), 1, 1, 1, 0, -0.06, 0, true));
    bake(wand);
    const star = new T.Mesh(new T.OctahedronGeometry(0.12, 0), gem(WAND, 1.6));
    star.scale.set(1, fl ? 1.7 : 1.35, fl ? 0.6 : 0.45);
    star.position.y = 0.95;
    star.userData.noOutline = true;
    wand.add(star);
    if (fl) {
      // a second crystal across the first makes a little six-pointed snowflake
      const star2 = new T.Mesh(new T.OctahedronGeometry(0.12, 0), gem(WAND, 1.6));
      star2.scale.set(1.7, 1, 0.6);
      star2.position.y = 0.95;
      star2.userData.noOutline = true;
      wand.add(star2);
    }
    const haloC = fl ? 'rgba(170,230,255,' : 'rgba(255,236,160,';
    const halo = new T.Sprite(new T.SpriteMaterial({ map: UA.radialTexture(haloC + '1)', haloC + '0)', 64), blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8, fog: false }));
    halo.scale.set(0.9, 0.9, 1);
    halo.position.y = 0.95;
    wand.add(halo);
    arms[0].add(wand);

    // head
    const head = new T.Group();
    head.position.y = 1.1;
    torso.add(head);
    head.add(B(0.5, M(SKIN), 1.02, 0.96, 1, 0, 0, 0));
    // eyes: big, dark, two sparkles each
    const eyes = [-1, 1].map((s) => {
      const g = new T.Group();
      g.position.set(s * 0.19, -0.03, 0.452);
      g.add(B(0.1, M(EYE), 1, 1.38, 0.5, 0, 0, 0));
      g.add(B(0.036, M(0xffffff), 1, 1, 0.5, s * -0.025, 0.06, 0.045, true));
      g.add(B(0.02, M(0xffffff), 1, 1, 0.5, s * 0.03, -0.045, 0.045, true));
      bake(g);
      head.add(g);
      return g;
    });
    [-1, 1].forEach((s) => {
      const b = B(0.075, M(BROW), 1, 0.26, 0.3, s * 0.19, 0.16, 0.44, true);
      b.rotation.z = s * -0.22;
      head.add(b);
      head.add(B(0.1, M(0xff9fb4), 1.2, 0.7, 0.3, s * 0.3, -0.15, 0.37, true));
    });
    head.add(B(0.028, M(0xf2b8a0), 1, 1, 1, 0, -0.09, 0.495, true));
    const smile = new T.Mesh(new T.TorusGeometry(0.07, 0.016, 5, 12, Math.PI).rotateZ(Math.PI), M(0xb04a7a));
    smile.position.set(0, -0.17, 0.462);
    head.add(smile);

    // hair: a golden cap with a fringe, side locks and long locks down the back (they swing)
    const hairMat = (HAIRMAT = new T.MeshToonMaterial({ color: HAIR, gradientMap: UA.gradient }));
    head.add(B(0.555, hairMat, 1.04, 1.0, 1, 0, 0.05, -0.07));
    for (let i = 0; i < 7; i++) {
      const x = -0.33 + i * 0.11;
      const f = B(0.115, hairMat, 1, 1.25, 0.8, x, 0.3 - Math.abs(x) * 0.28, 0.4 - Math.abs(x) * 0.15, true);
      f.rotation.z = -x * 1.1;
      head.add(f);
    }
    [-1, 1].forEach((s) => head.add(B(0.14, hairMat, 0.9, 2.3, 0.9, s * 0.5, -0.17, -0.06, true)));
    const locks = [-0.27, 0, 0.27].map((x, i) => {
      const g = new T.Group();
      g.position.set(x, 0.05, -0.44);
      g.add(B(0.2, hairMat, 1, 2.7, 0.9, 0, -0.5, 0, true));
      g.add(B(0.14, M(HAIR2), 1, 2.4, 0.8, 0, -0.62, 0.0, true));
      bake(g);
      head.add(g);
      return g;
    });
    if (fl) {
      // twin hair puffs high on either side, tied with periwinkle ribbons and a silver clip
      [-1, 1].forEach((s) => {
        head.add(B(0.3, hairMat, 1, 1, 1, s * 0.4, 0.5, -0.1));
        head.add(B(0.2, M(HAIR2), 1, 1, 1, s * 0.5, 0.62, -0.06, true));
        head.add(B(0.085, M(LILAC), 1.3, 0.8, 1, s * 0.33, 0.37, -0.02, true));
        head.add(B(0.045, M(GOLD, GOLD), 1, 1, 1, s * 0.33, 0.37, 0.05, true));
      });
    }
    const bowC = fl ? LILAC : 0xff6fa8;
    const bow = new T.Group();
    bow.position.set(0, -0.14, -0.5);
    bow.add(B(0.09, M(bowC), 1.7, 1, 0.6, -0.1, 0, 0, true));
    bow.add(B(0.09, M(bowC), 1.7, 1, 0.6, 0.1, 0, 0, true));
    bow.add(B(0.05, M(GOLD, GOLD), 1, 1, 1, 0, 0, 0.03, true));
    bake(bow);
    head.add(bow);

    // crown
    const crown = new T.Group();
    crown.position.set(0, 0.49, 0.02);
    crown.rotation.x = -0.2;
    crown.add(CY(0.37, 0.12, M(GOLD, GOLD), 0, 0, 0));
    const gems = fl ? [0x8fe8ff, 0xb9a8ff, 0xffffff, 0xb9a8ff, 0x8fe8ff] : [0xff6fa8, 0x7fc8ff, 0x8fe8c0, 0xb394ff, 0xff9ac4];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + Math.PI / 2;
      // (Flurry's crown is a ring of tall ice crystals)
      const c = UA.cone(fl ? 0.07 : 0.065, fl ? 0.4 : 0.24, M(GOLD, GOLD), Math.cos(a) * 0.35, fl ? 0.26 : 0.17, Math.sin(a) * 0.35);
      crown.add(c);
      crown.add(B(0.05, gem(gems[i], 1.6), 1, 1, 1, Math.cos(a) * 0.35, fl ? 0.5 : 0.3, Math.sin(a) * 0.35, true));
    }
    crown.add(B(0.07, gem(fl ? 0x8fe8ff : 0xff6fa8, 1.6), 1, fl ? 1.6 : 1.1, 0.7, 0, fl ? 0.1 : 0, 0.375, true));
    bake(crown);
    head.add(crown);
    bake(head);

    return { root, hips, torso, skirt, legs, arms, wand, star, halo, head, eyes, locks, bow, ph: 0, blink: 0, blinkT: 2 };
  }

  /* ---------- posing ---------- */
  // p: skip (0..1 walking/skipping), sit, wave (left arm), twirl (wand arm), air (arms up, legs tucked), wind (hair streaming),
  // curtsy (0..1 over the move), lean (extra roll), look (head yaw), spd
  function pose(S, dt, t, p) {
    S.ph += dt * (8 + p.skip * 3);
    const ph = S.ph;
    const ease = (cur, tar, k) => UA.damp(cur, tar, k, dt);
    const W = S.w || (S.w = { sit: 0, air: 0, wave: 0, twirl: 0, lean: 0, look: 0, wind: 0, skip: 0 });
    W.sit = ease(W.sit, p.sit, 12);
    W.air = ease(W.air, p.air, 14);
    W.wave = ease(W.wave, p.wave, 10);
    W.twirl = ease(W.twirl, p.twirl, 10);
    W.lean = ease(W.lean, p.lean, 6);
    W.look = ease(W.look, p.look, 9);
    W.wind = ease(W.wind, p.wind, 5);
    W.skip = ease(W.skip, p.skip, 10);
    const sk = W.skip * (1 - W.sit) * (1 - W.air);
    const dip = Math.sin(Math.PI * UA.clamp(p.curtsy, 0, 1));

    // hips: standing height, down onto the saddle when sitting; bounce when skipping
    const idle = Math.sin(t * 2.1) * 0.012;
    S.hips.position.y = UA.lerp(0.72, 0.19, W.sit) + Math.abs(Math.sin(ph)) * 0.15 * sk + idle - dip * 0.2;
    S.torso.rotation.z = W.lean + Math.sin(t * 1.3) * 0.03 * (1 - W.sit) + Math.sin(ph) * 0.05 * sk;
    S.torso.rotation.x = dip * 0.32 + W.sit * 0.05 + sk * 0.06;
    S.torso.rotation.y = Math.sin(ph) * 0.1 * sk;
    // legs: swing when skipping, tuck in the air, out to the sides when sitting
    S.legs.forEach((leg, i) => {
      const s = i ? 1 : -1;
      leg.rotation.x = Math.sin(ph + i * Math.PI) * 0.95 * sk - W.air * 0.9 - W.sit * 0.3;
      leg.rotation.z = s * (W.sit * 0.95 + W.air * 0.2);
    });
    // gown: flares over the saddle, flutters in the air
    S.skirt.scale.set(1 + W.sit * 0.38 + dip * 0.15 + W.air * 0.12, 1 - W.air * 0.22, 1 + W.sit * 0.22 + dip * 0.15 + W.air * 0.12);
    S.skirt.rotation.z = Math.sin(ph + 1) * 0.07 * sk;
    S.skirt.rotation.x = -W.wind * 0.12;
    // arms
    const armR = S.arms[0],
      armL = S.arms[1];
    const swing = Math.sin(ph) * 0.8 * sk;
    let lx = swing,
      lz = 0.05,
      rx = -swing,
      rz = -0.05;
    // riding: hands forward on the mane
    lx = UA.lerp(lx, -0.95, W.sit);
    rx = UA.lerp(rx, -0.95, W.sit);
    lz = UA.lerp(lz, 0.2, W.sit);
    rz = UA.lerp(rz, -0.2, W.sit);
    // in the air: both arms up, flapping with joy
    const flap = Math.sin(t * 12) * 0.25;
    lx = UA.lerp(lx, -0.25, W.air);
    rx = UA.lerp(rx, -0.25, W.air);
    lz = UA.lerp(lz, 2.5 + flap, W.air);
    rz = UA.lerp(rz, -2.5 - flap, W.air);
    // waving hello with the left arm, wand twirl with the right
    lx = UA.lerp(lx, -0.15, W.wave);
    lz = UA.lerp(lz, 2.55 + Math.sin(t * 10) * 0.32, W.wave);
    rx = UA.lerp(rx, -0.55, W.twirl);
    rz = UA.lerp(rz, -1.7, W.twirl);
    armL.rotation.set(lx, 0, lz);
    armR.rotation.set(rx, 0, rz);
    S.wand.rotation.set(0.8 - W.twirl * 0.2, 0, Math.sin(t * 15) * 0.7 * W.twirl);
    const pulse = 1 + Math.sin(t * 6) * 0.08 + W.twirl * 0.3;
    S.halo.scale.set(0.9 * pulse, 0.9 * pulse, 1);
    S.star.rotation.y = t * 2;

    // head: looks where she is looking, tilts when she is happy, blinks
    S.head.rotation.y = W.look;
    S.head.rotation.x = -dip * 0.1 + Math.sin(t * 0.9) * 0.02 - W.wind * 0.08;
    S.head.rotation.z = Math.sin(t * 1.1) * 0.04 + W.wave * 0.06 + W.lean * 0.5;
    S.blinkT -= dt;
    if (S.blinkT <= 0) {
      S.blink = 0.14;
      S.blinkT = 2 + Math.random() * 3;
    }
    S.blink = Math.max(0, S.blink - dt);
    const eyeY = S.blink > 0 ? 0.12 : 1;
    S.eyes.forEach((e) => (e.scale.y = eyeY));
    // long locks swing, stream back with speed
    S.locks.forEach((l, i) => {
      l.rotation.x = 0.08 + W.wind * (0.95 + i * 0.05) + Math.sin(t * 2.2 + i * 1.3) * 0.07 + Math.sin(ph + i) * 0.14 * sk + W.air * 0.2;
      l.rotation.z = Math.sin(t * 1.7 + i) * 0.05 + (i - 1) * 0.04 * W.wind - W.lean * 0.6;
    });
    S.bow.rotation.z = Math.sin(t * 3) * 0.1;
  }

  /* ---------- behaviour ---------- */
  const rnd = (a) => a[(Math.random() * a.length) | 0];
  const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  /* One princess: cfg says who she is (see STARLA and FLURRY at the bottom). */
  function make(cfg) {
  const Pr = { built: false, state: 'wait', riding: false, cfg };
  const LINES = cfg.lines;
  const home = () => cfg.home();
  // is another princess on the saddle (or on her way up or down)? then this one just waves from her castle
  const busyOther = () => {
    const o = cfg.other && cfg.other();
    return !!o && !!o.built && (o.state === 'ride' || o.state === 'hop' || o.state === 'drop');
  };

  function say(text, giggle) {
    const S = Pr.S;
    S.head.getWorldPosition(_v);
    Pr.proxy.pos.set(_v.x, _v.y - 2.0, _v.z);
    UA.UI.say(Pr.proxy, text);
    Pr.lineCd = 5;
    if (giggle && UA.Audio.giggle) UA.Audio.giggle();
  }
  function sparkle(n, spread) {
    const S = Pr.S;
    S.star.getWorldPosition(_w);
    UA.FX.sparkles(_w, n || 4, undefined, spread || 0.6, 0.6);
  }
  // face a point, turning smoothly
  function faceTo(x, z, dt, rate) {
    const R = Pr.S.root;
    const want = Math.atan2(x - R.position.x, z - R.position.z);
    R.rotation.y += UA.clamp(UA.angleDiff(R.rotation.y, want), -(rate || 8) * dt, (rate || 8) * dt);
  }
  // walk (skip) toward a spot; returns the distance left. Sets Pr.moved when she really made progress.
  // If the way is blocked (the fountain, a column) she sidesteps around it instead of pushing into it.
  function skipTo(x, z, dt, speed, free) {
    const R = Pr.S.root;
    const dx = x - R.position.x,
      dz = z - R.position.z;
    const d = Math.hypot(dx, dz);
    Pr.moved = false;
    if (d > 0.05) {
      const ux = dx / d,
        uz = dz / d;
      const st = Math.min(d, speed * dt);
      const side = Pr.side || 1;
      let best = null;
      for (const a of [0, side * 0.85, -side * 0.85, side * 1.6, -side * 1.6]) {
        const ca = Math.cos(a),
          sa = Math.sin(a);
        const dirx = ux * ca - uz * sa,
          dirz = ux * sa + uz * ca;
        _q.set(R.position.x + dirx * st, 0, R.position.z + dirz * st);
        if (free) UA.World.clampPlay(_q); // walking home from far away: only the edge of the world stops her
        else cfg.clamp(_q); // stay inside her castle grounds
        UA.World.resolve(_q, 0.7);
        const mx = _q.x - R.position.x,
          mz = _q.z - R.position.z;
        const prog = (mx * ux + mz * uz) / st;
        const disp = Math.hypot(mx, mz) / st;
        // straight on if it works; otherwise any sidestep that really gets her somewhere (sliding round the fountain)
        if (disp > 0.5 && prog > (a === 0 ? 0.45 : -0.1)) {
          best = { x: _q.x, z: _q.z, a, prog, disp, score: 9 };
          break;
        }
        const score = prog + 0.3 * disp;
        if (!best || score > best.score) best = { x: _q.x, z: _q.z, a, prog, disp, score };
      }
      if (best && best.a !== 0) Pr.side = best.a > 0 ? 1 : -1;
      if (best && best.disp > 0.2) {
        const mx = best.x - R.position.x,
          mz = best.z - R.position.z;
        faceTo(R.position.x + mx, R.position.z + mz, dt, 12);
        R.position.x = best.x;
        R.position.z = best.z;
        Pr.moved = true;
      } else faceTo(x, z, dt, 10);
      R.position.y = UA.World.groundAt(R.position.x, R.position.z);
    }
    return d;
  }
  function setState(s) {
    Pr.state = s;
    Pr.t = 0;
    Pr.step = -1; // the intro's line counter starts over every time
    if (s === 'wait' || s === 'hop' || s === 'walk' || s === 'ride') Pr.wantRide = false; // (a request to ride lasts while she is on her way to you)
  }
  function startHop(uni) {
    const R = Pr.S.root;
    UA.state[cfg.metKey] = true;
    if (UA.save) UA.save();
    Pr.hopFrom = R.position.clone();
    setState('hop');
    Pr.hopYaw0 = R.rotation.y;
    UA.Audio.jump();
  }
  // where she walks to after a ride: her castle door in her own world, otherwise the portal that leads to her home
  function walkTarget() {
    if (cfg.here()) {
      const h = home();
      return { x: h.x, z: h.z };
    }
    const Rm = UA.Realm,
      P = Pr.S.root.position;
    let best = null,
      bd = 1e9;
    for (const q of Rm.portals) {
      if (q.area !== Rm.cur) continue;
      if (Rm.cur === 'main' && q.dest !== cfg.world) continue;
      const d = Math.hypot(q.wx - P.x, q.wz - P.z);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best ? { x: best.wx, z: best.wz, portal: best } : null;
  }
  function toHome(sparkles) {
    const h = home();
    const R = Pr.S.root;
    if (R.parent && R.parent !== Pr.scene) {
      R.parent.remove(R);
      Pr.scene.add(R);
    }
    R.position.copy(h);
    R.rotation.set(0, 0, 0);
    R.scale.setScalar(Pr.scale);
    if (sparkles && cfg.here()) UA.FX.burst(_v.set(h.x, h.y + 1.6, h.z), 18);
    Pr.riding = false;
    setState('wait');
  }

  /* The player asks her to ride (the "Ride together" card), or asks her to get down (J, or the "Hop off" button). Riders only
     ever mount and dismount when asked, so a child is never surprised by a passenger. */
  Pr.askRide = function (uni) {
    if (!Pr.built || Pr.wantRide) return false;
    if (!(Pr.state === 'wait' || Pr.state === 'come' || Pr.state === 'intro') || busyOther()) return false;
    if (uni.rail && uni.rail.active) return false;
    Pr.wantRide = true;
    if (UA.Audio.pop) UA.Audio.pop();
    say(rnd(['Yes please!', 'Oh, yippee!', 'I would love to!']), true);
    return true;
  };
  Pr.hopOff = function (uni) {
    if (!Pr.built || Pr.state !== 'ride') return false;
    if (!Pr.hopPending) say(rnd(['Okay! Down I hop!', 'Thank you for the ride!', 'Okay, hop hop!']), true);
    Pr.hopPending = true; // (she waits for a landing, or the end of a slide)
    return true;
  };
  // the dress-up screen hides the rider while the unicorn is being dressed (Pr.update shows her again)
  Pr.lookHide = function (on) {
    if (Pr.built && Pr.state === 'ride') Pr.S.root.visible = !on;
  };

  Pr.build = function (scene) {
    if (Pr.built) return;
    Pr.built = true;
    Pr.scene = scene;
    Pr.scale = 0.9; // a little smaller than the model's natural size, so she sits nicely on the saddle
    const S = (Pr.S = buildModel(cfg));
    S.root.scale.setScalar(Pr.scale);
    scene.add(S.root);
    S.root.visible = false;
    Pr.proxy = { pos: new V3(), scale: 1 };
    Pr.cool = 0;
    Pr.lineCd = 0;
    Pr.rideT = 0;
    Pr.stillT = 0;
    Pr.hopT = 0;
    Pr.curtsyT = 9;
    Pr.wandCd = 12;
    Pr.lastPoops = 0;
    Pr.wasGrounded = true;
    Pr.fastT = 0;
    Pr.jumped = false;
    toHome(false);
    if (UA.Outline && UA.Outline.apply) UA.Outline.apply(S.root);
    if (cfg.beacon) buildBeacon(S.root);
  };

  /* a soft column of light and a turning snowflake above a princess who is waiting, so she can be seen from far away
     (Flurry waits at the top of a mountain: without it she is a tiny figure in front of a very big castle) */
  function buildBeacon(root) {
    // (drawn with normal blending, in real colours: a pale additive glow vanishes against a pale castle and snow)
    const gradTex = (stops) => {
      const gc = document.createElement('canvas');
      gc.width = 4;
      gc.height = 128;
      const g = gc.getContext('2d');
      const gr = g.createLinearGradient(0, 128, 0, 0);
      stops.forEach((st) => gr.addColorStop(st[0], st[1]));
      g.fillStyle = gr;
      g.fillRect(0, 0, 4, 128);
      return new T.CanvasTexture(gc);
    };
    const mk = (r0, r1, h, op, tex) => {
      const m = new T.Mesh(new T.CylinderGeometry(r0, r1, h, 14, 1, true), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: op, depthWrite: false, side: T.DoubleSide, fog: false }));
      m.position.y = h / 2;
      m.renderOrder = 6;
      return m;
    };
    const B = new T.Group();
    B.add(mk(1.2, 3.0, 34, 0.95, gradTex([[0, 'rgba(20,130,255,1)'], [0.6, 'rgba(40,140,255,0.95)'], [0.88, 'rgba(110,120,255,0.75)'], [1, 'rgba(160,120,255,0)']])));
    B.add(mk(0.3, 1.1, 34, 1, gradTex([[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(235,248,255,0.85)'], [1, 'rgba(255,255,255,0)']])));
    // a snowflake that turns and bobs at the top of the column (white with a blue edge, so it shows on any background)
    const sc = document.createElement('canvas');
    sc.width = sc.height = 128;
    const c = sc.getContext('2d');
    c.translate(64, 64);
    c.lineCap = 'round';
    const arms = (col, w1, w2) => {
      c.strokeStyle = col;
      for (let k = 0; k < 6; k++) {
        c.rotate(Math.PI / 3);
        c.lineWidth = w1;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, -52);
        c.stroke();
        c.lineWidth = w2;
        c.beginPath();
        c.moveTo(0, -28);
        c.lineTo(-14, -42);
        c.moveTo(0, -28);
        c.lineTo(14, -42);
        c.stroke();
      }
    };
    arms('#1f5fe0', 22, 18);
    arms('#ffffff', 8, 6);
    const flake = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false, depthTest: false, fog: false }));
    flake.scale.set(7.4, 7.4, 1);
    flake.position.y = 37;
    flake.renderOrder = 7;
    B.add(flake);
    B.userData.flake = flake;
    B.userData.mats = B.children.filter((o) => o.isMesh).map((o) => o.material);
    B.userData.base = B.userData.mats.map((m) => m.opacity);
    root.add(B);
    Pr.beacon = B;
    Pr.beaconK = 1;
  }
  function updateBeacon(dt, t) {
    const B = Pr.beacon;
    if (!B) return;
    // shown while she waits for you; fades away when she has come to say hello (and never while she rides)
    const want = Pr.state === 'wait' ? 1 : 0;
    Pr.beaconK = UA.damp(Pr.beaconK, want, 4, dt);
    B.visible = Pr.beaconK > 0.02;
    if (!B.visible) return;
    const pulse = 0.82 + 0.18 * Math.sin(t * 2.4);
    B.userData.mats.forEach((m, i) => (m.opacity = B.userData.base[i] * pulse * Pr.beaconK));
    const f = B.userData.flake;
    f.material.opacity = Pr.beaconK * (0.75 + 0.25 * Math.sin(t * 3));
    f.position.y = 37 + Math.sin(t * 1.7) * 1.1;
    f.material.rotation = t * 0.6;
    f.scale.setScalar(7.4 + Math.sin(t * 2.4) * 0.7);
  }

  // called by realm.js when the unicorn goes through a portal
  Pr.onPortal = function (uni) {
    if (!Pr.built) return;
    if (Pr.state === 'ride') {
      Pr.lineCd = 0;
      say(cfg.here() ? rnd(LINES.home) : rnd(LINES.away), true);
    } else if (Pr.state === 'hop' || Pr.state === 'drop') {
      if (Pr.state === 'hop') mount(uni);
      else toHome(false);
    } else if (Pr.state !== 'wait') {
      toHome(false);
    }
    Pr.cool = Math.max(Pr.cool, 3);
  };

  function mount(uni) {
    const R = Pr.S.root;
    if (R.parent) R.parent.remove(R);
    uni.P.saddle.add(R);
    R.position.copy(SEAT);
    R.rotation.set(0, 0, 0);
    R.scale.setScalar(Pr.scale);
    Pr.riding = true;
    Pr.rideT = 0;
    Pr.stillT = 0;
    Pr.fastT = 0;
    Pr.hopPending = false;
    Pr.hintShown = false;
    Pr.wandCd = 10;
    Pr.lineCd = 3;
    Pr.lastPoops = UA.GlitterPoop ? UA.GlitterPoop.total : 0;
    setState('ride');
    UA.FX.burst(_v.set(uni.pos.x, uni.pos.y + 3.2 * uni.size * uni.scaleK, uni.pos.z), 22);
    UA.FX.hearts(_v, 5);
    if (UA.Audio.hello) UA.Audio.hello();
    if (!UA.state[cfg.rodeKey]) {
      UA.state[cfg.rodeKey] = true;
      UA.UI.toast('Princess ' + cfg.name + ' is riding with you!<small>Tap "Hop off" at the top left when you want her to get down</small>', 5200);
      if (UA.save) UA.save();
    }
  }

  function dismount(uni, toGround) {
    const R = Pr.S.root;
    // take her off the saddle at its current place in the world
    uni.P.saddle.localToWorld(_v.copy(SEAT));
    uni.P.saddle.remove(R);
    Pr.scene.add(R);
    R.position.copy(_v);
    R.rotation.set(0, uni.yaw, 0);
    R.scale.setScalar(Pr.scale * uni.size * uni.scaleK);
    Pr.hopFrom = _v.clone();
    // land beside the unicorn, on her right
    const side = uni.yaw - Math.PI / 2;
    Pr.hopTo = new V3(uni.pos.x + Math.sin(side) * 3.0, 0, uni.pos.z + Math.cos(side) * 3.0);
    UA.World.resolve(Pr.hopTo, 0.7);
    Pr.hopTo.y = UA.World.groundAt(Pr.hopTo.x, Pr.hopTo.z);
    Pr.hopYaw0 = uni.yaw;
    Pr.hopYaw1 = uni.yaw + Math.PI * 0.9;
    Pr.riding = false;
    setState('drop');
  }

  Pr.update = function (dt, t, uni, ctx) {
    if (!Pr.built) return;
    const S = Pr.S,
      Realm = UA.Realm;
    const riding = Pr.state === 'ride';
    const visible = cfg.here() || riding || Pr.state === 'hop' || Pr.state === 'drop' || Pr.state === 'poof' || Pr.state === 'walk';
    S.root.visible = visible;
    if (!visible) {
      if (Pr.state !== 'wait') toHome(false);
      return;
    }
    updateBeacon(dt, t);
    Pr.cool = Math.max(0, Pr.cool - dt);
    Pr.lineCd = Math.max(0, Pr.lineCd - dt);
    Pr.t += dt;
    Pr.curtsyT += dt;
    const R = S.root;
    const h = home();
    const p = { skip: 0, sit: 0, wave: 0, twirl: 0, air: 0, wind: 0, lean: 0, look: 0, curtsy: Pr.curtsyT < 0.9 ? Pr.curtsyT / 0.9 : 1 };
    const du = dist2(uni.pos, R.position); // only meaningful while she is on the ground

    // the "Ride together" card: whenever she is waiting near you (or coming over to say hello)
    if ((Pr.state === 'wait' || Pr.state === 'come' || Pr.state === 'intro') && cfg.here() && !busyOther() && !(uni.rail && uni.rail.active) && du < (Pr.state === 'wait' ? 12 : 22)) {
      UA.UI.offer('ride-' + cfg.key, du, {
        name: 'Princess ' + cfg.name,
        sub: Pr.wantRide ? 'is coming!' : 'would love a ride',
        btns: [{ a: 'pet', key: 'E', icon: UA.UI.ICON.crown, label: 'Ride together' }],
        acts: { pet: () => Pr.askRide(uni) },
        sig: Pr.wantRide ? 'coming' : 'ask',
      });
    }

    if (Pr.state === 'wait' && Pr.wantRide) {
      if (du < 12 && uni.grounded && !uni.gliding) startHop(uni);
      else setState('come');
    } else if (Pr.state === 'wait') {
      // by the keep door, glancing at the unicorn and waving when she is near
      const dHome = dist2(uni.pos, h);
      const dNow = dist2(uni.pos, R.position);
      const away = dist2(R.position, h) > 1.2;
      if (away) {
        skipTo(h.x, h.z, dt, 6);
        p.skip = Pr.moved ? 1 : 0;
      } else {
        faceTo(dNow < (cfg.waveR || 34) + 6 ? uni.pos.x : h.x, dNow < (cfg.waveR || 34) + 6 ? uni.pos.z : h.z + 10, dt, 6);
      }
      p.wave = dNow < (cfg.waveR || 34) && dNow > 6 ? 1 : 0;
      p.look = dNow < (cfg.waveR || 34) ? UA.clamp(UA.angleDiff(R.rotation.y, Math.atan2(uni.pos.x - R.position.x, uni.pos.z - R.position.z)), -0.7, 0.7) : 0;
      // a twinkle from the wand now and then
      Pr.wandCd -= dt;
      if (Pr.wandCd <= 0) {
        Pr.wandCd = 6 + Math.random() * 6;
        Pr.twirlT = 1.2;
      }
      Pr.twirlT = Math.max(0, (Pr.twirlT || 0) - dt);
      p.twirl = Pr.twirlT > 0 ? 1 : 0;
      if (Pr.twirlT > 0 && Math.random() < dt * 14) sparkle(2, 0.5);
      // somebody is coming: go and say hello
      if (Pr.cool <= 0 && !away && uni.grounded && uni.size < 2.6 && dNow < (cfg.comeR || 34) && cfg.here() && !busyOther()) {
        if (!UA.state[cfg.metKey]) say(LINES.come, true);
        else say('Hello again, ' + (UA.state.name || 'Sparkle') + '!', true);
        setState('come');
      } else if (Pr.cool <= 0 && away && dNow < (cfg.comeR || 34) && !busyOther()) {
        setState('come');
      }
    } else if (Pr.state === 'come') {
      // skip over to the unicorn and stop a few steps away
      const dx = R.position.x - uni.pos.x,
        dz = R.position.z - uni.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const tx = uni.pos.x + (dx / d) * 3.5,
        tz = uni.pos.z + (dz / d) * 3.5;
      skipTo(tx, tz, dt, 8.5);
      p.skip = Pr.moved ? 1 : 0;
      p.wave = d < 12 || !Pr.moved ? 1 : 0;
      if (d < 4.4) {
        if (Pr.wantRide && uni.grounded && !uni.gliding) startHop(uni);
        else setState('intro');
      } else if (d > (cfg.comeR || 34) + 14 || !cfg.here()) {
        Pr.cool = 5;
        setState('wait');
      }
    } else if (Pr.state === 'intro') {
      // greet, curtsy, ask for a ride
      faceTo(uni.pos.x, uni.pos.z, dt, 9);
      p.look = UA.clamp(UA.angleDiff(R.rotation.y, Math.atan2(uni.pos.x - R.position.x, uni.pos.z - R.position.z)), -0.6, 0.6);
      const first = !UA.state[cfg.metKey];
      const k = Pr.t;
      const step = first ? [0, 2.7, 5.4, 7.6] : [0, 2.2, 4.0];
      const want = step.filter((s) => k >= s).length - 1;
      while (Pr.step < want) {
        Pr.step++;
        if (first) {
          if (Pr.step === 0) {
            say(LINES.intro[0], true);
            if (UA.Audio.hello) UA.Audio.hello();
          } else if (Pr.step === 1) {
            say(LINES.intro[1]);
            Pr.curtsyT = 0;
          } else if (Pr.step === 2) say(LINES.intro[2]);
        } else {
          if (Pr.step === 0) {
            say('Welcome back, ' + (UA.state.name || 'Sparkle') + '!', true);
            Pr.curtsyT = 0;
          } else if (Pr.step === 1) say('Shall we go for a ride?');
        }
      }
      p.wave = k < 2.4 ? 1 : 0;
      if (first && k > 5 && k < 7.4) p.twirl = 0;
      const readyT = first ? 7.6 : 4.0;
      if (Pr.wantRide) {
        // they said yes: hop on as soon as the unicorn stands still enough
        if (du < 12 && uni.grounded && !uni.gliding) startHop(uni);
        else if (du > 14) setState('come');
      } else if (k >= readyT) {
        // she has asked and now waits for the answer (the "Ride together" card); she gives up if they ride away, or after a while
        if (du > 14 || uni.speed > 9) {
          say('Come back soon!');
          Pr.cool = 8;
          setState('wait');
        } else if (k > readyT + 26) {
          say('Maybe next time!');
          Pr.cool = 30;
          setState('wait');
        }
      } else if (du > 20) {
        say('Wait for me!');
        setState('come');
      }
      // she is not far when they are close: keep her facing and bobbing happily
      p.skip = 0;
    } else if (Pr.state === 'hop') {
      // a twirling leap onto the saddle
      const k = UA.clamp(Pr.t / 0.95, 0, 1);
      uni.P.saddle.localToWorld(_q.copy(SEAT));
      _v.lerpVectors(Pr.hopFrom, _q, k * k * (3 - 2 * k));
      _v.y += Math.sin(Math.PI * k) * 2.6;
      R.position.copy(_v);
      R.rotation.y = Pr.hopYaw0 + UA.angleDiff(Pr.hopYaw0, uni.yaw) * k + k * TAU;
      R.scale.setScalar(Pr.scale * UA.lerp(1, uni.size * uni.scaleK, k));
      p.air = Math.sin(Math.PI * Math.min(1, k * 1.15));
      p.sit = k > 0.8 ? (k - 0.8) / 0.2 : 0;
      p.wave = 0;
      if (Math.random() < dt * 30) UA.FX.sparkles(_v, 1, undefined, 0.5, 0.2);
      if (k >= 1) {
        mount(uni);
        say('Wheee! Off we go!', true);
      }
    } else if (Pr.state === 'ride') {
      rideUpdate(dt, t, uni, ctx, p);
    } else if (Pr.state === 'drop') {
      const k = UA.clamp(Pr.t / 0.85, 0, 1);
      _v.lerpVectors(Pr.hopFrom, Pr.hopTo, k);
      _v.y += Math.sin(Math.PI * k) * 2.2;
      R.position.copy(_v);
      R.rotation.y = Pr.hopYaw0 + (Pr.hopYaw1 - Pr.hopYaw0) * k;
      R.scale.setScalar(Pr.scale * UA.lerp(uni.size * uni.scaleK, 1, k));
      p.air = Math.sin(Math.PI * k);
      p.sit = 1 - Math.min(1, k * 3);
      if (k >= 1) {
        R.position.copy(Pr.hopTo);
        R.scale.setScalar(Pr.scale);
        UA.FX.puff(R.position, 6, 0xfff4fb);
        Pr.cool = 22;
        Pr.curtsyT = 0;
        // she waves and walks back to her castle (or, far from home, to the portal that leads there)
        const tg = walkTarget();
        if (tg) {
          say(cfg.here() ? 'Thank you for the lovely ride!' : 'Thank you! I will walk home now!', true);
          Pr.walkTo = tg;
          Pr.stuckT = 0;
          setState('walk');
        } else {
          say('Thank you! Bye bye!', true);
          setState('poof');
        }
      }
    } else if (Pr.state === 'walk') {
      const tg = Pr.walkTo;
      Pr.cool = Math.max(Pr.cool, 3);
      if (Pr.t < 1.4) {
        // a wave goodbye first
        faceTo(uni.pos.x, uni.pos.z, dt, 8);
        p.wave = 1;
      } else {
        const d = skipTo(tg.x, tg.z, dt, 7.2, true);
        p.skip = Pr.moved ? 1 : 0;
        Pr.stuckT = Pr.moved ? 0 : (Pr.stuckT || 0) + dt;
        if (d < (tg.portal ? 2.2 : 1.6)) {
          if (tg.portal) {
            // through the portal and home
            UA.FX.burst(_v.set(R.position.x, R.position.y + 1.6, R.position.z), 26);
            UA.Audio.sparkle();
            toHome(false);
          } else setState('wait');
          Pr.cool = 14;
        } else if (Pr.stuckT > 3 || Pr.t > 60 || dist2(R.position, uni.pos) > 170) {
          // stuck, or too far for anybody to see: a twinkle and she is home
          if (dist2(R.position, uni.pos) < 80) UA.FX.burst(_v.set(R.position.x, R.position.y + 1.6, R.position.z), 18);
          toHome(false);
          Pr.cool = 14;
        }
      }
    } else if (Pr.state === 'poof') {
      p.wave = 1;
      faceTo(uni.pos.x, uni.pos.z, dt, 8);
      if (Pr.t > 1.7) {
        UA.FX.burst(_v.set(R.position.x, R.position.y + 1.6, R.position.z), 26);
        UA.Audio.sparkle();
        toHome(false);
        Pr.cool = 12;
      }
    }

    // sparkle dust drifting off her wand in the world (not every frame)
    if (Pr.state !== 'wait' || p.twirl) pose(S, dt, t, p);
    else pose(S, dt, t, p);
    // keep the speech bubble's anchor on her head
    S.head.getWorldPosition(_v);
    Pr.proxy.pos.set(_v.x, _v.y - 2.0, _v.z);
  };

  function rideUpdate(dt, t, uni, ctx, p) {
    const S = Pr.S;
    Pr.rideT += dt;
    p.sit = 1;
    const spd = uni.speed;
    const spdFrac = UA.clamp(spd / 14, 0, 1);
    p.wind = spdFrac * 0.95 + (uni.gliding ? 0.5 : 0);
    p.lean = UA.clamp(-uni.yawRate * 0.022, -0.25, 0.25);
    p.look = UA.clamp(uni.yawRate * 0.035, -0.5, 0.5);
    const air = !uni.grounded && !uni.gliding && uni.pos.y - UA.World.groundAt(uni.pos.x, uni.pos.z) > 1.2;
    p.air = air || uni.gliding ? 1 : 0;
    // wand: twirl now and then, and when the unicorn casts magic
    Pr.wandCd -= dt;
    if (ctx && ctx.input && ctx.input.magic) Pr.wandCd = Math.min(Pr.wandCd, 0);
    if (Pr.wandCd <= 0) {
      Pr.wandCd = 14 + Math.random() * 10;
      Pr.twirlT = 1.4;
      // her sparkle makes nearby friends cheer
      if (UA.Creatures.nearest(uni, 10)) UA.Creatures.dazzle(uni.pos, 10);
      if (Pr.lineCd <= 0) say(rnd(LINES.magic), true);
    }
    Pr.twirlT = Math.max(0, (Pr.twirlT || 0) - dt);
    p.twirl = Pr.twirlT > 0 && !p.air ? 1 : 0;
    if (Pr.twirlT > 0 && Math.random() < dt * 20) sparkle(2, 0.5);
    // things to say
    const jumpedNow = !uni.grounded && Pr.wasGrounded && uni.vy > 5;
    Pr.wasGrounded = uni.grounded;
    if (jumpedNow && Pr.lineCd <= 0 && Math.random() < 0.55) say(rnd(LINES.air), true);
    Pr.fastT = spd > 12 ? Pr.fastT + dt : 0;
    if (Pr.fastT > 3.2 && Pr.lineCd <= 0) {
      Pr.fastT = 0;
      say(rnd(LINES.fast));
    }
    if (UA.GlitterPoop && UA.GlitterPoop.total !== Pr.lastPoops) {
      Pr.lastPoops = UA.GlitterPoop.total;
      Pr.lineCd = 0;
      say(rnd(LINES.poop), true);
    }
    if (Pr.lineCd <= 0 && Pr.rideT > 5) {
      const near = UA.Creatures.nearest(uni, 9);
      if (near && near.bond === 0 && Math.random() < 0.5 && LINES.friend[near.type]) say(LINES.friend[near.type]);
      else if (Math.random() < dt * 0.12) say(rnd(LINES.wow), spd > 8);
    }
    // she gets down only when asked (J, or the "Hop off" button), as soon as the unicorn has landed and is not sliding
    Pr.stillT = spd < 0.8 && uni.grounded ? Pr.stillT + dt : 0;
    if (Pr.hopPending && uni.grounded && !uni.gliding && !(uni.rail && uni.rail.active)) {
      Pr.hopPending = false;
      dismount(uni);
    } else if (!Pr.hintShown && Pr.stillT > 7 && Pr.lineCd <= 0) {
      // for anyone who stops and wonders how to let her down
      Pr.hintShown = true;
      say('Tap "Hop off" when you want me to get down!');
    }
  }
  return Pr;
  }

  /* ---------- the two princesses ---------- */
  const COMMON = {
    wow: ['Wheee!', 'This is so fun!', 'I love riding!', 'What a lovely day!', 'Wow, so fast!', 'Yippee!'],
    fast: ['Faster, faster!', 'Whoosh!', 'Hold on tight!', 'Zoom zoom zoom!'],
    air: ['Wheee!', 'We are flying!', 'Wow, up we go!'],
    poop: ['Hee hee! Glitter!', 'Oh my! So sparkly!', 'Hehehe! Pretty sparkles!'],
  };
  const clampBox = (q, cx, cz, x0, x1, z0, z1) => {
    q.x = cx + UA.clamp(q.x - cx, x0, x1);
    q.z = cz + UA.clamp(q.z - cz, z0, z1);
  };
  const STARLA = {
    key: 'starla',
    name: 'Starla',
    style: 'starla',
    pal: { SKIN: 0xffdcc6, HAIR: 0xffc93c, HAIR2: 0xffe27a, DRESS: 0xff93c8, DRESS2: 0xffc4e0, LILAC: 0xb394ff, GOLD: 0xffd45e, GEM: 0xff6fa8, EYE: 0x3b2a6e, BROW: 0xb8802a, WAND: 0xffd45e },
    world: 'star', // the area she lives in (walking home from elsewhere, she heads for the portal that leads there)
    metKey: 'princessMet',
    rodeKey: 'princessRode',
    here: () => UA.Realm.inRealm,
    home: () => UA.Realm.toWorld(UA.Realm.PRINCESS_HOME.lx, UA.Realm.PRINCESS_HOME.lz),
    clamp: (q) => clampBox(q, UA.REALM.x, UA.REALM.z, -58, 58, -62, 30), // the castle gardens
    other: () => UA.IcePrincess,
    lines: Object.assign({}, COMMON, {
      come: 'Yoo-hoo! A unicorn!',
      intro: ["Hello! I'm Princess Starla!", 'Welcome to Starlight Castle!', 'May I ride with you?'],
      home: ['Home sweet castle!', 'Look, we are home!'],
      away: ['Ooh! What a pretty place!', 'Wow! Where are we?'],
      magic: ['Sparkle sparkle!', 'A little magic!', 'Ta-da!'],
      friend: { bunny: 'Hello, little bunny!', sheep: 'Hello, fluffy sheep!', fox: 'Hello, Mr. Fox!', dragon: 'Hello, little dragon!', snowbunny: 'Hello, snowy bunny!', frostfox: 'Hello, frosty fox!', penguin: 'Hello, little penguin!', polarcub: 'Hello, snuggly cub!', icedragon: 'Hello, icy dragon!' },
    }),
  };
  const FLURRY = {
    key: 'flurry',
    name: 'Flurry',
    style: 'flurry',
    pal: { SKIN: 0xffe3d6, HAIR: 0xd2cfff, HAIR2: 0xf0eeff, DRESS: 0x86c8ff, DRESS2: 0xc9e8ff, LILAC: 0x9b8cff, GOLD: 0xeef7ff, GEM: 0x6fd8ff, EYE: 0x2f4a8f, BROW: 0x8c88c4, WAND: 0x8fe8ff },
    world: 'ice',
    metKey: 'iceMet',
    rodeKey: 'iceRode',
    beacon: true, // a column of light over her while she waits (she is far from the arrival and the castle is huge)
    waveR: 90, // she waves from a long way off ...
    comeR: 46, // ... and comes out to meet you from here
    here: () => UA.Realm.inIce,
    home: () => {
      const H = UA.Realm.ICE_PRINCESS_HOME;
      return new V3(UA.ICE.x + H.lx, UA.World.groundAt(UA.ICE.x + H.lx, UA.ICE.z + H.lz), UA.ICE.z + H.lz);
    },
    clamp: (q) => clampBox(q, UA.ICE.x, UA.ICE.z, -36, 36, -132, -76), // the ice castle's courtyard and gardens
    other: () => UA.Princess,
    lines: Object.assign({}, COMMON, {
      come: 'Ooh, a unicorn! Hello!',
      intro: ["Hi there! I'm Princess Flurry!", 'Welcome to Frostglow Peak!', 'May I ride with you?'],
      home: ['Home sweet ice castle!', 'Brrr-illiant! We are home!'],
      away: ['Ooh! What a pretty place!', 'Wow! It is so warm here!'],
      magic: ['Sparkle sparkle!', 'A little frost magic!', 'Ta-da!'],
      wow: ['Wheee! So fast!', 'Brrr-illiant!', 'I love snowy rides!', 'What a sparkly day!', 'Whoosh!', 'Yippee!'],
      friend: { bunny: 'Hello, little bunny!', sheep: 'Hello, fluffy sheep!', fox: 'Hello, Mr. Fox!', dragon: 'Hello, little dragon!', snowbunny: 'Hello, snowy bunny!', frostfox: 'Hello, frosty fox!', penguin: 'Hello, little penguin!', polarcub: 'Hello, snuggly cub!', icedragon: 'Hello, icy dragon!' },
    }),
  };
  UA.Princess = make(STARLA);
  UA.IcePrincess = make(FLURRY);
})();
