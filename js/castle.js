/* Starlight Castle (the buildings): a pastel princess castle with a keep, a tall rose-pink spire and four turrets, a
   fountain court, a red carpet to the keep door, the lamp-lined Royal Road, topiary, rose arches, benches and the princess's
   pumpkin carriage. There are NO walls or gate towers: nothing encloses the grounds, so there is nowhere to get wedged
   (the gardens are in garden.js). Everything static is merged into two meshes (body + glowing windows) so the castle costs
   almost nothing to draw. Local coordinates: the keep stands at z -52..-26; the Royal Road runs from the keep door down (+z)
   past the fountain to the plaza and the home portal. */
(function () {
  const UA = window.UA,
    T = THREE;
  const R = UA.REALM,
    GH = R.gh,
    Realm = UA.Realm;
  const Town = UA.Town;
  const { Acc, GEO } = Town;
  const { M, trans } = Realm;
  const PI = Math.PI;
  const P = {
    wall: 0xffdce8,
    wall2: 0xffe8cf,
    trim: 0xfff7fb,
    stone: 0xe9dcef,
    glass: 0xfff0bd,
    dark: 0x9a78c8,
    gold: 0xffd45e,
    rose: 0xff8fc2,
    lilac: 0xb394ff,
    sky: 0x8ccfff,
    mint: 0x8fe8c0,
    wood: 0xe0b08c,
    leaf: 0x9fe3b4,
    red: 0xff7fa8,
    cream: 0xfff6ec,
  };
  const HALF = new T.TorusGeometry(1, 0.1, 6, 24, PI);

  Realm.buildCastle = function (g) {
    const WD = UA.World;
    const rnd = UA.rng(UA.C.SEED + 909);
    const A = new Acc(),
      Wn = new Acc();
    A.push(trans(0, GH, 0));
    Wn.push(trans(0, GH, 0));

    /* ----- colliders and camera blockers ----- */
    const col = (x, z, r, y1) => {
      WD.addCollider(R.x + x, R.z + z, r, GH + y1, true);
      WD.addBlocker(R.x + x, R.z + z, r, GH, GH + y1);
    };
    const colLine = (x1, z1, x2, z2, r, y1) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.ceil(len / (r * 1.25)));
      for (let i = 0; i <= n; i++) col(x1 + ((x2 - x1) * i) / n, z1 + ((z2 - z1) * i) / n, r, y1);
    };
    const softCol = (x, z, r, y1) => WD.addCollider(R.x + x, R.z + z, r, GH + y1);

    /* ----- little builders ----- */
    // an arched, glowing window facing yaw (its +z direction), centred at (px, py, pz)
    function archWin(px, py, pz, yaw, w, h) {
      Wn.push(M(px, py, pz, yaw));
      Wn.box(P.glass, 0, 0, 0.06, w, h, 0.3);
      Wn.cyl(P.glass, 0, h / 2, 0.06, w / 2, 0.3, PI / 2, 0, 0);
      Wn.pop();
      A.push(M(px, py, pz, yaw));
      A.box(P.dark, 0, 0, 0, w + 0.55, h + 0.2, 0.2);
      A.cyl(P.dark, 0, h / 2 + 0.05, 0, (w + 0.55) / 2, 0.2, PI / 2, 0, 0);
      A.box(P.cream, 0, -h / 2 - 0.25, 0.22, w + 1.0, 0.3, 0.7);
      A.pop();
    }
    function merlon(x, y, z, w, d) {
      A.box(P.wall, x, y, z, w, 1.4, d);
    }
    function pole(x, y, z, h, color, fw, fh) {
      A.cyl(P.gold, x, y + h / 2, z, 0.1, h);
      A.sph(P.gold, x, y + h + 0.05, z, 0.22);
      // the flag itself is its own mesh so it can wave
      const geo = new T.BufferGeometry();
      const w = fw || 2.6,
        hh = (fh || 1.5) / 2;
      geo.setAttribute('position', new T.Float32BufferAttribute([0, hh, 0, 0, -hh, 0, w, 0, 0], 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
      const m = new T.Mesh(geo, new T.MeshToonMaterial({ color, gradientMap: UA.gradient, side: T.DoubleSide, emissive: color, emissiveIntensity: 0.2 }));
      m.position.set(x, GH + y + h - hh - 0.15, z);
      m.userData.noOutline = true;
      g.add(m);
      Realm.flags.push({ m, base: 0.3 + rnd() * 1.2, ph: rnd() * 6 });
    }
    // a round tower with a pointed roof, flag and windows
    function tower(x, z, r, h, roofC, roofH, o) {
      o = o || {};
      A.cyl(o.wallC || P.wall, x, h / 2, z, r, h);
      A.cyl(P.trim, x, h + 0.4, z, r + 0.6, 0.8);
      A.cyl(P.gold, x, h + 0.9, z, r + 0.7, 0.22);
      const baseY = h + 0.8;
      A.cone(roofC, x, baseY + 0.8, z, r + 1.7, 1.6);
      A.cone(roofC, x, baseY + roofH / 2, z, r + 1.0, roofH);
      A.cyl(P.gold, x, baseY + 0.12, z, r + 1.5, 0.22);
      pole(x, baseY + roofH - 0.1, z, 3.0, o.flagC || P.rose);
      // windows facing out in a few directions
      const angs = o.angs || [0, PI / 2, -PI / 2];
      const wy = o.winY || h * 0.62;
      angs.forEach((a) => archWin(x + Math.sin(a) * (r - 0.05), wy, z + Math.cos(a) * (r - 0.05), a, 1.5, 2.8));
      if (o.win2 !== false && h > 14) angs.forEach((a, i) => i % 2 === 0 && archWin(x + Math.sin(a) * (r - 0.05), wy - h * 0.3, z + Math.cos(a) * (r - 0.05), a, 1.2, 2.2));
      col(x, z, r + 0.3, h + roofH);
    }
    function lamp(x, z, tall) {
      const h = tall || 4.4;
      A.cyl(P.gold, x, 0.35, z, 0.5, 0.7);
      A.cyl(P.dark, x, h / 2, z, 0.12, h);
      A.cyl(P.gold, x, h + 0.1, z, 0.34, 0.16);
      Wn.sph(P.glass, x, h + 0.55, z, 0.38, 0.5, 0.38);
      A.cone(P.gold, x, h + 1.15, z, 0.45, 0.5);
      A.sph(P.gold, x, h + 1.5, z, 0.12);
      Realm.lamps.push({ x, y: GH + h + 0.6, z });
      softCol(x, z, 0.35, h);
    }
    function topiary(x, z, s) {
      s = s || 1;
      A.cyl(P.cream, x, 0.5 * s, z, 0.7 * s, 1.0 * s);
      A.cyl(P.wood, x, 1.4 * s, z, 0.14 * s, 0.9 * s);
      A.sph(P.leaf, x, 2.7 * s, z, 1.45 * s, 1.45 * s, 1.45 * s, true);
      for (let i = 0; i < 12; i++) {
        const a = rnd() * 6.283,
          e = rnd() * 2.3 - 0.4;
        A.sph(UA.pick([P.rose, 0xffffff, 0xffe27a, P.lilac], rnd), x + Math.cos(a) * Math.cos(e) * 1.45 * s, 2.7 * s + Math.sin(e) * 1.45 * s, z + Math.sin(a) * Math.cos(e) * 1.45 * s, 0.24 * s);
      }
      softCol(x, z, 1.0 * s, 4.3 * s);
    }
    // a rose arch across a path: centred at (ox, z), facing yaw, pillars `half` either side of the centre
    function roseArch(z, ox, yaw, half) {
      ox = ox || 0;
      yaw = yaw || 0;
      half = half || 4.9;
      A.push(M(ox, 0, z, yaw));
      for (const sx of [-1, 1]) {
        A.cyl(P.cream, sx * half, 2.6, 0, 0.28, 5.2);
        A.sph(P.gold, sx * half, 5.3, 0, 0.34);
        softCol(ox + Math.cos(yaw) * sx * half, z - Math.sin(yaw) * sx * half, 0.5, 5.5);
      }
      A.geo(HALF, P.cream, 0, 5.2, 0, half, 3.0, 4.9, 0, 0, 0);
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * PI;
        A.sph(i % 3 === 0 ? 0xffffff : P.rose, Math.cos(a) * half, 5.2 + Math.sin(a) * 3.0, (rnd() - 0.5) * 0.3, 0.34);
        if (i % 2) A.sph(P.leaf, Math.cos(a) * half, 5.2 + Math.sin(a) * 3.0 + 0.15, 0.25, 0.28, 0.2, 0.28);
      }
      for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) A.sph(k % 2 ? 0xffffff : P.rose, sx * half + (rnd() - 0.5) * 0.4, 0.8 + k * 1.0, (rnd() - 0.5) * 0.4, 0.3);
      A.pop();
    }
    function bench(x, z, yaw) {
      A.push(M(x, 0, z, yaw));
      A.box(P.cream, 0, 0.7, 0, 3.2, 0.25, 1.1);
      A.box(P.cream, 0, 1.45, -0.5, 3.2, 1.2, 0.2);
      A.box(P.gold, -1.4, 0.35, 0, 0.2, 0.7, 0.9);
      A.box(P.gold, 1.4, 0.35, 0, 0.2, 0.7, 0.9);
      A.pop();
      softCol(x, z, 1.3, 1.8);
    }

    /* ----- the keep ----- */
    A.box(P.wall2, 0, 12, -39, 28, 24, 26);
    A.box(P.trim, 0, 24.2, -39, 29, 0.5, 27);
    A.box(P.gold, 0, 8.2, -25.95, 28.1, 0.35, 0.3); // gold band over the porch
    for (let i = 0; i < 10; i++) {
      const x = -12.6 + i * 2.8;
      merlon(x, 25.2, -26.1, 1.5, 0.9);
      merlon(x, 25.2, -51.9, 1.5, 0.9);
    }
    for (let i = 0; i < 8; i++) {
      const z = -49.4 + i * 3.2;
      merlon(-13.9, 25.2, z, 0.9, 1.6);
      merlon(13.9, 25.2, z, 0.9, 1.6);
    }
    colLine(-14.5, -26.4, 14.5, -26.4, 1.9, 36);
    colLine(-14.5, -51.6, 14.5, -51.6, 1.9, 36);
    colLine(-14.2, -26.4, -14.2, -51.6, 1.9, 36);
    colLine(14.2, -26.4, 14.2, -51.6, 1.9, 36);
    // central spire
    tower(0, -40, 6.6, 44, P.rose, 26, { angs: [0, PI / 2, PI, -PI / 2], winY: 36, win2: false, flagC: P.gold, wallC: P.wall2 });
    // corner turrets
    [
      [-14, -26, P.lilac],
      [14, -26, P.sky],
      [-14, -52, P.sky],
      [14, -52, P.lilac],
    ].forEach((t) => tower(t[0], t[1], 3.5, 33, t[2], 11, { angs: [t[0] < 0 ? -PI / 2 : PI / 2, t[1] > -30 ? 0 : PI], winY: 28, win2: false, wallC: P.wall2, flagC: t[2] }));
    // front windows, banners, rose window
    [-10, -5, 5, 10].forEach((x) => archWin(x, 15.6, -25.8, 0, 2.1, 3.6));
    [-8.5, 8.5].forEach((x) => archWin(x, 20.8, -25.8, 0, 1.8, 3.0));
    Wn.cyl(P.glass, 0, 18.4, -25.9, 2.3, 0.3, PI / 2, 0, 0);
    A.cyl(P.gold, 0, 18.4, -25.8, 2.8, 0.2, PI / 2, 0, 0);
    for (let k = 0; k < 8; k++) A.box(P.gold, 0, 18.4, -25.62, 0.16, 4.6, 0.12, 0, 0, (k * PI) / 8);
    [-7.5, 7.5].forEach((x, i) => {
      const c = i ? P.lilac : P.rose;
      A.box(c, x, 17.4, -25.7, 2.2, 9.2, 0.15);
      A.box(c, x, 12.8, -25.7, 1.6, 1.6, 0.15, 0, 0, PI / 4);
      A.sph(P.gold, x, 19.4, -25.62, 0.62, 0.62, 0.18);
    });
    [-33, -45].forEach((z) => {
      archWin(14, 15.6, z, PI / 2, 2.0, 3.4);
      archWin(-14, 15.6, z, -PI / 2, 2.0, 3.4);
      archWin(14, 20.8, z, PI / 2, 1.8, 3.0);
      archWin(-14, 20.8, z, -PI / 2, 1.8, 3.0);
    });
    // the big door under a little porch
    A.box(P.trim, 0, 4.5, -25.9, 8.6, 9.0, 0.3);
    A.cyl(P.trim, 0, 9.0, -25.9, 4.3, 0.3, PI / 2, 0, 0);
    A.box(P.dark, 0, 4.2, -25.7, 6.6, 8.4, 0.3);
    A.cyl(P.dark, 0, 8.4, -25.7, 3.3, 0.3, PI / 2, 0, 0);
    A.box(P.gold, 0, 4.2, -25.5, 0.2, 8.4, 0.12);
    for (let i = 0; i < 5; i++) A.sph(P.gold, -2.6 + (i % 2) * 5.2, 1.2 + i * 1.4, -25.45, 0.22);
    A.sph(P.gold, -0.6, 4.0, -25.4, 0.28);
    A.sph(P.gold, 0.6, 4.0, -25.4, 0.28);
    for (const sx of [-1, 1]) {
      A.cyl(P.cream, sx * 5.4, 4.8, -23.6, 0.75, 9.6);
      A.cyl(P.gold, sx * 5.4, 0.25, -23.6, 1.0, 0.5);
      A.cyl(P.gold, sx * 5.4, 9.6, -23.6, 1.0, 0.4);
      softCol(sx * 5.4, -23.6, 1.0, 11);
    }
    A.box(P.rose, 0, 10.2, -24.3, 14.2, 0.7, 3.6);
    A.box(P.gold, 0, 10.62, -22.6, 14.2, 0.2, 0.3);
    A.box(P.rose, 0, 10.9, -25.0, 12.6, 0.5, 1.8, 0.3, 0, 0);

    /* ----- courtyard: fountain, flower beds, lamps ----- */
    const FZ = -12;
    A.cyl(P.stone, 0, 0.5, FZ, 5.2, 1.0);
    A.cyl(P.cream, 0, 1.15, FZ, 5.5, 0.45);
    A.cyl(P.lilac, 0, 1.2, FZ, 5.7, 0.2);
    A.cyl(P.stone, 0, 2.4, FZ, 0.95, 2.6);
    A.cyl(P.cream, 0, 3.6, FZ, 2.4, 0.5);
    A.cyl(P.stone, 0, 4.5, FZ, 0.5, 1.6);
    A.cyl(P.cream, 0, 5.4, FZ, 1.2, 0.3);
    const wat = new T.Mesh(new T.CircleGeometry(5.0, 40).rotateX(-PI / 2), new T.MeshToonMaterial({ color: 0xa9e1ff, gradientMap: UA.gradient, emissive: 0x6fc4ff, emissiveIntensity: 0.45, transparent: true, opacity: 0.9 }));
    wat.position.set(0, GH + 1.2, FZ);
    wat.userData.noOutline = true;
    g.add(wat);
    const top = new T.Mesh(new T.OctahedronGeometry(0.8, 0), UA.addGlow(new T.MeshToonMaterial({ color: P.gold, gradientMap: UA.gradient, emissive: 0xffb000, emissiveIntensity: 0.5 }), 1.4));
    top.scale.set(1, 1.4, 0.6);
    top.position.set(0, GH + 6.5, FZ);
    top.userData.noOutline = true;
    g.add(top);
    Realm.starTop = top;
    WD.addCollider(R.x, R.z + FZ, 5.7, GH + 6);
    Realm.fountain = { x: R.x, z: R.z + FZ, y: GH + 1.2 };
    // lamps either side of the keep door
    [-9, 9].forEach((x) => lamp(x, -22.5, 5));
    // the gardens (garden.js): parterres, a lily pond, a tea gazebo, an orchard and a carousel
    if (Realm.buildGarden) Realm.buildGarden({ g, A, Wn, P, rnd, col, softCol, lamp, topiary, roseArch, bench, FZ, archWin });

    /* ----- the Royal Road ----- */
    for (let z = -1; z <= 76; z += 13) {
      lamp(-6.4, z);
      lamp(6.4, z);
    }
    [20, 34, 48, 62, 76].forEach((z, i) => {
      topiary(-9.8, z, 1 + (i % 2) * 0.12);
      topiary(9.8, z, 1 + ((i + 1) % 2) * 0.12);
    });
    roseArch(26);
    roseArch(54);
    // gold kerbs along the road
    A.box(P.gold, -4.7, 0.12, (Realm.PORTAL_Z - 1.5) / 2, 0.45, 0.2, Realm.PORTAL_Z + 1.5);
    A.box(P.gold, 4.7, 0.12, (Realm.PORTAL_Z - 1.5) / 2, 0.45, 0.2, Realm.PORTAL_Z + 1.5);
    A.box(P.gold, -4.7, 0.12, -22.5, 0.45, 0.2, 7);
    A.box(P.gold, 4.7, 0.12, -22.5, 0.45, 0.2, 7);

    /* ----- the plaza ----- */
    const PZ = Realm.PLAZA_Z;
    for (const a of [0.55, 1.05, 2.1, 2.6, 3.7, 4.2, 5.2, 5.75]) {
      const rx = Math.cos(a) * 15.5,
        rz = Math.sin(a) * 15.5;
      if (Math.abs(rx) < 8 && rz > 0) continue; // keep the road end clear
      lamp(rx, PZ + rz);
    }
    for (const a of [0.0, 1.57, 3.14, 4.7]) {
      const rx = Math.cos(a) * 13.5,
        rz = Math.sin(a) * 13.5;
      if (Math.abs(rx) < 8) continue;
      bench(rx, PZ + rz, Math.atan2(-rx, -rz));
    }
    // a signpost to the castle
    A.cyl(P.dark, 8.2, 2.0, PZ - 14, 0.16, 4.0);
    A.box(P.gold, 8.6, 3.5, PZ - 14, 2.6, 0.9, 0.18);
    A.box(P.gold, 10.2, 3.5, PZ - 14, 0.9, 0.9, 0.18, 0, 0, PI / 4);
    A.sph(P.rose, 7.6, 3.5, PZ - 13.9, 0.28);
    softCol(8.2, PZ - 14, 0.4, 4);

    /* ----- the princess's carriage (a pumpkin coach) ----- */
    (function () {
      const cx = -18,
        cz = 22,
        yaw = 0.35;
      A.push(M(cx, 0, cz, yaw));
      A.box(P.gold, 0, 1.4, 0, 2.7, 0.4, 5.2);
      A.sph(0xffa6cf, 0, 3.0, 0, 1.95, 1.65, 2.45, true);
      for (let k = -2; k <= 2; k++) A.sph(0xff8fc2, k * 0.62, 3.0, 0, 0.12, 1.66, 2.47);
      A.sph(P.lilac, 0, 4.7, -0.1, 1.5, 0.9, 1.9, true);
      A.sph(P.gold, 0, 5.55, -0.1, 0.32);
      A.box(P.gold, 0, 3.0, 2.45, 1.7, 1.5, 0.16);
      A.box(P.dark, 0, 1.0, 3.0, 0.2, 0.2, 1.6);
      for (const sx of [-1, 1])
        for (const sz of [-1.7, 1.7]) {
          A.cyl(P.gold, sx * 1.55, 1.25, sz, 1.25, 0.34, 0, 0, PI / 2);
          A.cyl(P.cream, sx * 1.55, 1.25, sz, 0.95, 0.4, 0, 0, PI / 2);
          A.cyl(P.gold, sx * 1.55, 1.25, sz, 0.28, 0.46, 0, 0, PI / 2);
        }
      A.sph(P.gold, 0, 5.0, 2.3, 0.2);
      A.pop();
      Wn.push(M(cx, 0, cz, yaw));
      Wn.box(P.glass, 0, 3.1, 2.5, 1.2, 1.0, 0.2);
      Wn.pop();
      softCol(cx, cz, 3.3, 5.5);
    })();

    A.pop();
    Wn.pop();
    const bodyMat = UA.addGlow(new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 0.3);
    const glowMat = UA.addGlow(new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 2.2);
    const body = new T.Mesh(A.build(), bodyMat);
    const glow = new T.Mesh(Wn.build(), glowMat);
    body.frustumCulled = glow.frustumCulled = false;
    g.add(body, glow);
    Realm.castle = { body, glow };
  };
})();
