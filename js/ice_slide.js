/* The Ice Slide: a banked chute of glittering ice that runs from a glowing pad on the castle's south lip, in long S-curves
   down the face of Frostglow Peak, to the edge of the plaza at the bottom. Ride onto the pad and the unicorn is whooshed
   down on rails: steer left and right with the arrow keys, hop with Space, brake with Down, and fly through the sparkle
   gates for a little speed.

   The chute lies on the ground (every vertex follows the terrain), with low rounded lips at the sides, so nothing solid
   stands in the way of anyone who walks across it. The unicorn is carried by unicorn.js through `unicorn.rail` (see
   Unicorn.update): while rail.active, rail.step() moves it, and the usual walking/jumping/colliding code is skipped.

   Local coordinates (lx, lz) are the ice world's own, like the rest of the ice files; the group sits at (ICE.x, ICE.z). */
(function () {
  const UA = window.UA,
    T = THREE,
    V3 = T.Vector3;
  const I = UA.ICE,
    Realm = UA.Realm,
    Ice = Realm.ice;
  const PI = Math.PI,
    TAU = Math.PI * 2;

  const S = (UA.IceSlide = {
    built: false,
    active: false, // a ride is happening (unicorn.js looks at rail.active)
    cool: 0,
    count: 0, // rides this visit
    rail: null,
  });

  // the middle line of the chute: [lx, lz] control points, smoothed by a spline. The first one is the glowing pad.
  const CTRL = [[-8, -82], [-9, -74], [-9, -64], [-4, -54], [5, -45], [12, -35], [13, -24], [10, -13], [9, -2], [12, 9], [14, 21], [12, 30], [10, 38]];
  const PAD_R = 3.4; // the pad you ride onto
  const GAP = 1.5; // distance between samples of the path
  const HALF = 3.5; // the whole chute's half-width, lips and skirt included
  const OFS_MAX = 2.35; // how far from the middle the unicorn can go (the lip's crest is at 2.5)
  // the chute's cross-section: [distance from the middle, height above the ground]
  const PROF = [[0, 0.1], [1.5, 0.12], [1.95, 0.4], [2.5, 0.64], [3.0, 0.38], [3.5, -0.35]];
  function prof(a) {
    a = Math.abs(a);
    if (a >= PROF[PROF.length - 1][0]) return PROF[PROF.length - 1][1];
    for (let i = 1; i < PROF.length; i++) {
      if (a <= PROF[i][0]) {
        const k = (a - PROF[i - 1][0]) / (PROF[i][0] - PROF[i - 1][0]);
        return PROF[i - 1][1] + (PROF[i][1] - PROF[i - 1][1]) * k;
      }
    }
    return 0;
  }

  /* ---------- the path (pure geometry, computed when the file loads so the forest can keep out of the way) ---------- */
  const P = []; // samples: { x, z, tx, tz, s, curv }
  (function buildPath() {
    const n = CTRL.length;
    const get = (i) => CTRL[Math.max(0, Math.min(n - 1, i))];
    const dense = [];
    for (let i = 0; i < n - 1; i++) {
      const p0 = get(i - 1),
        p1 = get(i),
        p2 = get(i + 1),
        p3 = get(i + 2);
      for (let k = 0; k < 24; k++) {
        const t = k / 24,
          t2 = t * t,
          t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    dense.push(CTRL[n - 1].slice());
    // resample at an even spacing
    const cum = [0];
    for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const total = cum[cum.length - 1];
    const cnt = Math.floor(total / GAP);
    let j = 0;
    for (let k = 0; k <= cnt; k++) {
      const d = k * GAP;
      while (j < dense.length - 2 && cum[j + 1] < d) j++;
      const f = (d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      P.push({ x: dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, z: dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f, s: d, tx: 0, tz: 1, curv: 0 });
    }
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)],
        b = P[Math.min(P.length - 1, i + 1)];
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      P[i].tx = (b.x - a.x) / l;
      P[i].tz = (b.z - a.z) / l;
    }
    for (let i = 1; i < P.length - 1; i++) {
      const h0 = Math.atan2(P[i - 1].tx, P[i - 1].tz),
        h1 = Math.atan2(P[i + 1].tx, P[i + 1].tz);
      P[i].curv = UA.angleDiff(h0, h1) / (2 * GAP); // radians per metre: positive turns to the unicorn's left
    }
  })();
  const LEN = P[P.length - 1].s;
  S.path = P;
  S.length = LEN;

  // where on the path is the point (lx, lz)? returns { i, d } (the nearest sample and its distance)
  function nearest(lx, lz, from, win) {
    let bi = -1,
      bd = 1e9;
    const a = from === undefined ? 0 : Math.max(0, from - win),
      b = from === undefined ? P.length - 1 : Math.min(P.length - 1, from + win);
    for (let i = a; i <= b; i++) {
      const d = Math.hypot(P[i].x - lx, P[i].z - lz);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    return { i: bi, d: bd };
  }
  // the forest, grass and crystals keep out of the chute and its pad (called through Ice.hard)
  Ice.slideNear = function (lx, lz, m) {
    if (lx < -30 || lx > 34 || lz < -96 || lz > 54) return false;
    return nearest(lx, lz).d < HALF + 3.4 + (m || 0);
  };

  /* ---------- the ride ---------- */
  const R = (S.rail = {
    active: false,
    pitch: 0,
    surfaceY: 0,
    s: 0,
    v: 0,
    ofs: 0,
    hop: 0,
    hopV: 0,
    blend: 1,
    entry: new V3(),
    gate: 0,
    fxT: 0,
    sfxT: 0,
    yawPrev: 0,
    maxV: 0,
    t: 0,
  });
  const GATES = [];
  S.gates = GATES;
  const sampleAt = (s) => {
    const f = UA.clamp(s / GAP, 0, P.length - 1.001);
    const i = Math.floor(f);
    const k = f - i;
    return { a: P[i], b: P[i + 1], k };
  };
  // the ground's height under the middle line (smoothed, so the slope the ride feels is not bumpy)
  const HY = [];
  function slopeAt(s) {
    // downhill steepness (positive going down) from the smoothed profile
    const q = sampleAt(s);
    const i = Math.max(0, Math.min(HY.length - 2, Math.floor(UA.clamp(s / GAP, 0, P.length - 1.001))));
    return (HY[i] - HY[i + 1]) / GAP;
  }
  const _n = { x: 0, z: 0 };

  R.begin = function (uni) {
    S.active = R.active = true;
    S.count++;
    // enter at the start of the chute, from wherever on the pad the unicorn is
    R.s = 0;
    R.v = UA.clamp(uni.speed * 0.9, 6.5, 12);
    const q = sampleAt(0);
    const a = q.a;
    const wx = I.x + a.x,
      wz = I.z + a.z;
    // which side of the middle line is it on?
    const side = -(uni.pos.x - wx) * a.tz + (uni.pos.z - wz) * a.tx; // positive: right of the line (the rider's right is (-tz, tx))
    R.ofs = UA.clamp(side, -OFS_MAX, OFS_MAX);
    R.entry.copy(uni.pos);
    R.blend = 0;
    R.hop = 0;
    R.hopV = 0;
    R.gate = 0;
    R.fxT = 0;
    R.sfxT = 0;
    R.maxV = 0;
    R.t = 0;
    R.yawPrev = uni.yaw;
    uni.grounded = false;
    uni.gliding = true;
    uni.flapUsed = true;
    uni.coyote = 0;
    UA.Audio.whoosh();
    UA.FX.burst(new V3(uni.pos.x, uni.pos.y + 1.2, uni.pos.z), 26);
    if (UA.UI) UA.UI.toast('Wheee! Ice slide!<small>Steer with the arrow keys, hop with Space</small>', 2800);
  };

  R.finish = function (uni, why) {
    R.active = S.active = false;
    const g = UA.World.groundAt(uni.pos.x, uni.pos.z);
    uni.pos.y = Math.max(g, uni.pos.y - 0.1);
    uni.speed = Math.min(R.v, 12);
    uni.grounded = true;
    uni.gliding = false;
    uni.vy = 0;
    uni.flapUsed = false;
    S.cool = 3;
    if (why === 'end') {
      UA.FX.puff(uni.pos, 12, 0xffffff);
      UA.FX.ring(uni.pos, 14, 5);
      UA.Audio.fanfare();
      const n = S.count;
      UA.state.iceSlides = (UA.state.iceSlides || 0) + 1;
      if (UA.save && (UA.state.iceSlides === 1 || UA.state.iceSlides % 5 === 0)) UA.save();
      UA.UI.toast(n === 1 ? 'What a ride!<small>Climb back up and slide again</small>' : 'Wheee! Slide number ' + n + '!<small>Again? The road leads back up</small>', 3200);
      if (UA.IceGuides && UA.IceGuides.afterSlide) UA.IceGuides.afterSlide();
      // the friends nearby cheer
      if (UA.Creatures && UA.Creatures.dazzle) UA.Creatures.dazzle(uni.pos, 14);
    }
  };

  // called from Unicorn.update every frame of the ride, in place of the usual movement
  R.step = function (uni, dt, input, camYaw) {
    if (!Realm.inIce) {
      R.finish(uni, 'left'); // (carried to another world mid-ride: let go)
      return;
    }
    R.t += dt;
    // ---- speed: gravity down the slope, air drag, a touch of ice friction; Down brakes ----
    const m = slopeAt(R.s);
    const sinT = m / Math.sqrt(1 + m * m);
    let a = 17 * sinT - 0.02 * R.v * R.v - 0.35;
    const sy = Math.sin(camYaw),
      cy = Math.cos(camYaw);
    const ix = -Math.cos(camYaw) * input.x + sy * input.y,
      iz = Math.sin(camYaw) * input.x + cy * input.y; // the direction the child is pushing, in the world
    const q = sampleAt(R.s);
    const A = q.a,
      B = q.b;
    const tx = A.tx + (B.tx - A.tx) * q.k,
      tz = A.tz + (B.tz - A.tz) * q.k;
    const tl = Math.hypot(tx, tz) || 1;
    const Tx = tx / tl,
      Tz = tz / tl;
    const Nx = -Tz,
      Nz = Tx; // the rider's right
    const along = ix * Tx + iz * Tz,
      lat = ix * Nx + iz * Nz;
    if (along < -0.35) a -= 9 * Math.min(1, -along); // brake
    if (input.gallop) a += 2.5; // (a little push)
    R.v = UA.clamp(R.v + a * dt, 0, 25);
    R.maxV = Math.max(R.maxV, R.v);
    // steering with the arrow keys
    R.ofs += lat * 6.2 * dt;
    R.ofs = UA.clamp(R.ofs, -OFS_MAX, OFS_MAX);
    R.s += R.v * dt;
    // hop
    if (input.jumpPressed && R.hop <= 0.01) {
      R.hopV = 8.2;
      UA.Audio.jump();
      UA.FX.puff(uni.pos, 4, 0xffffff);
    }
    R.hopV -= 26 * dt;
    R.hop += R.hopV * dt;
    if (R.hop <= 0) {
      if (R.hopV < -3 && R.hop < 0) UA.FX.ring(uni.pos, 8, 3);
      R.hop = 0;
      R.hopV = 0;
    }
    uni.vy = R.hopV;

    // ---- where that puts the unicorn ----
    const q2 = sampleAt(Math.min(R.s, LEN - 0.01));
    const px = q2.a.x + (q2.b.x - q2.a.x) * q2.k,
      pz = q2.a.z + (q2.b.z - q2.a.z) * q2.k;
    const wx = I.x + px + Nx * R.ofs,
      wz = I.z + pz + Nz * R.ofs;
    const ground = UA.World.groundAt(wx, wz);
    R.surfaceY = ground + prof(R.ofs);
    const wy = R.surfaceY + R.hop;
    if (R.blend < 1) {
      // from the pad onto the rail, smoothly
      R.blend = Math.min(1, R.blend + dt / 0.35);
      const e = R.blend * R.blend * (3 - 2 * R.blend);
      uni.pos.set(R.entry.x + (wx - R.entry.x) * e, R.entry.y + (wy - R.entry.y) * e, R.entry.z + (wz - R.entry.z) * e);
    } else uni.pos.set(wx, wy, wz);
    // facing: down the chute, turned a little towards where it is drifting
    const yawT = Math.atan2(Tx, Tz) + UA.clamp(-lat * 0.16, -0.25, 0.25);
    const dyaw = UA.angleDiff(uni.yaw, yawT);
    uni.yaw += dyaw * (1 - Math.exp(-9 * dt));
    uni.yawRate = UA.damp(uni.yawRate, UA.clamp(UA.angleDiff(R.yawPrev, uni.yaw) / Math.max(dt, 1e-4), -3.2, 3.2), 10, dt);
    R.yawPrev = uni.yaw;
    uni.speed = R.v;
    uni.grounded = false;
    uni.gliding = true; // (the stretched-out gliding pose is the sliding pose)
    R.pitch = UA.damp(R.pitch, Math.atan(m) * 0.95, 8, dt);

    // ---- the sparkle gates ----
    while (R.gate < GATES.length && R.s >= GATES[R.gate]) {
      UA.Audio.ring(R.gate);
      UA.FX.burst(new V3(uni.pos.x, uni.pos.y + 1.6, uni.pos.z), 30);
      R.v = Math.min(25, R.v + 1.2);
      R.gate++;
    }
    // ---- sparkles and ice spray ----
    R.fxT -= dt;
    if (R.fxT <= 0 && R.blend >= 1) {
      R.fxT = 0.045;
      UA.FX.emit({ x: uni.pos.x + (Math.random() - 0.5) * 0.8, y: uni.pos.y + 0.25, z: uni.pos.z + (Math.random() - 0.5) * 0.8, vx: -Tx * R.v * 0.2 + (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 1.5, vz: -Tz * R.v * 0.2 + (Math.random() - 0.5) * 2, color: Math.random() < 0.5 ? 0xffffff : 0xbfe8ff, size: 0.35 + Math.random() * 0.35, shape: Math.random() < 0.4 ? 1 : 0, life: 0.7, grow: -0.4, gravity: 3, drag: 1, twinkle: 8 });
    }
    R.sfxT -= dt;
    if (R.sfxT <= 0) {
      R.sfxT = 1.1;
      if (R.v > 12) UA.Audio.shimmer();
    }
    // ---- the end ----
    if (R.s >= LEN - 0.02) R.finish(uni, 'end');
  };
  R.pitch = 0;

  /* ---------- the buildings (the chute itself, its gate arches, the pad and the sign) ---------- */
  Realm.buildIceSlide = function (ctx) {
    const g = ctx.g;
    const W = UA.World;
    const gy = (x, z) => W.heightAt(I.x + x, I.z + z);
    // the smoothed height profile along the middle line
    const raw = P.map((p) => gy(p.x, p.z));
    for (let i = 0; i < raw.length; i++) {
      let sum = 0,
        n = 0;
      for (let k = -4; k <= 4; k++) {
        const j = i + k;
        if (j < 0 || j >= raw.length) continue;
        sum += raw[j];
        n++;
      }
      HY[i] = sum / n;
    }
    // gates at (roughly) every 30 metres
    GATES.length = 0;
    for (let s = 30; s < LEN - 22; s += 29) GATES.push(s);

    /* ----- the ribbon ----- */
    const tex = Realm.canvasTex(128, 192, (c, w, h) => {
      const bed = c.createLinearGradient(0, 0, w, 0);
      bed.addColorStop(0, '#e9f6ff');
      bed.addColorStop(0.27, '#c8e6ff');
      bed.addColorStop(0.5, '#f4fbff');
      bed.addColorStop(0.73, '#c8e6ff');
      bed.addColorStop(1, '#e9f6ff');
      c.fillStyle = bed;
      c.fillRect(0, 0, w, h);
      // long glassy streaks
      for (let k = 0; k < 18; k++) {
        c.strokeStyle = k % 3 ? 'rgba(255,255,255,0.8)' : 'rgba(150,205,250,0.55)';
        c.lineWidth = 1 + (k % 3);
        const x = w * (0.3 + 0.4 * ((k * 0.37) % 1));
        c.beginPath();
        c.moveTo(x, 0);
        c.quadraticCurveTo(x + (k % 2 ? 5 : -5), h / 2, x, h);
        c.stroke();
      }
      // candy-striped lips
      const lipW = w * 0.2;
      for (let y = 0; y < h; y += 48) {
        const col = (y / 48) % 2 ? '#ffc3dc' : '#d3c6ff';
        c.fillStyle = col;
        c.fillRect(w * 0.07, y, lipW, 48);
        c.fillRect(w - w * 0.07 - lipW, y, lipW, 48);
      }
      c.fillStyle = '#f4fbff';
      c.fillRect(0, 0, w * 0.07, h);
      c.fillRect(w * 0.93, 0, w * 0.07, h);
      // tiny stars
      for (let k = 0; k < 26; k++) {
        const x = w * (0.28 + 0.44 * ((k * 0.618) % 1)),
          y = ((k * 53) % h);
        c.fillStyle = 'rgba(255,255,255,0.95)';
        c.beginPath();
        c.arc(x, y, 1.3, 0, TAU);
        c.fill();
        c.fillRect(x - 3, y - 0.5, 6, 1);
        c.fillRect(x - 0.5, y - 3, 1, 6);
      }
    });
    tex.wrapS = T.ClampToEdgeWrapping;
    const pos = [],
      uv = [],
      idx = [];
    const COLS = [-3.5, -3.0, -2.5, -1.95, -1.5, 0, 1.5, 1.95, 2.5, 3.0, 3.5];
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const nx = -p.tz,
        nz = p.tx;
      for (let c = 0; c < COLS.length; c++) {
        const lat = COLS[c];
        const x = p.x + nx * lat,
          z = p.z + nz * lat;
        pos.push(x, gy(x, z) + prof(lat), z);
        uv.push((lat + HALF) / (HALF * 2), p.s / 12);
      }
      if (i > 0) {
        const k = COLS.length;
        for (let c = 0; c < k - 1; c++) {
          const a = (i - 1) * k + c,
            b = a + 1,
            cc = i * k + c,
            d = cc + 1;
          idx.push(a, cc, b, b, cc, d);
        }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    // (the normals of a ribbon wound this way point down: flip them so the toon shading lights the top)
    const nrm = geo.attributes.normal;
    for (let i = 0; i < nrm.count; i++) if (nrm.getY(i) < 0) nrm.setXYZ(i, -nrm.getX(i), -nrm.getY(i), -nrm.getZ(i));
    const mat = new T.MeshToonMaterial({ map: tex, gradientMap: UA.gradient, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    UA.addGlow(mat, 0.4);
    const mesh = new T.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    mesh.userData.noOutline = true;
    g.add(mesh);
    S.mesh = mesh;
    S.tex = tex;

    /* ----- gate arches over the chute, lamps beside it ----- */
    GATES.forEach((s, k) => {
      const q = sampleAt(s);
      const x = q.a.x + (q.b.x - q.a.x) * q.k,
        z = q.a.z + (q.b.z - q.a.z) * q.k;
      const yaw = Math.atan2(q.a.tx, q.a.tz);
      ctx.iceArch(x, gy(x, z), z, yaw, 4.7, 1.05);
    });
    for (let s = 14; s < LEN - 6; s += 14) {
      const q = sampleAt(s);
      const x = q.a.x + (q.b.x - q.a.x) * q.k,
        z = q.a.z + (q.b.z - q.a.z) * q.k;
      const side = Math.floor(s / 14) % 2 ? 1 : -1;
      const lx = x + -q.a.tz * 4.6 * side,
        lz = z + q.a.tx * 4.6 * side;
      ctx.lamp(lx, gy(lx, lz), lz, 4.2);
    }

    /* ----- the pad and the entrance arch with its sign ----- */
    const a0 = P[0];
    const padY = gy(a0.x, a0.z);
    const dh = 1.5;
    // the pad lies on the slope
    const nPad = new V3(-(gy(a0.x + dh, a0.z) - gy(a0.x - dh, a0.z)) / (2 * dh), 1, -(gy(a0.x, a0.z + dh) - gy(a0.x, a0.z - dh)) / (2 * dh)).normalize();
    const padTex = Realm.canvasTex(256, 256, (c, w) => {
      c.translate(w / 2, w / 2);
      const gr = c.createRadialGradient(0, 0, 10, 0, 0, w / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.0)');
      gr.addColorStop(0.55, 'rgba(180,235,255,0.35)');
      gr.addColorStop(0.86, 'rgba(255,255,255,0.95)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.beginPath();
      c.arc(0, 0, w / 2, 0, TAU);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.95)';
      c.lineCap = 'round';
      c.shadowColor = '#7fd8ff';
      c.shadowBlur = 8;
      for (let k = 0; k < 6; k++) {
        c.rotate(PI / 3);
        c.lineWidth = 7;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(0, 92);
        c.stroke();
        c.lineWidth = 5;
        for (const t of [38, 62]) {
          c.beginPath();
          c.moveTo(0, t);
          c.lineTo(16, t + 16);
          c.moveTo(0, t);
          c.lineTo(-16, t + 16);
          c.stroke();
        }
      }
    });
    const padMat = new T.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: false });
    const pad = new T.Mesh(new T.CircleGeometry(PAD_R + 0.6, 32), padMat);
    const padG = new T.Group();
    padG.position.set(a0.x, padY + 0.22, a0.z);
    padG.quaternion.setFromUnitVectors(new V3(0, 0, 1), nPad); // (the circle faces +z until turned onto the slope)
    pad.rotation.z = 0;
    padG.add(pad);
    pad.renderOrder = 4;
    g.add(padG);
    S.pad = { g: padG, mesh: pad, x: I.x + a0.x, z: I.z + a0.z, y: padY, r: PAD_R };
    // the sign (one face for riders arriving, one for riders below)
    const sign = (txt, sub) =>
      Realm.canvasTex(512, 160, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, '#8fd6ff');
        gr.addColorStop(0.5, '#d6e4ff');
        gr.addColorStop(1, '#c4b2ff');
        c.fillStyle = gr;
        c.beginPath();
        c.roundRect ? c.roundRect(6, 6, w - 12, h - 12, 34) : c.rect(6, 6, w - 12, h - 12);
        c.fill();
        c.lineWidth = 8;
        c.strokeStyle = '#ffffff';
        c.stroke();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 84px "Arial Rounded MT Bold","Trebuchet MS","Segoe UI",sans-serif';
        c.lineWidth = 12;
        c.strokeStyle = '#4a5fb8';
        c.strokeText(txt, w / 2, h / 2 + 4);
        c.fillStyle = '#ffffff';
        c.fillText(txt, w / 2, h / 2 + 4);
        c.fillStyle = '#ffffff';
        for (const x of [62, w - 62]) {
          c.save();
          c.translate(x, h / 2);
          c.strokeStyle = '#ffffff';
          c.lineWidth = 6;
          c.lineCap = 'round';
          for (let k = 0; k < 3; k++) {
            c.rotate(PI / 3);
            c.beginPath();
            c.moveTo(-22, 0);
            c.lineTo(22, 0);
            c.stroke();
          }
          c.restore();
        }
      });
    const yaw0 = Math.atan2(a0.tx, a0.tz);
    const archS = 5; // the arch stands this far down the chute from the pad's middle
    const qa = sampleAt(archS);
    const ax = qa.a.x + (qa.b.x - qa.a.x) * qa.k,
      az = qa.a.z + (qa.b.z - qa.a.z) * qa.k;
    const ay = gy(ax, az);
    ctx.iceArch(ax, ay, az, Math.atan2(qa.a.tx, qa.a.tz), 5.0, 1.3);
    const signG = new T.Group();
    signG.position.set(ax, ay + 5.4 * 1.3 + 1.6, az);
    signG.rotation.y = Math.atan2(qa.a.tx, qa.a.tz);
    const mkSign = (txt, facing) => {
      const m = new T.Mesh(new T.PlaneGeometry(7.2, 2.25), new T.MeshBasicMaterial({ map: sign(txt), transparent: true, side: T.FrontSide, fog: false }));
      m.rotation.y = facing; // 0 faces +z (down the chute), PI faces back up the chute
      m.position.z = facing ? -0.06 : 0.06;
      m.renderOrder = 5;
      return m;
    };
    signG.add(mkSign('ICE SLIDE', PI)); // seen by riders arriving from the castle
    signG.add(mkSign('WHEEE!', 0));
    g.add(signG);
    S.sign = signG;

    // a soft pillow of snow where the ride ends
    const end = P[P.length - 1];
    const pillow = new T.Mesh(new T.SphereGeometry(1, 12, 8), new T.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient, emissive: 0xdff0ff, emissiveIntensity: 0.4 }));
    [[-3.7, 3.5, 1.7], [3.9, 3.5, 1.5], [-5.4, 0.6, 1.2], [5.6, 0.8, 1.3]].forEach((o) => {
      const m = pillow.clone();
      const x = end.x + o[0] + end.tz * 0,
        z = end.z + o[1];
      m.position.set(x, gy(x, z) + 0.2, z);
      m.scale.set(o[2] * 1.5, o[2] * 0.8, o[2] * 1.5);
      g.add(m);
    });
    S.built = true;
  };

  /* ---------- every frame (the ride itself is stepped from Unicorn.update) ---------- */
  const _v = new V3();
  S.update = function (dt, t, uni) {
    if (!S.built) return;
    if (uni.rail !== R) uni.rail = R;
    S.cool = Math.max(0, S.cool - dt);
    const here = Realm.inIce;
    if (!here) {
      if (R.active) R.finish(uni, 'left'); // (went through a portal mid-ride)
      return;
    }
    const pd = S.pad;
    // a ride begins when the unicorn rolls onto the glowing pad
    if (!R.active && S.cool <= 0 && uni.grounded) {
      const dx = uni.pos.x - pd.x,
        dz = uni.pos.z - pd.z;
      if (dx * dx + dz * dz < pd.r * pd.r && uni.pos.y > pd.y - 1.5) R.begin(uni);
    }
    // the pad pulses and glitters, and says so the first time you are near
    const near = Math.hypot(uni.pos.x - pd.x, uni.pos.z - pd.z) < 60;
    pd.g.visible = near || R.active;
    if (pd.g.visible) {
      pd.mesh.rotation.z = t * 0.5;
      pd.mesh.material.opacity = 0.7 + 0.3 * Math.sin(t * 2.6);
      S.sparkT = (S.sparkT || 0) - dt;
      if (S.sparkT <= 0 && near) {
        S.sparkT = 0.16;
        const a = Math.random() * TAU,
          r = Math.random() * PAD_R;
        UA.FX.emit({ x: pd.x + Math.cos(a) * r, y: pd.y + 0.5, z: pd.z + Math.sin(a) * r, vx: 0, vy: 2.2 + Math.random(), vz: 0, color: 0xffffff, size: 0.5, shape: 1, life: 1.3, grow: -0.4, twinkle: 9 });
      }
    }
    if (S.tex && near) S.tex.offset.y = (t * 0.06) % 1; // the ice glitters as if it were flowing
    if (!S.told && !R.active && Math.hypot(uni.pos.x - pd.x, uni.pos.z - pd.z) < 16 && uni.pos.y > pd.y - 4 && !(UA.state && UA.state.iceSlides)) {
      S.told = true;
      UA.UI.toast('An ice slide!<small>Ride onto the glowing snowflake to whoosh down the mountain</small>', 4200);
    }
  };
  S.reset = function () {
    S.told = false;
    S.count = 0;
  };
})();
