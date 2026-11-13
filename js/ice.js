/* Frostglow Peak: a third area, far off to the east (world x about 2600), reached through the icy portals (one in the home
   meadow, one in Twinkle Town). A snowy pine forest and a frozen lake lie at the foot of an ice mountain; a lamp-lit road
   spirals once round the mountain to the ice castle at the flat summit (ice_castle.js builds the castle, courtyard and
   gardens). Princess Flurry lives there (princess.js) and snow and ice animals roam the forest (creatures.js).

   Everything is in one Group at (ICE.x, 0, ICE.z), so coordinates here are "local" (lx, lz) unless a name says world. The
   height field (the mountain, the carved road, the flat summit) is in world.js. Only the area you are in is drawn. */
(function () {
  const UA = window.UA,
    C = UA.C,
    T = THREE,
    V3 = T.Vector3;
  const I = UA.ICE,
    GH = I.gh,
    TAU = Math.PI * 2,
    PI = Math.PI;
  const Realm = UA.Realm;
  const { Acc, GEO } = UA.Town;
  const { M, trans } = Realm;
  const nz = UA.makeNoise(C.SEED + 654);
  const SUMMIT = GH + I.mTop;
  const Ice = (Realm.ice = { group: null, flags: [], anims: [], clouds: [], lamps: [], pads: [], trees: [], glades: [], SUMMIT, built: false });

  /* ---------- the palette ---------- */
  const P = {
    ice: 0xd2ecff,
    ice2: 0xe9f6ff,
    deep: 0x93c8f5,
    glass: 0xfff0c0,
    cool: 0xdff8ff,
    lilac: 0xb9b6ff,
    pink: 0xffc8ea,
    silver: 0xe3ecf7,
    dark: 0x5b7fc2,
    snow: 0xf7fcff,
    teal: 0x8fe0e0,
    gold: 0xffe9a8,
    wood: 0xb99a86,
    red: 0xff8da8,
  };
  Ice.P = P;

  /* ---------- where things are ---------- */
  // the spiral road: distance from the road's middle line (and where along it, 0..1) at local (lx, lz)
  function roadAt(lx, lz) {
    const rz = lz - I.mz,
      rho = Math.hypot(lx, rz),
      phi = Math.atan2(lx, rz);
    const u = phi <= 0 ? -phi / TAU : 1 - phi / TAU;
    return { d: Math.abs(rho - I.roadRho(u)), u, rho };
  }
  Ice.roadAt = roadAt;
  // hard surfaces and anywhere the gardens and buildings stand: no grass, trees or random crystals there
  function hard(lx, lz, m) {
    m = m || 0;
    if (Math.hypot(lx - I.lake.x, lz - I.lake.z) < I.lake.r + 1.5 + m) return true;
    if (Math.hypot(lx - I.plaza.x, lz - I.plaza.z) < 18 + m) return true;
    if (Math.hypot(lx, lz - Realm.ICE_PORTAL_Z) < 9.5 + m) return true;
    if (lz < -78 - m && lz > -158 - m && Math.abs(lx) < 48 + m) return true; // the summit: castle, courtyard, gardens
    if (Ice.slideNear && Ice.slideNear(lx, lz, m)) return true; // the ice slide
    const r = roadAt(lx, lz);
    if (r.d < I.roadW + 0.6 + m && r.u > 0.001 && r.u < 0.999) return true;
    const PD = Ice.pads;
    for (let i = 0; i < PD.length; i++) {
      const s = PD[i];
      if (Math.hypot(lx - s.x, lz - s.z) < s.r + m) return true;
    }
    return false;
  }
  Ice.hard = hard;
  Realm.iceNoGrass = (lx, lz) => hard(lx, lz, 0.5);
  // open clearings in the forest where the animals live: [x, z, radius]
  Ice.glades = [
    { x: -70, z: 72, r: 11 },
    { x: 58, z: 62, r: 12 },
    { x: 62, z: 14, r: 10 },
    { x: -78, z: -6, r: 11 },
    { x: -20, z: 92, r: 9 },
    { x: 30, z: 36, r: 9 },
    { x: 26, z: 90, r: 10 },
  ];

  /* ---------- terrain ---------- */
  function buildTerrain(g) {
    const W = UA.World;
    const sx = 460,
      sz = 640,
      cz = -35;
    const geo = new T.PlaneGeometry(sx, sz, 184, 256);
    geo.rotateX(-PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i),
        lz = pos.getZ(i) + cz;
      pos.setXYZ(i, lx, W.heightAt(I.x + lx, I.z + lz), lz);
    }
    geo.computeVertexNormals();
    const nor = geo.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    const snow = new T.Color(0xf6fbff),
      snow2 = new T.Color(0xe2f0ff),
      ice1 = new T.Color(0xa6d2f8),
      ice2 = new T.Color(0x7fb2ea),
      rock = new T.Color(0xb8b9ff),
      lake = new T.Color(0xc4e8ff),
      tmp = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i);
      const n1 = nz(x * 0.03, z * 0.03) * 0.5 + 0.5,
        n2 = nz(x * 0.11 + 9, z * 0.11) * 0.5 + 0.5;
      tmp.copy(snow).lerp(snow2, UA.smoothstep(0.3, 0.8, n1));
      tmp.lerp(ice1, UA.smoothstep(0.62, 0.9, n2) * 0.22);
      const steep = 1 - nor.getY(i);
      tmp.lerp(ice1, UA.smoothstep(0.12, 0.4, steep) * 0.85);
      tmp.lerp(ice2, UA.smoothstep(0.4, 0.7, steep) * 0.85);
      // the rim hills round the play area lean lilac-blue
      const d = Math.hypot(x, z - UA.clamp(z, I.segA, I.segB));
      tmp.lerp(rock, UA.smoothstep(I.playR - 30, I.playR + 20, d) * 0.55);
      // under the lake and under the summit: clean white
      if (Math.hypot(x - I.lake.x, z - I.lake.z) < I.lake.r) tmp.lerp(lake, 0.8);
      tmp.lerp(snow, UA.smoothstep(34, 26, Math.hypot(x, z - I.mz)) * 0.8);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const mesh = new T.Mesh(geo, new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }));
    mesh.frustumCulled = false;
    g.add(mesh);
    Ice.terrain = mesh;
  }

  /* ---------- the spiral road: a ribbon laid on the carved terrace, with lamps and ice arches ---------- */
  function roadTexture() {
    return Realm.canvasTex(
      256,
      256,
      (c) => {
        c.fillStyle = '#e4eeff';
        c.fillRect(0, 0, 256, 256);
        // bricks of pale ice
        c.strokeStyle = 'rgba(150,178,230,0.55)';
        c.lineWidth = 3;
        for (let r = 0; r < 4; r++) {
          const y = r * 64;
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(256, y);
          c.stroke();
          const off = r % 2 ? 0 : 64;
          for (let x = off; x < 256; x += 128) {
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x, y + 64);
            c.stroke();
          }
        }
        // edge stripes
        c.fillStyle = '#b9dcff';
        c.fillRect(0, 0, 14, 256);
        c.fillRect(242, 0, 14, 256);
        c.fillStyle = '#ffffff';
        c.fillRect(14, 0, 6, 256);
        c.fillRect(236, 0, 6, 256);
        // a little snowflake in the middle of every tile
        c.save();
        c.translate(128, 128);
        c.strokeStyle = '#ffffff';
        c.lineWidth = 5;
        c.lineCap = 'round';
        for (let k = 0; k < 6; k++) {
          c.rotate(PI / 3);
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(0, 30);
          c.moveTo(0, 18);
          c.lineTo(9, 26);
          c.moveTo(0, 18);
          c.lineTo(-9, 26);
          c.stroke();
        }
        c.restore();
        // sparkles
        c.fillStyle = 'rgba(255,255,255,0.9)';
        [[50, 40], [190, 90], [70, 200], [200, 220], [110, 20]].forEach((p) => c.fillRect(p[0], p[1], 5, 5));
      },
      1,
      1
    );
  }

  function buildRoad(g, ctx) {
    const { P: PA, PW } = ctx;
    const tex = roadTexture();
    const N = 520,
      Wd = 6.5;
    const pos = [],
      uv = [],
      idx = [];
    let len = 0,
      prev = null;
    for (let i = 0; i <= N; i++) {
      const u = i / N,
        p = I.roadPoint(u),
        a = I.roadPhi(u);
      const rx = Math.sin(a),
        rz = Math.cos(a);
      if (prev) len += Math.hypot(p.x - prev.x, p.z - prev.z);
      prev = p;
      const y = p.y + 0.13;
      pos.push(p.x - rx * Wd, y, p.z - rz * Wd, p.x + rx * Wd, y, p.z + rz * Wd);
      uv.push(0, len / 13, 1, len / 13);
      if (i > 0) {
        const k = i * 2;
        idx.push(k - 2, k, k - 1, k - 1, k, k + 1); // (wound so the top faces up)
      }
    }
    Ice.roadLen = len;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 1, 0); // (the terrace is level across: flat shading all the way)
    const mat = new T.MeshToonMaterial({ map: tex, gradientMap: UA.gradient, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    UA.addGlow(mat, 0.3);
    const mesh = new T.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    mesh.userData.noOutline = true;
    g.add(mesh);
    Ice.road = mesh;

    // lamps along the inside edge, an ice arch over the road at every quarter of the climb
    const lampAt = (u) => {
      const p = I.roadPoint(u),
        a = I.roadPhi(u);
      const x = p.x - Math.sin(a) * 5.7,
        z = p.z - Math.cos(a) * 5.7;
      ctx.lamp(x, p.y, z, 4.6);
    };
    for (let u = 0.022; u < 0.99; u += 0.0235) lampAt(u);
    const arch = (u, half, tall) => {
      const p = I.roadPoint(u),
        a = I.roadPhi(u);
      const q = I.roadPoint(u + 0.003),
        q0 = I.roadPoint(u - 0.003);
      const yaw = Math.atan2(q.x - q0.x, q.z - q0.z);
      ctx.iceArch(p.x, p.y, p.z, yaw, half, tall);
    };
    arch(0.035, 6.6, 1);
    arch(0.27, 6.6, 0.9);
    arch(0.52, 6.6, 0.9);
    arch(0.77, 6.6, 0.9);
    arch(0.975, 7.0, 1.15);
  }

  /* ---------- the frozen lake ---------- */
  function buildLake(g) {
    const W = UA.World;
    const L = I.lake;
    const tex = Realm.canvasTex(
      512,
      512,
      (c, w, h) => {
        const grd = c.createRadialGradient(256, 256, 20, 256, 256, 256);
        grd.addColorStop(0, '#e9f8ff');
        grd.addColorStop(0.7, '#bfe6ff');
        grd.addColorStop(1, '#9cd0f6');
        c.fillStyle = grd;
        c.fillRect(0, 0, w, h);
        // a big faint snowflake and cracks
        c.save();
        c.translate(256, 256);
        c.strokeStyle = 'rgba(255,255,255,0.7)';
        c.lineCap = 'round';
        for (let k = 0; k < 6; k++) {
          c.rotate(PI / 3);
          c.lineWidth = 9;
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(0, 190);
          c.stroke();
          c.lineWidth = 6;
          for (const s of [70, 120, 160]) {
            c.beginPath();
            c.moveTo(0, s);
            c.lineTo(34, s + 30);
            c.moveTo(0, s);
            c.lineTo(-34, s + 30);
            c.stroke();
          }
        }
        c.restore();
        c.strokeStyle = 'rgba(120,170,225,0.55)';
        c.lineWidth = 2.5;
        const rr = UA.rng(77);
        for (let k = 0; k < 16; k++) {
          let x = 256 + (rr() - 0.5) * 340,
            y = 256 + (rr() - 0.5) * 340;
          c.beginPath();
          c.moveTo(x, y);
          for (let j = 0; j < 4; j++) {
            x += (rr() - 0.5) * 70;
            y += (rr() - 0.5) * 70;
            c.lineTo(x, y);
          }
          c.stroke();
        }
        c.fillStyle = 'rgba(255,255,255,0.95)';
        for (let k = 0; k < 40; k++) c.fillRect(rr() * 512, rr() * 512, 4, 4);
      },
      1,
      1
    );
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    const mat = new T.MeshToonMaterial({ map: tex, gradientMap: UA.gradient, emissive: 0x7fcfff, emissiveIntensity: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    if (UA.Cartoon && UA.Cartoon.gloss) UA.Cartoon.gloss(mat);
    UA.addGlow(mat, 0.35);
    const lake = new T.Mesh(new T.CircleGeometry(L.r, 64).rotateX(-PI / 2), mat);
    lake.position.set(L.x, W.heightAt(I.x + L.x, I.z + L.z) + 0.1, L.z);
    lake.renderOrder = 1;
    lake.userData.noOutline = true;
    g.add(lake);
    Ice.lake = lake;
    // a rim of snow humps and little ice chunks round the shore
    const rnd = UA.rng(C.SEED + 5150);
    const bumps = new Acc();
    for (let k = 0; k < 34; k++) {
      const a = (k / 34) * TAU + rnd() * 0.15;
      const r = L.r + 0.4 + rnd() * 1.6;
      const x = L.x + Math.cos(a) * r,
        z = L.z + Math.sin(a) * r;
      const h = W.heightAt(I.x + x, I.z + z);
      const s = 0.8 + rnd() * 1.1;
      bumps.sph(k % 3 ? P.snow : P.ice, x, h + 0.1, z, s * 1.5, s * 0.7, s * 1.3);
      if (k % 4 === 0) bumps.cone(P.cool, x + 0.4, h + s * 0.9, z, 0.5 * s, 2.0 * s);
    }
    const bm = new T.Mesh(bumps.build(), UA.addGlow(new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 0.3));
    g.add(bm);
  }

  /* ---------- the pine forest ---------- */
  function pineGeo() {
    const parts = [];
    const cyl = new T.CylinderGeometry(0.3, 0.42, 1.8, 7);
    cyl.translate(0, 0.9, 0);
    parts.push({ geo: cyl, color: 0x9a86b4 });
    const cone = new T.ConeGeometry(1, 1, 9, 1, true);
    const greens = [0x4f9fa6, 0x5db1b3, 0x6dc3bf, 0x80d4cb];
    for (let k = 0; k < 4; k++) {
      const r = 2.7 - k * 0.55,
        h = 2.5 - k * 0.15,
        y = 1.3 + k * 1.45;
      parts.push({ geo: cone, color: greens[k], matrix: new T.Matrix4().compose(new V3(0, y + h / 2, 0), new T.Quaternion(), new V3(r, h, r)) });
      // a cap of snow on each tier, and a drooping skirt of it at the rim
      parts.push({ geo: cone, color: 0xf6fbff, matrix: new T.Matrix4().compose(new V3(0, y + h * 0.62, 0), new T.Quaternion(), new V3(r * 0.82, h * 0.62, r * 0.82)) });
    }
    const tip = new T.OctahedronGeometry(0.34, 0);
    parts.push({ geo: tip, color: 0xdff8ff, matrix: new T.Matrix4().compose(new V3(0, 7.55, 0), new T.Quaternion(), new V3(1, 1.7, 1)) });
    return UA.mergeGeos(parts);
  }

  function buildForest(g) {
    const W = UA.World;
    const rnd = UA.rng(C.SEED + 4343);
    const list = [];
    for (let tries = 0; tries < 30000 && list.length < 430; tries++) {
      const lx = (rnd() - 0.5) * 340,
        lz = -280 + rnd() * 480;
      if (hard(lx, lz, 7)) continue;
      if (W.outOfBounds(I.x + lx, I.z + lz, -14)) continue; // (a little way into the rim hills is fine)
      const h = W.heightAt(I.x + lx, I.z + lz);
      if (h > GH + 40) continue;
      if (W.slopeAt(I.x + lx, I.z + lz) > 0.5) continue;
      const dens = nz(lx * 0.022 + 3, lz * 0.022);
      if (dens < -0.05 && rnd() > 0.08) continue;
      let ok = true;
      for (const gl of Ice.glades) if (Math.hypot(gl.x - lx, gl.z - lz) < gl.r + 3) ok = false;
      if (!ok) continue;
      if (list.some((o) => Math.hypot(o.x - lx, o.z - lz) < 5.6)) continue;
      list.push({ x: lx, z: lz, h, s: 0.75 + rnd() * 0.85, rot: rnd() * 6.28 });
    }
    const geo = pineGeo();
    const mat = UA.addGlow(new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 0.25);
    const mesh = new T.InstancedMesh(geo, mat, list.length);
    const _m = new T.Matrix4(),
      _q = new T.Quaternion(),
      _up = new V3(0, 1, 0),
      tc = new T.Color();
    const tints = [0xffffff, 0xf0fff8, 0xeaf2ff, 0xf6eaff, 0xffffff];
    list.forEach((t, i) => {
      _q.setFromAxisAngle(_up, t.rot);
      _m.compose(new V3(t.x, t.h - 0.15, t.z), _q, new V3(t.s, t.s * (0.9 + rnd() * 0.3), t.s));
      mesh.setMatrixAt(i, _m);
      mesh.setColorAt(i, tc.set(tints[Math.floor(rnd() * tints.length)]));
      W.addCollider(I.x + t.x, I.z + t.z, 0.6 * t.s, t.h + 9 * t.s);
      W.addBlocker(I.x + t.x, I.z + t.z, 2.2 * t.s, t.h + 2, t.h + 8 * t.s);
    });
    mesh.frustumCulled = false;
    g.add(mesh);
    Ice.trees = list;
    Ice.treeCount = list.length;
  }

  /* ---------- crystals: clusters of glowing ice spikes ---------- */
  function buildCrystals(g) {
    const W = UA.World;
    const rnd = UA.rng(C.SEED + 6161);
    const CR = new Acc();
    const prism = new T.CylinderGeometry(1, 1, 1, 6);
    const point = new T.ConeGeometry(1, 1, 6);
    const cols = [0x9fe3ff, 0xb8c4ff, 0xe3d4ff, 0xc8f5ff, 0x8fd2ff, 0xffd6f2];
    const spike = (x, y, z, r, h, tx, tz, c) => {
      // the spike's axis after tilting (rotation about x by tx, then z by tz)
      const ax = -Math.sin(tz),
        ay = Math.cos(tz) * Math.cos(tx),
        az = Math.cos(tz) * Math.sin(tx);
      CR.add(prism, c, x + ax * h * 0.3, y + ay * h * 0.3, z + az * h * 0.3, r, h * 0.6, r, tx, 0, tz);
      CR.add(point, c, x + ax * h * 0.8, y + ay * h * 0.8, z + az * h * 0.8, r, h * 0.4, r, tx, 0, tz);
    };
    const cluster = (x, z, big) => {
      const h0 = W.heightAt(I.x + x, I.z + z);
      const n = big ? 9 : 4 + Math.floor(rnd() * 4);
      const base = cols[Math.floor(rnd() * 5)];
      for (let k = 0; k < n; k++) {
        const a = rnd() * TAU,
          d = k === 0 ? 0 : (0.5 + rnd() * 1.4) * (big ? 1.9 : 1);
        const hh = (k === 0 ? 1 : 0.35 + rnd() * 0.55) * (big ? 10 + rnd() * 5 : 2.4 + rnd() * 3.2);
        const r = (k === 0 ? 0.75 : 0.35 + rnd() * 0.3) * (big ? 1.7 : 1);
        const tilt = k === 0 ? 0.04 : 0.2 + rnd() * 0.3;
        spike(x + Math.cos(a) * d, h0 - 0.3, z + Math.sin(a) * d, r, hh, Math.sin(a) * tilt, -Math.cos(a) * tilt, k % 3 === 2 ? cols[Math.floor(rnd() * cols.length)] : base);
      }
      W.addCollider(I.x + x, I.z + z, big ? 3.1 : 1.35, h0 + (big ? 12 : 3.5), true);
      Ice.crystals.push({ x, z, y: h0 + (big ? 6 : 2), big });
    };
    Ice.crystals = [];
    // tall formations that frame the plaza
    [[-17, 36], [17, 38], [-30, 70], [30, 72]].forEach((p) => cluster(p[0], p[1], true));
    // scattered everywhere else
    let placed = 0;
    for (let tries = 0; tries < 4000 && placed < 56; tries++) {
      const lx = (rnd() - 0.5) * 310,
        lz = -260 + rnd() * 450;
      if (hard(lx, lz, 5)) continue;
      if (W.outOfBounds(I.x + lx, I.z + lz, 6)) continue;
      const h = W.heightAt(I.x + lx, I.z + lz);
      if (h > GH + 46 || W.slopeAt(I.x + lx, I.z + lz) > 0.45) continue;
      let ok = true;
      for (const t of Ice.trees) if (Math.hypot(t.x - lx, t.z - lz) < 3.5) ok = false;
      for (const c of Ice.crystals) if (Math.hypot(c.x - lx, c.z - lz) < 12) ok = false;
      for (const gl of Ice.glades) if (Math.hypot(gl.x - lx, gl.z - lz) < gl.r + 1) ok = false;
      if (!ok) continue;
      cluster(lx, lz, false);
      placed++;
    }
    const mat = UA.addGlow(new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient, emissive: 0x5fa8ff, emissiveIntensity: 0.18 }), 1.1);
    const m = new T.Mesh(CR.build(), mat);
    m.frustumCulled = false;
    g.add(m);
    Ice.crystalMesh = m;
  }

  /* ---------- clouds: some drift below the summit, so the castle floats above them ---------- */
  function buildSky(g) {
    const rnd = UA.rng(C.SEED + 515);
    const mat = new T.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient, emissive: 0xe8f4ff, emissiveIntensity: 0.55 });
    const puff = new T.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 16; i++) {
      const parts = [];
      const n = 5 + Math.floor(rnd() * 4);
      for (let j = 0; j < n; j++) {
        const r = 7 + rnd() * 7;
        parts.push({ geo: puff, color: 0xffffff, matrix: new T.Matrix4().compose(new V3((j - n / 2) * 8 + rnd() * 3, (rnd() - 0.3) * 4, (rnd() - 0.5) * 6), new T.Quaternion(), new V3(r * 1.2, r * 0.8, r)) });
      }
      const c = new T.Mesh(UA.mergeGeos(parts), mat);
      const a = rnd() * TAU,
        rr = 60 + rnd() * 220;
      c.position.set(Math.cos(a) * rr, 48 + rnd() * 100, I.mz + Math.sin(a) * rr);
      c.userData.speed = 0.5 + rnd() * 1.0;
      c.userData.baseY = c.position.y; // the height it would like to drift at; it rises to clear anything under it
      c.rotation.y = rnd() * 3;
      g.add(c);
      Ice.clouds.push(c);
    }
    Ice.cloudMat = mat;
  }

  /* how high a cloud's middle has to be for its underside to clear everything beneath it: the highest ground (or castle) under
     the cloud's footprint, plus the cloud's own half-depth and some air. Measured at a ring of points reaching past its ends. */
  const CLOUD_REACH = 42; // the farthest a puff reaches from the cloud's middle (it is long: up to about 38 each way)
  const CLOUD_CLEAR = 26; // the underside of the lowest puff hangs about 12 below the middle, plus 14 of air
  function cloudRoof(c) {
    const W = UA.World;
    let top = -1e9;
    for (let k = 0; k < 17; k++) {
      const a = (k % 8) * (TAU / 8) + (k > 8 ? TAU / 16 : 0);
      const r = k === 0 ? 0 : k <= 8 ? CLOUD_REACH * 0.5 : CLOUD_REACH;
      const lx = c.position.x + Math.cos(a) * r,
        lz = c.position.z + Math.sin(a) * r;
      let h = W.heightAt(I.x + lx, I.z + lz);
      if (Math.abs(lx) < 52 && lz > -168 && lz < -74) h = Math.max(h, SUMMIT + 68); // the castle: towers, roofs, spires and pennants
      if (h > top) top = h;
    }
    return top + CLOUD_CLEAR;
  }

  /* ---------- snowfall: flakes wrap round the unicorn, so a few hundred points cover the whole world ---------- */
  function buildSnow(g) {
    const N = 1500;
    const pos = new Float32Array(N * 3),
      rnd = UA.rng(C.SEED + 909);
    for (let i = 0; i < N * 3; i++) pos[i] = rnd();
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    const mat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uCenter: { value: new V3() }, uTime: { value: 0 }, uScale: { value: 600 }, uNight: { value: 0 } },
      vertexShader:
        'uniform vec3 uCenter; uniform float uTime; uniform float uScale; varying float vA;' +
        'void main(){ vec3 box = vec3(110.0, 52.0, 110.0); vec3 s = position;' +
        ' float sp = 3.0 + s.y * 2.4; vec3 q = s * box + vec3(sin(uTime * 0.5 + s.x * 40.0) * 2.5 + uTime * 1.2, -uTime * sp, cos(uTime * 0.43 + s.z * 30.0) * 2.5);' +
        ' vec3 c = vec3(uCenter.x, uCenter.y + 10.0, uCenter.z);' +
        ' vec3 w = mod(q - c + box * 0.5, box) - box * 0.5; vec3 p = c + w;' +
        ' vec3 e = abs(w) / (box * 0.5); vA = 1.0 - smoothstep(0.78, 1.0, max(max(e.x, e.y), e.z));' +
        ' vec4 mv = viewMatrix * vec4(p, 1.0); gl_PointSize = (0.34 + s.x * 0.34) * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'varying float vA; uniform float uNight; void main(){ float d = length(gl_PointCoord * 2.0 - 1.0); float a = smoothstep(1.0, 0.35, d) * vA;' +
        ' if (a < 0.02) discard; vec3 col = mix(vec3(0.82, 0.92, 1.0), vec3(1.0), uNight); gl_FragColor = vec4(col, a * 0.92); gl_FragColor = linearToOutputTexel(gl_FragColor); }',
    });
    const pts = new T.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = 7;
    g.add(pts);
    if (UA.FX && UA.FX.extraMats) UA.FX.extraMats.push(mat);
    Ice.snow = { pts, mat };
  }

  /* ---------- the shared little builders (the castle file uses them too) ---------- */
  function makeCtx(g) {
    const W = UA.World;
    const rnd = UA.rng(C.SEED + 8118);
    const P_ = new Acc(), // props: lamps, arches, snowmen, igloos, the plaza's things
      PW = new Acc(); // their glowing bits
    const A = new Acc(), // the castle and its courtyard
      Wn = new Acc();
    const col = (x, z, r, y1) => {
      W.addCollider(I.x + x, I.z + z, r, y1, true);
      W.addBlocker(I.x + x, I.z + z, r, y1 - 40, y1);
    };
    const softCol = (x, z, r, y1) => W.addCollider(I.x + x, I.z + z, r, y1);
    const ctx = { g, rnd, P: P_, PW, A, Wn, col, softCol, W };
    // a slim lamp post with a glowing crystal lantern
    ctx.lamp = (x, y, z, h) => {
      h = h || 4.4;
      P_.cyl(P.silver, x, y + 0.3, z, 0.46, 0.6);
      P_.cyl(P.dark, x, y + h / 2, z, 0.1, h);
      P_.cyl(P.silver, x, y + h + 0.06, z, 0.32, 0.14);
      PW.sph(P.glass, x, y + h + 0.58, z, 0.36, 0.52, 0.36);
      P_.cone(P.cool, x, y + h + 1.2, z, 0.44, 0.55);
      P_.sph(P.cool, x, y + h + 1.55, z, 0.12);
      Ice.lamps.push({ x, y: y + h + 0.6, z });
      softCol(x, z, 0.35, y + h);
    };
    // an arch of ice over a path: centred at (x, z) facing yaw, pillars `half` either side; tall = scale
    ctx.iceArch = (x, y, z, yaw, half, tall) => {
      tall = tall || 1;
      P_.push(M(x, y, z, yaw));
      const H = 5.4 * tall;
      for (const sx of [-1, 1]) {
        P_.cyl(P.ice2, sx * half, H / 2, 0, 0.5, H);
        P_.cyl(P.silver, sx * half, 0.3, 0, 0.8, 0.6);
        P_.cone(P.cool, sx * half, H + 0.9, 0, 0.62, 1.8);
        P_.sph(P.cool, sx * half, H + 2.0, 0, 0.18);
        softCol(x + Math.cos(yaw) * sx * half, z - Math.sin(yaw) * sx * half, 0.7, y + H + 2);
      }
      P_.geo(new T.TorusGeometry(1, 0.13, 6, 24, PI), P.ice2, 0, H, 0, half, 3.1 * tall, 1.3, 0, 0, 0);
      // icicles hang from the arch, a crown of crystals sits on top
      for (let k = 1; k < 12; k++) {
        const a = (k / 12) * PI;
        const ix = Math.cos(a) * half,
          iy = H + Math.sin(a) * 3.1 * tall;
        const len = 0.7 + ((k * 7) % 5) * 0.3;
        P_.cone(P.cool, ix, iy - len / 2 - 0.1, 0, 0.14, len, PI, 0, 0);
        if (k % 2 === 0) P_.cone(k % 4 === 0 ? P.pink : P.cool, ix, iy + 0.5, 0, 0.26, 1.3 + (k % 3) * 0.3, 0, 0, a - PI / 2 + PI / 2 - PI / 2);
      }
      P_.cone(P.lilac, 0, H + 3.1 * tall + 1.0, 0, 0.5, 2.4);
      P_.pop();
    };
    // a pennant that waves
    ctx.flag = (x, y, z, c, fw, fh) => {
      const geo = new T.BufferGeometry();
      const w = fw || 2.6,
        hh = (fh || 1.5) / 2;
      geo.setAttribute('position', new T.Float32BufferAttribute([0, hh, 0, 0, -hh, 0, w, 0, 0], 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
      const m = new T.Mesh(geo, new T.MeshToonMaterial({ color: c, gradientMap: UA.gradient, side: T.DoubleSide, emissive: c, emissiveIntensity: 0.25 }));
      m.position.set(x, y, z);
      m.userData.noOutline = true;
      g.add(m);
      Ice.flags.push({ m, base: 0.3 + rnd() * 1.2, ph: rnd() * 6 });
    };
    ctx.bench = (x, y, z, yaw) => {
      A.push(M(x, y, z, yaw));
      A.box(P.ice2, 0, 0.7, 0, 3.2, 0.25, 1.1);
      A.box(P.ice2, 0, 1.45, -0.5, 3.2, 1.2, 0.2);
      A.box(P.silver, -1.4, 0.35, 0, 0.2, 0.7, 0.9);
      A.box(P.silver, 1.4, 0.35, 0, 0.2, 0.7, 0.9);
      A.pop();
      softCol(x, z, 1.3, y + 1.8);
    };
    return ctx;
  }

  /* ---------- props: snowmen, igloos, a signpost, the plaza ---------- */
  function snowman(P_, ctx, x, z, s, scarf, hat, yaw) {
    const W = UA.World;
    const y = W.heightAt(I.x + x, I.z + z);
    P_.push(M(x, y, z, yaw));
    P_.sph(0xffffff, 0, 0.9 * s, 0, 1.05 * s, 0.95 * s, 1.05 * s);
    P_.sph(0xffffff, 0, 2.1 * s, 0, 0.78 * s);
    P_.sph(0xffffff, 0, 3.05 * s, 0, 0.62 * s);
    for (const e of [-1, 1]) P_.sph(0x2b3a67, e * 0.22 * s, 3.2 * s, 0.54 * s, 0.07 * s);
    P_.cone(0xff9a4a, 0, 3.05 * s, 0.78 * s, 0.09 * s, 0.55 * s, PI / 2, 0, 0);
    for (let k = 0; k < 3; k++) P_.sph(0x2b3a67, 0, (1.5 + k * 0.42) * s, 0.74 * s, 0.075 * s);
    P_.geo(GEO.tor, scarf, 0, 2.62 * s, 0, 0.72 * s, 0.72 * s, 0.9 * s, PI / 2, 0, 0);
    P_.box(scarf, 0.45 * s, 2.0 * s, 0.7 * s, 0.34 * s, 1.0 * s, 0.12 * s, 0, 0, -0.12);
    if (hat === 0) {
      // a knitted cap with a pompom
      P_.cone(scarf, 0, 3.78 * s, 0, 0.64 * s, 0.9 * s);
      P_.sph(0xffffff, 0, 4.28 * s, 0, 0.16 * s);
    } else {
      // a top hat
      P_.cyl(0x34456e, 0, 3.55 * s, 0, 0.74 * s, 0.12 * s);
      P_.cyl(0x34456e, 0, 3.95 * s, 0, 0.46 * s, 0.7 * s);
      P_.cyl(scarf, 0, 3.7 * s, 0, 0.47 * s, 0.14 * s);
    }
    for (const a of [-1, 1]) P_.box(0x8a6a5a, a * 1.12 * s, 2.35 * s, 0, 1.0 * s, 0.09 * s, 0.09 * s, 0, 0, a * 0.55);
    P_.pop();
    ctx.softCol(x, z, 1.15 * s, y + 4.2 * s);
  }
  function igloo(P_, ctx, x, z, r, yaw) {
    const W = UA.World;
    const y = W.heightAt(I.x + x, I.z + z);
    P_.push(M(x, y, z, yaw));
    P_.geo(GEO.dome, 0xf1f8ff, 0, -0.1, 0, r, r * 0.85, r);
    P_.cyl(P.ice, 0, 0.2, 0, r * 1.02, 0.5);
    // a tunnel door and a glowing doorway
    P_.box(0xe4f1ff, 0, 0.95, r * 0.92, 2.5, 1.9, 2.6);
    P_.geo(GEO.dome, 0xe4f1ff, 0, 1.85, r * 0.92, 1.25, 0.6, 1.3);
    ctx.PW.push(M(x, y, z, yaw));
    ctx.PW.box(P.glass, 0, 0.85, r + 1.0, 1.3, 1.5, 0.2);
    ctx.PW.pop();
    for (let k = 0; k < 5; k++) P_.cone(P.cool, Math.cos(k * 1.3) * r * 0.55, r * 0.8 + 0.2, Math.sin(k * 1.3) * r * 0.55 - 0.2, 0.18, 0.9, PI, 0, 0);
    P_.pop();
    ctx.col(x, z, r * 0.95, y + r);
    const tx = x + Math.sin(yaw) * (r * 0.92),
      tz = z + Math.cos(yaw) * (r * 0.92);
    ctx.softCol(tx, tz, 1.4, y + 2.6);
  }

  function buildProps(g, ctx) {
    const W = UA.World;
    const { P: P_, PW } = ctx;
    // the plaza: a snowflake rosette, lamps round it, a signpost to the castle
    const rosette = Realm.canvasTex(1024, 1024, (c) => {
      c.scale(4, 4);
      const cx = 128,
        cy = 128;
      c.fillStyle = '#f2f9ff';
      c.fillRect(0, 0, 256, 256);
      const ring = (r, col) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(cx, cy, r, 0, TAU);
        c.fill();
      };
      ring(126, '#cfe6ff');
      ring(116, '#f7fbff');
      ring(100, '#dcd9ff');
      ring(92, '#f2f9ff');
      c.save();
      c.translate(cx, cy);
      c.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        c.rotate(PI / 3);
        c.strokeStyle = '#8fc4f5';
        c.lineWidth = 9;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, 84);
        c.stroke();
        c.lineWidth = 6;
        for (const s of [34, 56, 76]) {
          c.beginPath();
          c.moveTo(0, s);
          c.lineTo(20, s + 18);
          c.moveTo(0, s);
          c.lineTo(-20, s + 18);
          c.stroke();
        }
        c.strokeStyle = '#ffffff';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(0, 6);
        c.lineTo(0, 80);
        c.stroke();
      }
      c.restore();
      ring(16, '#b9a8ff');
      ring(9, '#ffffff');
    });
    rosette.wrapS = rosette.wrapT = T.ClampToEdgeWrapping;
    const pm = new T.Mesh(
      new T.CircleGeometry(17, 56).rotateX(-PI / 2),
      UA.addGlow(new T.MeshToonMaterial({ map: rosette, gradientMap: UA.gradient, transparent: true, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), 0.3)
    );
    pm.position.set(I.plaza.x, W.heightAt(I.x + I.plaza.x, I.z + I.plaza.z) + 0.07, I.plaza.z);
    pm.renderOrder = 2;
    pm.userData.noOutline = true;
    g.add(pm);
    // lamps round the plaza (not across the road mouth to the north or the portal to the south)
    for (const a of [0.2, 0.7, 1.3, 1.85, 2.4, 3.0, 3.9, 4.4, 4.95, 5.6]) {
      const lx = I.plaza.x + Math.cos(a) * 14.5,
        lz = I.plaza.z + Math.sin(a) * 14.5;
      if (Math.abs(lx) < 8) continue;
      ctx.lamp(lx, W.heightAt(I.x + lx, I.z + lz), lz, 4.4);
    }
    // a signpost: an arrow of ice pointing up the mountain
    {
      const x = 8.8,
        z = 34,
        y = W.heightAt(I.x + x, I.z + z);
      P_.cyl(P.dark, x, y + 2.0, z, 0.16, 4.0);
      P_.box(P.ice2, x + 0.5, y + 3.5, z, 2.8, 0.9, 0.18);
      P_.box(P.ice2, x + 2.1, y + 3.5, z, 0.9, 0.9, 0.18, 0, 0, PI / 4);
      P_.cone(P.lilac, x - 0.4, y + 3.5, z + 0.12, 0.32, 0.4, PI / 2, 0, 0);
      ctx.softCol(x, z, 0.4, y + 4);
    }
    // snowmen: three round the plaza, a few in the forest (never on the road, the lake or the portal's pad)
    const okProp = (x, z) => {
      if (Math.hypot(x - I.lake.x, z - I.lake.z) < I.lake.r + 4) return false;
      if (Math.hypot(x, z - Realm.ICE_PORTAL_Z) < 11) return false;
      const r = roadAt(x, z);
      return !(r.d < I.roadW + 4 && r.u > 0 && r.u < 1);
    };
    const sn = [
      [-19, 60, 1.0, 0xff8da8, 0, 0.5],
      [19, 61, 0.85, 0x7fc8ff, 1, -0.6],
      [-27, 50, 1.15, 0xb9a8ff, 0, 0.9],
      [-48, 78, 1.0, 0xff8da8, 1, 0.2],
      [56, 56, 1.1, 0x8fe0c8, 0, -0.9],
      [70, 8, 0.9, 0xffc16a, 1, 2.2],
      [-84, 4, 1.05, 0x7fc8ff, 0, 1.4],
    ];
    sn.forEach((s) => okProp(s[0], s[1]) && snowman(P_, ctx, s[0], s[1], s[2], s[3], s[4], s[5]));
    // igloos in two of the glades
    igloo(P_, ctx, 64, 66, 3.2, -2.4);
    igloo(P_, ctx, -74, 70, 3.0, 2.2);
    igloo(P_, ctx, 66, 20, 2.8, -1.2);
    // the way home
    const py = W.heightAt(I.x, I.z + Realm.ICE_PORTAL_Z);
    const ret = Realm.makePortal(g, 0, py, Realm.ICE_PORTAL_Z, 0, [0x7fdcff, 0xf0fbff], 'Back home', { area: 'ice', dest: 'main', style: 'ice', ox: I.x, oz: I.z });
    ret.g.visible = true;
    Ice.portal = ret;
  }

  /* ---------- build ---------- */
  Realm.buildIce = function (scene) {
    if (Ice.built) return;
    Ice.built = true;
    const g = (Ice.group = new T.Group());
    g.position.set(I.x, 0, I.z);
    g.visible = false;
    scene.add(g);
    const ctx = makeCtx(g);
    Ice.ctx = ctx;
    buildTerrain(g);
    buildSky(g);
    buildLake(g);
    buildRoad(g, ctx);
    buildProps(g, ctx);
    if (Realm.buildIceCastle) Realm.buildIceCastle(ctx);
    if (Realm.buildIceSlide) Realm.buildIceSlide(ctx);
    buildForest(g);
    buildCrystals(g);
    buildSnow(g);
    // the static meshes (props / castle) merged by the accumulators
    const mk = (acc, k) => {
      const m = new T.Mesh(acc.build(), UA.addGlow(new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), k));
      g.add(m);
      return m;
    };
    Ice.props = mk(ctx.P, 0.3);
    Ice.propsGlow = mk(ctx.PW, 2.2);
    Ice.castle = mk(ctx.A, 0.35);
    Ice.castleGlow = mk(ctx.Wn, 2.2);
    // a soft halo round every lamp (additive points, they fade in at dusk)
    const pts = Ice.lamps;
    const pos = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => pos.set([p.x, p.y, p.z], i * 3));
    const hg = new T.BufferGeometry();
    hg.setAttribute('position', new T.BufferAttribute(pos, 3));
    const hm = new T.PointsMaterial({ map: UA.radialTexture('rgba(255,236,190,1)', 'rgba(255,236,190,0)', 64), size: 3.6, sizeAttenuation: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
    const hp = new T.Points(hg, hm);
    hp.frustumCulled = false;
    hp.renderOrder = 3;
    g.add(hp);
    Ice.halo = hm;
  };

  /* ---------- every frame ---------- */
  const _v = new V3();
  Realm.updateIce = function (dt, t, uni) {
    if (!Ice.built) return;
    const night = UA.Time ? UA.Time.night : 0;
    for (const f of Ice.flags) f.m.rotation.y = f.base + Math.sin(t * 2.6 + f.ph) * 0.28;
    // clouds drift east and ride up over whatever is beneath them (the mountain, the ring wall, the castle's towers) so that
    // none ever cuts through the ground: each one's underside stays CLOUD_CLEAR above the highest thing in its footprint
    Ice.cloudI = ((Ice.cloudI || 0) + 2) % Ice.clouds.length; // (two clouds re-measured per frame, so each is checked every few frames)
    for (let k = 0; k < Ice.clouds.length; k++) {
      const c = Ice.clouds[k];
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 320) {
        c.position.x = -320;
        c.userData.ty = undefined; // (it re-enters at the far side: measure again before it is shown)
      }
      const fresh = c.userData.ty === undefined;
      if (fresh || k === Ice.cloudI || k === (Ice.cloudI + 1) % Ice.clouds.length) c.userData.ty = cloudRoof(c);
      const ty = Math.max(c.userData.baseY, c.userData.ty);
      // rise quickly (it must not touch), sink slowly (it drifts back down once it is past); a new one starts at the right height
      if (fresh) c.position.y = ty;
      else c.position.y = ty > c.position.y ? UA.damp(c.position.y, ty, 2.4, dt) : UA.damp(c.position.y, ty, 0.35, dt);
    }
    for (const f of Ice.anims) f(t, dt, uni);
    if (Ice.halo) Ice.halo.opacity = UA.clamp(night * 1.1, 0, 0.95);
    if (Ice.cloudMat) Ice.cloudMat.emissiveIntensity = UA.lerp(0.55, 0.2, night);
    if (Ice.snow) {
      const u = Ice.snow.mat.uniforms;
      u.uCenter.value.set(uni.pos.x, uni.pos.y, uni.pos.z);
      u.uTime.value = t;
      u.uNight.value = night;
    }
    const lx = uni.pos.x - I.x,
      lz = uni.pos.z - I.z;
    // the frozen lake: a glittering trail while you glide over it
    if (UA.World.onIce(uni.pos.x, uni.pos.z)) {
      if (uni.speed > 2 && Math.random() < dt * 40) {
        const a = Math.random() * TAU;
        UA.FX.emit({ x: uni.pos.x + Math.cos(a) * 0.9, y: uni.pos.y + 0.2, z: uni.pos.z + Math.sin(a) * 0.9, vx: (Math.random() - 0.5) * 1.6, vy: 0.8 + Math.random() * 1.4, vz: (Math.random() - 0.5) * 1.6, color: Math.random() < 0.5 ? 0xffffff : 0xa8e4ff, size: 0.3 + Math.random() * 0.25, shape: 1, life: 0.9, grow: -0.4, gravity: 2, drag: 0.8, twinkle: 7 });
      }
      if (!Ice.skateToast && Realm.cd <= 0) {
        Ice.skateToast = true;
        UA.UI.toast('A frozen lake!<small>Glide across the ice</small>', 3200);
      }
    }
    // frost glitter drifting round you
    Ice.dustT = (Ice.dustT || 0) - dt;
    if (Ice.dustT <= 0) {
      Ice.dustT = 0.2;
      const a = Math.random() * TAU,
        rr = 4 + Math.random() * 18;
      UA.FX.emit({ x: uni.pos.x + Math.cos(a) * rr, y: uni.pos.y + 0.5 + Math.random() * 7, z: uni.pos.z + Math.sin(a) * rr, vx: (Math.random() - 0.5) * 0.5, vy: 0.2 + Math.random() * 0.4, vz: (Math.random() - 0.5) * 0.5, color: UA.pick([0xffffff, 0xcfeeff, 0xb8c4ff, 0xe3d4ff]), size: 0.26 + Math.random() * 0.22, shape: 1, life: 1.6 + Math.random(), grow: -0.3, gravity: -0.05, drag: 0.5, twinkle: 5 });
    }
    // crystals twinkle when you pass
    Ice.twT = (Ice.twT || 0) - dt;
    if (Ice.twT <= 0 && Ice.crystals) {
      Ice.twT = 0.35;
      for (const c of Ice.crystals) {
        if (Math.abs(c.x - lx) > 40 || Math.abs(c.z - lz) > 40) continue;
        if (Math.random() < 0.5) UA.FX.emit({ x: I.x + c.x + (Math.random() - 0.5) * 2, y: c.y + (Math.random() - 0.3) * (c.big ? 8 : 3), z: I.z + c.z + (Math.random() - 0.5) * 2, vx: 0, vy: 0.3, vz: 0, color: 0xffffff, size: 0.5, shape: 1, life: 1.0, grow: -0.5, twinkle: 9 });
      }
    }
    // the first time up on the summit
    if (!Ice.summitToast && uni.pos.y > SUMMIT - 3 && Math.hypot(lx, lz - I.mz) < 40 && Realm.cd <= 0) {
      Ice.summitToast = true;
      UA.UI.toast('The Ice Castle!<small>Princess Flurry is waiting by the fountain</small>', 4200);
    }
    if (Ice.update2) Ice.update2(dt, t, uni);
  };
})();
