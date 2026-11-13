/* Twinkle Town residents: shopkeepers who live in their shops, stroll the street, greet the unicorn, step aside,
   (and stay out under the stars: BEDTIME below turns the old go-to-bed-at-night routine back on), plus the jelly-bean kids playing tag in the plaza and Pixel's "Special Delivery" quest. */
(function () {
  const UA = window.UA;
  const V3 = THREE.Vector3;
  const T = UA.TOWN;
  const Town = UA.Town;
  const M = UA.FolkModels;
  const K = M.K;
  const Folk = (UA.Folk = { list: [], built: false, started: false, it: null, sayCd: 0, out: true });
  const Y0 = T.H + 0.09;
  const C0 = { x: T.ox - 34, z: T.oz };
  const clamp = UA.clamp,
    damp = UA.damp,
    dampAngle = UA.dampAngle;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const L = (u, v) => ({ x: T.ox + u, z: T.oz + v });
  const angDiff = (a, b) => {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  /* ---------- who lives here ---------- */
  const DEFS = [
    {
      id: 'pixel', name: 'Pixel', role: 'Postal fox', model: 'fox', home: 'post', s: 1.0, speed: 2.5, voice: 700, act: 'post', roam: 'mail', every: [9, 16], hold: { R: [-1.0, 0.12] },
      hi: ['Hi {n}! Got any mail?', 'Zoom zoom! Letters to deliver!', 'Hello hello, {n}!'],
      talk: ['I run through town with the mail every day!', 'Every letter has a little sparkle inside.', 'Bun gets the most letters. Everybody loves cupcakes!', 'Your hoofprints make the cobblestones twinkle!'],
    },
    {
      id: 'bun', name: 'Baker Bun', role: 'Bunny baker', model: 'bunny', home: 'bakery', s: 1.0, speed: 2.0, voice: 880, act: 'bake', roam: 'street', every: [14, 26], gift: 'sprinkle cupcake',
      hi: ['Fresh cupcakes! Yum!', 'Hello {n}! Smell that?', 'Sprinkles for everyone!'],
      talk: ['Sprinkles make everything better!', 'I bake a thousand cupcakes before breakfast!', 'Shh... my secret ingredient is giggles.'],
      giftLine: 'Fresh from the oven! Have a sprinkle cupcake!',
    },
    {
      id: 'gumbo', name: 'Gumbo', role: 'Dragon candy-maker', model: 'dragon', home: 'candy', s: 1.2, speed: 1.9, voice: 330, act: 'candy', roam: 'street', every: [16, 28], gift: 'warm gumdrop', hold: { L: [-0.9, -0.1] },
      hi: ['Burp! Oops, hello!', 'Candy time, {n}!', 'Hee hee, hello!'],
      talk: ['I make gumdrops hot and fresh!', 'Careful, the lollipops are extra sticky!', 'I sneeze sparkles when I eat too much sugar.'],
      giftLine: 'Hot gumdrop, fresh from the pot! For you!',
    },
    {
      id: 'hoot', name: 'Professor Hoot', role: 'Owl librarian', model: 'owl', home: 'library', s: 1.0, speed: 1.7, voice: 460, act: 'read', roam: 'street', every: [30, 50], hold: { L: [-1.15, -0.05] },
      hi: ['Hoo hoo! Welcome!', 'Shh... story time!', 'Hoo! A visitor!'],
      talk: ['Every book in here has a secret door inside.', 'My favorite story is about a cloud that learned to dance.', 'I read bedtime stories to the fireflies.'],
    },
    {
      id: 'nimbus', name: 'Nimbus', role: 'Sheep innkeeper', model: 'sheep', home: 'inn', s: 1.0, speed: 1.5, voice: 520, act: 'sleepy', roam: 'street', every: [34, 55], hold: { R: [-0.9, -0.5] },
      hi: ['Yaaawn... hello!', 'Zzz... oh! Hi!', 'Sweet dreams, {n}!'],
      talk: ['The Cozy Cloud Inn has the fluffiest beds!', 'I counted a hundred sheep. Wait... I AM a sheep.', 'Sleepy unicorns get the best dreams.'],
    },
    {
      id: 'maple', name: 'Madame Maple', role: 'Hedgehog hat-maker', model: 'hedgehog', home: 'hats', s: 0.95, speed: 1.9, voice: 760, act: 'sew', roam: 'street', every: [16, 30], hold: { L: [-0.9, -0.1] },
      hi: ['Ooh, darling! Fabulous mane!', 'Welcome to Twirl Top Hats!', 'Hello, {n}! Lovely day!'],
      talk: ['Hats are just hugs for your head!', 'I once made a hat for a giraffe. Very tall!', 'A hat with a feather can sing, you know.'],
    },
    {
      id: 'misty', name: 'Misty', role: 'Cloud-cat ice cream seller', model: 'cat', home: 'icecream', s: 0.95, speed: 2.1, voice: 980, act: 'scoop', roam: 'street', every: [14, 26], hold: { R: [-1.3, 0.1] },
      hi: ['Brrr-illiant day for ice cream!', 'Meow! Hello {n}!', 'Scoop scoop!'],
      talk: ['I make ice cream from real clouds!', 'Rainbow swirl is my favorite. Purr!', 'One scoop for you, one scoop for the sky!'],
    },
    {
      id: 'petal', name: 'Petal', role: 'Flower fairy', model: 'fairy', home: 'flowers', s: 0.85, speed: 2.4, voice: 1180, act: 'water', roam: 'fly', every: [8, 15], hover: 0.7,
      hi: ['Hi hi hi! Flutter flutter!', '{n}! You are so sparkly!', 'Wheee, hello!'],
      talk: ['Flowers love it when you sing to them!', 'I wake up every bud with a tiny kiss.', 'Did you know flowers giggle at night?'],
    },
    {
      id: 'wizzle', name: 'Wizzle', role: 'Gnome wand-maker', model: 'gnome', home: 'wands', s: 0.9, speed: 1.8, voice: 400, act: 'wand', roam: 'street', every: [18, 32], hold: { L: [-0.9, -0.1] },
      hi: ['Abra-hello!', 'Ah! A unicorn! Magical!', 'Greetings, {n}!'],
      talk: ['Every wand has a tiny star inside.', 'Shh, I am teaching my beard to do magic.', 'I lost my wand once. It was in my hat!'],
    },
    {
      id: 'toby', name: 'Toby', role: 'Toadstool toy-maker', model: 'toad', home: 'toys', s: 0.95, speed: 2.2, voice: 600, act: 'juggle', roam: 'street', every: [16, 28],
      hi: ['Ta-da! Watch this!', 'Hi hi! Catch!', 'Boing! Hello {n}!'],
      talk: ['I can juggle three! Soon four!', 'Every toy here is full of giggles.', 'Boing boing! Want to see a trick?'],
    },
    {
      id: 'mayor', name: 'Mayor Marshmallow', role: 'The squishiest mayor', model: 'mayor', home: 'hall', s: 1.1, speed: 1.9, voice: 340, act: 'greet', roam: 'mayor', every: [12, 22],
      hi: ['Welcome to Twinkle Town!', 'Ah, our favorite unicorn!', 'Hello, {n}! Splendid!'],
      talk: ['This town runs on friendship and cupcakes.', 'Our clock tower knows exactly when bedtime is.', 'Everybody here is so happy you came by!'],
    },
  ];
  const KID_COLORS = [0xff8fb8, 0x8fd2ff, 0xffd45e, 0xa6ec9a, 0xbf9bff];
  const KID_LINES = { hi: ['Wheee!', 'Look, a unicorn!', 'Yay, {n}!', 'Hi hi hi!'], talk: ['Wanna play tag?', 'I can hop THIS high!', 'Your tail is so pretty!', 'You are it! No wait, I am!'] };
  const CHEERS = ['Ooh, sparkly!', 'Wow, magic!', 'So pretty!', 'Whoa!'];

  /* ---------- building ---------- */
  let root, MAT, shadows, envGeo, envMat, exMark;
  const _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _s = new THREE.Vector3(),
    _p = new THREE.Vector3();

  function meshOf(acc) {
    if (!acc || !acc.items.length) return null;
    const m = new THREE.Mesh(acc.build(), MAT);
    return m;
  }
  const grp = (x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    return g;
  };

  function makeFolk(def, kidIndex) {
    const P = M.parts();
    const info = def.kid ? M.kid(P, kidIndex, def.color) : M[def.model](P);
    const g = new THREE.Group();
    const bodyG = new THREE.Group();
    g.add(bodyG);
    const parts = { g, bodyG };
    const bm = meshOf(P.body);
    if (bm) bodyG.add(bm);
    if (!def.kid) {
      parts.headG = grp(0, K.NECK, 0.02);
      const hm = meshOf(P.head);
      if (hm) parts.headG.add(hm);
      parts.eyesG = grp(0, K.EYE, 0);
      const em = meshOf(P.eyes);
      if (em) parts.eyesG.add(em);
      parts.headG.add(parts.eyesG);
      bodyG.add(parts.headG);
      parts.armL = grp(-K.SHX, K.SHY, 0);
      parts.armR = grp(K.SHX, K.SHY, 0);
      for (const [n, a] of [['armL', P.armL], ['armR', P.armR]]) {
        const m = meshOf(a);
        if (m) parts[n].add(m);
        bodyG.add(parts[n]);
      }
      parts.legL = grp(-K.HIPX, K.HIPY, 0);
      parts.legR = grp(K.HIPX, K.HIPY, 0);
      for (const [n, a] of [['legL', P.legL], ['legR', P.legR]]) {
        const m = meshOf(a);
        if (m) parts[n].add(m);
        g.add(parts[n]);
      }
      const tm = meshOf(P.tail);
      if (tm) {
        parts.tail = grp(0, K.TAILY, K.TAILZ);
        parts.tail.add(tm);
        bodyG.add(parts.tail);
      }
      if (info.wingPivot) {
        const wp = info.wingPivot;
        parts.wingL = grp(-wp[0], wp[1], wp[2]);
        parts.wingR = grp(wp[0], wp[1], wp[2]);
        parts.wingL.add(meshOf(P.wingL));
        parts.wingR.add(meshOf(P.wingR));
        bodyG.add(parts.wingL, parts.wingR);
      }
    } else {
      parts.eyesG = grp(0, info.kidEye, 0);
      parts.eyesG.add(meshOf(P.eyes));
      bodyG.add(parts.eyesG);
    }
    return { parts, info };
  }

  Folk.build = function (scene) {
    if (Folk.built) return;
    Folk.built = true;
    root = new THREE.Group();
    scene.add(root);
    MAT = UA.addGlow(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 0.35);

    const defs = DEFS.slice();
    for (let i = 0; i < 5; i++) defs.push({ id: 'kid' + i, name: 'Jelly bean', role: 'Little friend', kid: true, color: KID_COLORS[i], model: 'kid', home: 'inn', s: 0.9, speed: 3.1, voice: 1100 + i * 90, act: 'play', hi: KID_LINES.hi, talk: KID_LINES.talk, every: [1, 2] });

    defs.forEach((def, idx) => {
      const { parts, info } = makeFolk(def, def.kid ? parseInt(def.id.slice(3), 10) : 0);
      root.add(parts.g);
      const shop = Town.shops[def.home];
      const side = shop.spec ? shop.spec.side : 0;
      const r = {
        id: def.id, def, parts, info, pos: new V3(shop.stand.x, Y0, shop.stand.z), yaw: 0, scale: 1, shop, side,
        state: 'work', after: 'work', path: [], arrive: 0.45, walkT: 0, walkMax: 10, cur: 0, phase: Math.random() * 6, timer: rnd(2, def.every[1]),
        k: 1, t2: 0, jit: Math.random(), out: true, stay: false, chatT: 0, waveT: 0, hopT: 0, cheerT: 0, greetCd: 0, seen: false, talkIdx: Math.floor(Math.random() * 3), giftCd: 0, startleCd: 0,
        blinkT: rnd(1.5, 4), blink: 0, hx: 0, hy: 0, fx_dir: 1, say: protoSay, pose: { aRx: 0, aRz: 0.08, aLx: 0, aLz: -0.08, lr: 0, ll: 0 }, fx: rnd(0, 2), eyeOpen: info.eyeOpen || 1, idx,
        face: shop.front > 0 ? 0 : shop.front < 0 ? Math.PI : Math.PI / 2, hover: def.hover || 0, vis: false, sleepZ: 0,
      };
      if (def.id === 'mayor') r.face = Math.PI / 2;
      r.scale = (def.s * (info.top || 2.3) + (def.hover || 0) + 0.6) / 2.9; // used by the speech bubble
      // where they stand when working
      r.work = { x: shop.stand.x, z: shop.stand.z };
      if (def.id === 'mayor') r.work = { x: shop.stand.x + 0.4, z: shop.stand.z + 0.8 };
      if (def.id === 'petal') r.work = { x: shop.stand.x + 0.6, z: shop.stand.z - side * 0.2 };
      if (def.kid) r.work = { x: C0.x + Math.cos(idx) * 8.5, z: C0.z + Math.sin(idx) * 8.5 };
      r.pos.set(r.work.x, Y0, r.work.z);
      r.yaw = r.face;
      if (def.id === 'toby') {
        r.balls = [0xff6f8f, 0x8fd2ff, 0xffe58a].map((c) => {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), UA.addGlow(new THREE.MeshToonMaterial({ color: c, gradientMap: UA.gradient, emissive: c, emissiveIntensity: 0.25 }), 0.6));
          parts.g.add(b);
          return b;
        });
      }
      parts.g.visible = false;
      Folk.list.push(r);
    });

    // blob shadows: one instanced draw call for everybody
    const sg = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    const sm = new THREE.MeshBasicMaterial({ map: UA.radialTexture('rgba(120,80,170,0.5)', 'rgba(120,80,170,0)', 64), transparent: true, depthWrite: false });
    shadows = new THREE.InstancedMesh(sg, sm, Folk.list.length);
    shadows.frustumCulled = false;
    shadows.renderOrder = 1;
    for (let i = 0; i < Folk.list.length; i++) shadows.setMatrixAt(i, _m.makeScale(0, 0, 0));
    root.add(shadows);

    // quest bits
    const A = new Town.Acc();
    A.box(0xffffff, 0, 0, 0, 0.95, 0.64, 0.12);
    A.box(0x7fb5ff, -0.22, 0.1, 0.075, 0.55, 0.045, 0.02, 0, 0, -0.52);
    A.box(0x7fb5ff, 0.22, 0.1, 0.075, 0.55, 0.045, 0.02, 0, 0, 0.52);
    A.sph(0xff6f8f, 0, -0.04, 0.09, 0.12, 0.12, 0.05);
    envGeo = A.build();
    envMat = UA.addGlow(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient, emissive: 0xffffff, emissiveIntensity: 0.22 }), 1.0);
    exMark = new THREE.Group();
    const emat = new THREE.MeshToonMaterial({ color: 0xffd23f, gradientMap: UA.gradient, emissive: 0xffb300, emissiveIntensity: 0.7 });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.1, 0.62, 8), emat);
    bar.position.y = 0.45;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), emat);
    dot.position.y = -0.03;
    exMark.add(bar, dot);
    exMark.visible = false;
    root.add(exMark);
    Folk.markers = {};
    Folk.orbit = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(envGeo, envMat);
      m.visible = false;
      m.scale.setScalar(0.5);
      root.add(m);
      return m;
    });
    Folk.byId = (id) => Folk.list.find((r) => r.id === id);
    Folk.resume();
  };

  /* ---------- paths ---------- */
  function planPath(a, b) {
    const pts = [];
    const dx = b.x - a.x,
      dz = b.z - a.z,
      len2 = dx * dx + dz * dz;
    const R = 6.8;
    if (len2 > 4) {
      const tt = clamp(((C0.x - a.x) * dx + (C0.z - a.z) * dz) / len2, 0, 1);
      const px = a.x + dx * tt,
        pz = a.z + dz * tt;
      const dd = Math.hypot(px - C0.x, pz - C0.z);
      const da = Math.hypot(a.x - C0.x, a.z - C0.z),
        db = Math.hypot(b.x - C0.x, b.z - C0.z);
      if (dd < R - 0.4 && da > R - 1 && db > R - 1) {
        let nx = px - C0.x,
          nz = pz - C0.z;
        if (Math.hypot(nx, nz) < 0.6) {
          nx = -dz;
          nz = dx;
        }
        const phi = Math.atan2(nz, nx);
        const w1 = { x: C0.x + Math.cos(phi - 0.62) * R, z: C0.z + Math.sin(phi - 0.62) * R };
        const w2 = { x: C0.x + Math.cos(phi + 0.62) * R, z: C0.z + Math.sin(phi + 0.62) * R };
        const d1 = Math.hypot(w1.x - a.x, w1.z - a.z),
          d2 = Math.hypot(w2.x - a.x, w2.z - a.z);
        if (d1 < d2) pts.push(w1, w2);
        else pts.push(w2, w1);
      }
    }
    pts.push({ x: b.x, z: b.z });
    return pts;
  }
  function setPath(r, to, arrive) {
    r.path = planPath(r.pos, to);
    r.arrive = arrive || 0.45;
    r.walkT = 0;
    let len = 0,
      p = r.pos;
    for (const q of r.path) {
      len += Math.hypot(q.x - p.x, q.z - p.z);
      p = q;
    }
    r.walkMax = len / (r.def.speed * 0.7) + 5;
  }
  // moves along the path; true when finished
  function follow(r, dt, speedK) {
    const p = r.path[0];
    if (!p) {
      r.cur = damp(r.cur, 0, 8, dt);
      return true;
    }
    r.walkT += dt;
    const last = r.path.length === 1;
    const dx = p.x - r.pos.x,
      dz = p.z - r.pos.z,
      d = Math.hypot(dx, dz);
    if (d < (last ? r.arrive : 0.9) || r.walkT > r.walkMax) {
      r.path.shift();
      if (!r.path.length) {
        r.cur = damp(r.cur, 0, 8, dt);
        return true;
      }
      return false;
    }
    const want = r.def.speed * (speedK || 1) * (last ? clamp(d / 1.4, 0.4, 1) : 1);
    r.cur = damp(r.cur, want, 5, dt);
    r.pos.x += (dx / d) * r.cur * dt;
    r.pos.z += (dz / d) * r.cur * dt;
    r.yaw = dampAngle(r.yaw, Math.atan2(dx, dz), 8, dt);
    return false;
  }

  /* ---------- where to stroll ---------- */
  function strollTarget(r) {
    const d = r.def;
    const w = Town.toLocal(r.work.x, r.work.z);
    const q = Math.random();
    if (d.roam === 'mail') {
      const ids = Object.keys(Town.shops).filter((k) => k !== 'hall' && k !== d.home);
      const sh = Town.shops[ids[Math.floor(Math.random() * ids.length)]];
      return { x: sh.stand.x + rnd(-1.2, 1.2), z: sh.stand.z, mail: true };
    }
    if (d.roam === 'fly') {
      if (q < 0.4) return { x: C0.x + Math.cos(rnd(0, 6.28)) * rnd(7.5, 10), z: C0.z + Math.sin(rnd(0, 6.28)) * rnd(7.5, 10) };
      const u = clamp(w.u + rnd(-14, 14), -26, 44);
      return L(u, rnd(-6, 6));
    }
    if (d.roam === 'mayor') {
      if (q < 0.5) return { x: C0.x + Math.cos(rnd(-0.6, 0.6) + Math.PI) * rnd(8, 10), z: C0.z + Math.sin(rnd(-1.2, 1.2)) * rnd(7, 10) };
      if (q < 0.75) return L(rnd(-26, -8), rnd(-2.5, 2.5));
      return L(rnd(-4, 36), rnd(-5.8, 5.8));
    }
    // ordinary shopkeepers: on their own pavement, across the road to a neighbour, or a bench by the plaza
    if (q < 0.5) return L(clamp(w.u + rnd(-9, 9), -26, 44), r.side * rnd(5.2, 6.6));
    if (q < 0.8) return L(clamp(w.u + rnd(-12, 12), -26, 44), -r.side * rnd(5.2, 6.6));
    return L(rnd(-26, -20), rnd(-3, 3));
  }

  // v0.9.5: the townsfolk now stay out all night so the town is never empty. Set to true to bring back bedtime.
  const BEDTIME = false;

  function goHome(r) {
    r.state = 'home';
    r.chatT = 0;
    r.path = planPath(r.pos, r.shop.stand);
    r.path.push({ x: r.shop.door.x, z: r.shop.door.z });
    r.arrive = 0.5;
    r.walkT = 0;
    r.walkMax = 40;
  }

  function hide(r, v) {
    r.parts.g.visible = v;
    r.vis = v;
  }

  /* ---------- per-frame behaviour ---------- */
  function lookAt(r, dt, uni, dU) {
    const d = r.def;
    const dyU = uni.pos.y + 2.4 - (r.pos.y + r.parts.headG.position.y * d.s + r.hover);
    let ty = 0,
      tx = 0;
    if (dU < 14) {
      const rel = angDiff(r.yaw, Math.atan2(uni.pos.x - r.pos.x, uni.pos.z - r.pos.z));
      if (Math.abs(rel) < 2.1) {
        ty = clamp(rel, -1.1, 1.1);
        tx = clamp(Math.atan2(-dyU, Math.max(dU, 1)), -0.3, 0.4);
      }
    } else if (r.state === 'work' && r.def.act === 'read') tx = 0.3;
    r.hy = damp(r.hy, ty, 6, dt);
    r.hx = damp(r.hx, tx, 6, dt);
  }

  function startStroll(r) {
    const tg = strollTarget(r);
    r.mailStop = !!tg.mail;
    setPath(r, tg, 0.5);
    r.state = 'walk';
    r.after = 'loiter';
  }

  function arrived(r) {
    if (r.after === 'work') {
      r.state = 'work';
      r.timer = rnd(r.def.every[0], r.def.every[1]);
    } else {
      r.state = 'loiter';
      r.timer = r.mailStop ? rnd(3, 5) : rnd(5, 10);
      if (r.mailStop) {
        r.waveT = 1.6;
        if (Folk.sayCd <= 0 && r.vis && r.distU < 22) {
          r.say(UA.pick(['Mail for you!', 'Special delivery!', 'Letters, letters!']));
        }
      }
    }
  }

  function updateAdult(r, dt, t, uni, night) {
    const d = r.def;
    r.timer -= dt;
    r.chatT = Math.max(0, r.chatT - dt);
    const dU = r.distU;
    switch (r.state) {
      case 'work':
      case 'loiter': {
        r.cur = damp(r.cur, 0, 8, dt);
        let ty = r.state === 'work' ? r.face : r.yaw;
        if (dU < 7.5 && Math.abs(uni.pos.y - r.pos.y) < 6) ty = Math.atan2(uni.pos.x - r.pos.x, uni.pos.z - r.pos.z);
        r.yaw = dampAngle(r.yaw, ty, 3.5, dt);
        if (r.timer <= 0 && r.chatT <= 0 && !(dU < 4.5)) {
          if (r.state === 'work') startStroll(r);
          else {
            setPath(r, r.work, 0.4);
            r.state = 'walk';
            r.after = 'work';
          }
        }
        break;
      }
      case 'walk':
        if (r.chatT > 0 || (dU < 3.0 && r.cur < 0.4)) r.cur = damp(r.cur, 0, 8, dt);
        else if (follow(r, dt)) arrived(r);
        break;
      case 'home': {
        const dd = Math.hypot(r.shop.door.x - r.pos.x, r.shop.door.z - r.pos.z);
        if (follow(r, dt, 1.15) || (dd < 1.7 && r.path.length <= 1)) {
          r.state = 'enter';
          r.t2 = 0;
        }
        break;
      }
      case 'enter': {
        r.t2 += dt;
        const dx = r.shop.door.x - r.pos.x,
          dz = r.shop.door.z - r.pos.z,
          dd = Math.hypot(dx, dz);
        if (dd > 0.05) {
          r.pos.x += (dx / dd) * Math.min(dd, 1.5 * dt);
          r.pos.z += (dz / dd) * Math.min(dd, 1.5 * dt);
          r.yaw = dampAngle(r.yaw, Math.atan2(dx, dz), 8, dt);
        }
        r.cur = 1.5;
        r.k = clamp(1 - r.t2 / 0.7, 0, 1);
        if (r.k <= 0) {
          r.state = 'inside';
          UA.FX.puff(new V3(r.shop.door.x, T.H + 1.2, r.shop.door.z), 6, 0xffffff);
          hide(r, false);
        }
        break;
      }
      case 'exit': {
        r.t2 += dt;
        r.k = clamp(r.t2 / 0.7, 0, 1);
        const dx = r.shop.stand.x - r.pos.x,
          dz = r.shop.stand.z - r.pos.z,
          dd = Math.hypot(dx, dz);
        if (dd > 0.05) {
          r.pos.x += (dx / dd) * Math.min(dd, 1.5 * dt);
          r.pos.z += (dz / dd) * Math.min(dd, 1.5 * dt);
          r.yaw = dampAngle(r.yaw, Math.atan2(dx, dz), 8, dt);
        }
        r.cur = 1.5;
        if (r.t2 >= 0.7) {
          r.k = 1;
          setPath(r, r.work, 0.4);
          r.state = 'walk';
          r.after = 'work';
        }
        break;
      }
    }
  }

  // jelly-bean kids: play tag around the fountain
  function updateKid(r, dt, t, uni, night) {
    const d = r.def;
    r.timer -= dt;
    r.chatT = Math.max(0, r.chatT - dt);
    if (r.state === 'work') {
      const kids = Folk.kids;
      if (!Folk.it || Folk.it.state !== 'work') Folk.it = kids.filter((k) => k.state === 'work')[Math.floor(Math.random() * kids.length)] || null;
      let tx, tz, spd = d.speed;
      if (r.pause > 0) {
        r.pause -= dt;
        tx = r.pos.x;
        tz = r.pos.z;
        spd = 0;
      } else if (r.chatT > 0) {
        spd = 0;
        tx = r.pos.x;
        tz = r.pos.z;
      } else if (Folk.it === r) {
        let best = null,
          bd = 1e9;
        for (const o of kids) {
          if (o === r || o.state !== 'work') continue;
          const dd = Math.hypot(o.pos.x - r.pos.x, o.pos.z - r.pos.z);
          if (dd < bd) {
            bd = dd;
            best = o;
          }
        }
        if (best) {
          tx = best.pos.x;
          tz = best.pos.z;
          spd = d.speed * 1.12;
          if (bd < 1.1) {
            Folk.it = best;
            r.pause = 1.1;
            best.pause = 0.5;
            if (Folk.sayCd <= 0 && r.distU < 26) {
              r.say(UA.pick(['Tag! You are it!', 'Gotcha!', 'Tag!']));
              Folk.sayCd = 2;
            }
            r.hopT = 0.5;
          }
        } else {
          tx = r.pos.x;
          tz = r.pos.z;
        }
      } else if (Folk.it && Math.hypot(Folk.it.pos.x - r.pos.x, Folk.it.pos.z - r.pos.z) < 5.5) {
        const ax = r.pos.x - Folk.it.pos.x,
          az = r.pos.z - Folk.it.pos.z,
          al = Math.hypot(ax, az) || 1;
        // flee, curving around the fountain
        const sx = -az / al,
          sz = ax / al;
        tx = r.pos.x + (ax / al) * 4 + sx * 3 * r.fx_dir;
        tz = r.pos.z + (az / al) * 4 + sz * 3 * r.fx_dir;
        spd = d.speed * 1.05;
      } else {
        if (!r.goal || Math.hypot(r.goal.x - r.pos.x, r.goal.z - r.pos.z) < 1.2 || r.timer <= 0) {
          const a = rnd(0, 6.28);
          r.goal = { x: C0.x + Math.cos(a) * rnd(7, 11), z: C0.z + Math.sin(a) * rnd(7, 11) };
          r.timer = rnd(3, 6);
          r.fx_dir = Math.random() < 0.5 ? -1 : 1;
        }
        tx = r.goal.x;
        tz = r.goal.z;
        spd = d.speed * 0.8;
      }
      const dx = tx - r.pos.x,
        dz = tz - r.pos.z,
        dd = Math.hypot(dx, dz);
      r.cur = damp(r.cur, dd > 0.2 ? spd : 0, 6, dt);
      if (dd > 0.2) {
        r.pos.x += (dx / dd) * r.cur * dt;
        r.pos.z += (dz / dd) * r.cur * dt;
        r.yaw = dampAngle(r.yaw, Math.atan2(dx, dz), 9, dt);
      } else if (r.distU < 8) r.yaw = dampAngle(r.yaw, Math.atan2(uni.pos.x - r.pos.x, uni.pos.z - r.pos.z), 4, dt);
      // keep them in the plaza ring, outside the fountain
      const cx = r.pos.x - C0.x,
        cz = r.pos.z - C0.z,
        cr = Math.hypot(cx, cz) || 1;
      const lo = 6.1,
        hi = 12.2;
      if (cr < lo || cr > hi) {
        const k = clamp(cr, lo, hi) / cr;
        r.pos.x = C0.x + cx * k;
        r.pos.z = C0.z + cz * k;
      }
      return;
    }
    // bedtime and morning for kids share the adult machinery
    updateAdult(r, dt, t, uni, night);
  }

  /* ---------- poses ---------- */
  const ACT = {
    post(r, t, g) {
      g.R = [-1.0 + Math.sin(t * 1.3) * 0.05, 0.12];
      g.hn = 0.18;
    },
    bake(r, t, g) {
      const k = Math.sin(t * 5);
      g.R = [-0.95 + k * 0.32, 0.1];
      g.L = [-0.95 - k * 0.32, -0.1];
      g.lean = 0.1 + k * 0.03;
      r.fx += 0;
    },
    candy(r, t, g) {
      g.R = [-0.7 + Math.sin(t * 2.6) * 0.45, 0.3 + Math.cos(t * 2.6) * 0.25];
      g.L = [-0.9, -0.1];
    },
    read(r, t, g) {
      g.L = [-1.15, -0.05];
      const f = Math.max(0, Math.sin(t * 0.9 - 1.2) - 0.8) * 5;
      g.R = [-0.8 - f * 0.5, 0.1];
      g.hn = 0.25;
    },
    sleepy(r, t, g) {
      g.R = [-0.9, -0.5];
      g.L = [-0.85, 0.5];
      g.lean = Math.sin(t * 0.7) * 0.05;
      g.hn = 0.18 + Math.sin(t * 0.7) * 0.18;
    },
    sew(r, t, g) {
      g.R = [-0.75 + Math.sin(t * 8) * 0.18, 0.12];
      g.L = [-0.9, -0.1];
      g.hn = 0.2;
    },
    scoop(r, t, g) {
      g.R = [-1.3 + Math.sin(t * 1.7) * 0.08, 0.1];
      g.L = [-0.8 + Math.sin(t * 3.4) * 0.4, -0.15];
    },
    water(r, t, g) {
      g.R = [-0.65 + Math.sin(t * 2.2) * 0.5, 0.55 + Math.cos(t * 2.2) * 0.3];
      g.L = [-0.2, -0.5 + Math.sin(t * 1.5) * 0.15];
    },
    wand(r, t, g) {
      g.R = [-1.1 + Math.sin(t * 2.4) * 0.5, 0.5 + Math.cos(t * 2.4) * 0.45];
      g.L = [-0.9, -0.1];
    },
    juggle(r, t, g) {
      g.R = [-1.3 + Math.sin(t * 4.2) * 0.45, 0.35];
      g.L = [-1.3 + Math.sin(t * 4.2 + Math.PI) * 0.45, -0.35];
    },
    greet(r, t, g) {
      const c = (t * 0.17) % 1;
      if (c < 0.3) g.R = [0, 2.55 + Math.sin(t * 7) * 0.3];
      else if (c < 0.5) g.R = [-2.2, 0.3];
      else g.R = [-0.3, 0.1];
      g.L = [-0.3, -0.1];
    },
    play() {},
  };

  function pose(r, dt, t) {
    const d = r.def,
      p = r.parts,
      P = r.pose;
    const walking = r.cur > 0.25 && (r.state === 'walk' || r.state === 'home' || r.state === 'enter' || r.state === 'exit' || (d.kid && r.state === 'work'));
    const g = { R: null, L: null, lean: 0, hn: 0 };
    let legR = 0,
      legL = 0,
      bob = 0,
      wk = clamp(r.cur / d.speed, 0, 1.4);
    r.blinkT -= dt;
    if (r.blinkT <= 0) {
      r.blink = 0.13;
      r.blinkT = rnd(2, 5);
    }
    r.blink = Math.max(0, r.blink - dt);
    p.eyesG.scale.y = damp(p.eyesG.scale.y, r.blink > 0 ? 0.08 : r.eyeOpen, 30, dt);
    if (d.kid) {
      // hop-run
      if (walking) {
        r.phase += r.cur * dt * 2.6;
        bob = Math.abs(Math.sin(r.phase)) * 0.4;
        p.bodyG.scale.set(1 + (0.12 - bob * 0.3), 1 + bob * 0.35 - 0.1, 1 + (0.12 - bob * 0.3));
        p.bodyG.rotation.z = Math.sin(r.phase) * 0.12;
        p.bodyG.rotation.x = 0.12;
      } else {
        const bn = Math.sin(t * 3 + r.idx) * 0.03;
        p.bodyG.scale.set(1 - bn, 1 + bn * 1.5, 1 - bn);
        p.bodyG.rotation.z = damp(p.bodyG.rotation.z, 0, 8, dt);
        p.bodyG.rotation.x = damp(p.bodyG.rotation.x, 0, 8, dt);
      }
      if (r.hopT > 0) {
        r.hopT -= dt;
        bob += Math.sin((1 - r.hopT / 0.5) * Math.PI) * 0.55;
      }
      if (r.cheerT > 0) {
        r.cheerT -= dt;
        bob += Math.abs(Math.sin(t * 9 + r.idx)) * 0.45;
      }
      p.bodyG.position.y = bob;
      return;
    }
    if (walking) {
      r.phase += r.cur * dt * 2.3;
      const sw = Math.sin(r.phase);
      legR = sw * 0.75 * wk;
      legL = -legR;
      g.R = [-sw * 0.6 * wk, 0.08];
      g.L = [sw * 0.6 * wk, -0.08];
      bob = Math.abs(sw) * 0.07 * wk;
      if (d.hold) {
        if (d.hold.R) g.R = [d.hold.R[0], d.hold.R[1]];
        if (d.hold.L) g.L = [d.hold.L[0], d.hold.L[1]];
      }
      g.lean = 0.06 * wk;
    } else {
      (ACT[d.act] || ACT.play)(r, t, g);
      bob = Math.sin(t * 2 + r.idx) * 0.012;
    }
    if (d.hover) {
      legR = 0.35 + Math.sin(t * 2.2) * 0.12;
      legL = 0.25 - Math.sin(t * 2.2) * 0.12;
    }
    // reactions
    if (r.waveT > 0) {
      r.waveT -= dt;
      g.R = [0, 2.5 + Math.sin(t * 10) * 0.35];
    }
    if (r.cheerT > 0) {
      r.cheerT -= dt;
      g.R = [0, 2.6 + Math.sin(t * 9) * 0.25];
      g.L = [0, -2.6 - Math.sin(t * 9 + 1) * 0.25];
      bob += Math.abs(Math.sin(t * 8 + r.idx)) * 0.08;
    }
    const k = 1 - Math.exp(-12 * dt);
    const Rt = g.R || [0, 0.08],
      Lt = g.L || [0, -0.08];
    P.aRx += (Rt[0] - P.aRx) * k;
    P.aRz += (Rt[1] - P.aRz) * k;
    P.aLx += (Lt[0] - P.aLx) * k;
    P.aLz += (Lt[1] - P.aLz) * k;
    P.lr += (legR - P.lr) * k;
    P.ll += (legL - P.ll) * k;
    p.armR.rotation.set(P.aRx, 0, P.aRz);
    p.armL.rotation.set(P.aLx, 0, P.aLz);
    p.legR.rotation.x = P.lr;
    p.legL.rotation.x = P.ll;
    p.bodyG.position.y = bob;
    p.bodyG.rotation.x = damp(p.bodyG.rotation.x, g.lean, 6, dt);
    p.headG.rotation.set(r.hx + g.hn, r.hy, 0);
    if (p.tail) {
      p.tail.rotation.set(d.id === 'pixel' ? 0.6 : d.id === 'gumbo' ? 0.35 : 0.2, Math.sin(t * 2.4 + r.idx) * 0.28, 0);
    }
    if (p.wingL) {
      const fl = 0.4 + Math.sin(t * 30 + r.idx) * 0.45;
      p.wingL.rotation.set(0, -0.3, -fl);
      p.wingR.rotation.set(0, 0.3, fl);
    }
  }

  /* ---------- effects tied to the work they do ---------- */
  const _w = new V3();
  function actFx(r, dt, t) {
    const d = r.def;
    r.fxT = (r.fxT || 0) - dt;
    if (r.fxT > 0 || r.state !== 'work' || r.distU > 45) return;
    const g = r.pos;
    if (d.id === 'bun') {
      r.fxT = 2.6;
      UA.FX.puff(_w.set(g.x + Math.sin(r.yaw) * 0.8, g.y + 1.5, g.z + Math.cos(r.yaw) * 0.8), 4, 0xffffff);
    } else if (d.id === 'gumbo') {
      r.fxT = 2.2;
      UA.FX.sparkles(_w.set(g.x + Math.sin(r.yaw) * 1.3, g.y + 2.4, g.z + Math.cos(r.yaw) * 1.3), 3, UA.pick([0xff8fb8, 0xffd45e, 0xa6ec9a]), 0.5, 1.2);
    } else if (d.id === 'nimbus') {
      r.fxT = 3.2;
      UA.FX.emit({ x: g.x + Math.sin(r.yaw) * 0.6, y: g.y + 3.0, z: g.z + Math.cos(r.yaw) * 0.6, vx: 0.2, vy: 0.7, vz: 0, color: 0x9fb8ff, size: 0.55, shape: 1, life: 1.8, grow: 0.2, gravity: -0.05, drag: 0.1, glow: 0.4 });
    } else if (d.id === 'misty') {
      r.fxT = 3.4;
      UA.FX.hearts(_w.set(g.x, g.y + 3.0, g.z), 1);
    } else if (d.id === 'petal') {
      r.fxT = 0.22;
      r.parts.armR.updateWorldMatrix(true, false);
      _w.set(0, -0.6, 0.8).applyMatrix4(r.parts.armR.matrixWorld);
      UA.FX.emit({ x: _w.x, y: _w.y, z: _w.z, vx: (Math.random() - 0.5) * 0.8, vy: 0.2, vz: (Math.random() - 0.5) * 0.8, color: UA.pick([0xffc2dc, 0xffe58a, 0xd9c8ff]), size: 0.4, shape: 1, life: 1.1, grow: -0.5, gravity: -0.2, drag: 0.6, glow: 0.6 });
    } else if (d.id === 'wizzle') {
      r.fxT = 0.15;
      r.parts.armR.updateWorldMatrix(true, false);
      _w.set(0, -0.6, 0.88).applyMatrix4(r.parts.armR.matrixWorld);
      UA.FX.emit({ x: _w.x, y: _w.y, z: _w.z, vx: (Math.random() - 0.5) * 0.6, vy: 0.3, vz: (Math.random() - 0.5) * 0.6, color: UA.pick([0xffd45e, 0xbf9bff, 0x8fd2ff]), size: 0.38, shape: 1, life: 0.9, grow: -0.5, gravity: -0.1, drag: 0.8, glow: 0.7 });
      if (Math.random() < 0.04) UA.FX.burst(_w, 8);
    }
  }

  /* ---------- the main update ---------- */
  const _tmp = new V3();
  Folk.update = function (dt, t, uni, ctx) {
    if (!Folk.built) return;
    const night = UA.Time.night;
    const tc = L(-6, 0);
    const far = Math.hypot(uni.pos.x - tc.x, uni.pos.z - tc.z) > 175;
    root.visible = !far;
    Folk.sayCd = Math.max(0, Folk.sayCd - dt);
    Folk.kids = Folk.list.filter((r) => r.def.kid);
    if (far) return;
    const q = Folk.qs();
    for (const r of Folk.list) r.stay = q.s === 'active' && (r.id === 'pixel' || DELIVER.indexOf(r.id) >= 0);

    // first frame: put everybody where the clock says they should be
    if (!Folk.started) {
      Folk.started = true;
      for (const r of Folk.list) {
        r.out = BEDTIME ? night < 0.5 : true;
        if (!r.out && !r.stay) {
          r.state = 'inside';
          hide(r, false);
        } else {
          r.state = 'work';
          hide(r, true);
        }
      }
    }

    let nearest = null,
      nd = 1e9;
    const reach = [];
    for (const r of Folk.list) {
      const dx = uni.pos.x - r.pos.x,
        dz = uni.pos.z - r.pos.z;
      r.distU = Math.hypot(dx, dz);
      // bedtime / morning
      const wantOut = r.stay || !BEDTIME || (r.out ? night < 0.5 + 0.22 * r.jit : night < 0.36 - 0.1 * r.jit);
      r.out = wantOut;
      const should = wantOut;
      if (!should && (r.state === 'work' || r.state === 'loiter' || r.state === 'walk')) goHome(r);
      if (should && r.state === 'inside') {
        r.state = 'exit';
        r.t2 = 0;
        r.k = 0;
        r.pos.set(r.shop.door.x, Y0, r.shop.door.z);
        r.yaw = r.shop.front > 0 ? 0 : r.shop.front < 0 ? Math.PI : Math.PI / 2;
        hide(r, true);
        UA.FX.puff(_tmp.set(r.shop.door.x, T.H + 1.2, r.shop.door.z), 6, 0xffffff);
      }
      if (r.state === 'inside') continue;
      if (!r.vis) hide(r, true);

      if (r.def.kid) updateKid(r, dt, t, uni, night);
      else updateAdult(r, dt, t, uni, night);

      // greeting when the unicorn arrives
      if (r.distU > 17) r.seen = false;
      r.greetCd = Math.max(0, r.greetCd - dt);
      if (!r.seen && r.distU < 9 && (r.state === 'work' || r.state === 'loiter' || r.state === 'walk' || r.def.kid)) {
        r.seen = true;
        if (r.greetCd <= 0 && Folk.sayCd <= 0) {
          r.greetCd = 40;
          Folk.sayCd = 2.6;
          r.say(UA.pick(r.def.hi));
          r.waveT = 2.0;
          r.hopT = 0.5;
          UA.Audio.chirp(r.def.voice);
        }
      }
      // step aside from the unicorn, and a squeak if it comes in fast
      const dy = Math.abs(uni.pos.y - r.pos.y);
      if (r.state !== 'enter' && r.state !== 'exit' && r.distU < 3.8 && dy < 4.5) {
        const dx = r.pos.x - uni.pos.x,
          dz = r.pos.z - uni.pos.z,
          dd = Math.max(0.2, Math.hypot(dx, dz));
        const push = (3.8 - dd) * clamp(dt * 5, 0, 1);
        r.pos.x += (dx / dd) * push;
        r.pos.z += (dz / dd) * push;
        r.startleCd -= dt;
        if (uni.speed > 8 && r.startleCd <= 0 && !r.def.kid) {
          r.startleCd = 14;
          r.hopT = 0.5;
          if (Folk.sayCd <= 0) {
            r.say(UA.pick(['Whoa!', 'Zoom!', 'Wheee, fast!']));
            Folk.sayCd = 2;
          }
        }
      }
      if (r.state !== 'enter' && r.state !== 'exit') UA.World.resolve(r.pos, 0.45, Y0 + r.hover);
      r.pos.y = Y0;
      if (r.parts.headG) lookAt(r, dt, uni, r.distU);

      if (r.distU < nd && r.vis && r.state !== 'enter' && r.state !== 'exit' && r.state !== 'inside') {
        nd = r.distU;
        nearest = r;
      }
      if (r.distU < 5.6 && r.vis && r.state !== 'enter' && r.state !== 'exit' && r.state !== 'inside') reach.push(r);
    }
    // keep neighbours from standing inside each other
    const ls = Folk.list;
    for (let i = 0; i < ls.length; i++) {
      const a = ls[i];
      if (!a.vis || a.state === 'enter' || a.state === 'exit') continue;
      for (let j = i + 1; j < ls.length; j++) {
        const b = ls[j];
        if (!b.vis || b.state === 'enter' || b.state === 'exit') continue;
        const dx = b.pos.x - a.pos.x,
          dz = b.pos.z - a.pos.z,
          dd = Math.hypot(dx, dz);
        const min = a.def.kid && b.def.kid ? 0.9 : 1.3;
        if (dd < min && dd > 0.001) {
          const k = (min - dd) * 0.5 * clamp(dt * 6, 0, 1);
          a.pos.x -= (dx / dd) * k;
          a.pos.z -= (dz / dd) * k;
          b.pos.x += (dx / dd) * k;
          b.pos.z += (dz / dd) * k;
        }
      }
    }

    // draw: transforms, poses and shadows
    for (let i = 0; i < ls.length; i++) {
      const r = ls[i];
      if (!r.vis) {
        shadows.setMatrixAt(i, _m.makeScale(0, 0, 0));
        continue;
      }
      let hop = 0;
      if (r.hopT > 0 && !r.def.kid) {
        hop = Math.sin((1 - r.hopT / 0.5) * Math.PI) * 0.45;
        r.hopT -= dt;
      }
      let hv = 0;
      if (r.hover) hv = r.hover + Math.sin(t * 2.3) * 0.14;
      const g = r.parts.g;
      g.visible = r.distU < 105; // far residents are skipped entirely (saves draw calls)
      const sc = r.def.s * r.k;
      g.position.set(r.pos.x, r.pos.y + hv + hop, r.pos.z);
      g.rotation.y = r.yaw;
      g.scale.setScalar(Math.max(0.001, sc));
      if (r.distU < 120) pose(r, dt, t);
      if (r.balls) juggle(r, t);
      actFx(r, dt, t);
      const sw = (r.def.kid ? 1.5 : 2.3) * sc * (1 - clamp(hv * 0.35 + hop * 0.5, 0, 0.5));
      _m.compose(_p.set(r.pos.x, Y0 + 0.06, r.pos.z), _q.identity(), _s.set(sw, 1, sw));
      shadows.setMatrixAt(i, _m);
    }
    shadows.instanceMatrix.needsUpdate = true;

    // everyone within reach offers a card; the UI decides who is focused (the nearest, or whoever the player picks)
    Folk._uni = uni;
    Folk.near = nearest && nd < 6.2 ? nearest : null;
    reach.sort((a, b) => a.distU - b.distU);
    for (let i = 0; i < reach.length && i < 3; i++) {
      const tgt = reach[i];
      const ready = tgt.def.gift && tgt.giftCd <= 0;
      UA.UI.offer('folk' + tgt.id, tgt.distU, {
        name: tgt.def.name,
        sub: tgt.def.role,
        btns: [{ a: 'pet', key: 'E', icon: ready ? UA.UI.ICON.candy : UA.UI.ICON.heart, label: ready ? 'Say hi (free treat!)' : 'Say hi' }],
        acts: { pet: () => Folk.talk(tgt) },
        sig: ready ? 'g' : 'h',
      });
    }

    Folk.questUpdate(dt, t, uni, q);
  };

  Folk.nearest = () => Folk.near || null;

  /* ---------- talking ---------- */
  function sayFor(r, text) {
    UA.UI.say(r, text.replace('{n}', UA.state.name || 'friend'));
  }
  const protoSay = function (text) {
    sayFor(this, text);
  };

  Folk.talk = function (r) {
    if (!r || r.state === 'inside') return;
    const d = r.def;
    r.chatT = 4;
    r.hopT = 0.5;
    r.waveT = 0;
    UA.Audio.chirp(d.voice);
    UA.FX.hearts(new V3(r.pos.x, r.pos.y + 2.4 * d.s + r.hover, r.pos.z), 3);
    if (d.gift && r.giftCd <= 0) {
      if (UA.state.treats >= 30) {
        r.say('Your pockets are full! Come back soon!');
        return;
      }
      r.giftCd = 70;
      UA.state.treats = Math.min(30, UA.state.treats + 1);
      UA.refreshHUD();
      UA.save();
      r.say(d.giftLine);
      UA.Audio.yum(d.voice);
      UA.UI.toast('+1 treat<small>' + d.name + ' gave you a ' + d.gift + '</small>', 2600);
      UA.FX.burst(new V3(r.pos.x, r.pos.y + 2.2, r.pos.z), 14);
      return;
    }
    // Pixel may still have something to ask
    if (d.id === 'pixel' && Folk.qs().s === 'idle' && !UA.Quests.active) {
      Folk.beginDelivery();
      return;
    }
    const lines = d.talk;
    r.talkIdx = (r.talkIdx + 1) % lines.length;
    r.say(lines[r.talkIdx]);
  };

  Folk.dazzle = function (pos, radius) {
    if (!Folk.built || !Folk.started) return;
    for (const r of Folk.list) {
      if (!r.vis || r.cheerT > 0 || r.state === 'enter' || r.state === 'exit') continue;
      if (Math.hypot(r.pos.x - pos.x, r.pos.z - pos.z) < radius) {
        r.cheerT = 2.6;
        r.hopT = 0.5;
        if (Folk.sayCd <= 0 && r.distU < 30 && Math.random() < 0.6) {
          r.say(UA.pick(CHEERS));
          Folk.sayCd = 1.6;
        }
        UA.FX.sparkles(new V3(r.pos.x, r.pos.y + 2.4, r.pos.z), 4, undefined, 0.8, 1.4);
      }
    }
  };

  /* ---------- Toby's juggling balls ---------- */
  function juggle(r, t) {
    const sc = r.k;
    r.balls.forEach((b, i) => {
      if (r.state !== 'work' && r.state !== 'loiter') {
        b.position.set((i - 1) * 0.35, 1.2 + Math.abs(Math.sin(t * 5 + i)) * 0.2, 0.55);
        return;
      }
      const ph = (t * 0.95 + i / 3) % 1;
      const seg = Math.floor(ph * 2);
      const u = (ph * 2) % 1;
      const fromX = seg % 2 ? -0.55 : 0.55,
        toX = -fromX;
      b.position.set(fromX + (toX - fromX) * u, 1.45 + 4 * 0.85 * u * (1 - u) + 0.3, 0.55);
    });
  }

  /* ---------- Special Delivery ---------- */
  const DELIVER = ['bun', 'hoot', 'petal'];
  Folk.qs = function () {
    const all = UA.state.quests || (UA.state.quests = {});
    return all.delivery || (all.delivery = { s: 'idle', n: 0, done: [] });
  };
  Folk.questActive = () => Folk.built && Folk.qs().s === 'active';
  Folk.hudText = () => "Deliver Pixel's letters  " + Folk.qs().done.length + '/3';

  Folk.beginDelivery = function (resumed) {
    const q = Folk.qs();
    q.s = 'active';
    UA.UI.setQuest(Folk.hudText());
    if (!resumed) {
      const px = Folk.byId('pixel');
      px.say('So many letters, so little time!');
      setTimeout(() => px.say('Can you take them to Bun, Hoot and Petal?'), 1900);
      px.hopT = 0.5;
      UA.Audio.chirp(px.def.voice);
      UA.UI.toast('New quest!<small>Special Delivery: bring three letters</small>', 4200);
      UA.save();
    }
    rebuildMarkers();
  };
  Folk.resume = function () {
    const q = Folk.qs();
    if (q.s === 'active' && !UA.Quests.active) Folk.beginDelivery(true);
    else if (q.s === 'active') q.s = 'idle';
  };

  function rebuildMarkers() {
    for (const k in Folk.markers) root.remove(Folk.markers[k]);
    Folk.markers = {};
    const q = Folk.qs();
    if (q.s !== 'active') return;
    DELIVER.forEach((id) => {
      if (q.done.indexOf(id) >= 0) return;
      const m = new THREE.Mesh(envGeo, envMat);
      m.scale.setScalar(1.15);
      root.add(m);
      Folk.markers[id] = m;
    });
  }

  Folk.questUpdate = function (dt, t, uni, q) {
    const px = Folk.byId('pixel');
    // "!" over Pixel while the quest is waiting
    const offer = q.s === 'idle' && px.vis && px.state !== 'enter' && px.state !== 'exit' && !UA.Quests.active;
    exMark.visible = !!offer;
    if (offer) {
      exMark.position.set(px.pos.x, px.pos.y + 2.35 * px.def.s + 0.9 + Math.sin(t * 3) * 0.15, px.pos.z);
      exMark.rotation.y = t * 2;
      if (px.distU < 6.5 && Math.abs(uni.pos.y - px.pos.y) < 6) Folk.beginDelivery();
    }
    if (q.s !== 'active') {
      Folk.orbit.forEach((m) => (m.visible = false));
      return;
    }
    // floating letters over the three recipients, and the ones still in the unicorn's satchel
    for (const id of DELIVER) {
      const m = Folk.markers[id];
      if (!m) continue;
      const r = Folk.byId(id);
      m.visible = r.vis;
      m.position.set(r.pos.x, r.pos.y + r.def.s * (r.info.top || 2.3) + r.hover + 0.95 + Math.sin(t * 2.6 + r.idx) * 0.18, r.pos.z);
      m.rotation.y = t * 1.8;
      if (r.vis && Math.random() < dt * 3) UA.FX.emit({ x: m.position.x + (Math.random() - 0.5), y: m.position.y - 0.3, z: m.position.z + (Math.random() - 0.5), vx: 0, vy: 1.0, vz: 0, color: 0xffe58a, size: 0.4, shape: 1, life: 1.1, grow: -0.4, gravity: -0.1, drag: 0.2, glow: 0.6 });
      if (r.vis && r.distU < 5.2 && Math.abs(uni.pos.y - r.pos.y) < 6) deliver(r, uni);
    }
    const left = DELIVER.length - q.done.length;
    Folk.orbit.forEach((m, i) => {
      m.visible = i < left;
      if (!m.visible) return;
      const a = t * 1.7 + i * 2.094;
      const s = uni.size || 1;
      m.position.set(uni.pos.x + Math.cos(a) * 2.3 * s, uni.pos.y + 3.9 * s + Math.sin(t * 2.2 + i) * 0.2, uni.pos.z + Math.sin(a) * 2.3 * s);
      m.rotation.y = -a + Math.PI / 2;
    });
  };

  function deliver(r, uni) {
    const q = Folk.qs();
    if (q.done.indexOf(r.id) >= 0) return;
    q.done.push(r.id);
    q.n = q.done.length;
    const thanks = { bun: 'A letter for me? Thank you!', hoot: 'Hoo! A letter! How delightful!', petal: 'Ooh, a letter! Flutter flutter!' };
    r.say(thanks[r.id]);
    r.hopT = 0.5;
    r.cheerT = 1.8;
    Folk.sayCd = 1.5;
    UA.FX.burst(new V3(r.pos.x, r.pos.y + 2.2, r.pos.z), 28);
    UA.FX.hearts(new V3(r.pos.x, r.pos.y + 2.4, r.pos.z), 8);
    UA.Audio.ring(q.done.length);
    UA.UI.setQuest(Folk.hudText());
    rebuildMarkers();
    if (q.done.length >= DELIVER.length) finish();
    UA.save();
  }
  function finish() {
    const q = Folk.qs();
    q.s = 'done';
    UA.UI.setQuest(null);
    const px = Folk.byId('pixel');
    setTimeout(() => {
      px.say('You are the fastest courier ever!');
      px.hopT = 0.5;
      px.cheerT = 2.4;
      UA.FX.burst(new V3(px.pos.x, px.pos.y + 2.2, px.pos.z), 40);
    }, 900);
    UA.state.treats = Math.min(30, UA.state.treats + 6);
    UA.refreshHUD();
    UA.Audio.fanfare();
    UA.UI.toast('Quest complete! +6 treats<small>Pixel says you are a super courier</small>', 4600);
    rebuildMarkers();
    UA.save();
  }

  Folk.reset = function () {
    Folk.qs().s = 'idle';
    Folk.qs().done = [];
    Folk.qs().n = 0;
    rebuildMarkers();
  };
})();
