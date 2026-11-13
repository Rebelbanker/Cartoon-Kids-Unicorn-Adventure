/* World: terrain, sky, water, trees, mushrooms, flowers, clouds, rainbow arch, gumdrop bushes */
(function () {
  const UA = window.UA,
    C = UA.C;
  const noiseA = UA.makeNoise(C.SEED);
  const noiseB = UA.makeNoise(C.SEED + 99);

  function fbm(x, z, oct) {
    let a = 1,
      f = 1,
      s = 0,
      n = 0;
    for (let i = 0; i < oct; i++) {
      s += noiseA(x * f, z * f) * a;
      n += a;
      a *= 0.5;
      f *= 2.03;
    }
    return s / n;
  }

  // Twinkle Town: a flat pad in Minty Meadows, just west of the starting meadow. Town space runs along +x (u) and +z (v)
  const TOWN = (UA.TOWN = { ox: -79, oz: -14, H: 4.2, u0: -66, u1: 54, hv: 30, blend: 26 });

  const PONDS = [
    { x: 62, z: -38, r: 13 },
    { x: -88, z: 52, r: 17 },
    { x: 34, z: 112, r: 12 },
    { x: -46, z: -118, r: 15 },
    { x: 128, z: 70, r: 11 },
  ];

  function heightAt(x, z) {
    const r = Math.sqrt(x * x + z * z);
    let h = fbm(x * 0.0075, z * 0.0075, 4) * 17 + fbm(x * 0.03 + 17, z * 0.03 - 5, 2) * 1.5 + 5.0;
    // gentle flat meadow around the start
    const f = UA.smoothstep(8, 58, r);
    h = UA.lerp(3.2 + fbm(x * 0.05, z * 0.05, 2) * 0.45, h, f);
    // compress lowlands so natural puddles do not appear
    if (h < 2.2) h = 2.2 + (h - 2.2) * 0.1;
    // ponds carve a soft bowl
    for (let i = 0; i < PONDS.length; i++) {
      const p = PONDS[i];
      const d = Math.hypot(x - p.x, z - p.z) / (p.r * 1.9);
      if (d < 1) {
        const t = 1 - d;
        const s = t * t * (3 - 2 * t);
        h = UA.lerp(h, -1.5, Math.min(1, s * 1.4));
      }
    }
    // the town sits on a flat pad that blends back into the hills
    {
      const du = Math.max(TOWN.ox + TOWN.u0 - x, x - (TOWN.ox + TOWN.u1), 0),
        dv = Math.max(Math.abs(z - TOWN.oz) - TOWN.hv, 0);
      const d = Math.hypot(du, dv);
      if (d < TOWN.blend) h = UA.lerp(TOWN.H, h, UA.smoothstep(0, TOWN.blend, d));
    }
    // candy mountain ring at the edge of the world
    const m = UA.smoothstep(150, 208, r);
    h += m * m * (30 + 26 * (fbm(x * 0.02, z * 0.02 + 40, 3) * 0.5 + 0.5)); // cartoon mountains: low enough that the sky shows above them
    return h;
  }

  /* ---------- regions: four named zones around a mixed starting meadow ---------- */
  const REGIONS = [
    { name: 'Rose Grove', note: 'Pink blossoms everywhere', tint: 0xffb4d8, trees: [0xff9ccb, 0xff8fb8, 0xffbe96, 0xffa6cf], flowers: [0xff9ec9, 0xffffff, 0xffb48a] },
    { name: 'Minty Meadows', note: 'Cool and calm and green', tint: 0x82e0b6, trees: [0x9fe8c4, 0x86e0bc, 0x9edfec, 0xb8ee96], flowers: [0xffffff, 0x9fd8ff, 0xffe27a] },
    { name: 'Lilac Hills', note: 'Soft purple hills', tint: 0xbfa9ff, trees: [0xcfaaff, 0xb4a2ff, 0xa4d4ff, 0xc2b8ff], flowers: [0xc3a4ff, 0x9fd8ff, 0xffffff] },
    { name: 'Sunny Glades', note: 'Golden and warm', tint: 0xfff07a, trees: [0xffe97a, 0xffd466, 0xffc896, 0xffdc8f], flowers: [0xffe27a, 0xffb48a, 0xff9ec9] },
  ];
  const HOME = { name: 'Sparkle Meadow', note: 'Home sweet home' };
  function regionWeights(x, z) {
    const a = noiseB(x * 0.0065 + 50, z * 0.0065);
    const b = noiseB(x * 0.0065 - 70, z * 0.0065 + 30);
    const wa = UA.smoothstep(-0.1, 0.1, a),
      wb = UA.smoothstep(-0.1, 0.1, b);
    return [wa * wb, wa * (1 - wb), (1 - wa) * wb, (1 - wa) * (1 - wb)];
  }
  function regionIndex(x, z) {
    if (Math.hypot(x, z) < 48) return -1;
    const w = regionWeights(x, z);
    let bi = 0;
    for (let i = 1; i < 4; i++) if (w[i] > w[bi]) bi = i;
    return bi;
  }

  const World = (UA.World = {
    regions: REGIONS,
    regionIndex,
    regionWeights,
    regionInfo(x, z) {
      const i = regionIndex(x, z);
      return i < 0 ? HOME : REGIONS[i];
    },
    heightAt,
    // is (x, z) inside the town's flat pad (plus a margin)? Used to keep trees, grass and wild creatures out of town
    inTown(x, z, m) {
      m = m || 0;
      return x > TOWN.ox + TOWN.u0 - m && x < TOWN.ox + TOWN.u1 + m && Math.abs(z - TOWN.oz) < TOWN.hv + m;
    },
    ponds: PONDS,
    waterY: C.WATER_Y,
    groundAt(x, z) {
      return Math.max(heightAt(x, z), C.WATER_Y - 0.35);
    },
    slopeAt(x, z) {
      const e = 1.2;
      const dx = heightAt(x + e, z) - heightAt(x - e, z);
      const dz = heightAt(x, z + e) - heightAt(x, z - e);
      return Math.sqrt(dx * dx + dz * dz) / (2 * e);
    },
    inWater(x, z) {
      return heightAt(x, z) < C.WATER_Y - 0.05;
    },
    bushes: [],
    colliders: [],
    _grid: new Map(),
    blockers: [],
    _bgrid: new Map(),
    clouds: [],
  });

  /* ---------- collisions ---------- */
  const CELL = 8;
  // bld: a big solid thing (town building, tower, stall) that blocks at any height, not just near the ground
  function addCollider(x, z, r, y1, bld) {
    const c = { x, z, r, y1: y1 === undefined ? Infinity : y1, bld: !!bld };
    World.colliders.push(c);
    const key = Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
    let arr = World._grid.get(key);
    if (!arr) World._grid.set(key, (arr = []));
    arr.push(c);
  }
  World.addCollider = addCollider;
  World.addBlocker = addBlocker;
  // camera blockers: big round things (tree crowns, mushroom caps) the camera should not sit inside
  function addBlocker(x, z, r, y0, y1) {
    const b = { x, z, r, y0, y1 };
    World.blockers.push(b);
    const key = Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
    let arr = World._bgrid.get(key);
    if (!arr) World._bgrid.set(key, (arr = []));
    arr.push(b);
  }
  // returns the fraction (0..1] of the segment A->B that is free of blockers
  World.camClip = function (ax, ay, az, bx, by, bz) {
    let best = 1;
    const x0 = Math.floor(Math.min(ax, bx) / CELL) - 1,
      x1 = Math.floor(Math.max(ax, bx) / CELL) + 1,
      z0 = Math.floor(Math.min(az, bz) / CELL) - 1,
      z1 = Math.floor(Math.max(az, bz) / CELL) + 1;
    const dx = bx - ax,
      dz = bz - az,
      dy = by - ay;
    const a2 = dx * dx + dz * dz;
    if (a2 < 1e-6) return 1;
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const arr = World._bgrid.get(ix + ',' + iz);
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const c = arr[i];
          const fx = ax - c.x,
            fz = az - c.z;
          if (fx * fx + fz * fz < c.r * c.r) continue; // target already inside
          const b2 = 2 * (fx * dx + fz * dz);
          const cc = fx * fx + fz * fz - c.r * c.r;
          const disc = b2 * b2 - 4 * a2 * cc;
          if (disc < 0) continue;
          const t = (-b2 - Math.sqrt(disc)) / (2 * a2);
          if (t < 0 || t > best) continue;
          const y = ay + dy * t;
          if (y > c.y0 - 0.8 && y < c.y1 + 0.8) best = t;
        }
      }
    }
    return best;
  };

  // push position out of nearby colliders; returns true if something was hit.
  // low === false: only the big solid things (bld) count, which is how the unicorn is kept out of walls while flying
  // over === true: the caller is on top of a roof or awning, so the bld colliders under it are skipped
  World.resolve = function (pos, rad, y, low, over) {
    let hit = false;
    const cx = Math.floor(pos.x / CELL),
      cz = Math.floor(pos.z / CELL);
    for (let ix = cx - 1; ix <= cx + 1; ix++) {
      for (let iz = cz - 1; iz <= cz + 1; iz++) {
        const arr = World._grid.get(ix + ',' + iz);
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const c = arr[i];
          if (y !== undefined && y > c.y1) continue; // flying above it
          if (low === false && !c.bld) continue;
          if (over && c.bld) continue;
          const dx = pos.x - c.x,
            dz = pos.z - c.z;
          const min = rad + c.r;
          const d2 = dx * dx + dz * dz;
          if (d2 < min * min && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            pos.x = c.x + (dx / d) * min;
            pos.z = c.z + (dz / d) * min;
            hit = true;
          }
        }
      }
    }
    return hit;
  };

  /* ---------- sky ---------- */
  function buildSky(scene) {
    const geo = new THREE.SphereGeometry(900, 24, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: new THREE.Color(C.SKY_TOP) },
        mid: { value: new THREE.Color(C.SKY_MID) },
        hor: { value: new THREE.Color(C.SKY_HORIZON) },
        uNight: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform float uNight; uniform float uTime; varying vec3 vDir;' +
        'float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }' +
        'void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0); vec3 c = mix(hor, mid, smoothstep(0.0, 0.09, h)); c = mix(c, top, smoothstep(0.05, 0.34, h));' +
        'if (uNight > 0.01) { float up = smoothstep(0.03, 0.3, d.y);' +
        ' vec3 sp = d * 95.0; vec3 id = floor(sp); vec3 f = fract(sp) - 0.5; float r = hash13(id);' +
        ' float s1 = step(0.93, r) * smoothstep(0.34, 0.0, length(f)) * (0.55 + 0.45 * sin(uTime * (1.5 + r * 3.0) + r * 40.0));' +
        ' vec3 sp2 = d * 38.0; vec3 id2 = floor(sp2); vec3 f2 = fract(sp2) - 0.5; float r2 = hash13(id2 + 7.0);' +
        ' float s2 = step(0.965, r2) * smoothstep(0.3, 0.0, length(f2)) * (0.6 + 0.4 * sin(uTime * (1.0 + r2 * 2.0) + r2 * 30.0));' +
        ' c += vec3(1.0, 0.95, 0.9) * (s1 * 0.9 + s2 * 1.4) * up * uNight;' +
        ' float ay = smoothstep(0.16, 0.4, d.y) * smoothstep(0.85, 0.5, d.y);' +
        ' float w = sin(d.x * 4.2 + sin(d.z * 3.0 + uTime * 0.15) * 1.6 + uTime * 0.12);' +
        ' vec3 ac = 0.55 + 0.45 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + d.x * 0.9 + uTime * 0.02));' +
        ' c += ac * pow(0.5 + 0.5 * w, 3.0) * ay * 0.3 * uNight; }' +
        'gl_FragColor = linearToOutputTexel(vec4(c, 1.0)); }',
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    scene.add(sky);
    World.sky = sky;

    // soft sun
    const tex = UA.radialTexture('rgba(255,255,255,1)', 'rgba(255,240,200,0)', 256);
    const sunMat = new THREE.SpriteMaterial({ map: tex, color: 0xfff3c8, fog: false, depthWrite: false, transparent: true });
    const sun = new THREE.Sprite(sunMat);
    sun.scale.set(360, 360, 1);
    sun.renderOrder = -9;
    World.sunDir = new THREE.Vector3(0.45, 0.55, -0.7).normalize();
    World.sun = sun;
    scene.add(sun);
  }

  /* ---------- terrain ---------- */
  function buildTerrain(scene) {
    const size = (C.WORLD_R + 12) * 2;
    const seg = 220;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
    const nor = geo.attributes.normal;
    const col = new Float32Array(pos.count * 3);

    const regionTints = REGIONS.map((r) => new THREE.Color(r.tint));
    const mint = new THREE.Color(0x86e2b4),
      lime = new THREE.Color(0xb9f08c),
      aqua = new THREE.Color(0xa2e8ec),
      pinkMeadow = new THREE.Color(0xffc0e2),
      sand = new THREE.Color(0xffe8bf),
      bed = new THREE.Color(0xf0bcd9),
      lav = new THREE.Color(0xc4aeff),
      snow = new THREE.Color(0xffe9f4),
      rock = new THREE.Color(0xbfa4f4),
      white = new THREE.Color(0xfff6fb),
      tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i);
      const ny = nor.getY(i);
      const n1 = noiseB(x * 0.018, z * 0.018) * 0.5 + 0.5;
      const n2 = noiseB(x * 0.07 + 9, z * 0.07) * 0.5 + 0.5;
      tmp.copy(mint).lerp(lime, UA.smoothstep(0.35, 0.75, n1));
      tmp.lerp(aqua, UA.smoothstep(0.55, 0.85, 1 - n1) * 0.6);
      tmp.lerp(pinkMeadow, UA.smoothstep(0.62, 0.85, n2) * 0.4);
      // each region leans toward its own color
      const rw = regionWeights(x, z);
      const rt = UA.smoothstep(34, 84, Math.sqrt(x * x + z * z)) * 0.5;
      for (let q = 0; q < 4; q++) tmp.lerp(regionTints[q], rw[q] * rt);
      // beaches and pond beds
      tmp.lerp(sand, 1 - UA.smoothstep(1.3, 2.3, y));
      tmp.lerp(bed, 1 - UA.smoothstep(-0.6, 0.4, y));
      // altitude to lavender, then to candy-striped peaks
      const hi = UA.smoothstep(12, 26, y) * 0.85;
      tmp.lerp(lav, hi);
      const r = Math.sqrt(x * x + z * z);
      if (r > 140) {
        const stripe = Math.sin(y * 0.55) * 0.5 + 0.5;
        tmp.lerp(stripe > 0.5 ? white : rock, UA.smoothstep(150, 185, r) * 0.7);
      }
      tmp.lerp(snow, UA.smoothstep(18, 32, y));
      // steep slopes show lavender rock
      tmp.lerp(rock, UA.smoothstep(0.86, 0.7, ny) * 0.8);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    World.terrain = mesh;

    // water
    const wgeo = new THREE.PlaneGeometry(size, size, 1, 1);
    wgeo.rotateX(-Math.PI / 2);
    const wmat = new THREE.MeshToonMaterial({
      color: 0x74d0ff,
      gradientMap: UA.gradient,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const water = new THREE.Mesh(wgeo, wmat);
    water.position.y = C.WATER_Y;
    water.renderOrder = 1;
    scene.add(water);
    World.water = water;
  }

  /* ---------- instanced props ---------- */
  function setMatrix(mesh, i, x, y, z, rotY, sx, sy, sz) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz));
    mesh.setMatrixAt(i, m);
  }

  function tint(color, rnd, amount) {
    const c = new THREE.Color(color);
    const hsl = {};
    c.getHSL(hsl);
    c.setHSL(hsl.h + (rnd() - 0.5) * 0.03, hsl.s, UA.clamp(hsl.l + (rnd() - 0.5) * (amount || 0.08), 0.6, 0.9));
    return c;
  }

  function buildTrees(scene) {
    const rnd = UA.rng(C.SEED + 1);
    const list = [];
    const cell = 10;
    for (let gx = -190; gx < 190; gx += cell) {
      for (let gz = -190; gz < 190; gz += cell) {
        const x = gx + rnd() * cell,
          z = gz + rnd() * cell;
        const r = Math.hypot(x, z);
        if (r < 16 || r > 176) continue;
        const dens = noiseB(x * 0.022 + 3, z * 0.022);
        const p = dens > 0.12 ? 0.8 : dens > -0.05 ? 0.28 : 0.04;
        if (rnd() > p) continue;
        const h = heightAt(x, z);
        if (h < 1.5 || World.slopeAt(x, z) > 0.42 || World.inTown(x, z, 9)) continue;
        const ri = regionIndex(x, z);
        const col = ri < 0 || rnd() < 0.18 ? UA.pick(C.PASTELS, rnd) : UA.pick(REGIONS[ri].trees, rnd);
        list.push({ x, z, h, s: 0.8 + rnd() * 0.75, rot: rnd() * 6.28, c: col });
      }
    }
    // trunk: candy-striped lollipop stick
    const trunkParts = [];
    const cream = 0xfff0de,
      pinkS = 0xffc2dc;
    for (let i = 0; i < 4; i++) {
      const g = new THREE.CylinderGeometry(0.3 - i * 0.015, 0.34 - i * 0.015, 0.85, 8);
      g.translate(0, 0.42 + i * 0.85, 0);
      trunkParts.push({ geo: g, color: i % 2 ? pinkS : cream });
    }
    const trunkGeo = UA.mergeGeos(trunkParts);
    const sph = new THREE.IcosahedronGeometry(1, 2);
    const sphLow = new THREE.IcosahedronGeometry(1, 1);
    const mk = (r, x, y, z) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(r, r * 0.92, r));
    const crownGeo = UA.mergeGeos([
      { geo: sph, matrix: mk(2.1, 0, 4.9, 0) },
      { geo: sphLow, matrix: mk(1.35, 1.35, 4.2, 0.3) },
      { geo: sphLow, matrix: mk(1.25, -1.2, 4.1, -0.7) },
      { geo: sphLow, matrix: mk(1.1, 0.2, 6.5, 0.2) },
    ]);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), list.length);
    const crowns = new THREE.InstancedMesh(crownGeo, UA.addGlow(new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient }), 0.3), list.length);
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      setMatrix(trunks, i, t.x, t.h - 0.1, t.z, t.rot, t.s);
      setMatrix(crowns, i, t.x, t.h - 0.1, t.z, t.rot, t.s);
      crowns.setColorAt(i, tint(t.c, rnd));
      addCollider(t.x, t.z, 0.5 * t.s, t.h + 7.8 * t.s);
      addBlocker(t.x, t.z, 2.4 * t.s, t.h + 2.6 * t.s, t.h + 7.8 * t.s);
    }
    trunks.frustumCulled = crowns.frustumCulled = false;
    scene.add(trunks, crowns);
    World.treeCount = list.length;
  }

  function buildMushrooms(scene) {
    const rnd = UA.rng(C.SEED + 2);
    const list = [];
    let tries = 0;
    while (list.length < 46 && tries++ < 2000) {
      const a = rnd() * 6.283,
        rr = 20 + rnd() * 150;
      const x = Math.cos(a) * rr,
        z = Math.sin(a) * rr;
      const h = heightAt(x, z);
      if (h < 1.6 || World.slopeAt(x, z) > 0.35 || World.inTown(x, z, 12)) continue;
      let ok = true;
      for (const o of list) if (Math.hypot(o.x - x, o.z - z) < 14) ok = false;
      if (!ok) continue;
      list.push({ x, z, h, s: 1.2 + rnd() * 1.4, rot: rnd() * 6.28, c: UA.pick([0xff9ccb, 0xcfaaff, 0xffc58a, 0xa4d4ff, 0xff8fb8], rnd) });
    }
    const stemGeo = new THREE.CylinderGeometry(0.35, 0.5, 1.6, 8);
    stemGeo.translate(0, 0.8, 0);
    const capGeo = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    capGeo.scale(1.5, 0.95, 1.5);
    capGeo.translate(0, 1.5, 0);
    const spotList = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283 + 0.4,
        e = 0.55 + (i % 2) * 0.35;
      const sx = Math.cos(a) * Math.cos(e) * 1.5 * 0.97,
        sz = Math.sin(a) * Math.cos(e) * 1.5 * 0.97,
        sy = Math.sin(e) * 0.95 * 0.97 + 1.5;
      spotList.push({ geo: new THREE.IcosahedronGeometry(0.2, 0), matrix: new THREE.Matrix4().compose(new THREE.Vector3(sx, sy, sz), new THREE.Quaternion(), new THREE.Vector3(1, 0.6, 1)), color: 0xffffff });
    }
    const spotGeo = UA.mergeGeos(spotList);
    const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshToonMaterial({ color: 0xfff0de, gradientMap: UA.gradient }), list.length);
    const caps = new THREE.InstancedMesh(capGeo, UA.addGlow(new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient }), 0.6), list.length);
    const spots = new THREE.InstancedMesh(spotGeo, UA.addGlow(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: UA.gradient }), 0.9), list.length);
    for (let i = 0; i < list.length; i++) {
      const m = list[i];
      setMatrix(stems, i, m.x, m.h - 0.2, m.z, m.rot, m.s);
      setMatrix(caps, i, m.x, m.h - 0.2, m.z, m.rot, m.s);
      setMatrix(spots, i, m.x, m.h - 0.2, m.z, m.rot, m.s);
      caps.setColorAt(i, new THREE.Color(m.c));
      addCollider(m.x, m.z, 0.5 * m.s, m.h + 2.8 * m.s);
      addBlocker(m.x, m.z, 1.6 * m.s, m.h + 1.2 * m.s, m.h + 2.6 * m.s);
      addBlocker(m.x, m.z, 0.6 * m.s, m.h - 0.2, m.h + 1.4 * m.s);
    }
    stems.frustumCulled = caps.frustumCulled = spots.frustumCulled = false;
    scene.add(stems, caps, spots);
    World.mushrooms = list;
    World.mushMeshes = { caps, spots };
  }

  function buildFlowers(scene) {
    const rnd = UA.rng(C.SEED + 3);
    const stemGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.5, 4);
    stemGeo.translate(0, 0.25, 0);
    const headGeo = new THREE.ConeGeometry(0.15, 0.3, 6);
    headGeo.rotateX(Math.PI);
    headGeo.translate(0, 0.62, 0);
    const pts = [];
    let tries = 0;
    while (pts.length < 4200 && tries++ < 4000) {
      const a = rnd() * 6.283,
        rr = Math.sqrt(rnd()) * 188;
      const cx = Math.cos(a) * rr,
        cz = Math.sin(a) * rr;
      const n = noiseB(cx * 0.045 + 31, cz * 0.045 - 8);
      if (n < -0.15 && rnd() > 0.12) continue;
      if (World.inTown(cx, cz, 1)) continue;
      const ri = regionIndex(cx, cz);
      const color = ri < 0 || rnd() < 0.2 ? UA.pick([0xff9ec9, 0xffffff, 0xffe27a, 0xc3a4ff, 0x9fd8ff, 0xffb48a], rnd) : UA.pick(REGIONS[ri].flowers, rnd);
      const k = 3 + Math.floor(rnd() * 6);
      for (let j = 0; j < k; j++) {
        const x = cx + (rnd() - 0.5) * 3.4,
          z = cz + (rnd() - 0.5) * 3.4;
        const h = heightAt(x, z);
        if (h < 1.4 || World.slopeAt(x, z) > 0.55) continue;
        pts.push({ x, z, h, s: 0.7 + rnd() * 0.7, rot: rnd() * 6.28, color });
      }
    }
    const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshToonMaterial({ color: 0x8fdca0, gradientMap: UA.gradient }), pts.length);
    const heads = new THREE.InstancedMesh(headGeo, UA.addGlow(new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient }), 1.0), pts.length);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      setMatrix(stems, i, p.x, p.h - 0.05, p.z, p.rot, p.s);
      setMatrix(heads, i, p.x, p.h - 0.05, p.z, p.rot, p.s);
      heads.setColorAt(i, new THREE.Color(p.color));
    }
    stems.frustumCulled = heads.frustumCulled = false;
    stems.userData.noOutline = heads.userData.noOutline = true; // thin stems would turn into black sticks
    scene.add(stems, heads);
    World.flowerCount = pts.length;
  }

  /* ---------- clouds ---------- */
  function buildClouds(scene) {
    const rnd = UA.rng(C.SEED + 4);
    const mat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient, emissive: 0xffeef8, emissiveIntensity: 0.55 });
    World.cloudMat = mat;
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group();
      const n = 5 + Math.floor(rnd() * 4);
      for (let j = 0; j < n; j++) {
        const r = 7 + rnd() * 7;
        g.add(UA.ball(r, mat, 1.2, 0.8, 1, (j - n / 2) * 8 + rnd() * 3, (rnd() - 0.3) * 4, (rnd() - 0.5) * 6, true));
      }
      const a = rnd() * 6.283,
        rr = 40 + rnd() * 230;
      g.position.set(Math.cos(a) * rr, 62 + rnd() * 35, Math.sin(a) * rr);
      g.userData.speed = 0.6 + rnd() * 1.2;
      g.rotation.y = rnd() * 3;
      scene.add(g);
      World.clouds.push(g);
    }
  }

  /* ---------- rainbow arch landmark ---------- */
  function buildArch(scene) {
    const cx = 0,
      cz = -78,
      radius = 15;
    const g = new THREE.Group();
    for (let i = 0; i < C.RAINBOW.length; i++) {
      const geo = new THREE.TorusGeometry(radius + (C.RAINBOW.length - i) * 1.5, 0.85, 8, 48, Math.PI);
      const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: C.RAINBOW[i], gradientMap: UA.gradient, emissive: C.RAINBOW[i], emissiveIntensity: 0.25 }));
      g.add(m);
    }
    const base = Math.min(heightAt(cx - radius - 5, cz), heightAt(cx + radius + 5, cz)) - 1.5;
    g.position.set(cx, base, cz);
    scene.add(g);
    // fluffy clouds at the feet
    const cm = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient, emissive: 0xffeef8, emissiveIntensity: 0.5 });
    [-1, 1].forEach((side) => {
      const cg = new THREE.Group();
      for (let k = 0; k < 5; k++) cg.add(UA.ball(3 + (k % 3) * 0.7, cm, 1.2, 0.85, 1.1, (k - 2) * 2.4, (k % 2) * 0.8, (k % 3) * 0.6, true));
      cg.position.set(cx + side * (radius + 5.2), base + 0.8, cz);
      scene.add(cg);
    });
    World.arch = { x: cx, z: cz, r: radius, base };
  }

  /* ---------- gumdrop bushes (treats) ---------- */
  function buildBushes(scene) {
    const rnd = UA.rng(C.SEED + 5);
    const colors = [0xff8fb8, 0xffb48a, 0xffe58a, 0xa6ec9a, 0x8fd2ff, 0xbf9bff];
    const pts = [
      [0, 0.0],
      [0.55, 0.12],
      [0.7, 0.4],
      [0.5, 0.62],
      [0.22, 0.78],
      [0.0, 0.8],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    const geo = new THREE.LatheGeometry(pts, 14);
    const leafMat = UA.mat(0x9fe3b4);
    let tries = 0;
    const placed = [];
    // a handful near the start so new players find treats right away
    const fixed = [
      [8, 10],
      [-9, 14],
      [14, -6],
      [-12, -10],
    ];
    while (World.bushes.length < 56 && tries++ < 3000) {
      let x, z;
      if (World.bushes.length < fixed.length) {
        x = fixed[World.bushes.length][0];
        z = fixed[World.bushes.length][1];
      } else {
        const a = rnd() * 6.283,
          rr = 16 + Math.sqrt(rnd()) * 165;
        x = Math.cos(a) * rr;
        z = Math.sin(a) * rr;
      }
      const h = heightAt(x, z);
      if (h < 1.5 || World.slopeAt(x, z) > 0.4 || World.inTown(x, z, 6)) continue;
      let ok = true;
      for (const p of placed) if (Math.hypot(p[0] - x, p[1] - z) < 9) ok = false;
      if (!ok) continue;
      placed.push([x, z]);
      const grp = new THREE.Group();
      const leaves = UA.ball(0.95, leafMat, 1, 0.55, 1, 0, 0.3, 0, true);
      grp.add(leaves);
      const col = [];
      for (let k = 0; k < 5; k++) {
        const c = colors[Math.floor(rnd() * colors.length)];
        const m = new THREE.Mesh(geo, UA.mat(c, c));
        const a = (k / 5) * 6.283 + rnd(),
          rr = k === 0 ? 0 : 0.55;
        m.position.set(Math.cos(a) * rr, 0.35 + (k === 0 ? 0.25 : 0), Math.sin(a) * rr);
        m.scale.setScalar(k === 0 ? 0.85 : 0.65);
        m.rotation.y = rnd() * 6;
        grp.add(m);
        col.push(m);
      }
      grp.position.set(x, h - 0.05, z);
      scene.add(grp);
      World.bushes.push({ x, z, h, grp, ready: true, regrow: 0, scale: 1, phase: rnd() * 6, glint: rnd() * 5 });
    }
  }

  /* ---------- public build / update ---------- */
  World.build = function (scene) {
    buildSky(scene);
    buildTerrain(scene);
    buildTrees(scene);
    buildMushrooms(scene);
    buildFlowers(scene);
    buildClouds(scene);
    buildArch(scene);
    buildBushes(scene);
  };

  World.update = function (dt, t, camPos) {
    // sky follows the camera
    World.sky.position.copy(camPos);
    for (const c of World.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 300) c.position.x = -300;
    }
    for (const b of World.bushes) {
      if (b.ready) {
        b.grp.position.y = b.h - 0.05 + Math.sin(t * 2 + b.phase) * 0.04;
        b.grp.scale.setScalar(1 + Math.sin(t * 2 + b.phase) * 0.02);
      } else {
        b.regrow -= dt;
        const k = UA.clamp(1 - b.regrow / 30, 0, 1);
        b.grp.scale.setScalar(0.05 + k * 0.95);
        b.grp.position.y = b.h - 0.05;
        if (b.regrow <= 0) {
          b.ready = true;
        }
      }
    }
  };
})();
