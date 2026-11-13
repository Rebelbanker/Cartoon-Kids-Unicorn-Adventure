/* Magic: the spell wheel. Sparkle Burst, Bubble Float, Butterfly Swarm and Rainbow Rain. Also rainbow arches you can ride through. */
(function () {
  const UA = window.UA,
    C = UA.C;
  const V3 = THREE.Vector3;
  const M = (UA.Magic = { arches: [], bubbles: [], boostCd: 0 });
  let scene, bubMat, bubGeo;

  const SPELLS = [
    { id: 'sparkle', name: 'Sparkle Burst', need: 0, note: 'Flowers bloom and friends dance', icon: 'spark', cd: 1.1 },
    { id: 'bubbles', name: 'Bubble Float', need: 1, note: 'Friends float up in soap bubbles. Pop bubbles for treats!', icon: 'bubble', cd: 2.2 },
    { id: 'butterflies', name: 'Butterfly Swarm', need: 3, note: 'A cloud of butterflies dances with you', icon: 'butterfly', cd: 3 },
    { id: 'rainbow', name: 'Rainbow Rain', need: 6, note: 'A rain cloud, flowers and a rainbow to ride through', icon: 'rainbow', cd: 5 },
  ];
  M.spells = SPELLS;
  const unlocked = (s) => UA.Creatures.friendCount() >= s.need;
  M.current = function () {
    const st = UA.state;
    const s = SPELLS.find((x) => x.id === st.spell);
    return s && unlocked(s) ? s : SPELLS[0];
  };
  function show() {
    UA.UI.setSpell(M.current());
  }
  M.set = function (s, quiet) {
    UA.state.spell = s.id;
    show();
    if (!quiet) {
      UA.UI.toast(s.name + '<small>' + s.note + '</small>', 2600);
      UA.Audio.chime(2 + SPELLS.indexOf(s));
    }
    UA.save();
  };
  M.next = function () {
    const cur = M.current();
    const list = SPELLS.filter(unlocked);
    const nx = list[(list.indexOf(cur) + 1) % list.length];
    if (nx) M.set(nx);
  };
  M.pick = function (i) {
    const s = SPELLS[i];
    if (!s) return;
    if (!unlocked(s)) {
      UA.UI.toast(s.name + ' is locked<small>Make ' + s.need + (s.need === 1 ? ' friend' : ' friends') + ' to learn it</small>', 2600);
      return;
    }
    M.set(s);
  };

  /* ---------- soap bubbles ---------- */
  function buildBubbles() {
    bubGeo = new THREE.SphereGeometry(1, 20, 14);
    bubMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'uniform float uTime; varying vec3 vN; varying vec3 vV; void main(){ vec3 n = normalize(vN); float f = 1.0 - abs(dot(n, normalize(vV))); float rim = pow(f, 2.2);' +
        'vec3 irid = 0.55 + 0.45 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + f * 1.3 + uTime * 0.15)); float spec = pow(max(0.0, dot(n, normalize(vec3(0.4, 0.8, 0.5)))), 22.0);' +
        'vec3 col = mix(vec3(0.85, 0.95, 1.0), irid, rim) + spec; float a = 0.07 + rim * 0.55 + spec * 0.6; gl_FragColor = vec4(col, a); gl_FragColor = linearToOutputTexel(gl_FragColor); }',
    });
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(bubGeo, bubMat);
      mesh.renderOrder = 4;
      mesh.frustumCulled = false;
      mesh.visible = false;
      const gum = new THREE.Mesh(UA._lowSphereGeo, UA.mat(0xff9ac4, 0xff9ac4));
      gum.scale.setScalar(0.32);
      gum.visible = false;
      mesh.add(gum);
      scene.add(mesh);
      M.bubbles.push({ mesh, gum, active: false, pos: new V3(), vel: new V3(), r: 1, life: 0, age: 0, owner: null, hasGum: false, ph: 0 });
    }
  }
  function spawnBubble(o) {
    const b = M.bubbles.find((x) => !x.active);
    if (!b) return null;
    b.active = true;
    b.pos.copy(o.pos);
    b.vel.copy(o.vel || new V3());
    b.r = o.r;
    b.life = o.life || 8;
    b.age = 0;
    b.owner = o.owner || null;
    b.hasGum = !!o.gum;
    b.ph = Math.random() * 6;
    b.gum.visible = b.hasGum;
    if (b.hasGum) b.gum.material = UA.mat(o.gum, o.gum);
    b.mesh.visible = true;
    b.mesh.position.copy(b.pos);
    b.mesh.scale.setScalar(0.01);
    return b;
  }
  function popBubble(b, byPlayer) {
    b.active = false;
    b.mesh.visible = false;
    UA.FX.sparkles(b.pos, 9, undefined, b.r);
    UA.FX.burst(b.pos, b.owner ? 14 : 8);
    UA.Audio.bubblePop();
    if (b.owner) {
      b.owner.hearts(5);
      b.owner.bubbleLeft = 0;
    }
    if (byPlayer && b.hasGum) {
      const s = UA.state;
      s.treats = Math.min(30, s.treats + 1);
      UA.FX.hearts(b.pos, 2);
      if (UA.refreshHUD) UA.refreshHUD();
    }
  }

  function castBubbles(uni, tip) {
    UA.Audio.bubble();
    // lift nearby friends (and strangers) into bubbles
    const near = UA.Creatures.list.filter((c) => !c.far && Math.hypot(c.pos.x - uni.pos.x, c.pos.z - uni.pos.z) < 17 && c.bubbleLeft <= 0).sort((a, b) => Math.hypot(a.pos.x - uni.pos.x, a.pos.z - uni.pos.z) - Math.hypot(b.pos.x - uni.pos.x, b.pos.z - uni.pos.z));
    near.slice(0, 7).forEach((c, i) => {
      c.bubbleLeft = 6 + Math.random() * 1.5;
      c.sleeping = false;
      c.dazzle = 0;
      const r = (c.S.bub || 1.9) * c.scale;
      spawnBubble({ pos: new V3(c.pos.x, c.pos.y + 1.1 * c.scale, c.pos.z), r, life: 99, owner: c });
      setTimeout(() => c.bubbleLeft > 0 && c.say(UA.pick(['Wheee!', 'I am floating!', 'Hee hee!', 'Wow, so high!'])), 400 + i * 220);
    });
    // a swarm of free bubbles, some hold a gumdrop
    const colors = [0xff8fb8, 0xffb48a, 0xffe58a, 0xa6ec9a, 0x8fd2ff, 0xbf9bff];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.283,
        sp = 2 + Math.random() * 4;
      spawnBubble({
        pos: new V3(tip.x + (Math.random() - 0.5) * 0.6, tip.y + Math.random() * 0.4, tip.z + (Math.random() - 0.5) * 0.6),
        vel: new V3(Math.cos(a) * sp + uni.dir.x * 3, 2 + Math.random() * 3, Math.sin(a) * sp + uni.dir.z * 3),
        r: 0.55 + Math.random() * 0.8,
        life: 9 + Math.random() * 5,
        gum: i % 4 === 0 ? colors[(i / 4) % 6] : 0,
      });
    }
  }

  // bubbles for everyone near a point (used by the wishing fountain)
  M.bubbleParty = function (f, uni) {
    UA.Audio.bubble();
    UA.Creatures.list
      .filter((c) => !c.far && Math.hypot(c.pos.x - f.x, c.pos.z - f.z) < 40 && c.bubbleLeft <= 0)
      .slice(0, 12)
      .forEach((c, i) => {
        c.bubbleLeft = 7 + Math.random() * 2;
        c.sleeping = false;
        c.dazzle = 0;
        c.go = null;
        const r = (c.S.bub || 1.9) * c.scale;
        spawnBubble({ pos: new V3(c.pos.x, c.pos.y + 1.1 * c.scale, c.pos.z), r, life: 99, owner: c });
        setTimeout(() => c.bubbleLeft > 0 && c.say(UA.pick(['Wheee!', 'Bubble party!', 'Hee hee!'])), 300 + i * 150);
      });
    const colors = [0xff8fb8, 0xffb48a, 0xffe58a, 0xa6ec9a, 0x8fd2ff, 0xbf9bff];
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * 6.283,
        sp = 1.5 + Math.random() * 3;
      spawnBubble({ pos: new V3(f.x, f.h + 4, f.z), vel: new V3(Math.cos(a) * sp, 3 + Math.random() * 3, Math.sin(a) * sp), r: 0.6 + Math.random() * 0.8, life: 10 + Math.random() * 5, gum: i % 4 === 0 ? colors[(i / 4) % 6] : 0 });
    }
  };

  function updateBubbles(dt, t, uni) {
    bubMat.uniforms.uTime.value = t;
    const cx = uni.pos.x,
      cy = uni.pos.y + 1.8,
      cz = uni.pos.z;
    for (const b of M.bubbles) {
      if (!b.active) continue;
      b.age += dt;
      if (b.owner) {
        const c = b.owner;
        b.pos.set(c.pos.x, c.pos.y + 1.15 * c.scale, c.pos.z);
        if (c.bubbleLeft <= 0) {
          popBubble(b, false);
          continue;
        }
      } else {
        b.vel.x *= 1 - 0.6 * dt;
        b.vel.z *= 1 - 0.6 * dt;
        b.vel.y += (0.6 - b.vel.y) * 0.8 * dt + Math.sin(t * 1.7 + b.ph) * 0.3 * dt;
        b.pos.addScaledVector(b.vel, dt);
        b.life -= dt;
        // ride into one to pop it
        const dx = b.pos.x - cx,
          dy = b.pos.y - cy,
          dz = b.pos.z - cz;
        if (dx * dx + dy * dy + dz * dz < (b.r + 1.5) * (b.r + 1.5) && b.age > 0.6) {
          popBubble(b, true);
          continue;
        }
        if (b.life <= 0) {
          popBubble(b, false);
          continue;
        }
      }
      const grow = Math.min(1, b.age / 0.35);
      const wob = 1 + Math.sin(t * 5 + b.ph) * 0.035;
      const s = b.r * (0.3 + 0.7 * grow * (2 - grow)) * wob;
      b.mesh.position.copy(b.pos);
      b.mesh.scale.set(s * (1 + Math.sin(t * 4 + b.ph) * 0.03), s * (1 - Math.sin(t * 4 + b.ph) * 0.03), s);
    }
  }

  /* ---------- butterflies (glow moths at night) ---------- */
  const NB = 26;
  let wings, bflies;
  const _m = new THREE.Matrix4(),
    _r = new THREE.Matrix4(),
    _t = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _p = new V3(),
    _s = new V3(),
    _up = new V3(0, 1, 0);
  function buildButterflies() {
    // one butterfly wing (right side): a big upper lobe and a smaller lower lobe, lying flat and pointing forward
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(0.15, 0.6, 0.85, 0.75, 0.82, 0.25);
    sh.bezierCurveTo(0.8, 0.02, 0.45, 0.0, 0.3, 0.0);
    sh.bezierCurveTo(0.62, -0.08, 0.66, -0.62, 0.4, -0.58);
    sh.bezierCurveTo(0.2, -0.52, 0.05, -0.25, 0, 0);
    const g = new THREE.ShapeGeometry(sh, 8);
    g.rotateX(Math.PI / 2);
    g.scale(0.62, 1, 0.62);
    wings = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), NB * 2);
    wings.frustumCulled = false;
    wings.visible = false;
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < NB * 2; i++) {
      wings.setMatrixAt(i, _m);
      wings.setColorAt(i, new THREE.Color(0xffffff));
    }
    scene.add(wings);
    bflies = [];
    for (let i = 0; i < NB; i++) bflies.push({ p: new V3(), a: 0, r: 3, h: 2, ph: 0, sp: 1, yaw: 0, on: false });
    M.bflies = { t: 0, on: false };
  }
  function castButterflies(uni, tip) {
    const night = UA.Time && UA.Time.night > 0.5;
    const cols = night ? [0xfff2a8, 0xb7f5ff, 0xffc6f0, 0xd6ffd0] : C.RAINBOW.concat([0xffffff]);
    bflies.forEach((b, i) => {
      b.on = true;
      b.p.set(tip.x + (Math.random() - 0.5), tip.y + Math.random(), tip.z + (Math.random() - 0.5));
      b.a = Math.random() * 6.283;
      b.r = 2 + Math.random() * 5;
      b.h = 1.2 + Math.random() * 3.4;
      b.ph = Math.random() * 10;
      b.sp = (0.5 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1);
      const c = new THREE.Color(cols[i % cols.length]);
      wings.setColorAt(i * 2, c);
      wings.setColorAt(i * 2 + 1, c);
    });
    wings.instanceColor.needsUpdate = true;
    M.bflies.t = 32;
    M.bflies.on = true;
    wings.visible = true;
    UA.Audio.shimmer();
    UA.FX.sparkles(tip, 16, 0xffffff, 1.5, 1);
  }
  function updateButterflies(dt, t, uni) {
    const bf = M.bflies;
    if (!bf.on) return;
    bf.t -= dt;
    const fade = UA.clamp(bf.t / 2, 0, 1);
    let any = false;
    for (let i = 0; i < NB; i++) {
      const b = bflies[i];
      if (!b.on) continue;
      b.a += b.sp * dt;
      const tx = uni.pos.x + Math.cos(b.a) * b.r + Math.sin(t * 1.3 + b.ph) * 0.8,
        tz = uni.pos.z + Math.sin(b.a) * b.r + Math.cos(t * 1.1 + b.ph) * 0.8;
      const ty = Math.max(UA.World.groundAt(tx, tz) + 1, uni.pos.y) + b.h + Math.sin(t * 2.2 + b.ph) * 0.5;
      const px = b.p.x,
        pz = b.p.z;
      const k = 1 - Math.exp(-2.4 * dt);
      b.p.x += (tx - b.p.x) * k;
      b.p.y += (ty - b.p.y) * k;
      b.p.z += (tz - b.p.z) * k;
      const vx = b.p.x - px,
        vz = b.p.z - pz;
      if (vx * vx + vz * vz > 1e-6) b.yaw = Math.atan2(vx, vz);
      const flap = Math.sin(t * (17 + (b.ph % 4)) + b.ph) * 0.85 + 0.25;
      const sc = fade * (1 - Math.exp(-(32 - bf.t) * 3));
      for (let side = -1; side <= 1; side += 2) {
        _q.setFromAxisAngle(_up, b.yaw);
        _s.set(sc, sc, sc);
        _m.compose(b.p, _q, _s);
        _r.makeRotationZ(side * flap);
        _t.makeScale(side, 1, 1);
        _m.multiply(_r).multiply(_t);
        wings.setMatrixAt(i * 2 + (side < 0 ? 0 : 1), _m);
      }
      if (Math.random() < dt * 1.2) UA.FX.sparkles(b.p, 1, undefined, 0.2, -0.5);
      any = true;
    }
    wings.instanceMatrix.needsUpdate = true;
    if (bf.t <= 0 || !any) {
      bf.on = false;
      wings.visible = false;
    }
  }

  /* ---------- rainbow arches ---------- */
  function makeArch(R) {
    const g = new THREE.Group();
    for (let i = 0; i < C.RAINBOW.length; i++) {
      const geo = new THREE.TorusGeometry(R + (C.RAINBOW.length - i) * 1.4, 0.8, 8, 40, Math.PI);
      g.add(new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: C.RAINBOW[i], gradientMap: UA.gradient, emissive: C.RAINBOW[i], emissiveIntensity: 0.3 })));
    }
    return g;
  }
  function addArch(x, z, yaw, R, life) {
    const g = makeArch(R);
    g.position.set(x, UA.World.groundAt(x, z) - 1.2, z);
    g.rotation.y = yaw;
    g.scale.setScalar(0.01);
    scene.add(g);
    M.arches.push({ g, x, z, yaw, R, age: 0, life, cd: 0 });
    return g;
  }
  M.addArch = addArch;
  function updateArches(dt, uni) {
    for (const a of M.arches) {
      a.age += dt;
      let s = 1;
      if (a.age < 1.3) {
        const k = a.age / 1.3;
        s = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); // ease out with a little overshoot
      } else if (a.life - a.age < 1.6) s = Math.max(0.01, (a.life - a.age) / 1.6);
      a.g.scale.setScalar(Math.max(0.01, s));
      if (a.age > a.life) {
        scene.remove(a.g);
        a.g.children.forEach((m) => {
          m.geometry.dispose();
          m.material.dispose();
        });
        a.dead = true;
        UA.FX.burst(new V3(a.x, a.g.position.y + a.R, a.z), 30);
      }
    }
    M.arches = M.arches.filter((a) => !a.dead);
    // riding through any arch (also the big one at the start) gives a rainbow boost
    M.boostCd = Math.max(0, M.boostCd - dt);
    if (M.boostCd > 0 || uni.speed < 3) return;
    const all = M.arches.map((a) => ({ x: a.x, z: a.z, yaw: a.yaw, R: a.R * 0.85, base: a.g.position.y })).concat(UA.World.arch ? [{ x: UA.World.arch.x, z: UA.World.arch.z, yaw: 0, R: UA.World.arch.r * 0.9, base: UA.World.arch.base }] : []);
    for (const a of all) {
      const dx = uni.pos.x - a.x,
        dz = uni.pos.z - a.z;
      const along = dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw);
      const lat = dx * Math.cos(a.yaw) - dz * Math.sin(a.yaw);
      const hy = uni.pos.y + 1.5 - a.base;
      if (Math.abs(along) < 1.8 && Math.hypot(lat, hy) < a.R && hy > -1) {
        M.boostCd = 3.5;
        uni.boost = 2.4;
        UA.FX.burst(new V3(uni.pos.x, uni.pos.y + 2, uni.pos.z), 36);
        UA.Audio.whoosh();
        UA.Audio.shimmer();
        UA.UI.toast('Rainbow boost!<small>Zoooom</small>', 1600);
        break;
      }
    }
  }

  /* ---------- rainbow rain: a little cloud, a flower shower, and a rainbow ---------- */
  let rain = null;
  function castRainbow(uni, tip) {
    if (rain) endRain();
    const g = new THREE.Group();
    const mat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: UA.gradient, emissive: 0xf3e6ff, emissiveIntensity: 0.55 });
    [[0, 0, 0, 3.2], [3, -0.3, 0.5, 2.5], [-3, -0.2, -0.4, 2.6], [1.4, 1.1, -0.8, 2.3], [-1.6, 0.9, 0.9, 2.2]].forEach((q) => g.add(UA.ball(q[3], mat, 1.2, 0.8, 1, q[0], q[1], q[2], true)));
    const cx = uni.pos.x + uni.dir.x * 9,
      cz = uni.pos.z + uni.dir.z * 9;
    const gy = UA.World.groundAt(cx, cz);
    g.position.set(cx, Math.max(gy, uni.pos.y) + 12, cz);
    g.scale.setScalar(0.01);
    scene.add(g);
    rain = { g, x: cx, z: cz, gy, t: 0, life: 9, flowerT: 0, danceT: 0, arch: false };
    UA.Audio.shimmer();
    UA.FX.sparkles(tip, 20, undefined, 1.5, 1);
  }
  function endRain() {
    if (!rain) return;
    scene.remove(rain.g);
    rain.g.children.forEach((m) => m.material !== undefined && m.material.dispose && 0);
    rain = null;
  }
  function updateRain(dt, t, uni) {
    if (!rain) return;
    const r = rain;
    r.t += dt;
    const k = r.t < 1 ? 1 - Math.pow(1 - r.t, 3) : r.life - r.t < 1 ? Math.max(0.01, r.life - r.t) : 1;
    r.g.scale.setScalar(Math.max(0.01, k) * 0.85);
    r.g.position.y += Math.sin(t * 2) * 0.004;
    if (r.t > 0.8 && r.t < r.life - 0.8) {
      // drops: lots of pastel sparkles falling from the cloud
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * 6.283,
          rr = Math.sqrt(Math.random()) * 8;
        UA.FX.emit({ x: r.x + Math.cos(a) * rr, y: r.g.position.y - 1, z: r.z + Math.sin(a) * rr, vx: 0, vy: -9, vz: 0, color: UA.pick(C.RAINBOW), size: 0.3 + Math.random() * 0.25, shape: Math.random() < 0.35 ? 1 : 0, life: 1.0, grow: -0.3, gravity: 5, drag: 0.1 });
      }
      r.flowerT -= dt;
      if (r.flowerT <= 0) {
        r.flowerT = 0.3;
        UA.FX.growFlowers(r.x, r.z, 9, 4);
      }
      r.danceT -= dt;
      if (r.danceT <= 0) {
        r.danceT = 2;
        UA.Creatures.dazzle({ x: r.x, z: r.z }, 20);
      }
    }
    if (!r.arch && r.t > 2) {
      r.arch = true;
      const R = 11;
      addArch(uni.pos.x + uni.dir.x * 26, uni.pos.z + uni.dir.z * 26, uni.yaw, R, 22);
      UA.Audio.fanfare();
      UA.UI.toast('A rainbow!<small>Ride through it for a boost</small>', 3000);
    }
    if (r.t > r.life) endRain();
  }

  M.rainState = () => rain && { t: rain.t, arch: rain.arch };
  M.cast = function (id, uni, tip) {
    if (id === 'bubbles') castBubbles(uni, tip);
    else if (id === 'butterflies') castButterflies(uni, tip);
    else if (id === 'rainbow') castRainbow(uni, tip);
  };

  M.init = function (sc) {
    scene = sc;
    buildBubbles();
    buildButterflies();
    if (!UA.state.spellsSeen) UA.state.spellsSeen = ['sparkle'];
    show();
  };

  let checkT = 0;
  M.update = function (dt, t, uni, playing) {
    updateBubbles(dt, t, uni);
    updateButterflies(dt, t, uni);
    updateRain(dt, t, uni);
    updateArches(dt, uni);
    // new spells appear as friendships grow
    checkT -= dt;
    if (checkT <= 0 && playing) {
      checkT = 0.8;
      const seen = UA.state.spellsSeen;
      for (const s of SPELLS) {
        if (seen.indexOf(s.id) < 0 && unlocked(s)) {
          seen.push(s.id);
          UA.Audio.fanfare();
          setTimeout(() => UA.UI.toast('New spell: ' + s.name + '!<small>Press C (or tap the spell button) to switch spells</small>', 4800), 1800);
          UA.save();
          break;
        }
      }
    }
  };
})();
