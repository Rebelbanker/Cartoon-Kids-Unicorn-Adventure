/* Starlight Castle: a second area, far off to the east of the main world (world x about 1500), reached through sparkle
   portals (one in the home meadow, one in Twinkle Town). It has its own lawn, hills and candy mountains, a long Royal Road
   up to a princess castle (castle.js builds the castle itself), flowers, trees and a few residents. Princess Starla lives
   here (princess.js).

   Everything in the realm lives in one Group at (REALM.x, 0, REALM.z), so all coordinates below are "local" (lx, lz)
   unless a name says world. The main world's meshes are hidden while you are here (and the realm's while you are not),
   so the extra area costs nothing when you are elsewhere. The height field itself is in world.js (UA.REALM, heightAt). */
(function () {
  const UA = window.UA,
    C = UA.C,
    T = THREE,
    V3 = T.Vector3;
  const R = UA.REALM,
    GH = R.gh,
    TAU = Math.PI * 2;
  const Realm = (UA.Realm = {
    built: false,
    cur: 'main', // where the unicorn is: 'main' (the home world), 'star' (Starlight Castle) or 'ice' (Frostglow Peak)
    inRealm: false, // in Starlight Castle (the princess code and the castle's own things go by this)
    inIce: false, // on Frostglow Peak
    group: null,
    portals: [],
    homes: [],
    flags: [],
    lamps: [],
    pads: [], // spots the gardens cover with paths, beds, ponds: no grass, flowers or trees there (garden.js adds to it)
    anims: [], // little per-frame functions (spinning things, a swing): (t, dt) => {}
    ponds: [], // garden ponds in world coordinates: the unicorn splashes through them
    clouds: [],
    cd: 0,
    toastCd: 45,
    lastHome: null,
    ROAD_W: 9,
    PLAZA_Z: 82,
    PORTAL_Z: 95,
    ARRIVE: { lx: 0, lz: 80, yaw: Math.PI },
    PRINCESS_HOME: { lx: 0, lz: -22 },
    GATE_HALF: 7.2,
    // Frostglow Peak (ice.js builds it): where you arrive, where the way home stands, where Princess Flurry waits (local coordinates)
    ICE_ARRIVE: { lx: 0, lz: 50, yaw: Math.PI },
    ICE_PORTAL_Z: 64,
    ICE_PRINCESS_HOME: { lx: 5, lz: -96 },
  });
  const nz = UA.makeNoise(C.SEED + 321);

  /* ---------- small helpers (castle.js uses these too) ---------- */
  const trans = (x, y, z) => new T.Matrix4().makeTranslation(x, y, z);
  const rotY = (a) => new T.Matrix4().makeRotationY(a);
  const M = (x, y, z, yaw) => trans(x, y, z).multiply(rotY(yaw || 0));
  Realm.trans = trans;
  Realm.rotY = rotY;
  Realm.M = M;
  Realm.toWorld = (lx, lz, dy) => new V3(R.x + lx, GH + (dy || 0), R.z + lz);
  // distance from (lx, lz) to the capsule's spine (the castle-to-plaza line)
  const segDist = (lx, lz) => Math.hypot(lx, lz - UA.clamp(lz, R.segA, R.segB));
  Realm.segDist = segDist;
  // hard surfaces (the keep, the fountain court, Royal Road, plaza and every garden path, bed and pond): no grass, flowers or
  // trees. m = margin
  function hard(x, z, m) {
    m = m || 0;
    if (Math.abs(x) < 20 + m && z > -58 - m && z < -21 + m) return true; // the keep and its turrets
    if (Math.abs(x) < 6.2 + m && z > -26 - m && z < Realm.PORTAL_Z + 6 + m) return true; // the Royal Road
    if (Math.hypot(x, z + 12) < 11.5 + m) return true; // the fountain court
    if (Math.hypot(x, z - Realm.PLAZA_Z) < 19 + m) return true;
    const P = Realm.pads;
    for (let i = 0; i < P.length; i++) {
      const s = P[i];
      if (s.r !== undefined) {
        if (Math.hypot(x - s.x, z - s.z) < s.r + m) return true;
      } else if (x > s.x0 - m && x < s.x1 + m && z > s.z0 - m && z < s.z1 + m) return true;
    }
    return false;
  }
  Realm.hard = hard;
  // the formal gardens (garden.js): the random trees and meadow flowers keep out of this box, the lawns inside it stay grassy
  const GARDEN = { x0: -63, x1: 63, z0: -102, z1: 10 };
  Realm.inGarden = (x, z, m) => {
    m = m || 0;
    return x > GARDEN.x0 - m && x < GARDEN.x1 + m && z > GARDEN.z0 - m && z < GARDEN.z1 + m;
  };
  // grass.js asks this in world coordinates
  Realm.noGrass = (x, z) => {
    if (x > UA.ICE.x0) return Realm.iceNoGrass ? Realm.iceNoGrass(x - UA.ICE.x, z - UA.ICE.z) : false;
    return hard(x - R.x, z - R.z, 0.5);
  };

  function canvasTex(w, h, draw, rx, ry) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    if (rx) t.repeat.set(rx, ry || rx);
    return t;
  }
  const css = (c) => '#' + c.toString(16).padStart(6, '0');
  Realm.canvasTex = canvasTex;

  /* ---------- terrain ---------- */
  function buildTerrain(g) {
    const W = UA.World;
    const sx = 320,
      sz = 435,
      cz = 27.5;
    const geo = new T.PlaneGeometry(sx, sz, 160, 217);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i),
        lz = pos.getZ(i) + cz;
      pos.setXYZ(i, lx, W.heightAt(R.x + lx, R.z + lz), lz);
    }
    geo.computeVertexNormals();
    const nor = geo.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    const mint = new T.Color(0x8fe6b8),
      lime = new T.Color(0xc3f09a),
      pink = new T.Color(0xffc6e4),
      lav = new T.Color(0xcdb6ff),
      rock = new T.Color(0xbfa4f4),
      white = new T.Color(0xfff6fb),
      snow = new T.Color(0xffe9f4),
      lite = new T.Color(0xe8ffd2),
      tmp = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i);
      const d = segDist(x, z);
      const n1 = nz(x * 0.02, z * 0.02) * 0.5 + 0.5,
        n2 = nz(x * 0.07 + 9, z * 0.07) * 0.5 + 0.5;
      tmp.copy(mint).lerp(lime, UA.smoothstep(0.35, 0.75, n1));
      tmp.lerp(pink, UA.smoothstep(0.6, 0.85, n2) * 0.45);
      // mown stripes on the royal lawns
      const stripe = Math.floor((x + 1000) / 6) % 2;
      if (stripe) tmp.lerp(lite, 0.22 * (1 - UA.smoothstep(40, 70, d)));
      tmp.lerp(lav, UA.smoothstep(11, 26, y) * 0.8);
      if (d > 100) {
        const st = Math.sin(y * 0.55) * 0.5 + 0.5;
        tmp.lerp(st > 0.5 ? white : rock, UA.smoothstep(105, 150, d) * 0.7);
      }
      tmp.lerp(snow, UA.smoothstep(24, 40, y));
      tmp.lerp(rock, UA.smoothstep(0.86, 0.7, nor.getY(i)) * 0.8);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const mesh = new T.Mesh(geo, new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }));
    mesh.frustumCulled = false;
    g.add(mesh);
    Realm.terrain = mesh;
  }

  /* ---------- sky dressing: clouds and a giant rainbow behind the castle ---------- */
  function buildSkyStuff(g) {
    const rnd = UA.rng(C.SEED + 515);
    const mat = new T.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient, emissive: 0xffeef8, emissiveIntensity: 0.55 });
    for (let i = 0; i < 12; i++) {
      const c = new T.Group();
      const n = 5 + Math.floor(rnd() * 4);
      for (let j = 0; j < n; j++) c.add(UA.ball(7 + rnd() * 7, mat, 1.2, 0.8, 1, (j - n / 2) * 8 + rnd() * 3, (rnd() - 0.3) * 4, (rnd() - 0.5) * 6, true));
      const a = rnd() * TAU,
        rr = 50 + rnd() * 200;
      c.position.set(Math.cos(a) * rr, 64 + rnd() * 34, Math.sin(a) * rr);
      c.userData.speed = 0.5 + rnd() * 1.0;
      c.rotation.y = rnd() * 3;
      g.add(c);
      Realm.clouds.push(c);
    }
    // the great rainbow, standing on the mountains behind the castle
    const rb = new T.Group();
    for (let i = 0; i < C.RAINBOW.length; i++) {
      const geo = new T.TorusGeometry(86 + (C.RAINBOW.length - i) * 3.4, 1.9, 8, 72, Math.PI);
      rb.add(new T.Mesh(geo, new T.MeshToonMaterial({ color: C.RAINBOW[i], gradientMap: UA.gradient, emissive: C.RAINBOW[i], emissiveIntensity: 0.3, transparent: true, opacity: 0.88, depthWrite: false })));
    }
    rb.position.set(0, 3, -150);
    g.add(rb);
    // fluffy clouds at its feet
    const cm = new T.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient, emissive: 0xffeef8, emissiveIntensity: 0.5 });
    [-1, 1].forEach((side) => {
      const cg = new T.Group();
      for (let k = 0; k < 6; k++) cg.add(UA.ball(7 + (k % 3) * 1.4, cm, 1.2, 0.85, 1.1, (k - 2.5) * 5, (k % 2) * 1.4, (k % 3) * 1.2, true));
      cg.position.set(side * 108, 10, -150);
      g.add(cg);
    });
    Realm.rainbow = rb;
  }

  /* ---------- flora: lollipop trees, flowers ---------- */
  function buildFlora(g) {
    const W = UA.World;
    const rnd = UA.rng(C.SEED + 4242);
    const tint = (color) => {
      const c = new T.Color(color),
        hsl = {};
      c.getHSL(hsl);
      c.setHSL(hsl.h + (rnd() - 0.5) * 0.03, hsl.s, UA.clamp(hsl.l + (rnd() - 0.5) * 0.08, 0.6, 0.9));
      return c;
    };
    // ---- trees
    const list = [];
    for (let tries = 0; tries < 4000 && list.length < 150; tries++) {
      const lx = (rnd() - 0.5) * 270,
        lz = -130 + rnd() * 310;
      if (segDist(lx, lz) < 19 || hard(lx, lz, 12) || Realm.inGarden(lx, lz, 8)) continue;
      const h = W.heightAt(R.x + lx, R.z + lz);
      if (W.slopeAt(R.x + lx, R.z + lz) > 0.45) continue;
      const dens = nz(lx * 0.03 + 3, lz * 0.03);
      if (dens < -0.1 && rnd() > 0.12) continue;
      if (list.some((o) => Math.hypot(o.x - lx, o.z - lz) < 8)) continue;
      list.push({ x: lx, z: lz, h, s: 0.8 + rnd() * 0.75, rot: rnd() * 6.28, c: UA.pick([0xff9ccb, 0xffb4d8, 0xffc8e6, 0xcfaaff, 0xb4a2ff, 0xffffff, 0xffd0a8, 0xa4d4ff], rnd) });
    }
    const trunkParts = [];
    for (let i = 0; i < 4; i++) {
      const gg = new T.CylinderGeometry(0.3 - i * 0.015, 0.34 - i * 0.015, 0.85, 8);
      gg.translate(0, 0.42 + i * 0.85, 0);
      trunkParts.push({ geo: gg, color: i % 2 ? 0xffc2dc : 0xfff0de });
    }
    const trunkGeo = UA.mergeGeos(trunkParts);
    const sph = new T.IcosahedronGeometry(1, 2),
      sphLow = new T.IcosahedronGeometry(1, 1);
    const mk = (r, x, y, z) => new T.Matrix4().compose(new V3(x, y, z), new T.Quaternion(), new V3(r, r * 0.92, r));
    const crownGeo = UA.mergeGeos([
      { geo: sph, matrix: mk(2.1, 0, 4.9, 0) },
      { geo: sphLow, matrix: mk(1.35, 1.35, 4.2, 0.3) },
      { geo: sphLow, matrix: mk(1.25, -1.2, 4.1, -0.7) },
      { geo: sphLow, matrix: mk(1.1, 0.2, 6.5, 0.2) },
    ]);
    const trunks = new T.InstancedMesh(trunkGeo, new T.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), list.length);
    const crowns = new T.InstancedMesh(crownGeo, UA.addGlow(new T.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient }), 0.3), list.length);
    const _m = new T.Matrix4(),
      _q = new T.Quaternion(),
      _up = new V3(0, 1, 0);
    list.forEach((t, i) => {
      _q.setFromAxisAngle(_up, t.rot);
      _m.compose(new V3(t.x, t.h - 0.1, t.z), _q, new V3(t.s, t.s, t.s));
      trunks.setMatrixAt(i, _m);
      crowns.setMatrixAt(i, _m);
      crowns.setColorAt(i, tint(t.c));
      W.addCollider(R.x + t.x, R.z + t.z, 0.5 * t.s, t.h + 7.8 * t.s);
      W.addBlocker(R.x + t.x, R.z + t.z, 2.4 * t.s, t.h + 2.6 * t.s, t.h + 7.8 * t.s);
    });
    trunks.frustumCulled = crowns.frustumCulled = false;
    g.add(trunks, crowns);
    Realm.treeCount = list.length;

    // ---- flowers
    const stemGeo = new T.CylinderGeometry(0.018, 0.024, 0.5, 4);
    stemGeo.translate(0, 0.25, 0);
    const headGeo = new T.ConeGeometry(0.15, 0.3, 6);
    headGeo.rotateX(Math.PI);
    headGeo.translate(0, 0.62, 0);
    const pts = [];
    for (let tries = 0; tries < 3000 && pts.length < 3200; tries++) {
      const cx = (rnd() - 0.5) * 250,
        cz = -120 + rnd() * 290;
      if (segDist(cx, cz) > 82) continue;
      const nn = nz(cx * 0.045 + 31, cz * 0.045 - 8);
      if (nn < -0.2 && rnd() > 0.15) continue;
      const color = UA.pick([0xff9ec9, 0xffffff, 0xffe27a, 0xc3a4ff, 0x9fd8ff, 0xffb48a, 0xff8fb8], rnd);
      const k = 3 + Math.floor(rnd() * 6);
      for (let j = 0; j < k; j++) {
        const x = cx + (rnd() - 0.5) * 3.4,
          z = cz + (rnd() - 0.5) * 3.4;
        if (hard(x, z, 1.2)) continue;
        const h = W.heightAt(R.x + x, R.z + z);
        if (W.slopeAt(R.x + x, R.z + z) > 0.55) continue;
        pts.push({ x, z, h, s: 0.7 + rnd() * 0.7, rot: rnd() * 6.28, color });
      }
    }
    const stems = new T.InstancedMesh(stemGeo, new T.MeshToonMaterial({ color: 0x8fdca0, gradientMap: UA.gradient }), pts.length);
    const heads = new T.InstancedMesh(headGeo, UA.addGlow(new T.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient }), 1.0), pts.length);
    pts.forEach((p, i) => {
      _q.setFromAxisAngle(_up, p.rot);
      _m.compose(new V3(p.x, p.h - 0.05, p.z), _q, new V3(p.s, p.s, p.s));
      stems.setMatrixAt(i, _m);
      heads.setMatrixAt(i, _m);
      heads.setColorAt(i, new T.Color(p.color));
    });
    stems.frustumCulled = heads.frustumCulled = false;
    stems.userData.noOutline = heads.userData.noOutline = true;
    g.add(stems, heads);
    Realm.flowerCount = pts.length;
  }

  /* ---------- ground decals: Royal Road, courtyard, plaza ---------- */
  function buildDecals(g) {
    const poly = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    const check = (rx, ry) =>
      canvasTex(
        128,
        128,
        (c) => {
          c.fillStyle = '#fff4ec';
          c.fillRect(0, 0, 128, 128);
          c.fillStyle = '#ffcfe4';
          c.fillRect(0, 0, 64, 64);
          c.fillRect(64, 64, 64, 64);
          c.strokeStyle = 'rgba(214,150,190,0.55)';
          c.lineWidth = 3;
          c.strokeRect(1.5, 1.5, 125, 125);
          c.beginPath();
          c.moveTo(64, 0);
          c.lineTo(64, 128);
          c.moveTo(0, 64);
          c.lineTo(128, 64);
          c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.45)';
          c.fillRect(6, 6, 24, 8);
          c.fillRect(70, 70, 24, 8);
        },
        rx,
        ry
      );
    const mkPlane = (w, d, x, z, tex, order) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2), UA.addGlow(new T.MeshToonMaterial(Object.assign({ map: tex, gradientMap: UA.gradient }, poly)), 0.25));
      m.position.set(x, GH + 0.05, z);
      m.renderOrder = order || 1;
      m.userData.noOutline = true;
      g.add(m);
      return m;
    };
    // the Royal Road: pink and cream checks, from the keep door down to the plaza and the portal
    const roadLen = Realm.PORTAL_Z + 4 + 26;
    mkPlane(Realm.ROAD_W, roadLen, 0, (Realm.PORTAL_Z + 4 - 26) / 2, check(Realm.ROAD_W / 4, roadLen / 4));
    // the fountain court: a round checkered floor around the fountain
    const court = new T.Mesh(new T.CircleGeometry(10.5, 48).rotateX(-Math.PI / 2), UA.addGlow(new T.MeshToonMaterial(Object.assign({ map: check(5.25, 5.25), gradientMap: UA.gradient }, poly)), 0.25));
    court.position.set(0, GH + 0.05, -12);
    court.renderOrder = 1;
    court.userData.noOutline = true;
    g.add(court);
    // a red carpet from the gate to the keep door
    const carpet = canvasTex(64, 64, (c) => {
      c.fillStyle = '#ff8fb8';
      c.fillRect(0, 0, 64, 64);
      c.fillStyle = '#ffd45e';
      c.fillRect(0, 0, 6, 64);
      c.fillRect(58, 0, 6, 64);
      c.fillStyle = '#ffb6d2';
      c.fillRect(6, 0, 4, 64);
      c.fillRect(54, 0, 4, 64);
    });
    carpet.repeat.set(1, 2);
    mkPlane(6, 8.4, 0, -21.5, carpet, 3); // from the fountain to the keep door
    mkPlane(6, 12.4, 0, -0.2, carpet, 3); // from the road to the fountain
    // the plaza: a rosette of stars
    const rosette = canvasTex(1024, 1024, (c, w, h) => {
      c.scale(4, 4);
      w = 256;
      h = 256;
      c.fillStyle = '#fff4ec';
      c.fillRect(0, 0, w, h);
      const cx = w / 2,
        cy = h / 2;
      const ring = (r, col) => {
        c.fillStyle = col;
        c.beginPath();
        c.arc(cx, cy, r, 0, TAU);
        c.fill();
      };
      ring(126, '#ffcfe4');
      ring(112, '#fff4ec');
      ring(96, '#e9dcff');
      c.fillStyle = '#ffd45e';
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU - Math.PI / 2,
          rad = i % 2 ? 40 : 88;
        c.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      c.closePath();
      c.fill();
      ring(34, '#ff9ccb');
      ring(18, '#fff4ec');
    });
    rosette.wrapS = rosette.wrapT = T.ClampToEdgeWrapping;
    const pl = new T.Mesh(new T.CircleGeometry(18.5, 48).rotateX(-Math.PI / 2), UA.addGlow(new T.MeshToonMaterial(Object.assign({ map: rosette, gradientMap: UA.gradient, transparent: true, alphaTest: 0.5 }, poly)), 0.25));
    pl.position.set(0, GH + 0.07, Realm.PLAZA_Z);
    pl.renderOrder = 2;
    pl.userData.noOutline = true;
    g.add(pl);
  }

  /* ---------- sparkle portals ---------- */
  const DISC_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
  const DISC_F =
    'uniform float uTime; uniform vec3 uA; uniform vec3 uB; varying vec2 vUv;' +
    'void main(){ vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float a = atan(p.y, p.x);' +
    ' float s = sin(a * 4.0 + r * 11.0 - uTime * 2.6); float s2 = sin(a * 7.0 - r * 17.0 + uTime * 3.4);' +
    ' vec3 col = mix(uA, uB, 0.5 + 0.5 * s);' +
    ' col += (0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + r * 0.5 + uTime * 0.12))) * 0.35 * (0.5 + 0.5 * s2);' +
    ' col += vec3(1.0, 0.97, 0.9) * exp(-r * r * 5.0) * 0.9;' +
    ' col += vec3(1.0) * pow(max(0.0, sin(a * 11.0 + uTime * 5.0 + r * 30.0)), 24.0) * smoothstep(0.1, 0.5, r) * 0.9;' +
    ' float alpha = smoothstep(1.0, 0.82, r) * (0.84 + 0.16 * s);' +
    ' gl_FragColor = linearToOutputTexel(vec4(col, alpha)); }';
  // the icy disc: deep azure and cyan, a six-armed swirl and six white spokes like a snowflake, no rainbow
  const DISC_F_ICE =
    'uniform float uTime; uniform vec3 uA; uniform vec3 uB; varying vec2 vUv;' +
    'void main(){ vec2 p = (vUv - 0.5) * 2.0; float r = length(p); float a = atan(p.y, p.x);' +
    ' float s = sin(a * 6.0 + r * 9.0 - uTime * 2.0); float s2 = sin(a * 12.0 - r * 20.0 + uTime * 3.0);' +
    ' vec3 col = mix(uA, uB, 0.5 + 0.5 * s);' +
    ' col += vec3(0.0, 0.18, 0.45) * (0.5 + 0.5 * s2) * 0.4;' +
    ' col += vec3(0.7, 0.92, 1.0) * pow(max(0.0, cos(a * 6.0 - uTime * 0.6)), 10.0) * smoothstep(0.0, 0.9, r) * 0.55;' +
    ' col += vec3(0.8, 0.95, 1.0) * exp(-r * r * 7.0) * 0.55;' +
    ' col += vec3(1.0) * pow(max(0.0, sin(a * 11.0 + uTime * 4.0 + r * 30.0)), 24.0) * smoothstep(0.1, 0.5, r) * 0.8;' +
    ' float alpha = smoothstep(1.0, 0.82, r) * (0.9 + 0.1 * s);' +
    ' gl_FragColor = linearToOutputTexel(vec4(col, alpha)); }';
  const haloTex = UA.radialTexture('rgba(255,214,250,0.95)', 'rgba(255,214,250,0)', 128);
  const haloTexIce = UA.radialTexture('rgba(110,200,255,0.95)', 'rgba(110,200,255,0)', 128);
  const MAT = {},
    MATI = {};
  function mats(style) {
    if (style === 'ice') {
      if (MATI.gold) return MATI;
      const gl = (c, k, e) => UA.addGlow(new T.MeshToonMaterial({ color: c, gradientMap: UA.gradient, emissive: c, emissiveIntensity: e === undefined ? 0.35 : e }), k);
      MATI.gold = gl(0x9ed8ff, 0.9, 0.5);
      MATI.pinkRing = gl(0x35b4ff, 1.2, 0.6);
      MATI.lilacRing = gl(0x7f9bff, 1.2, 0.55);
      MATI.orb = gl(0x6fe0ff, 2.0, 0.95);
      MATI.cream = UA.addGlow(new T.MeshToonMaterial({ color: 0xa9d6ff, gradientMap: UA.gradient }), 0.3);
      MATI.pink = UA.addGlow(new T.MeshToonMaterial({ color: 0x4fa8ff, gradientMap: UA.gradient }), 0.3);
      MATI.pad = UA.addGlow(new T.MeshToonMaterial({ color: 0xc4e2ff, gradientMap: UA.gradient }), 0.35);
      MATI.snow = UA.addGlow(new T.MeshToonMaterial({ color: 0xf2faff, gradientMap: UA.gradient }), 0.3);
      return MATI;
    }
    if (MAT.gold) return MAT;
    const glowy = (c, k, e) => UA.addGlow(new T.MeshToonMaterial({ color: c, gradientMap: UA.gradient, emissive: c, emissiveIntensity: e === undefined ? 0.35 : e }), k);
    MAT.gold = glowy(0xffd45e, 0.8, 0.4);
    MAT.pinkRing = glowy(0xff9ccb, 1.2, 0.5);
    MAT.lilacRing = glowy(0xc6a8ff, 1.2, 0.5);
    MAT.orb = glowy(0xffb3e0, 2.0, 0.85);
    MAT.cream = UA.addGlow(new T.MeshToonMaterial({ color: 0xfff1f7, gradientMap: UA.gradient }), 0.3);
    MAT.pink = UA.addGlow(new T.MeshToonMaterial({ color: 0xffb3d4, gradientMap: UA.gradient }), 0.3);
    MAT.pad = UA.addGlow(new T.MeshToonMaterial({ color: 0xf2e2ff, gradientMap: UA.gradient }), 0.35);
    return MAT;
  }

  // one portal, in the local frame of `parent` at (x, y, z), its disc facing yaw. tint = [colorA, colorB]
  // opts: { area: where it stands ('main' | 'star' | 'ice'), dest: where it leads, style: 'ice' for the frosty look, ox/oz: the parent's world offset }
  function makePortal(parent, x, y, z, yaw, tint, label, opts) {
    opts = opts || {};
    const ice = opts.style === 'ice';
    const m = mats(ice ? 'ice' : undefined);
    const g = new T.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    parent.add(g);
    const CY = 3.7; // height of the disc's centre
    // ground pad
    const pad = new T.Mesh(new T.CylinderGeometry(7.2, 7.6, 0.6, 36), m.pad);
    pad.position.y = -0.1;
    g.add(pad);
    const padRing = new T.Mesh(new T.CylinderGeometry(5.6, 5.6, 0.12, 36), m.pink);
    padRing.position.y = 0.24;
    g.add(padRing);
    const padCore = new T.Mesh(new T.CylinderGeometry(4.9, 4.9, 0.14, 36), m.cream);
    padCore.position.y = 0.26;
    g.add(padCore);
    // the arch: three rings
    const ring = new T.Mesh(new T.TorusGeometry(3.45, 0.34, 12, 56), m.gold);
    ring.position.y = CY;
    g.add(ring);
    const ring2 = new T.Mesh(new T.TorusGeometry(3.05, 0.1, 8, 56), m.pinkRing);
    ring2.position.y = CY;
    g.add(ring2);
    const ring3 = new T.Mesh(new T.TorusGeometry(3.9, 0.13, 8, 56), m.lilacRing);
    ring3.position.y = CY;
    g.add(ring3);
    // pillars with glowing orbs
    for (const sx of [-1, 1]) {
      const px = sx * 4.9;
      const col = new T.Mesh(new T.CylinderGeometry(0.52, 0.66, 6.2, ice ? 6 : 12), m.cream);
      col.position.set(px, 3.1, 0);
      g.add(col);
      for (let k = 0; k < 3; k++) {
        const band = new T.Mesh(new T.CylinderGeometry(0.6 - k * 0.02, 0.6 - k * 0.02, 0.42, ice ? 6 : 12), m.pink);
        band.position.set(px, 1.1 + k * 1.9, 0);
        g.add(band);
      }
      const cap = new T.Mesh(new T.CylinderGeometry(0.85, 0.6, 0.45, 12), m.gold);
      cap.position.set(px, 6.3, 0);
      g.add(cap);
      const orb = UA.ball(0.8, m.orb, 1, 1, 1, px, 7.2, 0);
      orb.userData.noOutline = true;
      g.add(orb);
      const halo = new T.Sprite(new T.SpriteMaterial({ map: ice ? haloTexIce : haloTex, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7, fog: false }));
      halo.scale.set(5.5, 5.5, 1);
      halo.position.set(px, 7.2, 0);
      g.add(halo);
    }
    // the swirling disc and a soft glow behind it
    const mat = new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uA: { value: new T.Color(ice ? 0x1f6dff : tint[0]) }, uB: { value: new T.Color(ice ? 0x7fe0ff : tint[1]) } },
      vertexShader: DISC_V,
      fragmentShader: ice ? DISC_F_ICE : DISC_F,
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      fog: false,
    });
    const disc = new T.Mesh(new T.CircleGeometry(3.1, 56), mat);
    disc.position.y = CY;
    disc.renderOrder = 4;
    g.add(disc);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: ice ? haloTexIce : haloTex, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.55, fog: false }));
    glow.scale.set(14, 14, 1);
    glow.position.set(0, CY, -0.4);
    glow.renderOrder = 3;
    g.add(glow);
    if (ice) {
      // a ring of ice crystals round the edge of the pad, and a snow drift on each pillar's foot
      const cg = new T.ConeGeometry(0.42, 1.0, 6);
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU + 0.2;
        if (Math.abs(Math.cos(a)) < 0.2 && Math.sin(a) > 0) continue; // keep the front open to ride in
        const rr = 6.9 + (k % 3) * 0.25;
        const cr = new T.Mesh(cg, k % 2 ? m.gold : m.pinkRing);
        const h = 1.2 + (k % 4) * 0.55;
        cr.scale.set(1 + (k % 3) * 0.15, h, 1 + (k % 3) * 0.15);
        cr.position.set(Math.cos(a) * rr, 0.2 + h * 0.5, Math.sin(a) * rr);
        cr.rotation.z = -Math.cos(a) * 0.25;
        cr.rotation.x = Math.sin(a) * 0.25;
        g.add(cr);
      }
      for (const sx of [-1, 1]) {
        const dr = UA.ball(1, m.snow, 1.5, 0.55, 1.5, sx * 4.9, 0.4, 0);
        g.add(dr);
      }
      // a crown of ice crystals round the top of the arch, and a snowflake on each pillar
      const spike = new T.ConeGeometry(0.34, 1.7, 6);
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * (0.12 + (k / 8) * 0.76);
        const sp = new T.Mesh(spike, k % 2 ? m.pink : m.gold);
        sp.position.set(Math.cos(a) * 4.15, CY + Math.sin(a) * 4.15, 0);
        sp.rotation.z = a - Math.PI / 2;
        sp.scale.set(1, k % 2 ? 0.8 : 1.25, 1);
        g.add(sp);
      }
    }
    // little stars circling the ring
    const orbit = new T.Group();
    orbit.position.y = CY;
    g.add(orbit);
    const starGeo = new T.OctahedronGeometry(0.34, 0);
    const stars = [];
    for (let k = 0; k < 8; k++) {
      const s = new T.Mesh(starGeo, k % 2 ? m.gold : m.pinkRing);
      const a = (k / 8) * TAU;
      s.position.set(Math.cos(a) * 4.45, Math.sin(a) * 4.45, 0);
      s.scale.set(1, 1.5, 0.6);
      s.userData.noOutline = true;
      orbit.add(s);
      stars.push(s);
    }
    const wx = (opts.ox || 0) + x,
      wz = (opts.oz || 0) + z;
    for (const sx of [-1, 1]) UA.World.addCollider(wx + Math.cos(yaw) * sx * 4.9, wz - Math.sin(yaw) * sx * 4.9, 0.85, y + 7.5);
    const p = { g, disc, mat, orbit, stars, halo: glow, wx, wz, y, yaw, nx: Math.sin(yaw), nz: Math.cos(yaw), area: opts.area || 'main', dest: opts.dest || 'star', label, tint, ph: Math.random() * 6, ice };
    p.realm = p.area !== 'main'; // (old name: standing in a realm)
    Realm.portals.push(p);
    return p;
  }

  Realm.makePortal = makePortal;

  // find a flat, empty spot near (tx, tz) in the main world for a portal (and its pad)
  function findSpot(tx, tz, maxR, onlyTown, accept) {
    const W = UA.World;
    const flat = (x, z) => {
      const h0 = W.heightAt(x, z);
      if (h0 < 1.8) return false;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        if (Math.abs(W.heightAt(x + Math.cos(a) * 7, z + Math.sin(a) * 7) - h0) > 0.85) return false;
      }
      return true;
    };
    const free = (x, z) => {
      for (const c of W.colliders) if (Math.hypot(c.x - x, c.z - z) < c.r + 7.6) return false;
      for (const b of W.bushes) if (Math.hypot(b.x - x, b.z - z) < 8) return false;
      if (UA.Wonders) {
        for (const r of UA.Wonders.rings || []) if (Math.hypot(r.x - x, r.z - z) < 12) return false;
        const f = UA.Wonders.fountain;
        if (f && Math.hypot(f.x - x, f.z - z) < 14) return false;
      }
      return true;
    };
    for (let rad = 0; rad <= maxR; rad += 1.5) {
      const n = Math.max(1, Math.round(rad * 1.2));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + rad;
        const x = tx + Math.cos(a) * rad,
          z = tz + Math.sin(a) * rad;
        if (!onlyTown && W.inTown(x, z, 8)) continue;
        if (accept && !accept(x, z)) continue;
        if (flat(x, z) && free(x, z)) return [x, z];
      }
    }
    return null;
  }

  function buildHomePortals(scene) {
    const W = UA.World;
    // the disc looks toward (face); `def.dest` says where it leads
    const place = (def, sp) => {
      if (!sp) return null;
      const h = W.heightAt(sp[0], sp[1]);
      const yaw = Math.atan2(def.face[0] - sp[0], def.face[1] - sp[1]);
      const p = makePortal(scene, sp[0], h, sp[1], yaw, def.tint, def.name, { area: 'main', dest: def.dest, style: def.style });
      p.exit = { x: sp[0] + p.nx * 9, z: sp[1] + p.nz * 9, yaw };
      p.home = def.name;
      p.g.visible = true;
      Realm.homes.push(p);
      return p;
    };
    // not on the straight line from the start to the rainbow arch, or riding off ahead would whisk you away by accident
    const okMeadow = (x, z) => Math.abs(x) > 15 && z < 4 && z > -50;
    // portals stand well apart, so you always know which one you are riding into
    const apart = (x, z) => Realm.homes.every((h) => Math.hypot(h.wx - x, h.wz - z) > 22);
    // the first spot that works from a list of [x, z, search radius] tries
    const firstSpot = (tries, accept, onlyTown) => {
      for (const t of tries) {
        const sp = findSpot(t[0], t[1], t[2], !!onlyTown, (x, z) => (!accept || accept(x, z)) && apart(x, z));
        if (sp) return sp;
      }
      return null;
    };
    // the home meadow: just the icy portal, out in front of the start on the left (Starlight's portals are in Twinkle Town; the
    // meadow's own sparkle portal was taken out on 10 Nov, to bring it back add a 'star' place() here)
    place(
      { name: 'Sparkle Meadow', dest: 'ice', style: 'ice', tint: [0x7fdcff, 0xf0fbff], face: [0, 0] },
      firstSpot([[-20, -24, 30], [22, -30, 30], [30, -14, 45], [24, -40, 45], [-40, -22, 45], [-22, -34, 40]], okMeadow)
    );
    // Twinkle Town: Starlight on the lawn just inside the east gate, the icy one on the other side of the gate
    const Tn = UA.TOWN;
    const town = (cands) => {
      for (const c of cands) {
        const sp = findSpot(c[0], c[1], 5, true, apart);
        if (sp && W.inTown(sp[0], sp[1], 2)) return sp;
      }
      return null;
    };
    place(
      { name: 'Twinkle Town', dest: 'star', tint: [0xffd45e, 0x8fe8d4], face: [Tn.ox + 20, Tn.oz] },
      town([
        [Tn.ox + 38, Tn.oz + 19],
        [Tn.ox + 38, Tn.oz - 19],
        [Tn.ox + 50, Tn.oz + 14],
        [Tn.ox - 18, Tn.oz + 22],
        [Tn.ox - 18, Tn.oz - 22],
      ])
    );
    place(
      { name: 'Twinkle Town', dest: 'ice', style: 'ice', tint: [0x8fe8ff, 0xe8f4ff], face: [Tn.ox + 20, Tn.oz] },
      town([
        [Tn.ox + 38, Tn.oz - 19],
        [Tn.ox + 50, Tn.oz - 14],
        [Tn.ox + 38, Tn.oz + 19],
        [Tn.ox - 18, Tn.oz - 22],
        [Tn.ox - 18, Tn.oz + 22],
        [Tn.ox - 4, Tn.oz - 27],
        [Tn.ox + 10, Tn.oz + 27],
      ])
    );
    Realm.homes.forEach((p) => UA.Grass && UA.Grass.clear && UA.Grass.clear.push({ x: p.wx, z: p.wz, r: 7.4 }));
    if (UA.Grass && UA.Grass.refresh) UA.Grass.refresh();
  }

  /* ---------- going through ---------- */
  // area: 'main' | 'star' | 'ice'. Only the area you are in is drawn (the others cost nothing)
  Realm.setArea = function (name) {
    if (name === Realm.cur) return;
    Realm.cur = name;
    Realm.inRealm = name === 'star';
    Realm.inIce = name === 'ice';
    Realm.group.visible = name === 'star';
    if (Realm.ice && Realm.ice.group) Realm.ice.group.visible = name === 'ice';
    const main = name === 'main';
    for (const m of UA.mainWorld || []) {
      if (!main) {
        if (m.userData._hid !== true) m.userData._vis = m.visible;
        m.userData._hid = true;
        m.visible = false;
      } else {
        m.userData._hid = false;
        m.visible = m.userData._vis !== false;
      }
    }
    for (const p of Realm.homes) p.g.visible = main;
    if (UA.Time && UA.Time.setArea) UA.Time.setArea(name);
    if (UA.Grass && UA.Grass.refresh) UA.Grass.refresh();
  };
  Realm.setIn = (v) => Realm.setArea(v ? 'star' : 'main'); // (the old two-world switch)

  Realm.go = function (portal, uni, ctx) {
    const dest = portal.dest || 'star';
    Realm.cd = 3;
    const fx = UA.FX;
    fx.burst(new V3(uni.pos.x, uni.pos.y + 1.6, uni.pos.z), 46);
    UA.Audio.portal();
    UA.UI.flash();
    if (dest === 'star') {
      Realm.lastHome = portal;
      Realm.setArea('star');
      uni.teleport(R.x + Realm.ARRIVE.lx, R.z + Realm.ARRIVE.lz, Realm.ARRIVE.yaw);
      UA.state.realmVisits = (UA.state.realmVisits || 0) + 1;
    } else if (dest === 'ice') {
      Realm.lastHome = portal;
      Realm.setArea('ice');
      const A = Realm.ICE_ARRIVE;
      uni.teleport(UA.ICE.x + A.lx, UA.ICE.z + A.lz, A.yaw);
      UA.state.iceVisits = (UA.state.iceVisits || 0) + 1;
      if (UA.IceGuides) UA.IceGuides.reset(); // the trail guides are back at their posts, ready to lead the climb
      if (UA.IceSlide) UA.IceSlide.reset();
    } else {
      const h = Realm.lastHome || Realm.homes.find((p) => p.dest === Realm.cur) || Realm.homes[0];
      Realm.setArea('main');
      if (h) uni.teleport(h.exit.x, h.exit.z, h.exit.yaw);
      else uni.teleport(0, 0, Math.PI);
    }
    if (ctx && ctx.chase) {
      ctx.chase.snap(uni);
      ctx.chase.yaw = uni.yaw;
    }
    // friends who tag along come through too
    const Cr = UA.Creatures;
    if (Cr && Cr.list) {
      Cr.list
        .filter((c) => c.follow)
        .forEach((c) => {
          const back = 4 + c.slot * 3.4,
            ang = uni.yaw + Math.PI + (c.slot % 2 ? 0.5 : -0.5);
          c.pos.set(uni.pos.x + Math.sin(ang) * back, uni.pos.y, uni.pos.z + Math.cos(ang) * back);
          c.pos.y = UA.World.groundAt(c.pos.x, c.pos.z);
          c.vel = 0;
          c.far = false;
          c.group.visible = c.shadow.visible = true;
          c.state = 'idle';
        });
    }
    if (UA.Princess && UA.Princess.onPortal) UA.Princess.onPortal(uni);
    if (UA.IcePrincess && UA.IcePrincess.onPortal) UA.IcePrincess.onPortal(uni);
    fx.burst(new V3(uni.pos.x, uni.pos.y + 1.6, uni.pos.z), 46);
    if (dest === 'star') UA.UI.toast('Starlight Castle<small>Follow the Royal Road to meet the princess</small>', 4600);
    else if (dest === 'ice') UA.UI.toast('Frostglow Peak<small>Ride up the icy road to meet Princess Flurry</small>', 4800);
    else UA.UI.toast('Welcome back!<small>' + (Realm.lastHome ? Realm.lastHome.home : 'Home') + '</small>', 2600);
    if (UA.refreshHUD) UA.refreshHUD();
  };

  /* ---------- build ---------- */
  Realm.build = function (scene) {
    if (Realm.built) return;
    Realm.built = true;
    const g = (Realm.group = new T.Group());
    g.position.set(R.x, 0, R.z);
    g.visible = false;
    scene.add(g);
    buildTerrain(g);
    buildSkyStuff(g);
    buildDecals(g);
    if (Realm.buildCastle) Realm.buildCastle(g);
    buildFlora(g);
    // the way home
    const ret = makePortal(g, 0, GH, Realm.PORTAL_Z, 0, [0xb394ff, 0xff9ccb], 'Back home', { area: 'star', dest: 'main', ox: R.x, oz: R.z });
    ret.g.visible = true;
    if (Realm.buildIce) Realm.buildIce(scene); // Frostglow Peak (ice.js): its own group, hidden until you go there
    buildHomePortals(scene);
    // residents
    if (UA.Creatures && UA.Creatures.addRealm) UA.Creatures.addRealm(scene, Realm);
    if (UA.Creatures && UA.Creatures.addIce) UA.Creatures.addIce(scene, Realm); // ... and for Frostglow Peak
    // the realm's residents did not exist yet when main.js restored the saved friendships: restore theirs now
    if (UA.Creatures && UA.Creatures.load && UA.state) UA.Creatures.load(UA.state.bonds);
    // halo for the lamps (additive points, fade in at dusk)
    const pts = Realm.lamps;
    const pos = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => pos.set([p.x, p.y, p.z], i * 3));
    const hg = new T.BufferGeometry();
    hg.setAttribute('position', new T.BufferAttribute(pos, 3));
    const hm = new T.PointsMaterial({ map: UA.radialTexture('rgba(255,236,170,1)', 'rgba(255,236,170,0)', 64), size: 3.4, sizeAttenuation: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
    const hp = new T.Points(hg, hm);
    hp.frustumCulled = false;
    hp.renderOrder = 3;
    g.add(hp);
    Realm.halo = hm;
    Realm.setArea('main');
  };

  /* ---------- every frame ---------- */
  const _v = new V3();
  Realm.update = function (dt, t, uni, ctx) {
    if (!Realm.built) return;
    Realm.cd = Math.max(0, Realm.cd - dt);
    Realm.toastCd = Math.max(0, Realm.toastCd - dt);
    const night = UA.Time ? UA.Time.night : 0;
    for (const p of Realm.portals) {
      if (p.area !== Realm.cur) continue;
      const dx = uni.pos.x - p.wx,
        dz = uni.pos.z - p.wz;
      const d = Math.hypot(dx, dz);
      p.mat.uniforms.uTime.value = t + p.ph;
      p.orbit.rotation.z = t * 0.7 + p.ph;
      p.stars.forEach((s, i) => (s.rotation.y = t * 2 + i));
      const pulse = 1 + Math.sin(t * 2 + p.ph) * 0.05;
      p.halo.scale.set(14 * pulse, 14 * pulse, 1);
      if (d > 120) continue;
      // sparkles drifting off the ring
      if (Math.random() < dt * 22) {
        const a = Math.random() * TAU;
        const rr = 3.1 + Math.random() * 0.7;
        const lx = Math.cos(a) * rr;
        _v.set(p.wx + (lx * Math.cos(p.yaw)), p.y + 3.7 + Math.sin(a) * rr, p.wz - lx * Math.sin(p.yaw));
        UA.FX.emit({ x: _v.x, y: _v.y, z: _v.z, vx: (Math.random() - 0.5) * 0.8, vy: 0.5 + Math.random() * 1.4, vz: (Math.random() - 0.5) * 0.8, color: Math.random() < 0.5 ? p.tint[Math.random() < 0.5 ? 0 : 1] : 0xffffff, size: 0.4 + Math.random() * 0.3, shape: 1, life: 1.2 + Math.random() * 0.8, grow: -0.5, gravity: -0.3, drag: 0.6, twinkle: 6 });
      }
      // a little invitation the first few times you wander near one
      if (p.area === 'main' && d < 15 && Realm.toastCd <= 0 && Realm.cd <= 0) {
        if (p.dest === 'star' && (UA.state.realmVisits || 0) < 1) {
          Realm.toastCd = 60;
          UA.UI.toast('A sparkle portal!<small>Ride through it to visit a princess castle</small>', 4200);
        } else if (p.dest === 'ice' && (UA.state.iceVisits || 0) < 1) {
          Realm.toastCd = 60;
          UA.UI.toast('An icy portal!<small>Ride through it to visit a snowy mountain</small>', 4200);
        }
      }
      // through the disc?
      if (Realm.cd <= 0 && d < 6) {
        const along = dx * p.nx + dz * p.nz,
          across = dx * p.nz - dz * p.nx;
        if (Math.abs(along) < 1.7 && Math.abs(across) < 3.4 && uni.pos.y - p.y < 6.2 && uni.pos.y - p.y > -1) {
          Realm.go(p, uni, ctx);
          return;
        }
      }
    }
    if (Realm.cur === 'ice') {
      if (Realm.updateIce) Realm.updateIce(dt, t, uni, ctx);
      return;
    }
    if (!Realm.inRealm) return;
    // flags
    for (const f of Realm.flags) f.m.rotation.y = f.base + Math.sin(t * 2.6 + f.ph) * 0.28;
    for (const c of Realm.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 300) c.position.x = -300;
    }
    for (const f of Realm.anims) f(t, dt, uni);
    if (Realm.halo) Realm.halo.opacity = UA.clamp(night * 1.1, 0, 0.95);
    // courtyard fountain
    const f = Realm.fountain;
    if (f) {
      const d = Math.hypot(uni.pos.x - f.x, uni.pos.z - f.z);
      if (d < 70) {
        f.acc = (f.acc || 0) + dt * 20;
        while (f.acc > 1) {
          f.acc -= 1;
          const a = Math.random() * TAU,
            sp = 1.2 + Math.random() * 1.5;
          UA.FX.emit({ x: f.x + Math.cos(a) * 0.2, y: f.y + 2.4, z: f.z + Math.sin(a) * 0.2, vx: Math.cos(a) * sp, vy: 5 + Math.random() * 1.4, vz: Math.sin(a) * sp, color: Math.random() < 0.3 ? 0xffffff : 0xb4e4ff, size: 0.2 + Math.random() * 0.12, shape: 0, life: 1.1, grow: 0, gravity: 9.5, drag: 0.05, glow: 0.4 });
        }
      }
    }
    if (Realm.starTop) Realm.starTop.rotation.y = t * 1.2;
    // a drift of pixie dust around you
    Realm.dustT = (Realm.dustT || 0) - dt;
    if (Realm.dustT <= 0) {
      Realm.dustT = 0.16;
      const a = Math.random() * TAU,
        rr = 4 + Math.random() * 20;
      UA.FX.emit({ x: uni.pos.x + Math.cos(a) * rr, y: uni.pos.y + 0.5 + Math.random() * 7, z: uni.pos.z + Math.sin(a) * rr, vx: (Math.random() - 0.5) * 0.5, vy: 0.3 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.5, color: UA.pick(C.RAINBOW), size: 0.28 + Math.random() * 0.25, shape: 1, life: 1.6 + Math.random(), grow: -0.3, gravity: -0.1, drag: 0.5, twinkle: 5 });
    }
  };
})();
